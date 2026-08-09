import React, { useState } from 'react';
import { Form, Button, Header, Icon, Dimmer, Loader, Message, Segment } from 'semantic-ui-react';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadImage, deleteImage } from '../../services/api.js';
import { uploadToS3 } from '../../services/s3.js';
import { cropImageToBlob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from '../../common/cropImage.js';
import { ThumbnailCropper } from '../../common/thumbnailCropper.js';
import imageCompression from 'browser-image-compression';

export const CreateEntryPage = () => {
  const { slug } = useParams();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (image && name && croppedAreaPixels) {
      setLoading(true);
      let entryId = null;

      try {
        // Get the image MIME type (e.g., 'image/jpeg' or 'image/png')
        const mimeType = image.type;

        // Get signed URLs from the API with the image MIME type
        const { id, imageUrl, thumbnailUrl } = await uploadImage({ name, mimeType, categorySlug: slug });
        entryId = id;

        // Generate the thumbnail from the selected crop region, then run it through
        // the same size budget as before as a safety net
        const croppedBlob = await cropImageToBlob(preview, croppedAreaPixels, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
        const options = {
          maxSizeMB: 1, // Reduce to under 1 MB
          maxWidthOrHeight: THUMBNAIL_WIDTH,
          useWebWorker: true,
        };
        const compressedThumbnail = await imageCompression(croppedBlob, options);

        // Upload the cropped thumbnail
        await uploadToS3(thumbnailUrl, compressedThumbnail);

        // Upload the original image (never cropped)
        await uploadToS3(imageUrl, image);

        alert('Upload successful!');
        navigate(`/category/${slug}`);
      } catch (error) {
        console.error('Error during upload:', error);

        if (entryId) {
          setErrorMessage('Upload failed. Attempting to delete metadata.');
          try {
            await deleteImage(entryId);
            alert('Metadata deleted.');
          } catch (deleteError) {
            console.error('Error during metadata deletion:', deleteError);
            setErrorMessage('Failed to delete metadata.');
          }
        } else {
          setErrorMessage('Upload failed before an entry was created. Nothing to clean up.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setErrorMessage('');
  };

  const triggerFileSelect = () => {
    document.getElementById('fileInput').click();
  };

  return (
    <div>
      <Dimmer active={loading} page>
        <Loader>Loading</Loader>
      </Dimmer>

      <Form onSubmit={handleSubmit}>
        {!preview && (
          <Form.Field>
            <Segment
              placeholder
              onClick={triggerFileSelect}
              style={{ cursor: 'pointer', height: '500px' }}
            >
              <Header icon>
                <Icon name='image outline' />
                Click to upload an image
              </Header>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
              <Button primary onClick={triggerFileSelect}>Upload Image</Button>
            </Segment>
          </Form.Field>
        )}
        {preview && (
          <Form.Field>
            <label>Select the thumbnail crop</label>
            <ThumbnailCropper
              imageSrc={preview}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </Form.Field>
        )}
        <Form.Field>
          <label>Name</label>
          <input
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Field>
        <Button
          type="submit"
          primary
          color="green"
          disabled={!image || !name || !croppedAreaPixels || errorMessage}
        >
          Submit
        </Button>
        <Button
          type="button"
          onClick={() => navigate(`/category/${slug}`)}
          color="red"
          style={{ marginLeft: '10px' }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={clearImage}
          disabled={!preview}
          secondary
          style={{ marginLeft: '10px' }}
        >
          Clear Image
        </Button>

        {errorMessage && (
          <Message negative>
            <p>{errorMessage}</p>
          </Message>
        )}
      </Form>
    </div>
  );
};
