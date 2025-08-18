const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');

function parseRange(q) {
  const from = q.from ? new Date(String(q.from)) : new Date(0);
  const to = q.to ? new Date(String(q.to)) : new Date();
  return { from, to };
}

function bucketExpr(granularity, field) {
  if (granularity === 'month') return { $dateToString: { format: '%Y-%m', date: `$${field}` } };
  if (granularity === 'week') return {
    $concat: [
      { $toString: { $isoWeekYear: `$${field}` } },
      '-W',
      { $toString: { $isoWeek: `$${field}` } },
    ]
  };
  // default day
  return { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } };
}

exports.summary = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const gran = ['day', 'week', 'month'].includes(String(req.query.granularity)) ? String(req.query.granularity) : 'day';

    const invoices = await Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $project: { bucket: bucketExpr(gran, 'createdAt'), total: '$total' } },
      { $group: { _id: '$bucket', total: { $sum: '$total' } } },
    ]);

    const txs = await Transaction.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      // Exclude income records that are linked to invoices (sales) to avoid double counting
      { $match: { $or: [ { type: 'expense' }, { type: 'income', invoice: { $exists: false } } ] } },
      { $project: { bucket: bucketExpr(gran, 'date'), type: '$type', amount: '$amount' } },
      { $group: { _id: { bucket: '$bucket', type: '$type' }, total: { $sum: '$amount' } } },
    ]);

    const byBucket = new Map();
    for (const r of invoices) {
      byBucket.set(r._id, { incomeSales: r.total, incomeTx: 0, expenseTx: 0 });
    }
    for (const r of txs) {
      const key = r._id.bucket;
      if (!byBucket.has(key)) byBucket.set(key, { incomeSales: 0, incomeTx: 0, expenseTx: 0 });
      if (r._id.type === 'income') byBucket.get(key).incomeTx += r.total;
      else byBucket.get(key).expenseTx += r.total;
    }

    const rows = Array.from(byBucket.entries()).map(([bucket, v]) => ({
      bucket,
      income: (v.incomeSales || 0) + (v.incomeTx || 0),
      expense: v.expenseTx || 0,
    })).map((x) => ({ ...x, net: x.income - x.expense }));

    rows.sort((a, b) => a.bucket.localeCompare(b.bucket));
    res.json({ from, to, granularity: gran, rows });
  } catch (err) { next(err); }
};

exports.topProducts = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const sortBy = String(req.query.sortBy) === 'value' ? 'value' : 'quantity';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));

    const rows = await Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      { $group: {
        _id: { product: '$items.product', description: '$items.description' },
        quantity: { $sum: '$items.quantity' },
        value: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      } },
      { $lookup: { from: 'products', localField: '_id.product', foreignField: '_id', as: 'product' } },
      { $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
      { $project: {
        _id: 0,
        productId: '$_id.product',
        name: { $ifNull: ['$product.name', '$_id.description'] },
        quantity: 1,
        value: 1,
      } },
      { $sort: { [sortBy]: -1 } },
      { $limit: limit },
    ]);

    res.json({ from, to, sortBy, rows });
  } catch (err) { next(err); }
};

exports.expensesByCategory = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const rows = await Transaction.aggregate([
      { $match: { date: { $gte: from, $lte: to }, type: 'expense' } },
      { $group: { _id: { $ifNull: ['$category', 'Sin categoría'] }, total: { $sum: '$amount' } } },
      { $project: { _id: 0, category: '$_id', total: 1 } },
      { $sort: { total: -1 } },
    ]);
    const total = rows.reduce((s, r) => s + r.total, 0);
    res.json({ from, to, total, rows });
  } catch (err) { next(err); }
};

function sendCsv(res, filename, header, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = [header.join(',')].concat(rows.map((r) => header.map((h) => esc(r[h])).join(',')));
  res.send(lines.join('\n'));
}

exports.summaryCsv = async (req, res, next) => {
  try {
    const data = await (async () => {
      const { from, to } = parseRange(req.query);
      const gran = ['day', 'week', 'month'].includes(String(req.query.granularity)) ? String(req.query.granularity) : 'day';
      const invoices = await Invoice.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $project: { bucket: bucketExpr(gran, 'createdAt'), total: '$total' } },
        { $group: { _id: '$bucket', total: { $sum: '$total' } } },
      ]);
      const txs = await Transaction.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $match: { $or: [ { type: 'expense' }, { type: 'income', invoice: { $exists: false } } ] } },
        { $project: { bucket: bucketExpr(gran, 'date'), type: '$type', amount: '$amount' } },
        { $group: { _id: { bucket: '$bucket', type: '$type' }, total: { $sum: '$amount' } } },
      ]);
      const byBucket = new Map();
      for (const r of invoices) byBucket.set(r._id, { incomeSales: r.total, incomeTx: 0, expenseTx: 0 });
      for (const r of txs) {
        const key = r._id.bucket; if (!byBucket.has(key)) byBucket.set(key, { incomeSales: 0, incomeTx: 0, expenseTx: 0 });
        if (r._id.type === 'income') byBucket.get(key).incomeTx += r.total; else byBucket.get(key).expenseTx += r.total;
      }
      const rows = Array.from(byBucket.entries()).map(([bucket, v]) => ({ bucket, income: (v.incomeSales||0)+(v.incomeTx||0), expense: v.expenseTx||0 }));
      for (const r of rows) r.net = r.income - r.expense;
      rows.sort((a,b)=>a.bucket.localeCompare(b.bucket));
      return rows;
    })();
    sendCsv(res, 'summary.csv', ['bucket','income','expense','net'], data);
  } catch (err) { next(err); }
};

exports.topProductsCsv = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const sortBy = String(req.query.sortBy) === 'value' ? 'value' : 'quantity';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const rows = await Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      { $group: { _id: { product: '$items.product', description: '$items.description' }, quantity: { $sum: '$items.quantity' }, value: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } } } },
      { $lookup: { from: 'products', localField: '_id.product', foreignField: '_id', as: 'product' } },
      { $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
      { $project: { _id: 0, name: { $ifNull: ['$product.name', '$_id.description'] }, quantity: 1, value: 1 } },
      { $sort: { [sortBy]: -1 } },
      { $limit: limit },
    ]);
    sendCsv(res, 'top-products.csv', ['name','quantity','value'], rows);
  } catch (err) { next(err); }
};

exports.expensesCsv = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const rows = await Transaction.aggregate([
      { $match: { date: { $gte: from, $lte: to }, type: 'expense' } },
      { $group: { _id: { $ifNull: ['$category', 'Sin categoría'] }, total: { $sum: '$amount' } } },
      { $project: { _id: 0, category: '$_id', total: 1 } },
      { $sort: { total: -1 } },
    ]);
    sendCsv(res, 'expenses-by-category.csv', ['category','total'], rows);
  } catch (err) { next(err); }
};

exports.summaryPdf = async (req, res, next) => {
  try {
    // reuse summary
    const { from, to } = parseRange(req.query);
    req.query.granularity = req.query.granularity || 'day';
    const gran = req.query.granularity;
    // quick compute
    const dataRes = await new Promise((resolve, reject) => {
      const fakeRes = { json: (v) => resolve(v) };
      exports.summary({ query: { from, to, granularity: gran } }, fakeRes, reject);
    });
    const { rows } = dataRes;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=summary.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Resumen financiero', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${from.toISOString()} — ${to.toISOString()}`);
    doc.text(`Granularidad: ${gran}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Bucket        Ingresos     Gastos     Neto');
    doc.font('Helvetica');
    for (const r of rows) {
      doc.text(`${r.bucket.padEnd(12)}  ${r.income.toFixed(2).padStart(10)}  ${r.expense.toFixed(2).padStart(10)}  ${r.net.toFixed(2).padStart(10)}`);
    }
    doc.end();
  } catch (err) { next(err); }
};
