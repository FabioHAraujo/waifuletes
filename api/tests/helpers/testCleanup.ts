/**
 * Helper utilitário para limpeza completa de dados de teste (usuários, casamentos, sugestões).
 * Garante que nenhum teste deixe resíduos no banco de dados.
 */

export async function cleanupUser(baseUrl: string, apiKey: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function forceDivorce(baseUrl: string, apiKey: string, userId: string, characterId: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/admin/harem/force-divorce`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, characterId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSuggestion(baseUrl: string, adminToken: string, suggestionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/admin/suggestions/${encodeURIComponent(suggestionId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function cleanupTestDatabase(baseUrl: string, apiKey: string): Promise<any> {
  try {
    const res = await fetch(`${baseUrl}/admin/cleanup-test-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}
