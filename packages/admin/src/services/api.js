import { getIdToken } from "./cognito.js";

const URL = 'https://fwqzoysv30.execute-api.us-west-2.amazonaws.com/prod'

export const uploadImage = async (formData) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries`, {
      method: 'PUT',
      body: formData,
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
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

    return await response.json();
  } catch (error) {
    console.error('Error getting images:', error);
    throw error;
  }
}