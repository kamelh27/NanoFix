const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  supplier: { type: String, trim: true },
  minStock: { type: Number, default: 3, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
