export const THUMBNAIL_WIDTH = 1024;
export const THUMBNAIL_HEIGHT = 768;

// Draws the selected crop region (in source-image pixel coordinates, as returned by
// react-easy-crop's onCropComplete) onto an offscreen canvas at the target thumbnail
// size, and resolves a JPEG Blob. crossOrigin is set unconditionally - it's a no-op
// for local blob: URLs (create flow) and required for cross-origin CloudFront URLs
// (edit flow, re-cropping an existing entry's full image).
export const cropImageToBlob = (imageSrc, croppedAreaPixels, width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT) => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        width,
        height
      );
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail image'));
          }
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });
};
