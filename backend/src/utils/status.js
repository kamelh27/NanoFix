const CANONICAL = ['diagnóstico', 'en reparación', 'listo', 'entregado'];

function normalizeStatusRaw(s) {
  if (!s) return null;
  const v = String(s).toLowerCase().trim();
  if (CANONICAL.includes(v)) return v;
  if (v === 'diagnostico' || v === 'diagnóstico') return 'diagnóstico';
  if (v === 'en_reparacion' || v === 'en-reparacion' || v === 'en reparacion') return 'en reparación';
  if (v === 'reparado' || v === 'listo') return 'listo';
  if (v === 'entregado') return 'entregado';
  return null;
}

module.exports = { normalizeStatusRaw, CANONICAL };
