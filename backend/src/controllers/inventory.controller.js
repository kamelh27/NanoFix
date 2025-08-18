const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

exports.list = async (req, res, next) => {
  try {
    const { q, barcode, category, minQty, maxQty, limit } = req.query;
    const filter = {};


    if (barcode) {
      filter.barcode = String(barcode).trim();
    }

    if (category) {
      filter.category = { $regex: String(category).trim(), $options: 'i' };
    }

    if (q) {
      const s = String(q).trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { supplier: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
        { barcode: { $regex: s, $options: 'i' } },
      ];
    }

    if (minQty !== undefined) {
      filter.quantity = { ...(filter.quantity || {}), $gte: Number(minQty) };
    }
    if (maxQty !== undefined) {
      filter.quantity = { ...(filter.quantity || {}), $lte: Number(maxQty) };
    }

    const lim = Math.max(1, Math.min(200, Number(limit) || 100));

    const items = await Product.find(filter).sort({ createdAt: -1 }).limit(lim);
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const payload = req.body;
    if (payload.barcode) payload.barcode = String(payload.barcode).trim();
    if (payload.category) payload.category = String(payload.category).trim();
    const item = await Product.create(payload);
    res.status(201).json(item);
  } catch (err) {
    // Handle duplicate barcode
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.barcode) {
      return res.status(400).json({ message: 'El código de barras ya está registrado en otro producto' });
    }
    next(err);
  }
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
    const updates = req.body || {};
    if (updates.barcode !== undefined) updates.barcode = String(updates.barcode || '').trim() || undefined;
    if (updates.category !== undefined) updates.category = String(updates.category || '').trim() || undefined;
    const item = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Product not found' });
    res.json(item);
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.barcode) {
      return res.status(400).json({ message: 'El código de barras ya está registrado en otro producto' });
    }
    next(err);
  }
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

// Purchase stock: increments product quantity and records an expense transaction in cash register
exports.purchase = async (req, res, next) => {
  try {
    const { productId, quantity, unitCost, supplier, notes } = req.body || {};
    const qty = Math.max(1, Number(quantity || 0));
    const cost = Math.max(0, Number(unitCost || 0));
    const prod = await Product.findById(productId);
    if (!prod) return res.status(404).json({ message: 'Product not found' });
    // Update stock and optionally supplier
    prod.quantity = Math.max(0, (prod.quantity || 0) + qty);
    if (supplier !== undefined && String(supplier).trim()) prod.supplier = String(supplier).trim();
    await prod.save();

    // Create expense transaction
    const tx = await Transaction.create({
      date: new Date(),
      type: 'expense',
      amount: qty * cost,
      description: `Compra: ${prod.name}${notes ? ' - ' + String(notes) : ''}`,
      category: 'compra',
      product: prod._id,
      quantity: qty,
      supplier: supplier ? String(supplier) : prod.supplier,
    });

    res.status(201).json({ product: prod, transaction: tx });
  } catch (err) { next(err); }
};

// Sell stock: decrements product quantity and records an income transaction in cash register
exports.sell = async (req, res, next) => {
  try {
    const { productId, quantity, unitPrice, notes } = req.body || {};
    const qty = Math.max(1, Number(quantity || 0));
    const price = Math.max(0, Number(unitPrice || 0));
    const prod = await Product.findById(productId);
    if (!prod) return res.status(404).json({ message: 'Product not found' });
    if ((prod.quantity || 0) < qty) return res.status(400).json({ message: 'Stock insuficiente' });

    // Update stock
    prod.quantity = Math.max(0, (prod.quantity || 0) - qty);
    await prod.save();

    // Create income transaction
    const tx = await Transaction.create({
      date: new Date(),
      type: 'income',
      amount: qty * price,
      description: `Venta: ${prod.name}${notes ? ' - ' + String(notes) : ''}`,
      category: 'venta',
      product: prod._id,
      quantity: qty,
    });

    res.status(201).json({ product: prod, transaction: tx });
  } catch (err) { next(err); }
};
