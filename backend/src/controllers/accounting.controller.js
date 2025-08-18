const Transaction = require('../models/Transaction');
const CashSession = require('../models/CashSession');

function parseDateRange(qs) {
  const from = qs.from ? new Date(String(qs.from)) : null;
  const to = qs.to ? new Date(String(qs.to)) : null;
  return { from, to };
}

function toDateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

exports.create = async (req, res, next) => {
  try {
    const { date, type, amount, description, category } = req.body;
    // Normalize date: if 'YYYY-MM-DD', interpret as LOCAL day (use midday to avoid timezone edge cases)
    let when;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      const [y, m, d] = String(date).split('-').map(Number);
      when = new Date(y, m - 1, d, 12, 0, 0, 0);
    } else if (date) {
      when = new Date(String(date));
    } else {
      when = new Date();
    }
    const payload = {
      date: when,
      type: String(type) === 'expense' ? 'expense' : 'income',
      amount: Math.max(0, Number(amount || 0)),
      description: String(description || '').trim(),
      category: category ? String(category).trim() : undefined,
    };
    if (!payload.description) return res.status(400).json({ message: 'Description required' });
    if (!payload.amount) return res.status(400).json({ message: 'Amount must be greater than 0' });
    const tx = await Transaction.create(payload);
    res.status(201).json(tx);
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const match = {};
    if (from || to) match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
    if (req.query.type) match.type = req.query.type === 'expense' ? 'expense' : 'income';
    if (req.query.category) match.category = String(req.query.category);

    const txs = await Transaction.find(match)
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(req.query.limit || 500))
      .populate('product', 'name category barcode');
    res.json(txs);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const tx = await Transaction.findByIdAndDelete(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.dailySummary = async (req, res, next) => {
  try {
    const dateStr = req.query.date; // YYYY-MM-DD (local)
    // Parse as LOCAL date to avoid UTC shifting when using new Date('YYYY-MM-DD')
    let start;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      const [y, m, d] = String(dateStr).split('-').map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const match = { date: { $gte: start, $lt: end } };
    const [agg] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const totalsRaw = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const income = totalsRaw.find((x) => x._id === 'income')?.total || 0;
    const expense = totalsRaw.find((x) => x._id === 'expense')?.total || 0;
    const net = income - expense;

    const txs = await Transaction.find(match)
      .sort({ date: -1, createdAt: -1 })
      .populate('product', 'name category barcode');

    // Opening/closing balances
    const dateKey = toDateKey(start);
    const session = await CashSession.findOne({ dateKey });
    const openingBalance = session?.openingBalance || 0;
    const closingBalance = openingBalance + net;

    res.json({ date: start, income, expense, net, openingBalance, closingBalance, transactions: txs });
  } catch (err) { next(err); }
};

exports.rangeSummary = async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();

    const match = { date: { $gte: start, $lte: end } };
    const rows = await Transaction.aggregate([
      { $match: match },
      { $project: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        type: 1,
        amount: 1,
      } },
      { $group: {
        _id: { day: '$day', type: '$type' },
        total: { $sum: '$amount' },
      } },
    ]);

    const map = new Map();
    for (const r of rows) {
      const day = r._id.day;
      if (!map.has(day)) map.set(day, { income: 0, expense: 0 });
      map.get(day)[r._id.type] = r.total;
    }
    const result = Array.from(map.entries()).map(([day, v]) => ({ date: day, income: v.income || 0, expense: v.expense || 0, net: (v.income || 0) - (v.expense || 0) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ from: start, to: end, days: result });
  } catch (err) { next(err); }
};

exports.getCashSession = async (req, res, next) => {
  try {
    const dateStr = req.query.date;
    // Parse as LOCAL date to avoid UTC shift issues
    let start;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      const [y, m, d] = String(dateStr).split('-').map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    const dateKey = toDateKey(start);
    const session = await CashSession.findOne({ dateKey });
    res.json({ date: start, dateKey, openingBalance: session?.openingBalance || 0, notes: session?.notes || '' });
  } catch (err) { next(err); }
};

exports.setCashSession = async (req, res, next) => {
  try {
    const { date, dateKey: dk, openingBalance, notes } = req.body || {};
    // Normalize to LOCAL date start
    let when;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      const [y, m, d] = String(date).split('-').map(Number);
      when = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      when = date ? new Date(String(date)) : new Date();
      when.setHours(0, 0, 0, 0);
    }
    const key = dk || toDateKey(when);
    const value = Math.max(0, Number(openingBalance || 0));
    const update = await CashSession.findOneAndUpdate(
      { dateKey: key },
      { $set: { dateKey: key, openingBalance: value, notes: notes ? String(notes) : undefined } },
      { new: true, upsert: true }
    );
    res.status(200).json({ dateKey: key, openingBalance: update.openingBalance, notes: update.notes || '' });
  } catch (err) { next(err); }
};
