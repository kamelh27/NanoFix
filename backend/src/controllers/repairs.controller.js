const Device = require('../models/Device');
const Repair = require('../models/Repair');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const path = require('path');

exports.list = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    const q = deviceId ? { device: deviceId } : {};
    const items = await Repair.find(q).populate('device').sort({ at: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { device: deviceId, status, comment } = req.body;
    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    device.status = status;
    if (status === 'entregado') device.fechaEntrega = new Date();
    await device.save();
    const item = await Repair.create({ device: device._id, status, comment, user: req.user?._id });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const repair = await Repair.findById(id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });
    if (status) repair.status = status;
    if (typeof comment === 'string') repair.comment = comment;
    await repair.save();
    // Optionally align device status with this repair update
    if (status && repair.device) {
      const device = await Device.findById(repair.device);
      if (device) {
        device.status = status;
        if (status === 'entregado') device.fechaEntrega = new Date();
        await device.save();
      }
    }
    res.json(repair);
  } catch (err) { next(err); }
};

exports.addPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const repair = await Repair.findById(id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ message: 'No files uploaded' });
    const base = `/uploads/repairs/${id}/`;
    const urls = files.map((f) => base + path.basename(f.path));
    repair.photos = [...(repair.photos || []), ...urls];
    await repair.save();
    res.status(201).json({ photos: urls, repair });
  } catch (err) { next(err); }
};

exports.addParts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{productId, quantity}]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array required' });
    }
    const repair = await Repair.findById(id);
    if (!repair) return res.status(404).json({ message: 'Repair not found' });

    // Validate stock first
    const insufficient = [];
    const products = new Map();
    for (const it of items) {
      const qty = Math.abs(parseInt(it.quantity, 10) || 0);
      if (!it.productId || !qty) continue;
      const p = await Product.findById(it.productId);
      if (!p) {
        insufficient.push({ productId: it.productId, reason: 'not_found' });
        continue;
      }
      if (p.quantity < qty) {
        insufficient.push({ productId: p._id, requested: qty, available: p.quantity, reason: 'insufficient' });
      }
      products.set(String(p._id), p);
    }
    if (insufficient.length) {
      return res.status(400).json({ message: 'Insufficient stock for some items', details: insufficient });
    }

    const applied = [];
    for (const it of items) {
      const qty = Math.abs(parseInt(it.quantity, 10) || 0);
      if (!it.productId || !qty) continue;
      const p = products.get(String(it.productId));
      if (!p) continue;
      p.quantity = Math.max(0, p.quantity - qty);
      await p.save();
      applied.push({ product: p._id, quantity: qty });
      await InventoryMovement.create({
        product: p._id,
        repair: repair._id,
        device: repair.device,
        user: req.user?._id,
        type: 'consumption',
        quantity: -qty,
      });
    }

    repair.parts = [...(repair.parts || []), ...applied];
    await repair.save();

    res.status(201).json({ parts: repair.parts, repair });
  } catch (err) { next(err); }
};
