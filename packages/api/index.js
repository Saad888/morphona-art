const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');
console.log("DsFSADSA")
const Jimp = require('jimp');
console.log("AFTER JOMP")

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

// Handle PUT: Create a new entry with image upload to S3
const handlePut = async (event) => {
  console.log("Starting PUT")
  const formData = JSON.parse(event.body);
  const { name, dateCreated, image } = formData;

  // Parameter validation
  console.log("Validating parameters")
  if (!name || !dateCreated) {
    return { error: 'Name and dateCreated are required' };
  }
  if (!image) {
    return { error: 'Image is required for creating an entry' };
  }

  console.log("Creating new entry")
  const id = uuid();
  const baseImageKey = `${name}-${id}`;
  const thumbnailKey = `${name}-${id}-thumbnail`;

  const buffer = Buffer.from(image, 'base64');

  console.log("Uploading image to S3")
  // Upload base image to S3
  await s3.putObject({
    Bucket: BUCKET_NAME,
    Key: baseImageKey,
    Body: buffer,
    ContentType: 'image/jpeg' // or appropriate content type
  }).promise();

  console.log("Resizing image for thumbnail")
  // Resize image for thumbnail using Jimp (max size: 1024x1024, maintaining aspect ratio)
  try {

    const img = await Jimp.read(buffer);
    img.scaleToFit(1024, 1024);
    const resizedImage = await img.getBufferAsync(Jimp.MIME_JPEG);
    console.log("Uploading thumbnail to S3")
    // Upload thumbnail to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: thumbnailKey,
      Body: resizedImage,
      ContentType: 'image/jpeg' // or appropriate content type
    }).promise();

  } catch (error) {
    console.log("Error resizing image", error)
    return { error: 'Error resizing image' };
  }


  console.log("Getting existing entries")
  // Get the current entries to determine the largest order
  const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
  const maxOrder = existingEntries.Items?.reduce((max, entry) => entry.order > max ? entry.order : max, 0) ?? 0;

  console.log("Creating new entry object")
  const newEntry = {
    id,
    name,
    url: `${CLOUDFRONT_URL}/${baseImageKey}`,  // CloudFront URL for the original image
    thumbnailUrl: `${CLOUDFRONT_URL}/${thumbnailKey}`,  // CloudFront URL for the thumbnail
    dateCreated,
    order: maxOrder + 1
  };

  console.log("Saving new entry to DynamoDB")
  // Save new entry to DynamoDB
  const params = {
    TableName: TABLE_NAME,
    Item: newEntry
  };

  await dynamoDb.put(params).promise();

  return { message: 'Entry created successfully', entry: newEntry };
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

  // Delete the image from S3
  const imageKey = entry.Item.url.split('/').pop();
  await s3.deleteObject({ Bucket: BUCKET_NAME, Key: imageKey }).promise();

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
  const { id, name, dateCreated, order } = JSON.parse(event.body);

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
    dateCreated: dateCreated || currentEntry.Item.dateCreated,
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

// Handle publish (stubbed)
const handlePublish = async () => {
  return { message: 'POST request for /publish' };
};
