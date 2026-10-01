'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function GeneralTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Órdenes Totales</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Facturación Total</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Utilidad Promedio (Margen)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{data.avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Evolución del período</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => formatCurrency(val)} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Facturación" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFact)" />
                <Area type="monotone" dataKey="Utilidad" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUtil)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Facturación por Estado</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend iconType="circle" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Cuadro General - Productos más vendidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="pb-3 pr-4">Producto</th>
                <th className="pb-3 px-4 text-center">Unidades</th>
                <th className="pb-3 px-4 text-right">Facturación</th>
                <th className="pb-3 px-4 text-right">Utilidad</th>
                <th className="pb-3 px-4 text-right">Margen</th>
                <th className="pb-3 pl-4 text-center">Stock Disp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topSelling.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay datos en este período</td></tr>
              ) : (
                data.topSelling.map((prod: any) => (
                  <tr key={prod.id} className="text-sm">
                    <td className="py-3 pr-4 font-medium text-slate-900">{prod.name}</td>
                    <td className="py-3 px-4 text-center">{prod.units}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(prod.revenue)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(prod.util)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {prod.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-center font-medium">{prod.stock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
