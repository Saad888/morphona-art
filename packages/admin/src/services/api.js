import { getIdToken } from "./cognito.js";

const URL = 'https://fwqzoysv30.execute-api.us-west-2.amazonaws.com/prod'

export const uploadImage = async (formData) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries`, {
      method: 'PUT',
      body: JSON.stringify(formData),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch signed URLs');
    }

    const data = await response.json();

    // Return the signed URLs for the image and thumbnail
    return {
      imageUrl: data.signedUrls.imageUrl,
      thumbnailUrl: data.signedUrls.thumbnailUrl,
    };

  } catch (error) {
    console.error('Error fetching signed URLs:', error);
    throw error;
  }
};

export const getImages = async() => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries`, {
      headers: {
        Authorization: `${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get images');
    }

    return (await response.json()).entries ?? [];
  } catch (error) {
    console.error('Error getting images:', error);
    throw error;
  }
}


// Function to update an image entry (e.g., order, name, date)
export const updateImage = async (id, updatedData) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries`, {
      method: 'POST',
      body: JSON.stringify({id, ...updatedData}),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to update image');
    }

  } catch (error) {
    console.error('Error updating image:', error);
    throw error;
  }
};

// Function to delete an image entry
export const deleteImage = async (id) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }

  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};


// Function to trigger publishing data to S3 as a minified JSON
export const publishData = async () => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to publish data');
    }

    return await response.json();  // Assuming the API returns a success message
  } catch (error) {
    console.error('Error publishing data:', error);
    throw error;
  }
};
