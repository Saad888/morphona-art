import React from 'react';
import Cropper from 'react-easy-crop';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from './cropImage.js';

export const THUMBNAIL_ASPECT_RATIO = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;

export const ThumbnailCropper = ({ imageSrc, crop, zoom, onCropChange, onZoomChange, onCropComplete }) => {
  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: '#000' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={THUMBNAIL_ASPECT_RATIO}
          mediaProps={{ crossOrigin: 'anonymous' }}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <label htmlFor="thumbnail-zoom">Zoom</label>
        <input
          id="thumbnail-zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  );
};
