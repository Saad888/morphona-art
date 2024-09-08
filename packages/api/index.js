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
    const id = path.split('/').pop(); 
    return addCorsHeaders(await handlePost(event));
  } else if (method === 'DELETE' && path.startsWith('/entries')) {
    const id = path.split('/').pop(); 
    return addCorsHeaders(await handleDelete(event));
  } else if (method === 'POST' && path === '/publish') {
    return addCorsHeaders(await handlePublish());
  } else {
    return addCorsHeaders({ error: 'Invalid request method or path' }, 400);
  }
};

const handleGet = async () => {
  return { message: 'GET request for /entries' };
};

const handlePost = async (event) => {
  console.log(event);
  return { message:  'POST request for /entries' };
};

const handleDelete = async (event) => {
  console.log(event);
  return { message: 'DELETE request for /entries' };
};

const handlePut = async (event) => {
  console.log(event);
  return { message: 'PUT request for /entries' };
};

const handlePublish = async () => {
  return { message: 'POST request for /publish' };
};
