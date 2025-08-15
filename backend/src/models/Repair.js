const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  status: { type: String, enum: ['diagnóstico', 'en reparación', 'listo', 'entregado'], required: true },
  comment: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Repair', RepairSchema);
