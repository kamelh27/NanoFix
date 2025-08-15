const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  issue: { type: String, required: true, trim: true },
  status: { type: String, enum: ['diagnóstico', 'en reparación', 'listo', 'entregado'], default: 'diagnóstico' },
  fechaIngreso: { type: Date, default: Date.now },
  fechaEntrega: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);
