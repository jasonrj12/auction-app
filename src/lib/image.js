/**
 * Crop an image File to a square, resize to 320px, and compress to JPEG.
 * Provides crisp display on cards and avatars while staying well under Firestore's document limit (~25-40 KB).
 */
export function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected.'));
    }

    const isImageMime = file.type && file.type.startsWith('image/');
    const isImageExt = file.name && /\.(jpe?g|png|webp|gif|bmp|svg|jfif)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      return reject(new Error('Selected file must be an image (JPEG, PNG, WEBP).'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        const targetSize = 320;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.70);
        if (dataUrl.length > 130000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.50);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to process image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image from device.'));
    reader.readAsDataURL(file);
  });
}
