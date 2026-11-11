import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Rarity } from '@prisma/client';
import { HostingFeeService } from '../src/services/HostingFeeService.js';
import { parseHostingRates } from '../src/config.js';

describe('HostingFeeService Unit & Logic Tests', () => {
  it('deve parsear corretamente as taxas ativas e inativas do formato CSV', () => {
    const active = parseHostingRates('1,3,8,15,40', {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 0,
    });
    expect(active).toEqual({
      COMMON: 1,
      UNCOMMON: 3,
      RARE: 8,
      EPIC: 15,
      LEGENDARY: 40,
    });

    const inactive = parseHostingRates('10,60,200,350,1000', {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 0,
    });
    expect(inactive).toEqual({
      COMMON: 10,
      UNCOMMON: 60,
      RARE: 200,
      EPIC: 350,
      LEGENDARY: 1000,
    });
  });

  it('deve retornar defaultRates caso a string CSV seja inválida ou incompleta', () => {
    const fallback = {
      COMMON: 1,
      UNCOMMON: 2,
      RARE: 3,
      EPIC: 4,
      LEGENDARY: 5,
    };
    const parsed = parseHostingRates('invalido,10', fallback);
    expect(parsed).toEqual(fallback);
  });
});
