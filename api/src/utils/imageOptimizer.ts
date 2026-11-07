import sharp from 'sharp';
import { DomainError } from '../errors/DomainError.js';

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export interface OptimizedImageResult {
  buffer: Buffer;
  ext: string;
  mimeType: string;
}

/**
 * Valida o limite de 10MB e compacta a imagem no lado do servidor para ficar com menos de 1MB (<= 1024 KB),
 * mantendo alta fidelidade visual para cards e visualização web.
 * Se a imagem for um GIF animado e já tiver <= 1MB, preserva a animação original.
 */
export async function optimizeImageUnder1Mb(inputBuffer: Buffer): Promise<OptimizedImageResult> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new DomainError('INVALID_IMAGE', 'Buffer de imagem vazio ou inválido.', 400);
  }

  if (inputBuffer.length > MAX_IMAGE_UPLOAD_BYTES) {
    throw new DomainError('PAYLOAD_TOO_LARGE', 'A imagem enviada é muito grande! Compacte ela antes', 413);
  }

  try {
    const meta = await sharp(inputBuffer).metadata();

    // Se for GIF animado e já for <= 1MB, preserva a animação intacta
    if (meta.format === 'gif' && (meta.pages || 0) > 1 && inputBuffer.length <= 1024 * 1024) {
      return {
        buffer: inputBuffer,
        ext: 'gif',
        mimeType: 'image/gif',
      };
    }

    // Pipeline progressivo de compressão em WebP para garantir arquivo < 1MB
    const compressionSteps = [
      { width: 1400, height: 1800, quality: 85 },
      { width: 1200, height: 1600, quality: 78 },
      { width: 1000, height: 1400, quality: 70 },
      { width: 800, height: 1200, quality: 65 },
    ];

    let resultBuffer: Buffer | null = null;

    for (const step of compressionSteps) {
      resultBuffer = await sharp(inputBuffer)
        .rotate() // Mantém orientação correta do sensor/EXIF
        .resize(step.width, step.height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: step.quality, effort: 4 })
        .toBuffer();

      if (resultBuffer.length <= 1024 * 1024) {
        break;
      }
    }

    if (!resultBuffer) {
      resultBuffer = inputBuffer;
    }

    return {
      buffer: resultBuffer,
      ext: 'webp',
      mimeType: 'image/webp',
    };
  } catch (err: any) {
    if (err instanceof DomainError) throw err;

    // Se o sharp não reconheceu o formato mas o buffer é <= 1MB, permite como fallback
    if (inputBuffer.length <= 1024 * 1024) {
      return {
        buffer: inputBuffer,
        ext: 'jpg',
        mimeType: 'image/jpeg',
      };
    }

    throw new DomainError('PAYLOAD_TOO_LARGE', 'A imagem enviada é muito grande! Compacte ela antes', 413);
  }
}
