'use client';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';

export default function VentasTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  const [search, setSearch] = useState('');
  const allMetrics = data.allProductsMetrics || [];
  const filteredProducts = allMetrics.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monto Promedio por Pedido</p>
          <p className="text-3xl font-extrabold text-dequino-secondary mt-1">{formatCurrency(data.avgOrderValue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Órdenes Totales</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{data.totalOrders}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturación Total</p>
          <p className="text-3xl font-extrabold text-dequino-primary mt-1">{formatCurrency(data.totalRevenue)}</p>
        </div>
      </div>

      {/* Buscador de Producto */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-dequino-secondary">Buscador de Producto</h3>
          <div className="relative w-full md:w-80">
            <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-800 focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center gap-2 transition-all">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar producto por nombre..."
                className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-xs"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedProduct(null); }}
              />
            </div>
            {search && !selectedProduct && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 max-h-60 overflow-y-auto p-1">
                {filteredProducts.map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#FAF8F5] text-xs font-medium text-slate-700 rounded-xl transition-colors"
                    onClick={() => { setSelectedProduct(p); setSearch(''); }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedProduct && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Producto</p>
              <p className="font-bold text-dequino-secondary text-sm truncate mt-0.5">{selectedProduct.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Facturado</p>
              <p className="font-extrabold text-dequino-primary text-sm mt-0.5">{formatCurrency(selectedProduct.revenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unidades</p>
              <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedProduct.units}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Margen</p>
              <p className="font-extrabold text-emerald-700 text-sm mt-0.5">{selectedProduct.margin.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Evolución de órdenes */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-dequino-secondary mb-4">Evolución de órdenes</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7D9375" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#7D9375" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value), 'Facturado']}
                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Area type="monotone" dataKey="Facturación" stroke="#7D9375" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clientes */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-lg font-bold text-dequino-secondary mb-4">Top Clientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Cliente / RIF</th>
                <th className="pb-3 px-4 text-center">Compras Totales</th>
                <th className="pb-3 px-4 text-right">Ventas Pagadas</th>
                <th className="pb-3 px-4 text-right">Ventas por Pagar</th>
                <th className="pb-3 px-4 text-right">Monto Total</th>
                <th className="pb-3 pl-4 text-left">Producto Estrella</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {(data.topClients || []).map((c: any, i: number) => (
                <tr key={c.rif + i} className="text-sm hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                  <td className="py-3 pr-4">
                    <p className="font-bold text-dequino-secondary text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.rif}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">{c.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(c.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-rose-600 font-semibold">{formatCurrency(c.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-800">{formatCurrency(c.totalSold)}</td>
                  <td className="py-3 pl-4 text-left">
                    <span className="inline-block px-2.5 py-1 bg-[#EEF3EC] text-dequino-secondary border border-dequino-tertiary/60 font-semibold text-[10px] rounded-lg truncate max-w-[150px]">
                      {c.topProduct}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.topClients || data.topClients.length === 0) && (
                <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">No hay datos de clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 y Bottom 5 Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4">Top 5 - Productos más vendidos</h3>
          <div className="space-y-3">
            {data.topProducts.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-2xl border border-slate-100/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#EEF3EC] text-dequino-secondary font-extrabold text-xs">
                    {i + 1}
                  </div>
                  <p className="font-bold text-slate-800 text-xs max-w-[200px] truncate">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900 text-xs">{p.units} und</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-dequino-secondary mb-4">Bottom 5 - Productos menos vendidos</h3>
          <div className="space-y-3">
            {data.bottomProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-2xl border border-slate-100/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs">
                    -
                  </div>
                  <p className="font-bold text-slate-800 text-xs max-w-[200px] truncate">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900 text-xs">{p.units} und</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Vendedores */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-lg font-bold text-dequino-secondary mb-4">Top 5 Vendedores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Vendedor</th>
                <th className="pb-3 px-4 text-center">Cant. Ventas</th>
                <th className="pb-3 px-4 text-right">Ventas Cobradas</th>
                <th className="pb-3 px-4 text-right">Ventas por Cobrar</th>
                <th className="pb-3 px-4 text-right">Monto Total</th>
                <th className="pb-3 pl-4 text-right">Comisiones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {(data.topVendors || []).map((v: any, i: number) => (
                <tr key={v.name + i} className="text-sm hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                  <td className="py-3 pr-4 font-bold text-dequino-secondary">
                    <span className="inline-block w-5 h-5 rounded-lg bg-[#EEF3EC] text-dequino-secondary text-center text-xs leading-5 font-bold mr-2">{i + 1}</span>
                    {v.name}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">{v.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(v.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-rose-600 font-semibold">{formatCurrency(v.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-800">{formatCurrency(v.totalSold)}</td>
                  <td className="py-3 pl-4 text-right font-extrabold text-dequino-primary">{formatCurrency(v.totalCommission)}</td>
                </tr>
              ))}
              {(!data.topVendors || data.topVendors.length === 0) && (
                <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">No hay datos de vendedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 5 Vendedores */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="text-lg font-bold text-dequino-secondary mb-4">Bottom 5 Vendedores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Vendedor</th>
                <th className="pb-3 px-4 text-center">Cant. Ventas</th>
                <th className="pb-3 px-4 text-right">Ventas Cobradas</th>
                <th className="pb-3 px-4 text-right">Ventas por Cobrar</th>
                <th className="pb-3 px-4 text-right">Monto Total</th>
                <th className="pb-3 pl-4 text-right">Comisiones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70">
              {(data.bottomVendors || []).map((v: any) => (
                <tr key={v.name} className="text-sm hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                  <td className="py-3 pr-4 font-bold text-dequino-secondary">
                    <span className="inline-block w-5 h-5 rounded-lg bg-amber-50 text-amber-800 text-center text-xs leading-5 font-bold mr-2">-</span>
                    {v.name}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">{v.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(v.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-rose-600 font-semibold">{formatCurrency(v.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-800">{formatCurrency(v.totalSold)}</td>
                  <td className="py-3 pl-4 text-right font-extrabold text-dequino-primary">{formatCurrency(v.totalCommission)}</td>
                </tr>
              ))}
              {(!data.bottomVendors || data.bottomVendors.length === 0) && (
                <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">No hay datos de vendedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
