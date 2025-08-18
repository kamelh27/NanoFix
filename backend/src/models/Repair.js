const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  status: { type: String, enum: ['diagnóstico', 'en reparación', 'listo', 'entregado'], required: true },
  comment: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
  photos: [{ type: String }],
  parts: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);
