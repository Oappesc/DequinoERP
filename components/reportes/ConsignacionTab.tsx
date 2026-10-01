'use client';
import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Package, Receipt, AlertCircle, RefreshCw, FileText } from 'lucide-react';


function safeNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export default function ConsignacionTab({ data, formatCurrency }: { data: any, formatCurrency: (v: number) => string }) {
  const [selectedClient, setSelectedClient] = useState<string>('all');

  // AGGREGATIONS BASED ON SELECTION
  const { kpis, chartData, table1Data, table2Data } = useMemo(() => {
    if (selectedClient === 'all') {
      // GLOBAL VIEW
      return {
        kpis: {
          capitalEnCalle: data.capitalEnCalle,
          totalLiquidado: data.totalLiquidado,
          cortesPendientes: data.cortesPendientes,
          tasaLiquidacion: data.tasaLiquidacion
        },
        chartData: data.evolutionData,
        table1Data: {
          type: 'global_clients',
          rows: data.clientStats
        },
        table2Data: {
          type: 'global_products',
          rows: data.productStats.slice(0, 20)
        }
      };
    } else {
      // INDIVIDUAL CLIENT VIEW
      const inv = data.rawInventario.filter((i: any) => i.cliente_id === selectedClient);
      const ped = data.rawPedidos.filter((p: any) => p.cliente_id === selectedClient);
      const cort = data.rawCortes.filter((c: any) => c.cliente_id === selectedClient);

      const capital = inv.reduce((acc: number, i: any) => acc + (i.cantidad_actual * (i.producto?.precio || 0)), 0);
      const liquidado = cort.filter((c: any) => c.estado === 'confirmado').reduce((acc: number, c: any) => acc + (c.total_usd || 0), 0);
      const pendientes = cort.filter((c: any) => c.estado === 'pendiente').reduce((acc: number, c: any) => acc + (c.total_usd || 0), 0);
      const tasa = liquidado > 0 && (capital + liquidado > 0) ? (liquidado / (capital + liquidado)) * 100 : 0;

      // Chart
      const daily: Record<string, {despachado: number, liquidado: number}> = {};
      ped.forEach((p: any) => {
          const d = p.created_at.split('T')[0];
          if(!daily[d]) daily[d] = {despachado:0, liquidado:0};
          const total = p.detalles.reduce((acc: number, det: any) => acc + (safeNum(det.cantidad_despachada ?? det.cantidad ?? 0) * (det.producto?.precio || 0)), 0);
          daily[d].despachado += safeNum(p.total ?? p.monto_despachado ?? total);
      });
      cort.filter((c: any) => c.estado === 'confirmado').forEach((c: any) => {
          const d = c.created_at.split('T')[0];
          if(!daily[d]) daily[d] = {despachado:0, liquidado:0};
          daily[d].liquidado += c.total_usd || 0;
      });
      const evo = Object.keys(daily).sort().map(d => ({ date: d, "Despachado ($)": daily[d].despachado, "Liquidado ($)": daily[d].liquidado }));

      // History (Table 1)
      const history = [
          ...ped.map((p: any) => ({ type: 'Pedido', id: p.id, date: p.created_at, ref: p.correlativo || p.id.slice(0,8), status: p.estado, total: safeNum(p.total ?? p.monto_despachado ?? p.detalles.reduce((acc: number, det: any) => acc + (safeNum(det.cantidad_despachada ?? det.cantidad ?? 0) * (det.producto?.precio || 0)), 0)) })),
          ...cort.map((c: any) => ({ type: 'Corte', id: c.id, date: c.created_at, ref: c.codigo || c.id.slice(0,8), status: c.estado, total: c.total_usd }))
      ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Detailed inventory (Table 2)
      const detailedInv = inv.map((i: any) => ({
        pt: i.producto?.codigo,
        name: i.producto?.descripcion,
        unidades: i.cantidad_actual,
        valor: i.cantidad_actual * (i.producto?.precio || 0),
        precio: i.producto?.precio || 0
      })).sort((a: any, b: any) => b.valor - a.valor);

      return {
        kpis: {
          capitalEnCalle: capital,
          totalLiquidado: liquidado,
          cortesPendientes: pendientes,
          tasaLiquidacion: tasa
        },
        chartData: evo,
        table1Data: {
          type: 'client_history',
          rows: history
        },
        table2Data: {
          type: 'client_inventory',
          rows: detailedInv
        }
      };
    }
  }, [selectedClient, data]);

  if (!data) return <div>Sin datos</div>;

  return (
    <div className="space-y-6">
      
      {/* Selector de Alcance */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="font-bold text-slate-800 text-lg">Reporte de Consignación</h2>
        <select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="all">Todos los clientes (Consolidado)</option>
          {data.clientes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.razon_social}</option>
          ))}
        </select>
      </div>

      {/* KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-slate-200 shadow-sm rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">{selectedClient === 'all' ? 'Capital en Calle Global' : 'Su Capital en Calle'}</p>
              <Package className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{formatCurrency(kpis.capitalEnCalle)}</div>
            <p className="text-xs text-slate-500 mt-1">Mercancía en custodia</p>
          </div>
        </div>
        
        <div className="bg-white border-slate-200 shadow-sm rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Ventas Liquidadas</p>
              <Receipt className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{formatCurrency(kpis.totalLiquidado)}</div>
            <p className="text-xs text-slate-500 mt-1">Acumuladas en periodo</p>
          </div>
        </div>

        <div className="bg-white border-slate-200 shadow-sm rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Cortes Pendientes</p>
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{formatCurrency(kpis.cortesPendientes)}</div>
            <p className="text-xs text-slate-500 mt-1">Esperando confirmación</p>
          </div>
        </div>

        <div className="bg-white border-slate-200 shadow-sm rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Tasa de Liquidación</p>
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{kpis.tasaLiquidacion.toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">Sell-Through / Retorno</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolución */}
      <div className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <div className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {selectedClient === 'all' ? 'Evolución de Consignación (Global)' : 'Historial de Relación Comercial'}
          </h3>
        </div>
        <div className="pt-6">
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Sin movimientos en el periodo</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Despachado ($)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Liquidado ($)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tablas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tabla 1 */}
        <div className="bg-white border-slate-200 shadow-sm rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">
              {table1Data.type === 'global_clients' ? 'Auditoría por Cliente de Consignación' : 'Historial de Transacciones'}
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-x-auto max-h-[400px] overflow-y-auto">
            {table1Data.type === 'global_clients' ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold">Cliente</th>
                    <th className="p-3 font-semibold text-right">Despachado</th>
                    <th className="p-3 font-semibold text-right">Cobrado</th>
                    <th className="p-3 font-semibold text-right">Saldo</th>
                    <th className="p-3 font-semibold text-center">Último Corte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table1Data.rows.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-700">{c.name}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(c.totalDespachado)}</td>
                      <td className="p-3 text-right font-medium text-emerald-600">{formatCurrency(c.totalLiquidado)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(c.saldoPendiente)}</td>
                      <td className="p-3 text-center text-xs text-slate-500">
                        {c.ultimoCorte ? new Date(c.ultimoCorte).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {table1Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold">Fecha</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Ref</th>
                    <th className="p-3 font-semibold text-center">Estado</th>
                    <th className="p-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table1Data.rows.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">
                        {t.type === 'Pedido' ? (
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs flex items-center gap-1 w-max"><Package className="w-3 h-3"/> {t.type}</span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs flex items-center gap-1 w-max"><Receipt className="w-3 h-3"/> {t.type}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{t.ref}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.status === 'abierto' || t.status === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold ${t.type === 'Corte' ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {formatCurrency(t.total)}
                      </td>
                    </tr>
                  ))}
                  {table1Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Sin historial</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tabla 2 */}
        <div className="bg-white border-slate-200 shadow-sm rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">
              {table2Data.type === 'global_products' ? 'Rendimiento de Productos en Consignación' : 'Inventario Actual en Tienda'}
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-x-auto max-h-[400px] overflow-y-auto">
            {table2Data.type === 'global_products' ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold">PT</th>
                    <th className="p-3 font-semibold">Producto</th>
                    <th className="p-3 font-semibold text-center">Desp.</th>
                    <th className="p-3 font-semibold text-center">Cob.</th>
                    <th className="p-3 font-semibold text-center">En Stock</th>
                    <th className="p-3 font-semibold text-right">% Rot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table2Data.rows.map((p: any) => {
                    const rotation = p.despachados > 0 ? (p.cobrados / p.despachados) * 100 : 0;
                    return (
                      <tr key={p.pt} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-700">{p.pt}</td>
                        <td className="p-3 text-slate-600 truncate max-w-[150px]">{p.name}</td>
                        <td className="p-3 text-center text-slate-600">{p.despachados}</td>
                        <td className="p-3 text-center font-medium text-emerald-600">{p.cobrados}</td>
                        <td className="p-3 text-center font-medium text-indigo-600">{p.enStock}</td>
                        <td className="p-3 text-right text-xs font-semibold text-slate-500">
                          {rotation.toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
                  {table2Data.rows.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold">PT</th>
                    <th className="p-3 font-semibold">Producto</th>
                    <th className="p-3 font-semibold text-center">En Poder</th>
                    <th className="p-3 font-semibold text-right">Valor Unit.</th>
                    <th className="p-3 font-semibold text-right">Valor Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table2Data.rows.map((i: any) => (
                    <tr key={i.pt} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-700">{i.pt}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[200px]">{i.name}</td>
                      <td className="p-3 text-center font-black text-indigo-600">{i.unidades}</td>
                      <td className="p-3 text-right text-slate-500">{formatCurrency(i.precio)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(i.valor)}</td>
                    </tr>
                  ))}
                  {table2Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cliente sin inventario actualmente</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
