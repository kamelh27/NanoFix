const mongoose = require('mongoose');

const InventoryMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  repair: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair' },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['consumption', 'adjustment', 'restock'], default: 'consumption' },
  quantity: { type: Number, required: true }, // negative for consumption
  at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovement', InventoryMovementSchema);
