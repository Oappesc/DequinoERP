import { formatProductName } from '@/lib/productUtils';
import { Package } from 'lucide-react';

export default function InventarioTab({ inventario, formatCurrency }: { inventario: any[], formatCurrency: (v: number) => string }) {
  // Filtermos las filas en 0?
  const activos = inventario.filter(i => i.cantidad_actual > 0);

  if (activos.length === 0) {
    return (
      <div className="bg-white p-12 text-center text-slate-500 rounded-b-2xl border-x border-b border-slate-200">
        <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <p className="text-lg font-medium">No hay inventario activo</p>
        <p className="text-sm">El cliente no tiene productos en custodia actualmente.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-semibold">Código PT</th>
              <th className="p-4 font-semibold">Producto</th>
              <th className="p-4 font-semibold text-right">Precio Cadena</th>
              <th className="p-4 font-semibold text-right">Unidades</th>
              <th className="p-4 font-semibold text-right">Total Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activos.map(inv => {
              const prod = inv.productos;
              const subtotal = inv.cantidad_actual * (prod.precio || 0);
              
              return (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-700">{prod.codigo}</td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{formatProductName(prod)}</div>
                  </td>
                  <td className="p-4 text-right text-slate-600 font-medium">
                    {formatCurrency(prod.precio || 0)}
                  </td>
                  <td className="p-4 text-right">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold">
                      {inv.cantidad_actual}
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-rose-600">
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
