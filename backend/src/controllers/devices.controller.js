const Device = require('../models/Device');
const Repair = require('../models/Repair');
const path = require('path');

exports.list = async (req, res, next) => {
  try {
    const { status, client } = req.query;
    const q = {};
    if (status) q.status = status;
    if (client) q.client = client;
    const items = await Device.find(q).populate('client').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const device = await Device.create(req.body);
    // initial history record
    await Repair.create({ device: device._id, status: device.status, comment: 'Creado' , user: req.user?._id});
    res.status(201).json(device);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).populate('client');
    if (!device) return res.status(404).json({ message: 'Device not found' });
    const history = await Repair.find({ device: device._id }).sort({ at: -1 });
    res.json({ ...device.toObject(), history });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!device) return res.status(404).json({ message: 'Device not found' });
    res.json(device);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    await Repair.deleteMany({ device: device._id });
    res.json({ message: 'Device deleted' });
  } catch (err) { next(err); }
};

exports.addPhotos = async (req, res, next) => {
  try {
    const id = req.params.id;
    const device = await Device.findById(id);
    if (!device) return res.status(404).json({ message: 'Device not found' });

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ message: 'No files uploaded' });

    const base = `/uploads/devices/${id}/`;
    const urls = files.map((f) => base + path.basename(f.path));
    device.photos = [...(device.photos || []), ...urls];
    await device.save();

    res.status(201).json({ photos: urls, device });
  } catch (err) { next(err); }
};
