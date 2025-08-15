const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Device = require('../models/Device');

function calcTotal(items) {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

exports.list = async (_req, res, next) => {
  try {
    const items = await Invoice.find().populate('client device').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { client, device, items, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Invoice items required' });
    const normalized = items.map((i) => ({
      product: i.product || undefined,
      description: i.description,
      quantity: Math.max(1, Number(i.quantity || 1)),
      unitPrice: Number(i.unitPrice || 0),
    }));
    const total = calcTotal(normalized);
    const inv = await Invoice.create({ client, device, items: normalized, total, notes });
    // adjust stock for items with product reference
    for (const it of normalized) {
      if (!it.product) continue;
      const p = await Product.findById(it.product);
      if (p) { p.quantity = Math.max(0, p.quantity - it.quantity); await p.save(); }
    }
    res.status(201).json(inv);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate('client device items.product');
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    res.json(inv);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const inv = await Invoice.findByIdAndDelete(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

exports.income = async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(0);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const match = { createdAt: { $gte: from, $lte: to } };
    const agg = await Invoice.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const totals = agg[0] || { total: 0, count: 0 };
    res.json({ from, to, total: totals.total, count: totals.count });
  } catch (err) { next(err); }
};

exports.pdf = async (req, res, next) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate('client device items.product');
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${inv._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('RepCellPOS - Factura', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Factura: ${inv._id}`);
    doc.text(`Fecha: ${new Date(inv.createdAt).toLocaleString()}`);

    doc.moveDown();
    doc.text(`Cliente: ${inv.client?.name || ''}`);
    doc.text(`Equipo: ${inv.device ? `${inv.device.brand} ${inv.device.model}` : '-'}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Items');
    doc.font('Helvetica');

    const tableTop = doc.y + 5;
    doc.text('Descripción', 40, tableTop);
    doc.text('Cant.', 320, tableTop);
    doc.text('Precio', 380, tableTop);
    doc.text('Importe', 460, tableTop);

    let y = tableTop + 15;
    for (const it of inv.items) {
      const importe = it.quantity * it.unitPrice;
      doc.text(it.description, 40, y, { width: 260 });
      doc.text(String(it.quantity), 320, y);
      doc.text(it.unitPrice.toFixed(2), 380, y);
      doc.text(importe.toFixed(2), 460, y);
      y += 18;
      if (y > 740) { doc.addPage(); y = 40; }
    }

    doc.moveTo(40, y + 5).lineTo(560, y + 5).stroke();
    doc.font('Helvetica-Bold').text(`Total: ${inv.total.toFixed(2)}`, 400, y + 15);

    if (inv.notes) { doc.moveDown(); doc.font('Helvetica').text(`Notas: ${inv.notes}`); }

    doc.end();
  } catch (err) { next(err); }
};
