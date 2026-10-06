/**
 * Helper de compression et redimensionnement d'image côté client
 * Garantit des images légères, nettes et parfaitement compatibles avec IndexedDB & MySQL
 * Préserve la transparence des logos PNG / WebP / SVG
 */
export async function resizeImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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
          resolve(e.target?.result as string);
          return;
        }

        const isPng = file.type === 'image/png' || file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.png');
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const outputFormat = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputFormat, isPng ? undefined : quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
