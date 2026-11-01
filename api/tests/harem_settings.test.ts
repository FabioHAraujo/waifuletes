import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3030';
const API_KEY = process.env.API_KEY || (process.env.API_KEYS ? process.env.API_KEYS.split(',')[0].trim() : '');

describe('🏰 Harem Settings, Privacy & Pinned Photo — Waifuletes', () => {
  const testUserId = `test_harem_user_${Date.now()}`;
  let testPublicId = '';
  let testSessionToken = '';
  let testChar1Id = '';
  let testChar2Id = '';
  let createdCollectionId = '';
  let createdCollection2Id = '';

  beforeAll(async () => {
    // 1. Cria usuário de teste
    await fetch(`${BASE_URL}/user/ensure`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        groupId: 'test_group_harem',
        name: 'Jogador Harem Teste',
      }),
    });

    // 2. Busca 2 personagens solteiros para casar
    const charsRes = await fetch(`${BASE_URL}/characters?limit=2&maritalStatus=single&rarity=COMMON`);
    const charsJson = await charsRes.json();
    if (charsJson.data?.data?.[0]) testChar1Id = charsJson.data.data[0].id;
    if (charsJson.data?.data?.[1]) testChar2Id = charsJson.data.data[1].id;

    if (testChar1Id) {
      await fetch(`${BASE_URL}/marry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          characterId: testChar1Id,
          groupId: 'test_group_harem',
        }),
      });
    }

    if (testChar2Id) {
      await fetch(`${BASE_URL}/marry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          characterId: testChar2Id,
          groupId: 'test_group_harem',
        }),
      });
    }

    // 3. Cria token de sessão web
    const sessionRes = await fetch(`${BASE_URL}/user/${testUserId}/web-session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const sessionJson = await sessionRes.json();
    testPublicId = sessionJson.data.publicId;
    testSessionToken = sessionJson.data.token;
  });

  it('1. Deve criar coleções e listar na ordem correta de position', async () => {
    // Cria Coleção A
    const resA = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        name: `Coleção A ${Date.now()}`,
      }),
    });
    const jsonA = await resA.json();
    expect(jsonA.success).toBe(true);
    createdCollectionId = jsonA.data.id;

    // Cria Coleção B
    const resB = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        name: `Coleção B ${Date.now()}`,
      }),
    });
    const jsonB = await resB.json();
    expect(jsonB.success).toBe(true);
    createdCollection2Id = jsonB.data.id;

    expect(createdCollectionId).toBeTruthy();
    expect(createdCollection2Id).toBeTruthy();
  });

  it('2. Deve reordenar coleções via PUT /collections/order', async () => {
    // Inverte a ordem das coleções
    const orderRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/collections/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        order: [createdCollection2Id, createdCollectionId],
      }),
    });
    const orderJson = await orderRes.json();
    expect(orderJson.success).toBe(true);

    const cols = orderJson.data.collections;
    expect(cols[0].id).toBe(createdCollection2Id);
    expect(cols[1].id).toBe(createdCollectionId);
  });

  it('3. Deve alternar privacidade de uma coleção e ocultar no público', async () => {
    // Vincula testChar1Id à Coleção A
    if (testChar1Id && createdCollectionId) {
      await fetch(`${BASE_URL}/api/web/user/${testPublicId}/collections/${createdCollectionId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testSessionToken,
          characterId: testChar1Id,
        }),
      });
    }

    // Torna Coleção A privada
    const privRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/collections/${createdCollectionId}/privacy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        isPrivate: true,
      }),
    });
    const privJson = await privRes.json();
    expect(privJson.success).toBe(true);
    expect(privJson.data.isPrivate).toBe(true);

    // Consulta visão pública: Coleção A não deve aparecer e testChar1Id não deve estar na lista pública
    const publicRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}`);
    const publicJson = await publicRes.json();
    expect(publicJson.success).toBe(true);
    expect(publicJson.data.isPrivate).toBe(false);

    const pubCols = publicJson.data.collections || [];
    expect(pubCols.some((c: any) => c.id === createdCollectionId)).toBe(false);

    const pubHarem = publicJson.data.harem || [];
    expect(pubHarem.some((item: any) => item.character.id === testChar1Id)).toBe(false);
  });

  it('4. Deve alternar privacidade do Harém do usuário e bloquear visão pública', async () => {
    // Torna Harém Privado
    const setPrivRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/harem-privacy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        isPrivate: true,
      }),
    });
    const setPrivJson = await setPrivRes.json();
    expect(setPrivJson.success).toBe(true);
    expect(setPrivJson.data.haremPrivate).toBe(true);

    // Consulta visão pública: deve retornar isPrivate: true e mensagem
    const publicRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}`);
    const publicJson = await publicRes.json();
    expect(publicJson.success).toBe(true);
    expect(publicJson.data.isPrivate).toBe(true);
    expect(publicJson.data.harem).toBeUndefined();
    expect(publicJson.data.message).toContain('decidiu privar seu harém');

    // Restaura para público
    await fetch(`${BASE_URL}/api/web/user/${testPublicId}/harem-privacy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testSessionToken,
        isPrivate: false,
      }),
    });
  });

  it('5. Deve buscar opções de fotos e fixar foto de catálogo', async () => {
    if (!testChar2Id) return;

    // Busca opções de foto
    const photosRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/harem/${testChar2Id}/photos?token=${testSessionToken}`);
    const photosJson = await photosRes.json();
    expect(photosJson.success).toBe(true);
    expect(photosJson.data.characterId).toBe(testChar2Id);
    expect(Array.isArray(photosJson.data.photos)).toBe(true);
    expect(photosJson.data.marriage).toBeDefined();

    // Se tiver foto no catálogo, fixa a primeira foto
    if (photosJson.data.photos.length > 0) {
      const chosenPhoto = photosJson.data.photos[0].id;

      const setPhotoRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/harem/${testChar2Id}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testSessionToken,
          photo: chosenPhoto,
        }),
      });
      const setPhotoJson = await setPhotoRes.json();
      expect(setPhotoJson.success).toBe(true);
      expect(setPhotoJson.data.pinnedPhoto).toBe(chosenPhoto);

      // Restaura para aleatório com null
      const resetRes = await fetch(`${BASE_URL}/api/web/user/${testPublicId}/harem/${testChar2Id}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testSessionToken,
          photo: null,
        }),
      });
      const resetJson = await resetRes.json();
      expect(resetJson.success).toBe(true);
      expect(resetJson.data.pinnedPhoto).toBeNull();
    }
  });
});
