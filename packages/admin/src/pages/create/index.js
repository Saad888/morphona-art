import React, { useState } from 'react';
import { Form, Button, TextArea, Image, Segment, Header, Icon, Dimmer, Loader } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (image && name) {
      setLoading(true);
      setTimeout(() => {
        // handleUpload({ image, name, description });
        setLoading(false);
      }, 2000);
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
