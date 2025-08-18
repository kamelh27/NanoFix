const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  category: { type: String, index: true },
  // Optional links to domain entities
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },
  quantity: { type: Number, min: 0 },
  supplier: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
