/**
 * Browser-side image compression utility.
 * Ensures uploaded photos and reports stay strictly under 1.5 MB to respect Cloudflare free plan limits.
 */

export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

export interface CompressionOptions {
  maxSizeBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  initialQuality?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const maxSizeBytes = options.maxSizeBytes ?? MAX_IMAGE_BYTES;
  const maxWidth = options.maxWidth ?? 1920;
  const maxHeight = options.maxHeight ?? 1920;
  let quality = options.initialQuality ?? 0.85;

  // Non-image files or already small files without DOM
  if (file.size <= maxSizeBytes && !file.type.startsWith('image/')) {
    return file;
  }

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return file;
  }

  // If already under size, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);

      function attemptCompression(q: number) {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }

            if (blob.size <= maxSizeBytes || q <= 0.3) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              return resolve(compressedFile);
            }

            quality = Math.max(0.3, q - 0.15);
            attemptCompression(quality);
          },
          'image/jpeg',
          q
        );
      }

      attemptCompression(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}
