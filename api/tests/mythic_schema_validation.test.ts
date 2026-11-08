import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

describe('🔮 Validação de Schema Fastify — DELETE Míticos', () => {
  it('DELETE /api/web/user/:publicId/mythics/:characterId sem body não deve lançar erro de validação (body must be object)', async () => {
    const app = Fastify();

    // Rota com a correção aplicada (sem body no schema)
    app.delete('/api/web/user/:publicId/mythics/:characterId', {
      schema: {
        params: {
          type: 'object',
          required: ['publicId', 'characterId'],
          properties: {
            publicId: { type: 'string' },
            characterId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
      handler: async (request, reply) => {
        const { token } = (request.query as any) || {};
        if (!token) return reply.status(401).send({ success: false });
        return reply.send({ success: true, deleted: true });
      },
    });

    // Simula requisição DELETE exatamente como o navegador faz (apenas querystring, sem body)
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/web/user/user_123/mythics/myt_456?token=my_secret_token',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(true);
  });

  it('Verifica que se body estivesse no schema, Fastify rejeitaria com VALIDATION_ERROR "body must be object"', async () => {
    const buggedApp = Fastify();

    // Rota com o bug original
    buggedApp.delete('/api/web/user/:publicId/mythics/:characterId', {
      schema: {
        params: {
          type: 'object',
          required: ['publicId', 'characterId'],
          properties: {
            publicId: { type: 'string' },
            characterId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
      handler: async () => ({ success: true }),
    });

    const response = await buggedApp.inject({
      method: 'DELETE',
      url: '/api/web/user/user_123/mythics/myt_456?token=my_secret_token',
    });

    // Demonstra que o bug causava 400 "body must be object"
    expect(response.statusCode).toBe(400);
    const json = response.json();
    expect(json.message).toContain('body must be object');
  });
});
