const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  items: { type: [InvoiceItemSchema], required: true },
  total: { type: Number, required: true },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
