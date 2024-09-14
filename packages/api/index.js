const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const TABLE_NAME = process.env.TABLE_NAME ?? '';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL ?? '';

const addCorsHeaders = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',  // Allow any origin
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (BUCKET_NAME === '' || TABLE_NAME === '' || CLOUDFRONT_URL === '') {
    return addCorsHeaders({ error: 'environment variables are required' }, 500);
  }

  console.log(event);

  const method = event.httpMethod;
  const path = event.path;
  console.log(`Handling ${method} request for path: ${path}`);
  let result = null;
  try {
    if (method === 'GET' && path === '/entries') {
      result = await handleGet();
    } else if (method === 'PUT' && path === '/entries') {
      result = await handlePut(event);
    } else if (method === 'POST' && path.startsWith('/entries')) {
      result = await handlePost(event);
    } else if (method === 'DELETE' && path.startsWith('/entries')) {
      result = await handleDelete(event);
    } else if (method === 'POST' && path === '/publish') {
      result = await handlePublish();
    } else {
      throw new Error('Invalid request method or path');
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return addCorsHeaders({ error: error.message }, 500);
  }
  return addCorsHeaders(result);
};

// Handle GET: return all entries from DynamoDB
const handleGet = async () => {
  const params = {
    TableName: TABLE_NAME
  };

  const data = await dynamoDb.scan(params).promise();
  return { entries: data.Items };
};


const handlePut = async (event) => {
  const formData = JSON.parse(event.body);
  const { name, mimeType } = formData;

  // Parameter validation
  if (!name || !mimeType) {
    return { error: 'Name and MIME type are required' };
  }

  // Validate the MIME type (either image/jpeg or image/png)
  if (!['image/jpeg', 'image/png'].includes(mimeType)) {
    return { error: 'Invalid MIME type. Only image/jpeg and image/png are allowed.' };
  }

  const id = uuid();
  const baseImageKey = `${name}-${id}`;
  const thumbnailKey = `${name}-${id}-thumbnail`;

  // Generate pre-signed URLs for image and thumbnail uploads with the provided MIME type
  const imageUrl = s3.getSignedUrl('putObject', {
    Bucket: BUCKET_NAME,
    Key: baseImageKey,
    Expires: 60 * 5,  // URL valid for 5 minutes
    ContentType: mimeType,  // Set the MIME type dynamically based on the request
  });

  const thumbnailUrl = s3.getSignedUrl('putObject', {
    Bucket: BUCKET_NAME,
    Key: thumbnailKey,
    Expires: 60 * 5,  // URL valid for 5 minutes
    ContentType: mimeType,  // Set the MIME type dynamically based on the request
  });

  // Get the current entries to determine the largest order
  const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
  const maxOrder = existingEntries.Items?.reduce((max, entry) => (entry.order > max ? entry.order : max), 0) ?? 0;

  // Create new entry object
  const newEntry = {
    id,
    name,
    url: `${CLOUDFRONT_URL}/${baseImageKey}`,  // CloudFront URL for the original image
    thumbnailUrl: `${CLOUDFRONT_URL}/${thumbnailKey}`,  // CloudFront URL for the thumbnail
    order: maxOrder + 1,
  };

  // Save new entry to DynamoDB
  const params = {
    TableName: TABLE_NAME,
    Item: newEntry,
  };

  await dynamoDb.put(params).promise();

  // Return the signed URLs for the client to upload the images
  return {
    message: 'Entry created successfully. Please upload the images using the provided URLs.',
    entry: newEntry,
    signedUrls: {
      imageUrl,
      thumbnailUrl,
    },
  };
};


// Handle DELETE: Delete entry and image from S3
const handleDelete = async (event) => {
  const { id } = JSON.parse(event.body);

  // Parameter validation
  if (!id) {
    return { error: 'ID is required to delete an entry' };
  }

  // Get the entry from DynamoDB
  const getParams = {
    TableName: TABLE_NAME,
    Key: { id }
  };
  const entry = await dynamoDb.get(getParams).promise();

  if (!entry.Item) {
    return { message: 'Entry not found' };
  }

  // Delete the image and thumbnail from S3 (with error handling)
  const imageKey = entry.Item.url.split('/').pop();
  const thumbnailKey = entry.Item.thumbnailUrl.split('/').pop();

  try {
    // Attempt to delete the main image
    await s3.deleteObject({ Bucket: BUCKET_NAME, Key: imageKey }).promise();
  } catch (error) {
    console.error(`Error deleting image from S3: ${imageKey}`, error);
    // Proceed even if image deletion fails
  }

  try {
    // Attempt to delete the thumbnail image
    await s3.deleteObject({ Bucket: BUCKET_NAME, Key: thumbnailKey }).promise();
  } catch (error) {
    console.error(`Error deleting thumbnail from S3: ${thumbnailKey}`, error);
    // Proceed even if thumbnail deletion fails
  }

  // Delete the entry from DynamoDB
  await dynamoDb.delete(getParams).promise();

  // Update the orders of the remaining entries
  const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
  const updatedEntries = existingEntries.Items?.filter(item => item.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1
    })) ?? [];

  for (let entry of updatedEntries) {
    await dynamoDb.put({ TableName: TABLE_NAME, Item: entry }).promise();
  }

  return { message: 'Entry deleted successfully and orders updated' };
};


// Handle POST: Update existing entry in DynamoDB
const handlePost = async (event) => {
  const { id, name, order } = JSON.parse(event.body);

  // Parameter validation
  if (!id) {
    return { error: 'ID is required to update an entry' };
  }

  // Get the current entry
  const getParams = {
    TableName: TABLE_NAME,
    Key: { id }
  };
  const currentEntry = await dynamoDb.get(getParams).promise();

  if (!currentEntry.Item) {
    return { message: 'Entry not found' };
  }

  const updatedEntry = {
    ...currentEntry.Item,
    name: name || currentEntry.Item.name,
    order: order || currentEntry.Item.order
  };

  if (order && order !== currentEntry.Item.order) {
    const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
    const entryWithDesiredOrder = existingEntries.Items?.find(item => item.order === order);

    if (entryWithDesiredOrder) {
      const swappedEntry = { ...entryWithDesiredOrder, order: currentEntry.Item.order };
      await dynamoDb.put({ TableName: TABLE_NAME, Item: swappedEntry }).promise();
    }
  }

  const updateParams = {
    TableName: TABLE_NAME,
    Item: updatedEntry
  };

  await dynamoDb.put(updateParams).promise();

  return { message: 'Entry updated successfully', entry: updatedEntry };
};

// Handle publish: Retrieve entries, minify, and save to S3 as data.json
const handlePublish = async () => {
  try {
    // Step 1: Fetch all entries from DynamoDB
    const params = {
      TableName: TABLE_NAME
    };

    const data = await dynamoDb.scan(params).promise();
    const entries = data.Items ?? [];

    const minifiedEntries = entries.map(entry => ({
      n: entry.name,              
      i: entry.url.replace(CLOUDFRONT_URL + '/', ''),  
      o: entry.order              
    }));

    const jsonData = JSON.stringify(minifiedEntries);

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: 'data.json',            
      Body: jsonData,              
      ContentType: 'application/json' 
    };

    await s3.putObject(s3Params).promise();

    return { message: 'Data published successfully', itemCount: minifiedEntries.length };
  } catch (error) {
    console.error('Error publishing data:', error);
    return { error: 'Error publishing data' };
  }
};
