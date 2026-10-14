import { describe, it, expect } from 'vitest';
import { compressImage, MAX_IMAGE_BYTES } from '../../src/lib/imageCompression';

describe('Frontend Image Compression Utility', () => {
  it('exports MAX_IMAGE_BYTES as 1.5 MB', () => {
    expect(MAX_IMAGE_BYTES).toBe(1.5 * 1024 * 1024);
  });

  it('leaves files under 1.5 MB untouched', async () => {
    const smallBlob = new Blob([new Uint8Array(100 * 1024)], { type: 'image/jpeg' });
    const smallFile = new File([smallBlob], 'photo.jpg', { type: 'image/jpeg' });

    const result = await compressImage(smallFile);
    expect(result.size).toBe(smallFile.size);
    expect(result.name).toBe('photo.jpg');
  });

  it('leaves non-image files under 1.5 MB untouched', async () => {
    const pdfBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], 'document.pdf', { type: 'application/pdf' });

    const result = await compressImage(pdfFile);
    expect(result.size).toBe(pdfFile.size);
    expect(result.name).toBe('document.pdf');
  });
});
