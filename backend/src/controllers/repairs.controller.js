const Device = require('../models/Device');
const Repair = require('../models/Repair');

exports.list = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    const q = deviceId ? { device: deviceId } : {};
    const items = await Repair.find(q).populate('device').sort({ at: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { device: deviceId, status, comment } = req.body;
    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    device.status = status;
    if (status === 'entregado') device.fechaEntrega = new Date();
    await device.save();
    const item = await Repair.create({ device: device._id, status, comment, user: req.user?._id });
    res.status(201).json(item);
  } catch (err) { next(err); }
};
