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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Monto Promedio por Pedido</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(data.avgOrderValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Órdenes Totales</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Facturación Total</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(data.totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-800">Buscador de Producto</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedProduct(null); }}
            />
            {search && !selectedProduct && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {filteredProducts.map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-100 last:border-0"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Producto</p>
              <p className="font-semibold text-slate-900 truncate">{selectedProduct.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Facturado</p>
              <p className="font-bold text-blue-600">{formatCurrency(selectedProduct.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Unidades</p>
              <p className="font-bold text-slate-900">{selectedProduct.units}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Margen</p>
              <p className="font-bold text-emerald-600">{selectedProduct.margin.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Evolución de órdenes</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => formatCurrency(val)} />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value), 'Facturado']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="Facturación" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Top Clientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="pb-3 pr-4">Cliente / RIF</th>
                <th className="pb-3 px-4 text-center">Compras Totales</th>
                <th className="pb-3 px-4 text-right">Ventas Pagadas</th>
                <th className="pb-3 px-4 text-right">Ventas por Pagar</th>
                <th className="pb-3 px-4 text-right">Monto Total</th>
                <th className="pb-3 pl-4 text-left">Producto Estrella</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.topClients || []).map((c: any, i: number) => (
                <tr key={c.rif + i} className="text-sm">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.rif}</p>
                  </td>
                  <td className="py-3 px-4 text-center">{c.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(c.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-red-500">{formatCurrency(c.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(c.totalSold)}</td>
                  <td className="py-3 pl-4 text-left">
                    <span className="inline-block px-2 py-1 bg-slate-100 rounded text-slate-700 text-xs truncate max-w-[150px]">
                      {c.topProduct}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.topClients || data.topClients.length === 0) && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay datos de clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 - Productos más vendidos</h3>
          <div className="space-y-4">
            {data.topProducts.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="font-medium text-slate-900 max-w-[200px] truncate">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{p.units} und</p>
                  <p className="text-xs text-slate-500">{formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Bottom 5 - Productos menos vendidos</h3>
          <div className="space-y-4">
            {data.bottomProducts.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                    -
                  </div>
                  <p className="font-medium text-slate-900 max-w-[200px] truncate">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{p.units} und</p>
                  <p className="text-xs text-slate-500">{formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Vendedores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="pb-3 pr-4">Vendedor</th>
                <th className="pb-3 px-4 text-center">Cant. Ventas</th>
                <th className="pb-3 px-4 text-right">Ventas Cobradas</th>
                <th className="pb-3 px-4 text-right">Ventas por Cobrar</th>
                <th className="pb-3 px-4 text-right">Total Vendido</th>
                <th className="pb-3 pl-4 text-right">Comisiones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.topVendors || []).map((v: any, i: number) => (
                <tr key={v.name + i} className="text-sm">
                  <td className="py-3 pr-4 font-bold text-slate-900">
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-center text-xs leading-5 mr-2">{i + 1}</span>
                    {v.name}
                  </td>
                  <td className="py-3 px-4 text-center">{v.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(v.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-red-500">{formatCurrency(v.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">{formatCurrency(v.totalSold)}</td>
                  <td className="py-3 pl-4 text-right font-bold text-emerald-600">{formatCurrency(v.totalCommission)}</td>
                </tr>
              ))}
              {(!data.topVendors || data.topVendors.length === 0) && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay datos de vendedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Bottom 5 Vendedores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-medium text-slate-500">
                <th className="pb-3 pr-4">Vendedor</th>
                <th className="pb-3 px-4 text-center">Cant. Ventas</th>
                <th className="pb-3 px-4 text-right">Ventas Cobradas</th>
                <th className="pb-3 px-4 text-right">Ventas por Cobrar</th>
                <th className="pb-3 px-4 text-right">Total Vendido</th>
                <th className="pb-3 pl-4 text-right">Comisiones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.bottomVendors || []).map((v: any, i: number) => (
                <tr key={v.name + i} className="text-sm">
                  <td className="py-3 pr-4 font-bold text-slate-900">
                    <span className="inline-block w-5 h-5 rounded-full bg-red-100 text-red-600 text-center text-xs leading-5 mr-2">-</span>
                    {v.name}
                  </td>
                  <td className="py-3 px-4 text-center">{v.ordersCount}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(v.paidSales)}</td>
                  <td className="py-3 px-4 text-right text-red-500">{formatCurrency(v.pendingSales)}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">{formatCurrency(v.totalSold)}</td>
                  <td className="py-3 pl-4 text-right font-bold text-emerald-600">{formatCurrency(v.totalCommission)}</td>
                </tr>
              ))}
              {(!data.bottomVendors || data.bottomVendors.length === 0) && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay datos de vendedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
