const Product = require('../models/Product');

exports.list = async (_req, res, next) => {
  try {
    const items = await Product.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const item = await Product.create(req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const item = await Product.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json(item);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const item = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json(item);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await Product.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { items } = req.body; // [{productId, quantityUsed}]
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items array required' });
    const results = [];
    for (const it of items) {
      const p = await Product.findById(it.productId);
      if (!p) continue;
      p.quantity = Math.max(0, p.quantity - Math.abs(it.quantityUsed || 0));
      await p.save();
      results.push(p);
    }
    res.json({ updated: results.length, items: results });
  } catch (err) { next(err); }
};
