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
  } else if (method === 'POST' && path.startsWith('/entries/')) {
    const id = path.split('/').pop(); 
    return addCorsHeaders(await handlePost(event, id));
  } else if (method === 'DELETE' && path.startsWith('/entries/')) {
    const id = path.split('/').pop(); 
    return addCorsHeaders(await handleDelete(id));
  } else if (method === 'POST' && path === '/publish') {
    return addCorsHeaders(await handlePublish());
  } else {
    return addCorsHeaders({ error: 'Invalid request method or path' }, 400);
  }
};

const handleGet = async () => {
  return { message: 'GET request for /entries' };
};

const handlePost = async (event, id) => {
  const { name, description } = JSON.parse(event.body);

  if (!id || !name || !description) {
    return { error: 'ID, name, and description are required' };
  }

  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set #name = :name, description = :description',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: {
        ':name': name,
        ':description': description,
      },
    };

    await dynamoDb.update(params).promise();

    return { id, name, description };
  } catch (error) {
    return { error: 'Could not update entry' };
  }
};

const handleDelete = async (id) => {
  if (!id) {
    return { error: 'ID is required' };
  }

  try {
    const getParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };

    const result = await dynamoDb.get(getParams).promise();
    const item = result.Item;

    if (!item) {
      return { error: 'Item not found' };
    }

    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };

    await dynamoDb.delete(deleteParams).promise();

    const imageUrl = item.imageUrl;
    const imageKey = imageUrl.split('/').pop();

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: imageKey,
    };

    await s3.deleteObject(s3Params).promise();

    return { message: 'Item and image deleted successfully' };
  } catch (error) {
    return { error: 'Could not delete entry' };
  }
};

const handlePut = async (event) => {
  const { name, description, image } = JSON.parse(event.body);

  if (!name || !description || !image) {
    return { error: 'Name, description, and image are required' };
  }

  const id = uuid();
  const imageKey = `${id}-${image.fileName}`;

  console.log(`Uploading image to S3 with key: ${imageKey}`);
  console.log(event)
  console.log(name, description, image)

  return { message: 'PUT request for /entries' };

  try {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        id,
        name,
        description,
        imageUrl: '',
      },
    };

    await dynamoDb.put(params).promise();

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: imageKey,
      Body: Buffer.from(image.content, 'base64'),
      ContentType: image.contentType,
    };

    await s3.upload(s3Params).promise();

    const imageUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${imageKey}`;

    const updateParams = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set imageUrl = :url',
      ExpressionAttributeValues: {
        ':url': imageUrl,
      },
    };

    await dynamoDb.update(updateParams).promise();

    return { id, name, description, imageUrl };
  } catch (error) {
    return { error: 'Could not create entry' };
  }
};

const handlePublish = async () => {
  try {
    const scanParams = {
      TableName: TABLE_NAME,
    };

    const result = await dynamoDb.scan(scanParams).promise();
    const items = result.Items;

    const jsonData = JSON.stringify(items);

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: 'data.json', 
      Body: jsonData,
      ContentType: 'application/json',
    };

    await s3.putObject(s3Params).promise();

    return { message: 'Metadata successfully published to S3 as data.json' };
  } catch (error) {
    return { error: 'Could not publish metadata to S3' };
  }
};
