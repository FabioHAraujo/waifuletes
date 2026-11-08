import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3030';
const API_KEY = process.env.API_KEY || (process.env.API_KEYS ? process.env.API_KEYS.split(',')[0].trim() : '');

export default async function globalTeardown() {
  if (!API_KEY) return;
  try {
    const res = await fetch(`${BASE_URL}/admin/cleanup-test-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data?.deletedUsers > 0 || json.data?.freedMarriages > 0 || json.data?.deletedSuggestions > 0) {
        console.log('🧹 [Global Teardown] Limpeza de resíduos de teste concluída:', json.data);
      }
    }
  } catch {
    // API não estava acessível ou eram apenas testes unitários em memória
  }
}
