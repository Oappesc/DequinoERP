export const formatProductName = (p: any) => {
  if (!p) return 'Producto desconocido';
  const parts = [];
  if (p.nombre) parts.push(p.nombre);
  if (p.descripcion) parts.push(p.descripcion);
  if (p.tamano_valor) {
    parts.push(`${p.tamano_valor}${p.unidad_medida || ''}`);
  }
  return parts.join(' ') || p.descripcion || 'Producto desconocido';
};
