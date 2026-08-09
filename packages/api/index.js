const { v4: uuid } = require('uuid');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const TABLE_NAME = process.env.TABLE_NAME ?? '';
const CATEGORIES_TABLE_NAME = process.env.CATEGORIES_TABLE_NAME ?? '';
const ABOUT_TABLE_NAME = process.env.ABOUT_TABLE_NAME ?? '';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL ?? '';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID ?? '';

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
  if (BUCKET_NAME === '' || TABLE_NAME === '' || CATEGORIES_TABLE_NAME === '' || ABOUT_TABLE_NAME === '' || CLOUDFRONT_URL === '') {
    return addCorsHeaders({ error: 'environment variables are required' }, 500);
  }

  console.log(event);

  const method = event.httpMethod;
  const path = event.path;
  console.log(`Handling ${method} request for path: ${path}`);
  let result = null;
  try {
    if (method === 'GET' && path === '/entries') {
      result = await handleGet(event);
    } else if (method === 'PUT' && path === '/entries') {
      result = await handlePut(event);
    } else if (method === 'POST' && path === '/entries/thumbnail-url') {
      result = await handleRequestThumbnailUpload(event);
    } else if (method === 'POST' && path.startsWith('/entries')) {
      result = await handlePost(event);
    } else if (method === 'DELETE' && path.startsWith('/entries')) {
      result = await handleDelete(event);
    } else if (method === 'GET' && path === '/categories') {
      result = await handleGetCategories();
    } else if (method === 'PUT' && path === '/categories') {
      result = await handlePutCategory(event);
    } else if (method === 'POST' && path.startsWith('/categories')) {
      result = await handlePostCategory(event);
    } else if (method === 'DELETE' && path.startsWith('/categories')) {
      result = await handleDeleteCategory(event);
    } else if (method === 'GET' && path === '/about') {
      result = await handleGetAbout();
    } else if (method === 'POST' && path === '/about') {
      result = await handleUpdateAbout(event);
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

// Turn a category name into a URL-friendly slug
const slugify = (name) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'category';
};

// Generate a slug guaranteed to be unique among existing categories (excluding excludeId, for renames)
const uniqueSlug = (name, existingCategories, excludeId) => {
  const base = slugify(name);
  const taken = new Set(
    existingCategories.filter((c) => c.id !== excludeId).map((c) => c.slug)
  );
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

// Find a category by its slug; returns undefined if not found
const resolveCategoryBySlug = async (slug) => {
  const data = await dynamoDb.scan({ TableName: CATEGORIES_TABLE_NAME }).promise();
  return (data.Items ?? []).find((c) => c.slug === slug);
};

// Entries are ordered independently within each category (order 1..N per category, not globally)
const scanEntriesByCategory = async (categoryId) => {
  const data = await dynamoDb.scan({
    TableName: TABLE_NAME,
    FilterExpression: 'categoryId = :cid',
    ExpressionAttributeValues: { ':cid': categoryId }
  }).promise();
  return data.Items ?? [];
};

// Handle GET: return entries from DynamoDB, optionally filtered by category slug
const handleGet = async (event) => {
  const categorySlug = event.queryStringParameters?.category;

  if (!categorySlug) {
    const data = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
    return { entries: data.Items };
  }

  const category = await resolveCategoryBySlug(categorySlug);
  if (!category) {
    return { entries: [] };
  }

  const data = await dynamoDb.scan({
    TableName: TABLE_NAME,
    FilterExpression: 'categoryId = :cid',
    ExpressionAttributeValues: { ':cid': category.id }
  }).promise();
  return { entries: data.Items };
};


const handlePut = async (event) => {
  const formData = JSON.parse(event.body);
  const { name, mimeType, categorySlug } = formData;

  // Parameter validation
  if (!name || !mimeType) {
    return { error: 'Name and MIME type are required' };
  }

  if (!categorySlug) {
    return { error: 'Category is required' };
  }

  // Validate the MIME type (either image/jpeg or image/png)
  if (!['image/jpeg', 'image/png'].includes(mimeType)) {
    return { error: 'Invalid MIME type. Only image/jpeg and image/png are allowed.' };
  }

  const category = await resolveCategoryBySlug(categorySlug);
  if (!category) {
    return { error: 'Invalid category' };
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
    ContentType: 'image/jpeg',  // Thumbnails are always generated as JPEG (client-side crop), regardless of the original image's format
  });

  // Get the current entries in this category to determine the largest order
  const existingEntries = await scanEntriesByCategory(category.id);
  const maxOrder = existingEntries.reduce((max, entry) => (entry.order > max ? entry.order : max), 0);

  // Create new entry object
  const newEntry = {
    id,
    name,
    url: `${CLOUDFRONT_URL}/${baseImageKey}`,  // CloudFront URL for the original image
    thumbnailUrl: `${CLOUDFRONT_URL}/${thumbnailKey}`,  // CloudFront URL for the thumbnail
    order: maxOrder + 1,
    categoryId: category.id,
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

  // Update the orders of the remaining entries in the same category
  const existingEntries = await scanEntriesByCategory(entry.Item.categoryId);
  const updatedEntries = existingEntries
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1
    }));

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
    const existingEntries = await scanEntriesByCategory(currentEntry.Item.categoryId);
    const entryWithDesiredOrder = existingEntries.find(item => item.order === order);

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

// Handle POST /entries/thumbnail-url: issue a fresh signed PUT URL for an existing
// entry's thumbnail (same S3 key as today, overwritten in place) and invalidate the
// CloudFront cache for that path so the new crop shows up immediately.
const handleRequestThumbnailUpload = async (event) => {
  const { id } = JSON.parse(event.body);

  if (!id) {
    return { error: 'ID is required to request a thumbnail upload URL' };
  }

  const entry = await dynamoDb.get({ TableName: TABLE_NAME, Key: { id } }).promise();
  if (!entry.Item) {
    return { message: 'Entry not found' };
  }

  const thumbnailKey = entry.Item.thumbnailUrl.split('/').pop();

  const thumbnailUploadUrl = s3.getSignedUrl('putObject', {
    Bucket: BUCKET_NAME,
    Key: thumbnailKey,
    Expires: 60 * 5,
    ContentType: 'image/jpeg',
  });

  if (CLOUDFRONT_DISTRIBUTION_ID) {
    try {
      await cloudfront.createInvalidation({
        DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          Paths: { Quantity: 1, Items: [`/${encodeURIComponent(thumbnailKey)}`] },
          CallerReference: `thumbnail-${id}-${Date.now()}`,
        },
      }).promise();
    } catch (error) {
      console.error(`Error invalidating CloudFront cache for ${thumbnailKey}:`, error);
      // Proceed even if invalidation fails; the client still uploads the new thumbnail
    }
  }

  return { thumbnailUploadUrl };
};

const ABOUT_ITEM_ID = 'about';

// Handle GET /about: return the current About Me markdown content
const handleGetAbout = async () => {
  const data = await dynamoDb.get({ TableName: ABOUT_TABLE_NAME, Key: { id: ABOUT_ITEM_ID } }).promise();
  return { content: data.Item?.content ?? '' };
};

// Handle POST /about: upsert the About Me markdown content
const handleUpdateAbout = async (event) => {
  const { content } = JSON.parse(event.body);

  if (typeof content !== 'string') {
    return { error: 'Content is required' };
  }

  await dynamoDb.put({ TableName: ABOUT_TABLE_NAME, Item: { id: ABOUT_ITEM_ID, content } }).promise();

  return { message: 'About content updated successfully', content };
};

// Handle GET: return all categories from DynamoDB
const handleGetCategories = async () => {
  const data = await dynamoDb.scan({ TableName: CATEGORIES_TABLE_NAME }).promise();
  return { categories: data.Items };
};

// Handle PUT: create a new category
const handlePutCategory = async (event) => {
  const { name } = JSON.parse(event.body);

  if (!name) {
    return { error: 'Name is required' };
  }

  const existingCategories = await dynamoDb.scan({ TableName: CATEGORIES_TABLE_NAME }).promise();
  const items = existingCategories.Items ?? [];
  const maxOrder = items.reduce((max, category) => (category.order > max ? category.order : max), 0);

  const newCategory = {
    id: uuid(),
    name,
    slug: uniqueSlug(name, items),
    order: maxOrder + 1,
  };

  await dynamoDb.put({ TableName: CATEGORIES_TABLE_NAME, Item: newCategory }).promise();

  return { message: 'Category created successfully', category: newCategory };
};

// Handle POST: update an existing category (rename, re-slug, reorder)
const handlePostCategory = async (event) => {
  const { id, name, slug, order } = JSON.parse(event.body);

  if (!id) {
    return { error: 'ID is required to update a category' };
  }

  const currentCategory = await dynamoDb.get({ TableName: CATEGORIES_TABLE_NAME, Key: { id } }).promise();
  if (!currentCategory.Item) {
    return { message: 'Category not found' };
  }

  const existingCategories = await dynamoDb.scan({ TableName: CATEGORIES_TABLE_NAME }).promise();
  const items = existingCategories.Items ?? [];

  let newSlug = currentCategory.Item.slug;
  if (slug) {
    newSlug = uniqueSlug(slug, items, id);
  } else if (name && name !== currentCategory.Item.name) {
    newSlug = uniqueSlug(name, items, id);
  }

  const updatedCategory = {
    ...currentCategory.Item,
    name: name || currentCategory.Item.name,
    slug: newSlug,
    order: order || currentCategory.Item.order,
  };

  if (order && order !== currentCategory.Item.order) {
    const categoryWithDesiredOrder = items.find(item => item.order === order);

    if (categoryWithDesiredOrder) {
      const swappedCategory = { ...categoryWithDesiredOrder, order: currentCategory.Item.order };
      await dynamoDb.put({ TableName: CATEGORIES_TABLE_NAME, Item: swappedCategory }).promise();
    }
  }

  await dynamoDb.put({ TableName: CATEGORIES_TABLE_NAME, Item: updatedCategory }).promise();

  return { message: 'Category updated successfully', category: updatedCategory };
};

// Handle DELETE: delete a category, blocked if any entries still reference it
const handleDeleteCategory = async (event) => {
  const { id } = JSON.parse(event.body);

  if (!id) {
    throw new Error('ID is required to delete a category');
  }

  const category = await dynamoDb.get({ TableName: CATEGORIES_TABLE_NAME, Key: { id } }).promise();
  if (!category.Item) {
    throw new Error('Category not found');
  }

  const referencingEntries = await dynamoDb.scan({
    TableName: TABLE_NAME,
    FilterExpression: 'categoryId = :cid',
    ExpressionAttributeValues: { ':cid': id },
    Select: 'COUNT',
  }).promise();

  if (referencingEntries.Count > 0) {
    const noun = referencingEntries.Count === 1 ? 'entry' : 'entries';
    throw new Error(`"${category.Item.name}" still has ${referencingEntries.Count} ${noun} in it. Move or delete ${referencingEntries.Count === 1 ? 'it' : 'them'} first, then try deleting the category again.`);
  }

  await dynamoDb.delete({ TableName: CATEGORIES_TABLE_NAME, Key: { id } }).promise();

  return { message: 'Category deleted successfully' };
};

// Handle publish: Retrieve categories and entries, minify, and save to S3 as data.json
const handlePublish = async () => {
  try {
    const [categoriesData, entriesData, aboutData] = await Promise.all([
      dynamoDb.scan({ TableName: CATEGORIES_TABLE_NAME }).promise(),
      dynamoDb.scan({ TableName: TABLE_NAME }).promise(),
      dynamoDb.get({ TableName: ABOUT_TABLE_NAME, Key: { id: ABOUT_ITEM_ID } }).promise(),
    ]);

    const categories = categoriesData.Items ?? [];
    const entries = entriesData.Items ?? [];
    const about = aboutData.Item?.content ?? '';
    const idToSlug = Object.fromEntries(categories.map((c) => [c.id, c.slug]));

    const minifiedCategories = categories.map(category => ({
      s: category.slug,
      n: category.name,
      o: category.order,
    }));

    const minifiedEntries = entries.map(entry => ({
      n: entry.name,
      i: entry.url.replace(CLOUDFRONT_URL + '/', ''),
      o: entry.order,
      c: idToSlug[entry.categoryId],
    }));

    const jsonData = JSON.stringify({ categories: minifiedCategories, entries: minifiedEntries, about });

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: 'data.json',
      Body: jsonData,
      ContentType: 'application/json'
    }).promise();

    if (CLOUDFRONT_DISTRIBUTION_ID) {
      try {
        await cloudfront.createInvalidation({
          DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            Paths: { Quantity: 1, Items: ['/data.json'] },
            CallerReference: `publish-${Date.now()}`,
          },
        }).promise();
      } catch (error) {
        console.error('Error invalidating CloudFront cache for data.json:', error);
        // Proceed even if invalidation fails; data.json is already updated in S3
      }
    }

    return { message: 'Data published successfully', itemCount: minifiedEntries.length };
  } catch (error) {
    console.error('Error publishing data:', error);
    return { error: 'Error publishing data' };
  }
};
