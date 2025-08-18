const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  supplier: { type: String, trim: true },
  // Optional barcode for quick identification/scanning
  barcode: { type: String, trim: true, unique: true, sparse: true },
  // Optional category for filtering/searching
  category: { type: String, trim: true },
  minStock: { type: Number, default: 3, min: 0 },
}, { timestamps: true });

// Text index to support searching by name, supplier, and category
ProductSchema.index({ name: 'text', supplier: 'text', category: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
