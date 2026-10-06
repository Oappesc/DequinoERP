'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function GeneralTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Órdenes Totales</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{data.totalOrders}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturación Total</p>
          <p className="text-3xl font-extrabold text-dequino-primary mt-1">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Utilidad Promedio (Margen)</p>
          <p className="text-3xl font-extrabold text-dequino-secondary mt-1">{data.avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4">Evolución del período</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7D9375" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#7D9375" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3D4D3A" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3D4D3A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => formatCurrency(val)} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Facturación" stroke="#7D9375" strokeWidth={3} fillOpacity={1} fill="url(#colorFact)" />
                <Area type="monotone" dataKey="Utilidad" stroke="#3D4D3A" strokeWidth={3} fillOpacity={1} fill="url(#colorUtil)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4">Facturación por Estado</h3>
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
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)} 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-lg font-bold text-dequino-secondary mb-4">Cuadro General - Productos más vendidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Producto</th>
                <th className="pb-3 px-4 text-center">Unidades</th>
                <th className="pb-3 px-4 text-right">Facturación</th>
                <th className="pb-3 px-4 text-right">Utilidad</th>
                <th className="pb-3 px-4 text-right">Margen</th>
                <th className="pb-3 pl-4 text-center">Stock Disp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {data.topSelling.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">No hay datos en este período</td></tr>
              ) : (
                data.topSelling.map((prod: any) => (
                  <tr key={prod.id} className="text-sm hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                    <td className="py-3 pr-4 font-bold text-dequino-secondary text-sm">{prod.name}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{prod.units}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-800">{formatCurrency(prod.revenue)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(prod.util)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block bg-[#EEF3EC] text-dequino-secondary font-bold px-2 py-0.5 rounded-lg text-xs">
                        {prod.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-center font-bold text-slate-700">{prod.stock}</td>
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
