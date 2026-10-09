/**
 * Browser-side photo re-encoding and sanitization.
 * Enforces max dimensions and compresses photos into clean JPEG before uploading to R2.
 */

export interface OptimizePhotoOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function optimizePhotoForUpload(
  file: File,
  options: OptimizePhotoOptions = {}
): Promise<File> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 0.85 } = options;

  // PDFs are returned as-is
  if (file.type === 'application/pdf') {
    return file;
  }

  // Only re-encode images
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Unsupported image format. Allowed: PDF, JPEG, PNG.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to create canvas rendering context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to re-encode image canvas to blob'));
              return;
            }

            const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
