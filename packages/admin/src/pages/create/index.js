import React, { useState } from 'react';
import { Form, Button, Image, Segment, Header, Icon, Dimmer, Loader } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../../services/api.js';

export const CreateEntryPage = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [dateCreated, setDateCreated] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (image && name && dateCreated) {
      setLoading(true);

      // Convert image to base64 string
      const imageBase64 = await toBase64(image);

      const body = {
        name,
        dateCreated,
        image: imageBase64 // Add base64 image data to the JSON object
      };

      try {
        const response = await uploadImage(body);  // Send the JSON object to your API
        const result = await response.json();
        if (response.ok) {
          console.log('Upload success:', result);
          alert('Upload successful!');
          navigate('/');
        } else {
          console.error('Upload failed:', result);
          alert(`Upload failed: ${result.message}`);
        }
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
        <Form.Field>
          <label>Date Created</label>
          <input
            type="date"
            value={dateCreated}
            onChange={(e) => setDateCreated(e.target.value)}
          />
        </Form.Field>
        <Button 
          type="submit" 
          primary 
          color="green"
          disabled={!image || !name || !dateCreated}
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
      </Form>
    </div>
  );
};
