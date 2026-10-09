import { describe, it, expect, vi } from 'vitest';
import { optimizePhotoForUpload } from '../../src/lib/image-optimizer';

describe('Browser Photo Re-encoding & Sanitizer', () => {
  it('passes PDF files through without modification', async () => {
    const pdf = new File(['%PDF-1.4 test'], 'report.pdf', { type: 'application/pdf' });
    const result = await optimizePhotoForUpload(pdf);
    expect(result).toBe(pdf);
    expect(result.type).toBe('application/pdf');
    expect(result.name).toBe('report.pdf');
  });

  it('rejects unsupported file formats', async () => {
    const textFile = new File(['hello'], 'note.txt', { type: 'text/plain' });
    await expect(optimizePhotoForUpload(textFile)).rejects.toThrow(/Unsupported image format/);
  });

  it('re-encodes image files to JPEG with downscaled dimensions', async () => {
    // Mock HTMLImageElement, FileReader, and Canvas in jsdom
    const originalFile = new File(['fake image bytes'], 'scan_photo.png', { type: 'image/png' });

    // Mock FileReader
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => {
          this.result = 'data:image/png;base64,mock';
          this.onload?.();
        }, 10);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // Mock Image
    class MockImage {
      width = 4000;
      height = 3000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          this.onload?.();
        }, 10);
      }
    }
    vi.stubGlobal('Image', MockImage);

    // Mock Canvas & Context
    const mockCtx = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        const blob = new Blob(['mock-reencoded-jpeg'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
      return document.createElement(tagName);
    });

    const result = await optimizePhotoForUpload(originalFile, { maxWidth: 2048, maxHeight: 2048 });

    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('scan_photo.jpg');
    // Original width 4000, scaled down: 4000 * (2048/4000) = 2048, height 3000 * (2048/4000) = 1536
    expect(mockCanvas.width).toBe(2048);
    expect(mockCanvas.height).toBe(1536);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });
});
