import React, { useState } from 'react';
import { Form, Button, Image, Segment, Header, Icon, Dimmer, Loader, Message } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../../services/api.js';

export const CreateEntryPage = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');  // New state for error messages
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (9.5 MB = 9.5 * 1024 * 1024 bytes)
      const maxSizeInBytes = 8.5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        setErrorMessage('Image size exceeds 8.5 MB. Please choose a smaller image.');
        setImage(null);
        setPreview(null);
      } else {
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setErrorMessage(''); // Clear error message if image is valid
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (image && name) {
      setLoading(true);

      // Convert image to base64 string
      const imageBase64 = await toBase64(image);

      const body = {
        name,
        image: imageBase64 // Add base64 image data to the JSON object
      };

      try {
        await uploadImage(body);  // Send the JSON object to your API
        alert('Upload successful!');
        navigate('/');
      } catch (error) {
        console.error('Error during upload:', error);
        alert(`Upload failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setErrorMessage(''); // Clear any error message
  };

  const triggerFileSelect = () => {
    document.getElementById('fileInput').click();
  };

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Get base64 data without metadata prefix
      reader.onerror = (error) => reject(error);
    });
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
          disabled={!image || !name || errorMessage} // Disable if image is too large or fields are incomplete
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
