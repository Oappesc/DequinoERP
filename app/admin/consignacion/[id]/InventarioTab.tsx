import { formatProductName } from '@/lib/productUtils';
import { Package } from 'lucide-react';

export default function InventarioTab({ inventario, formatCurrency }: { inventario: any[], formatCurrency: (v: number) => string }) {
  // Filtermos las filas en 0?
  const activos = inventario.filter(i => i.cantidad_actual > 0);

  if (activos.length === 0) {
    return (
      <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-100 shadow-sm">
        <Package className="w-12 h-12 mx-auto text-slate-300 mb-4 stroke-1" />
        <p className="text-base font-bold text-slate-700">No hay inventario activo</p>
        <p className="text-xs text-slate-400 mt-1">El cliente no tiene productos en custodia actualmente.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-extrabold">Código PT</th>
              <th className="pb-3 px-4 font-extrabold">Producto</th>
              <th className="pb-3 px-4 font-extrabold text-right">Precio Cadena</th>
              <th className="pb-3 px-4 font-extrabold text-right">Unidades</th>
              <th className="pb-3 pl-4 font-extrabold text-right">Total Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 text-sm">
            {activos.map(inv => {
              const prod = inv.productos;
              const subtotal = inv.cantidad_actual * (prod.precio || 0);
              
              return (
                <tr key={inv.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3.5 pr-4 font-mono font-bold text-slate-800 text-xs">{prod.codigo}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800 text-xs">{formatProductName(prod)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600 font-medium text-xs">
                    {formatCurrency(prod.precio || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="bg-[#EEF3EC] text-dequino-secondary px-3 py-1 rounded-xl font-bold text-xs">
                      {inv.cantidad_actual}
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 text-right font-extrabold text-dequino-secondary">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
