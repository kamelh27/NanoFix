const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Device = require('../models/Device');
const Transaction = require('../models/Transaction');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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
    const { client, device, items, notes, date } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Invoice items required' });
    const normalized = items.map((i) => ({
      product: i.product || undefined,
      description: i.description,
      quantity: Math.max(1, Number(i.quantity || 1)),
      unitPrice: Number(i.unitPrice || 0),
    }));
    const total = calcTotal(normalized);
    // Parse optional date as local time if provided
    let when;
    if (date && typeof date === 'string') {
      const s = date.trim();
      const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
      if (m2) {
        const [_, y, mo, d, hh, mm, ss] = m2;
        when = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), ss ? Number(ss) : 0, 0);
      } else if (m1) {
        const [_, y, mo, d] = m1;
        // If only date, set to local current time of the day as best UX (or noon). We'll use current time.
        const now = new Date();
        when = new Date(Number(y), Number(mo) - 1, Number(d), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      } else {
        // Fall back to native parsing (may interpret timezone if present)
        when = new Date(s);
      }
    }
    const inv = await Invoice.create({ client, device, items: normalized, total, notes, ...(when ? { createdAt: when, updatedAt: when } : {}) });
    // adjust stock for items with product reference
    for (const it of normalized) {
      if (!it.product) continue;
      const p = await Product.findById(it.product);
      if (p) { p.quantity = Math.max(0, p.quantity - it.quantity); await p.save(); }
    }
    // Record income transactions per item for cash register
    try {
      const txDocs = normalized.map((it) => ({
        date: inv.createdAt,
        type: 'income',
        amount: Number(it.quantity) * Number(it.unitPrice),
        description: `Venta: ${it.description}`,
        category: 'venta',
        product: it.product || undefined,
        invoice: inv._id,
        quantity: it.quantity,
      })).filter((t) => t.amount > 0);
      if (txDocs.length > 0) {
        await Transaction.insertMany(txDocs);
      }
    } catch (e) {
      // Do not block invoice creation if cash transaction fails; log for diagnostics
      // eslint-disable-next-line no-console
      console.error('Failed to create cash transactions for invoice', e);
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

    // Try to draw branding logo and brand name.
    let drewLogo = false;
    let brandName = null;
    try {
      const BRAND_DIR = path.join(__dirname, '..', 'uploads', 'branding');
      try {
        const settingsRaw = fs.readFileSync(path.join(BRAND_DIR, 'settings.json'), 'utf8');
        const settings = JSON.parse(settingsRaw);
        if (settings && typeof settings.name === 'string' && settings.name.trim()) brandName = settings.name.trim();
      } catch {}
      if (fs.existsSync(BRAND_DIR)) {
        const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.tif', '.tiff', '.ico', '.avif', '.heic', '.heif']);
        const files = fs.readdirSync(BRAND_DIR)
          .filter((f) => !f.startsWith('.'))
          .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
          .map((name) => ({ name, time: fs.statSync(path.join(BRAND_DIR, name)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
        if (files.length > 0) {
          const latest = path.join(BRAND_DIR, files[0].name);
          const ext = path.extname(latest).toLowerCase();
          const x = doc.x; // current left margin
          const y = doc.y; // current top
          try {
            if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
              doc.image(latest, x, y, { fit: [140, 50] });
              drewLogo = true;
            } else {
              // Convert other formats to PNG in-memory (if supported by sharp) for embedding
              const inputBuf = fs.readFileSync(latest);
              const pngBuf = await sharp(inputBuf).png({ quality: 90, compressionLevel: 9 }).toBuffer();
              doc.image(pngBuf, x, y, { fit: [140, 50] });
              drewLogo = true;
            }
            if (drewLogo && brandName) {
              try { doc.fontSize(16).text(brandName, x + 150, y + 10, { continued: false }); } catch {}
            }
            if (drewLogo) doc.moveDown(2);
          } catch {}
        }
      }
    } catch {}

    // If no logo was drawn but we have a brand name, render it at the top-left.
    if (!drewLogo && brandName) {
      try {
        doc.fontSize(16).text(brandName, doc.x, doc.y, { continued: false });
        doc.moveDown(2);
      } catch {}
    }

    doc.fontSize(20).text('RepCellPOS - Factura', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Factura: ${inv._id}`);
    // Format date using client locale and (optionally) requested timezone
    const acceptLang = String(req.headers['accept-language'] || 'es-MX');
    const locale = acceptLang.split(',')[0] || 'es-MX';
    const requestedTz = req.query.tz ? String(req.query.tz) : undefined;
    const serverTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();
    const tz = requestedTz || process.env.TZ || serverTz; // may be undefined, which means default server TZ
    let dateStr;
    try {
      dateStr = new Date(inv.createdAt).toLocaleString(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: tz,
      });
    } catch {
      // Fallback without explicit timezone if invalid tz was provided
      dateStr = new Date(inv.createdAt).toLocaleString(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }
    doc.text(`Fecha: ${dateStr}`);

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
