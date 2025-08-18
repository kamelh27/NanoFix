const multer = require('multer');
const path = require('path');
const fs = require('fs');

const IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = req.params.id || 'misc';
    // Decide folder by router base path
    const base = (req.baseUrl || '').includes('/repairs') ? 'repairs' : 'devices';
    const dir = path.join(__dirname, '..', 'uploads', base, id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  if (!IMAGES.has(file.mimetype)) return cb(new Error('Only image uploads are allowed'));
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024, files: 8 } });

module.exports = upload;
