import { describe, it, expect, beforeEach } from 'vitest';
import { CooldownService } from '../src/services/CooldownService.js';
import { config } from '../src/config.js';

class MockRedis {
  private store = new Map<string, { val: string; expiresAt: number }>();

  async set(key: string, val: string, ...args: any[]): Promise<'OK' | null> {
    let ex = 0;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX') ex = Number(args[i + 1]);
      if (args[i] === 'NX') nx = true;
    }
    const existing = this.store.get(key);
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      if (nx) return null;
    }
    const expiresAt = ex > 0 ? now + ex * 1000 : Infinity;
    this.store.set(key, { val, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.val;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    const remainingMs = item.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async eval(...args: any[]): Promise<any> {
    return [1, 8, 300, 2400, Date.now()];
  }
}

describe('Aceleração de Regeneração de Rolls (Diminishing Returns)', () => {
  let mockRedis: MockRedis;
  let service: CooldownService;

  beforeEach(() => {
    (config as any).ROLL_REGEN_SECONDS = 300;
    (config as any).ROLL_MAX_BASE = 9;
    (config as any).ROLL_REGEN_ACCEL_FACTOR = 20;
    mockRedis = new MockRedis();
    service = new CooldownService(mockRedis as any);
  });

  it('deve manter 300 segundos para o limite base de 9 rolls', () => {
    const regen = service.getUserRegenSeconds(9);
    expect(regen).toBe(300);
  });

  it('deve acelerar corretamente para 15 rolls (6 extras)', () => {
    // 300 / (1 + 0.02 * 6) = 300 / 1.12 = 267.857... -> round = 268s
    const regen = service.getUserRegenSeconds(15);
    expect(regen).toBe(268);
  });

  it('deve acelerar corretamente para 50 rolls (41 extras)', () => {
    // 300 / (1 + 0.02 * 41) = 300 / 1.82 = 164.835... -> round = 165s
    const regen = service.getUserRegenSeconds(50);
    expect(regen).toBe(165);
  });

  it('deve acelerar corretamente para 120 rolls (111 extras)', () => {
    // 300 / (1 + 0.02 * 111) = 300 / 3.22 = 93.167... -> round = 93s
    const regen = service.getUserRegenSeconds(120);
    expect(regen).toBe(93);
  });

  it('deve respeitar alteração do fator no config', () => {
    const originalFactor = config.ROLL_REGEN_ACCEL_FACTOR;
    try {
      // Teste com fator 25 (0.025)
      (config as any).ROLL_REGEN_ACCEL_FACTOR = 25;
      // 300 / (1 + 0.025 * 41) = 300 / 2.025 = 148.148... -> 148s
      expect(service.getUserRegenSeconds(50)).toBe(148);

      // Teste com aceleração desativada (0)
      (config as any).ROLL_REGEN_ACCEL_FACTOR = 0;
      expect(service.getUserRegenSeconds(50)).toBe(300);
    } finally {
      (config as any).ROLL_REGEN_ACCEL_FACTOR = originalFactor;
    }
  });

  it('deve incluir regenSeconds em getUserRolls e getRollCooldown', async () => {
    const userId = 'test_user_regen_123';
    // Usuário com 41 rolls extras (total 50)
    const rollsState = await service.getUserRolls(userId, 41);
    expect(rollsState.maxRolls).toBe(50);
    expect(rollsState.regenSeconds).toBe(165);

    const cooldown = await service.getRollCooldown(userId, 41);
    expect(cooldown.maxRolls).toBe(50);
    expect(cooldown.regenSeconds).toBe(165);
  });
});
