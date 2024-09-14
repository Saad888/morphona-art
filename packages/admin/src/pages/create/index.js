import React, { useState } from 'react';
import { Form, Button, Image, Segment, Header, Icon, Dimmer, Loader, Message } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { uploadImage, deleteImage } from '../../services/api.js';
import imageCompression from 'browser-image-compression';

export const CreateEntryPage = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); 
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (image && name) {
      setLoading(true);
  
      try {
        // Get the image MIME type (e.g., 'image/jpeg' or 'image/png')
        const mimeType = image.type;
  
        // Get signed URLs from the API with the image MIME type
        const { imageUrl, thumbnailUrl } = await uploadImage({ name, mimeType });
  
        // Compress the image for thumbnail
        const options = {
          maxSizeMB: 1, // Reduce to under 1 MB
          maxWidthOrHeight: 1024, // Maximum size for the thumbnail
          useWebWorker: true,
        };
        const compressedThumbnail = await imageCompression(image, options);
  
        // Upload the compressed thumbnail
        await uploadToS3(thumbnailUrl, compressedThumbnail);
  
        // Upload the original image
        await uploadToS3(imageUrl, image);
  
        alert('Upload successful!');
        navigate('/');
      } catch (error) {
        console.error('Error during upload:', error);
        setErrorMessage('Upload failed. Attempting to delete metadata.');
  
        try {
          await deleteImage({ name });
          alert('Metadata deleted.');
        } catch (deleteError) {
          console.error('Error during metadata deletion:', deleteError);
          setErrorMessage('Failed to delete metadata.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setErrorMessage('');
  };

  const triggerFileSelect = () => {
    document.getElementById('fileInput').click();
  };

  const uploadToS3 = async (url, file) => {
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type, // Make sure the file is uploaded with the correct MIME type
      },
    });
    if (!response.ok) {
      throw new Error('Failed to upload to S3');
    }
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
          <Segment textAlign="center" style={{ height: '500px' }}>
            <Image src={preview} size="large" centered style={{ height: '100%', objectFit: 'contain' }} />
          </Segment>
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
          disabled={!image || !name || errorMessage}
        >
          Submit
        </Button>
        <Button
          type="button"
          onClick={() => navigate('/')}
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
