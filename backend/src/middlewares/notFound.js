module.exports = function notFound(_req, res, _next) {
  res.status(404).json({ message: 'Not Found' });
};
