import AWS from 'aws-sdk';
import {v4 as uuid} from 'uuid';

const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const TABLE_NAME = process.env.TABLE_NAME ?? '';

exports.handler = async (event) => {
  const method = event.httpMethod;
  if (BUCKET_NAME == '' || TABLE_NAME == '') {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Environment variables not set' }),
    };
  }

  if (method === 'GET') {
    return await handleGet();
  } else if (method === 'PUT') {
    return await handlePut(event);
  } else if (method === 'POST') {
    return handlePost();
  } else if (method === 'DELETE') {
    return handleDelete();
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
};

const handleGet = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'GET request stub' }),
  };
};

const handlePost = () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'POST request stub' }),
  };
};

const handleDelete = () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'DELETE request stub' }),
  };
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
    // Step 1: Save the entry to DynamoDB
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

    // Step 2: Upload the image to S3
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: imageKey,
      Body: Buffer.from(image.content, 'base64'),
      ContentType: image.contentType,
    };

    await s3.upload(s3Params).promise();

    // Step 3: Update the DynamoDB entry with the image URL
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
