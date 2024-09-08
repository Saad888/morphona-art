const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const TABLE_NAME = process.env.TABLE_NAME ?? '';

exports.handler = async (event) => {
  if (BUCKET_NAME === '' || TABLE_NAME === '') {
    throw new Error('BUCKET_NAME and TABLE_NAME environment variables are required');
  }
  console.log(event)

  const method = event.httpMethod; 
  const path = event.path; 
  console.log(`Handling ${method} request for path: ${path}`);

  if (method === 'GET' && path === '/entries') {
    return await handleGet();
  } else if (method === 'PUT' && path === '/entries') {
    return await handlePut(event);
  } else if (method === 'POST' && path.startsWith('/entries/')) {
    const id = path.split('/').pop(); 
    return await handlePost(event, id);
  } else if (method === 'DELETE' && path.startsWith('/entries/')) {
    const id = path.split('/').pop(); 
    return await handleDelete(id);
  } else if (method === 'POST' && path === '/publish') {
    return await handlePublish();
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request method or path' }),
    };
  }
};

const handleGet = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'GET request for /entries' }),
  };
};

const handlePost = async (event, id) => {
  const { name, description } = JSON.parse(event.body);

  if (!id || !name || !description) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'ID, name, and description are required' }),
    };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ id, name, description }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not update entry' }),
    };
  }
};

const handleDelete = async (id) => {
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'ID is required' }),
    };
  }

  try {
    const getParams = {
      TableName: TABLE_NAME,
      Key: { id },
    };

    const result = await dynamoDb.get(getParams).promise();
    const item = result.Item;

    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Item not found' }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Item and image deleted successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not delete entry' }),
    };
  }
};

const handlePut = async (event) => {
  const { name, description, image } = JSON.parse(event.body);

  if (!name || !description || !image) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Name, description, and image are required' }),
    };
  }

  const id = uuid();
  const imageKey = `${id}-${image.fileName}`;

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

    return {
      statusCode: 200,
      body: JSON.stringify({ id, name, description, imageUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not create entry' }),
    };
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

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Metadata successfully published to S3 as data.json' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not publish metadata to S3' }),
    };
  }
};
