const Device = require('../models/Device');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

exports.summary = async (_req, res, next) => {
  try {
    const activeRepairs = await Device.countDocuments({ status: { $ne: 'entregado' } });
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recentInvoices = await Invoice.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10);
    const incomeLast30Days = recentInvoices.reduce((s, i) => s + i.total, 0);
    const lowInventory = await Product.find({ $expr: { $lt: ['$quantity', '$minStock'] } }).limit(20);
    res.json({ activeRepairs, incomeLast30Days, recentInvoices, lowInventory });
  } catch (err) { next(err); }
};
