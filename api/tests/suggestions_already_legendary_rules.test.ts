import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3030';
const API_KEY = process.env.API_KEY || (process.env.API_KEYS ? process.env.API_KEYS.split(',')[0].trim() : '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

describe('⭐ Personagem JÁ Lendário: nenhuma trava de casamento deve ser aplicada', () => {
  let testUserId = 'test_already_legendary_user';
  let testPublicId = '';
  let testUserToken = '';
  let adminToken = '';
  let legendaryMarriedCharId = '';
  const createdSuggestionIds: string[] = [];

  beforeAll(async () => {
    // 1. Login do admin
    try {
      const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASSWORD }),
      });
      const loginJson = await loginRes.json();
      if (loginJson?.data?.token) adminToken = loginJson.data.token;
    } catch (_) {}

    // 2. Garante usuário de teste
    await fetch(`${BASE_URL}/user/ensure`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        groupId: 'test_group_already_legendary',
        name: 'Jogador Teste Já Lendário',
      }),
    });

    // 3. Token web do usuário
    const userRes = await fetch(`${BASE_URL}/user/${testUserId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const userJson = await userRes.json();
    testPublicId = userJson.data.publicId;

    const tokenRes = await fetch(`${BASE_URL}/user/session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: testUserId }),
    });
    const tokenJson = await tokenRes.json();
    testUserToken = tokenJson.data.token;

    // 4. Garante um personagem LENDÁRIO já casado (casa com um lendário; se não houver, promove um comum)
    const legendaryRes = await fetch(`${BASE_URL}/characters?limit=1&maritalStatus=single&rarity=LEGENDARY`);
    const legendaryJson = await legendaryRes.json();
    legendaryMarriedCharId = legendaryJson.data?.data?.[0]?.id || '';

    if (!legendaryMarriedCharId) {
      const candidateRes = await fetch(`${BASE_URL}/characters?limit=1&page=2&maritalStatus=single&rarity=COMMON`);
      const candidateJson = await candidateRes.json();
      legendaryMarriedCharId = candidateJson.data?.data?.[0]?.id || '';
    }

    if (legendaryMarriedCharId && adminToken) {
      await fetch(`${BASE_URL}/api/admin/users/${encodeURIComponent(testUserId)}/marry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId: legendaryMarriedCharId }),
      });

      // Assegura que o personagem alvo está em LENDÁRIO antes das sugestões
      await fetch(`${BASE_URL}/api/admin/characters/${encodeURIComponent(legendaryMarriedCharId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseRarity: 'LEGENDARY' }),
      });
    }
  });

  afterAll(async () => {
    for (const id of createdSuggestionIds) {
      if (!adminToken) break;
      await fetch(`${BASE_URL}/api/admin/suggestions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  });

  it('personagem de teste deve estar casado e já ser LENDÁRIO', async () => {
    if (!legendaryMarriedCharId) return;
    const res = await fetch(`${BASE_URL}/characters/${encodeURIComponent(legendaryMarriedCharId)}`);
    const json = await res.json();
    expect(json.data.baseRarity).toBe('LEGENDARY');
    expect(json.data.wasEverMarried).toBe(true);
  });

  it('POST suggestions EDIT com raridade LENDÁRIO (sem foto e sem frase) DEVE ser aceito', async () => {
    if (!legendaryMarriedCharId) return;

    const res = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testUserToken,
        type: 'EDIT',
        characterId: legendaryMarriedCharId,
        suggestedRarity: 'LEGENDARY',
        suggestedDescription: 'Biografia corrigida por sugestão de um personagem que já é lendário.',
        reason: 'Correção de biografia de um personagem que já é Lendário no catálogo.',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.suggestion.type).toBe('EDIT');
    createdSuggestionIds.push(json.data.suggestion.id);
  });

  it('POST suggestions EDIT cujo motivo cita LENDÁRIO DEVE ser aceito (não é upgrade)', async () => {
    if (!legendaryMarriedCharId) return;

    const res = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testUserToken,
        type: 'EDIT',
        characterId: legendaryMarriedCharId,
        suggestedSeries: 'Série Corrigida Teste',
        reason: 'O personagem já é lendário, apenas a série está cadastrada errada.',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.suggestion.type).toBe('EDIT');
    createdSuggestionIds.push(json.data.suggestion.id);
  });

  it('POST approve de EDIT LENDÁRIO em personagem já LENDÁRIO DEVE ser aceito', async () => {
    if (!adminToken || createdSuggestionIds.length === 0) return;

    const res = await fetch(`${BASE_URL}/api/admin/suggestions/${createdSuggestionIds[0]}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const charRes = await fetch(`${BASE_URL}/characters/${encodeURIComponent(legendaryMarriedCharId)}`);
    const charJson = await charRes.json();
    expect(charJson.data.baseRarity).toBe('LEGENDARY');
    expect(charJson.data.description).toContain('Biografia corrigida');
  });

  it('POST approve com overrideRarity LENDÁRIO em personagem já LENDÁRIO DEVE ser aceito', async () => {
    if (!adminToken || createdSuggestionIds.length < 2) return;

    const res = await fetch(`${BASE_URL}/api/admin/suggestions/${createdSuggestionIds[1]}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ overrideRarity: 'LEGENDARY' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
