const mongoose = require('mongoose');

// Stores daily opening balance for cash management. Closing is computed as opening + income - expense.
const CashSessionSchema = new mongoose.Schema({
  // YYYY-MM-DD key of the local day
  dateKey: { type: String, required: true, unique: true, index: true },
  openingBalance: { type: Number, required: true, min: 0, default: 0 },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CashSession', CashSessionSchema);
