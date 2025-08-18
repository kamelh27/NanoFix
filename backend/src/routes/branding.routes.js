const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { protect } = require('../middlewares/auth');

// Ensure directory exists
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

const BRAND_DIR = path.join(__dirname, '..', 'uploads', 'branding');
const SETTINGS_PATH = path.join(BRAND_DIR, 'settings.json');

router.get('/logo', (req, res) => {
  ensureDir(BRAND_DIR);
  if (!fs.existsSync(BRAND_DIR)) return res.json({ url: null });
  const IMAGE_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
    '.bmp', '.tif', '.tiff', '.ico', '.avif', '.heic', '.heif'
  ]);
  const all = fs.readdirSync(BRAND_DIR)
    .filter((f) => !f.startsWith('.'))
    .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
    .map((name) => ({ name, time: fs.statSync(path.join(BRAND_DIR, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  if (all.length === 0) return res.json({ url: null });
  const chosen = all[0]; // always latest upload, regardless of format
  res.set('Cache-Control', 'no-store');
  return res.json({ url: `/uploads/branding/${chosen.name}` });
});

// Read brand settings (currently only name)
router.get('/settings', (_req, res) => {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return res.json({ name: data?.name ?? null });
  } catch {
    return res.json({ name: null });
  }
});

// Update brand settings (name)
router.put('/settings', protect, (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    ensureDir(BRAND_DIR);
    const data = { name: name || null };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
    return res.json(data);
  } catch (e) {
    return res.status(400).json({ message: 'No se pudo guardar el nombre' });
  }
});

// Use memory storage; we'll convert and persist a PNG ourselves
const storage = multer.memoryStorage();

// Accept any image/* mimetype. We'll attempt to convert to PNG with sharp; unsupported formats will be rejected.
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    try {
      const mt = String(file.mimetype || '').toLowerCase();
      if (mt.startsWith('image/')) return cb(null, true);
      return cb(new Error('Only image uploads are allowed'));
    } catch {
      return cb(new Error('Only image uploads are allowed'));
    }
  },
});

router.post('/logo', protect, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    ensureDir(BRAND_DIR);
    const ts = Date.now();
    // Primary path: convert to PNG for maximum compatibility (PDFKit, browsers)
    try {
      const filename = `logo-${ts}.png`;
      const outPath = path.join(BRAND_DIR, filename);
      await sharp(req.file.buffer)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outPath);
      return res.json({ url: `/uploads/branding/${filename}` });
    } catch (convErr) {
      // Fallback: persist original file if conversion is unsupported. UI may still render formats like SVG/WEBP/AVIF.
      try {
        let ext = (path.extname(req.file.originalname || '') || '').toLowerCase();
        if (!ext) {
          const mt = String(req.file.mimetype || '').toLowerCase();
          const map = new Map([
            ['image/png', '.png'],
            ['image/jpeg', '.jpg'],
            ['image/jpg', '.jpg'],
            ['image/webp', '.webp'],
            ['image/gif', '.gif'],
            ['image/svg+xml', '.svg'],
            ['image/avif', '.avif'],
            ['image/heic', '.heic'],
            ['image/heif', '.heif'],
            ['image/bmp', '.bmp'],
            ['image/tiff', '.tiff'],
          ]);
          ext = map.get(mt) || '.img';
        }
        const origName = `logo-${ts}${ext}`;
        const outPath2 = path.join(BRAND_DIR, origName);
        fs.writeFileSync(outPath2, req.file.buffer);
        return res.json({ url: `/uploads/branding/${origName}` });
      } catch (persistErr) {
        // Fallthrough to error response
        // eslint-disable-next-line no-console
        console.error('Failed to persist original logo after conversion error', persistErr);
      }
    }
  } catch (e) {
    return res.status(400).json({ message: 'Invalid or unsupported image' });
  }
});

module.exports = router;
