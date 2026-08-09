export const uploadToS3 = async (url, file) => {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to upload to S3');
  }
};
