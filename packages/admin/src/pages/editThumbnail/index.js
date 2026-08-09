import React, { useEffect, useState } from 'react';
import { Button, Dimmer, Image, Loader, Message } from 'semantic-ui-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getImages, requestThumbnailUploadUrl } from '../../services/api.js';
import { uploadToS3 } from '../../services/s3.js';
import { cropImageToBlob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../common/cropImage.js';
import { ThumbnailCropper } from '../../common/thumbnailCropper.js';
import imageCompression from 'browser-image-compression';

export const EditThumbnailPage = () => {
  const { slug, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(location.state?.entry ?? null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Stable for this page visit. Used to bypass any stale browser-cached copy of
  // this entry's images - if this entry's full image or thumbnail was ever loaded
  // elsewhere on the page (e.g. plain <img>, or from the dashboard moments ago),
  // reusing that exact URL could either taint our crossOrigin canvas read or just
  // show outdated pixels, since thumbnails are overwritten in place at the same
  // S3 key rather than getting a new URL each edit.
  const [cacheBust] = useState(() => Date.now());
  const imageSrc = entry ? `${entry.url}?cb=${cacheBust}` : null;
  const thumbnailPreviewSrc = entry ? `${entry.thumbnailUrl}?cb=${cacheBust}` : null;

  useEffect(() => {
    // Deep-links/refreshes arrive without location.state - resolve the entry
    if (!entry) {
      getImages(slug).then((entries) => {
        const match = entries.find((e) => e.id === id);
        if (match) setEntry(match);
      });
    }
  }, [slug, id, entry]);

  const handleSave = async () => {
    if (!entry || !croppedAreaPixels) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const thumbnailUploadUrl = await requestThumbnailUploadUrl(entry.id);
      const croppedBlob = await cropImageToBlob(imageSrc, croppedAreaPixels, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      const compressedThumbnail = await imageCompression(croppedBlob, {
        maxSizeMB: 1,
        maxWidthOrHeight: THUMBNAIL_WIDTH,
        useWebWorker: true,
      });
      await uploadToS3(thumbnailUploadUrl, compressedThumbnail);

      alert('Thumbnail updated successfully!');
      navigate(`/category/${slug}`);
    } catch (error) {
      console.error('Error saving thumbnail:', error);
      setErrorMessage('Failed to save the new thumbnail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: '50px' }}>
      <Dimmer active={loading} page>
        <Loader>Loading</Loader>
      </Dimmer>

      <h2 style={{ textAlign: 'center' }}>Edit Thumbnail</h2>
      <p style={{ textAlign: 'center' }}>{entry ? entry.name : 'Loading entry...'}</p>

      {entry && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px' }}>Current Thumbnail</p>
          <Image
            src={thumbnailPreviewSrc}
            size="medium"
            centered
            style={{ cursor: 'pointer', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
            onClick={() => window.open(entry.url, '_blank')}
          />
        </div>
      )}

      {entry && imageSrc && (
        <ThumbnailCropper
          imageSrc={imageSrc}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
        />
      )}

      <div style={{ marginTop: '20px' }}>
        <Button
          color="green"
          onClick={handleSave}
          disabled={!entry || !croppedAreaPixels || loading}
        >
          Save Thumbnail
        </Button>
        <Button
          color="grey"
          onClick={() => navigate(`/category/${slug}`)}
          style={{ marginLeft: '10px' }}
        >
          Cancel
        </Button>
      </div>

      {errorMessage && (
        <Message negative>
          <p>{errorMessage}</p>
        </Message>
      )}
    </div>
  );
};
