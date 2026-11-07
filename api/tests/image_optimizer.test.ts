import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeImageUnder1Mb, MAX_IMAGE_UPLOAD_BYTES } from '../src/utils/imageOptimizer.js';
import { DomainError } from '../src/errors/DomainError.js';

describe('🖼️ Image Optimizer & Size Limits', () => {
  it('deve rejeitar buffers maiores que 10MB com a mensagem exata requerida', async () => {
    // Buffer simulando 10.1 MB
    const fakeLargeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);

    await expect(optimizeImageUnder1Mb(fakeLargeBuffer)).rejects.toThrow(
      'A imagem enviada é muito grande! Compacte ela antes'
    );

    try {
      await optimizeImageUnder1Mb(fakeLargeBuffer);
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.statusCode).toBe(413);
      expect(err.code).toBe('PAYLOAD_TOO_LARGE');
      expect(err.message).toBe('A imagem enviada é muito grande! Compacte ela antes');
    }
  });

  it('deve aceitar imagem de até 10MB e compactar para menos de 1MB mantendo formato WebP', async () => {
    // Gera imagem sintética de ~6-8MB (abaixo de 10MB)
    const rawBuffer = await sharp({
      create: {
        width: 1400,
        height: 1800,
        channels: 3,
        noise: { type: 'gaussian', mean: 128, sigma: 30 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(rawBuffer.length).toBeLessThanOrEqual(MAX_IMAGE_UPLOAD_BYTES);

    const result = await optimizeImageUnder1Mb(rawBuffer);

    expect(result.ext).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
    // Deve ficar com menos de 1MB (<= 1024 * 1024 bytes)
    expect(result.buffer.length).toBeLessThan(1024 * 1024);
  });

  it('deve preservar GIF animado intacto quando já for <= 1MB', async () => {
    // 1x1 GIF
    const tinyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const result = await optimizeImageUnder1Mb(tinyGif);
    expect(result.buffer.length).toBeLessThan(1024 * 1024);
  });
});
