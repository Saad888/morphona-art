import React, { useState } from 'react';
import { Form, Button, TextArea, Image, Segment, Header, Icon, Dimmer, Loader } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../../services/api.js';

export const CreateEntryPage = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    if (image && name) {
      setLoading(true);

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('image', image);

      try {
        const response = await uploadImage(formData);
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
          <label>Description</label>
          <TextArea
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Field>
        <Button 
          type="submit" 
          primary 
          color="green"
          disabled={!image || !name}
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
