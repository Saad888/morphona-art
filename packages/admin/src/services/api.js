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

    // Return the new entry's id (needed for cleanup if the S3 upload fails) and the signed URLs
    return {
      id: data.entry.id,
      imageUrl: data.signedUrls.imageUrl,
      thumbnailUrl: data.signedUrls.thumbnailUrl,
    };

  } catch (error) {
    console.error('Error fetching signed URLs:', error);
    throw error;
  }
};

export const getImages = async(categorySlug) => {
  try {
    const idToken = await getIdToken();
    const query = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : '';

    const response = await fetch(`${URL}/entries${query}`, {
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

// Function to request a fresh signed URL for re-uploading an existing entry's thumbnail
export const requestThumbnailUploadUrl = async (id) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/entries/thumbnail-url`, {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get thumbnail upload URL');
    }

    return (await response.json()).thumbnailUploadUrl;
  } catch (error) {
    console.error('Error requesting thumbnail upload URL:', error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/categories`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get categories');
    }

    return (await response.json()).categories ?? [];
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

export const createCategory = async (name) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/categories`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create category');
    }

    return (await response.json()).category;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

// Function to update an existing category (name, slug, order)
export const updateCategory = async (id, updatedData) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/categories`, {
      method: 'POST',
      body: JSON.stringify({ id, ...updatedData }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Failed to update category');
    }

    return (await response.json()).category;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Function to delete a category. Rejects with the API's error message
// (e.g. "N entries still reference it") rather than a generic string,
// since the caller needs to surface why the deletion was blocked.
export const deleteCategory = async (id) => {
  try {
    const idToken = await getIdToken();

    const response = await fetch(`${URL}/categories`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to delete category');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
