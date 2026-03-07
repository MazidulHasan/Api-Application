const crypto = require('crypto');
const db = require('../data/db');

exports.getAllProducts = (req, res) => {
  let { page = 1, limit = 10, category, sort } = req.query;
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  let results = [...db.products];

  if (category) {
    results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (sort === 'price') {
    results.sort((a, b) => a.price - b.price);
  } else if (sort === '-price' || sort === 'price_desc') {
    results.sort((a, b) => b.price - a.price);
  }

  const total = results.length;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedResults = results.slice(startIndex, endIndex);

  res.json({
    data: paginatedResults,
    page,
    limit,
    total,
  });
};

exports.getProductById = (req, res) => {
  const product = db.findProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }
  res.json(product);
};

exports.createProduct = (req, res) => {
  const { name, price, category, stock, description } = req.body;

  if (!name || price === undefined || !category) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'name, price, and category are required' },
    });
  }

  const newProduct = {
    id: crypto.randomUUID(),
    name,
    price: parseFloat(price),
    category,
    stock: stock !== undefined ? parseInt(stock, 10) : 100,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  db.products.push(newProduct);

  res.status(201).json({
    message: 'Product created successfully',
    product: newProduct,
  });
};

exports.updateProduct = (req, res) => {
  const productIndex = db.products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  const { name, price, category, stock, description } = req.body;
  const product = db.products[productIndex];

  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = parseFloat(price);
  if (category !== undefined) product.category = category;
  if (stock !== undefined) product.stock = parseInt(stock, 10);
  if (description !== undefined) product.description = description;

  res.json({
    message: 'Product updated successfully',
    product,
  });
};

exports.deleteProduct = (req, res) => {
  const productIndex = db.products.findIndex((p) => p.id === req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  db.products.splice(productIndex, 1);
  res.json({ message: 'Product deleted successfully' });
};
