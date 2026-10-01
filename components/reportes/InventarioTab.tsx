'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function InventarioTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Valor por Costo</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(data.totalCostValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Valor por Precio de Venta</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(data.totalRetailValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Cantidad de Productos (Tipos)</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{data.totalItems}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Valor de inventario (Top Categorías/Productos)</h3>
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
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-4 w-full text-left">Resumen Patrimonial</h3>
          <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <span className="font-medium text-slate-700">Inversión (Costo)</span>
              <span className="font-bold text-slate-900">{formatCurrency(data.totalCostValue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl">
              <span className="font-medium text-emerald-800">Ganancia Proyectada</span>
              <span className="font-bold text-emerald-600">{formatCurrency(data.totalRetailValue - data.totalCostValue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
              <span className="font-medium text-blue-800">Valor Retail</span>
              <span className="font-bold text-blue-600">{formatCurrency(data.totalRetailValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Productos Hot / Bajos en Stock (Prioridad Alta)</h3>
        <p className="text-sm text-slate-500 mb-6">Proyección basada en el ritmo de ventas del período seleccionado.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3 pr-4">Producto</th>
                <th className="pb-3 px-4 text-center">Stock Actual</th>
                <th className="pb-3 px-4 text-center">Vendidos</th>
                <th className="pb-3 px-4 text-center">Promedio (Venta/Día)</th>
                <th className="pb-3 pl-4 text-right">Días Restantes Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.priorityProducts.slice(0, 15).map((prod: any) => (
                <tr key={prod.id} className="text-sm">
                  <td className="py-3 pr-4">
                    {prod.status === 'critical' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Crítico</span>}
                    {prod.status === 'attention' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Atención</span>}
                    {prod.status === 'ok' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">OK</span>}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900">{prod.name}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">{prod.stock}</td>
                  <td className="py-3 px-4 text-center">{prod.sold30}</td>
                  <td className="py-3 px-4 text-center">{prod.avgDay.toFixed(1)}</td>
                  <td className="py-3 pl-4 text-right">
                    <span className={`font-medium ${prod.daysLeft < 7 ? 'text-red-600' : prod.daysLeft < 15 ? 'text-yellow-600' : 'text-emerald-600'}`}>
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
