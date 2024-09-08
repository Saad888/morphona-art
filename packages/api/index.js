const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const TABLE_NAME = process.env.TABLE_NAME ?? '';

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
  if (BUCKET_NAME === '' || TABLE_NAME === '') {
    return addCorsHeaders({ error: 'BUCKET_NAME and TABLE_NAME environment variables are required' }, 500);
  }

  console.log(event);

  const method = event.httpMethod; 
  const path = event.path; 
  console.log(`Handling ${method} request for path: ${path}`);

  if (method === 'GET' && path === '/entries') {
    return addCorsHeaders(await handleGet());
  } else if (method === 'PUT' && path === '/entries') {
    return addCorsHeaders(await handlePut(event));
  } else if (method === 'POST' && path.startsWith('/entries')) {
    return addCorsHeaders(await handlePost(event));
  } else if (method === 'DELETE' && path.startsWith('/entries')) {
    return addCorsHeaders(await handleDelete(event));
  } else if (method === 'POST' && path === '/publish') {
    return addCorsHeaders(await handlePublish());
  } else {
    return addCorsHeaders({ error: 'Invalid request method or path' }, 400);
  }
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
  const formData = JSON.parse(event.body);
  const { name, dateCreated, image } = formData;

  // Parameter validation
  if (!name || !dateCreated) {
    return { error: 'Name and dateCreated are required' };
  }
  if (!image) {
    return { error: 'Image is required for creating an entry' };
  }

  const id = uuid();
  const imageKey = `${name}-${id}`;

  // Upload image to S3
  await s3.putObject({
    Bucket: BUCKET_NAME,
    Key: imageKey,
    Body: Buffer.from(image, 'base64'),
    ContentType: 'image/jpeg' // or appropriate content type
  }).promise();

  // Get the current entries to determine the largest order
  const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
  const maxOrder = existingEntries.Items?.reduce((max, entry) => entry.order > max ? entry.order : max, 0) ?? -1;

  const newEntry = {
    id,
    name,
    url: `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`,
    dateCreated,
    order: maxOrder + 1
  };

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

  // If the order is changing, update all orders
  if (order && order !== currentEntry.Item.order) {
    const existingEntries = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
    
    const updatedEntries = existingEntries.Items?.filter(item => item.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({
        ...item,
        order: index + (index + 1 === order ? 2 : 1)
      })) ?? [];

    for (let entry of updatedEntries) {
      await dynamoDb.put({ TableName: TABLE_NAME, Item: entry }).promise();
    }

    updatedEntry.order = order;
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
