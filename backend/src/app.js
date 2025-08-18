const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/clients.routes');
const deviceRoutes = require('./routes/devices.routes');
const repairRoutes = require('./routes/repairs.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const invoiceRoutes = require('./routes/invoices.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const accountingRoutes = require('./routes/accounting.routes');
const reportsRoutes = require('./routes/reports.routes');
const brandingRoutes = require('./routes/branding.routes');

const app = express();

app.use(helmet({
  // Allow images and other resources to be embedded cross-origin (e.g., from Next.js app on another port)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable COEP to avoid requiring CORS isolation for canvases (helps html2canvas)
  crossOriginEmbedderPolicy: false,
}));
// Reflect request origin to support credentials; optionally restrict via CORS_ORIGIN list
const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : null;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (!origins) return cb(null, true);
    return cb(null, origins.includes(origin));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (_req, res) => {
  res.json({ name: 'RepCellPOS API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/branding', brandingRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
