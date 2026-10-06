'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function InventarioTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  const COLORS = ['#7D9375', '#3D4D3A', '#B38E5D', '#D1DDD0', '#8C6D45', '#1F2920'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor por Costo</p>
          <p className="text-3xl font-extrabold text-dequino-secondary mt-1">{formatCurrency(data.totalCostValue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor por Precio de Venta</p>
          <p className="text-3xl font-extrabold text-dequino-primary mt-1">{formatCurrency(data.totalRetailValue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cantidad de Productos (Tipos)</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{data.totalItems}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4">Valor de inventario (Top Categorías/Productos)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4 w-full text-left">Resumen Patrimonial</h3>
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center p-4 bg-[#FAF8F5] rounded-2xl border border-slate-100/80">
              <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider">Inversión (Costo)</span>
              <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(data.totalCostValue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
              <span className="font-semibold text-emerald-800 text-xs uppercase tracking-wider">Ganancia Proyectada</span>
              <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(data.totalRetailValue - data.totalCostValue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[#EEF3EC] rounded-2xl border border-dequino-tertiary/60">
              <span className="font-semibold text-dequino-secondary text-xs uppercase tracking-wider">Valor Retail</span>
              <span className="font-extrabold text-dequino-secondary text-sm">{formatCurrency(data.totalRetailValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-lg font-bold text-dequino-secondary mb-1">Productos Hot / Bajos en Stock (Prioridad Alta)</h3>
        <p className="text-xs text-slate-400 mb-6 font-medium">Proyección basada en el ritmo de ventas del período seleccionado.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3 pr-4">Producto</th>
                <th className="pb-3 px-4 text-center">Stock Actual</th>
                <th className="pb-3 px-4 text-center">Vendidos</th>
                <th className="pb-3 px-4 text-center">Promedio (Venta/Día)</th>
                <th className="pb-3 pl-4 text-right">Días Restantes Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {data.priorityProducts.slice(0, 15).map((prod: any) => (
                <tr key={prod.id} className="text-sm hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                  <td className="py-3 pr-4">
                    {prod.status === 'critical' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Crítico</span>}
                    {prod.status === 'attention' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Atención</span>}
                    {prod.status === 'ok' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF3EC] text-dequino-secondary border border-dequino-tertiary/60">OK</span>}
                  </td>
                  <td className="py-3 pr-4 font-bold text-dequino-secondary text-sm">{prod.name}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-slate-800">{prod.stock}</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-600">{prod.sold30}</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-600">{prod.avgDay.toFixed(1)}</td>
                  <td className="py-3 pl-4 text-right text-xs">
                    <span className={`font-bold ${prod.daysLeft < 7 ? 'text-rose-600' : prod.daysLeft < 15 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {prod.daysLeft > 900 ? 'Sin datos' : `${Math.floor(prod.daysLeft)} días`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
