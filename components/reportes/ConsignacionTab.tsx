'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Package, Receipt, AlertCircle, RefreshCw } from 'lucide-react';

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

  if (!data) return <div className="text-xs text-slate-400 py-10 text-center font-medium">Sin datos</div>;

  return (
    <div className="space-y-6">
      
      {/* Selector de Alcance */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">FILTRADO DE DATOS</span>
          <h2 className="font-bold text-dequino-secondary text-base">Reporte de Consignación</h2>
        </div>
        <select 
          value={selectedClient} 
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all cursor-pointer"
        >
          <option value="all">Todos los clientes (Consolidado)</option>
          {data.clientes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.razon_social}</option>
          ))}
        </select>
      </div>

      {/* KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedClient === 'all' ? 'Capital en Calle' : 'Su Capital en Calle'}</p>
            <div className="w-8 h-8 rounded-xl bg-[#EEF3EC] flex items-center justify-center text-dequino-secondary">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-dequino-secondary mt-1">{formatCurrency(kpis.capitalEnCalle)}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Mercancía en custodia</p>
        </div>
        
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Liquidadas</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-dequino-primary mt-1">{formatCurrency(kpis.totalLiquidado)}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Acumuladas en periodo</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cortes Pendientes</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">{formatCurrency(kpis.cortesPendientes)}</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Esperando confirmación</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Liquidación</p>
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-slate-700">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{kpis.tasaLiquidacion.toFixed(1)}%</div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sell-Through / Retorno</p>
        </div>
      </div>

      {/* Gráfico de Evolución */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <h3 className="text-lg font-bold text-dequino-secondary">
            {selectedClient === 'all' ? 'Evolución de Consignación (Global)' : 'Historial de Relación Comercial'}
          </h3>
        </div>
        <div className="pt-6">
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">Sin movimientos en el periodo</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip cursor={{ fill: '#FAF8F5' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="Despachado ($)" fill="#7D9375" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Liquidado ($)" fill="#3D4D3A" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tablas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tabla 1 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <h3 className="text-sm font-bold text-dequino-secondary">
              {table1Data.type === 'global_clients' ? 'Auditoría por Cliente de Consignación' : 'Historial de Transacciones'}
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-x-auto max-h-[400px] overflow-y-auto">
            {table1Data.type === 'global_clients' ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">
                    <th className="pb-3 pr-3">Cliente</th>
                    <th className="pb-3 px-3 text-right">Despachado</th>
                    <th className="pb-3 px-3 text-right">Cobrado</th>
                    <th className="pb-3 px-3 text-right">Saldo</th>
                    <th className="pb-3 pl-3 text-center">Último Corte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table1Data.rows.map((c: any) => (
                    <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-2.5">
                      <td className="py-2.5 pr-3 font-bold text-dequino-secondary text-xs">{c.name}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-slate-600">{formatCurrency(c.totalDespachado)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-700">{formatCurrency(c.totalLiquidado)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-extrabold text-rose-600">{formatCurrency(c.saldoPendiente)}</td>
                      <td className="py-2.5 pl-3 text-center text-xs text-slate-400">
                        {c.ultimoCorte ? new Date(c.ultimoCorte).toLocaleDateString('es-VE') : '-'}
                      </td>
                    </tr>
                  ))}
                  {table1Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">
                    <th className="pb-3 pr-3">Fecha</th>
                    <th className="pb-3 px-3">Tipo</th>
                    <th className="pb-3 px-3">Ref</th>
                    <th className="pb-3 px-3 text-center">Estado</th>
                    <th className="pb-3 pl-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table1Data.rows.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-2.5">
                      <td className="py-2.5 pr-3 text-xs text-slate-500">{new Date(t.date).toLocaleDateString('es-VE')}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {t.type === 'Pedido' ? (
                          <span className="text-dequino-primary bg-[#EEF3EC] px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><Package className="w-3 h-3"/> {t.type}</span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><Receipt className="w-3 h-3"/> {t.type}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">{t.ref}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'abierto' || t.status === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className={`py-2.5 pl-3 text-right font-extrabold text-xs ${t.type === 'Corte' ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {formatCurrency(t.total)}
                      </td>
                    </tr>
                  ))}
                  {table1Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">Sin historial</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tabla 2 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <h3 className="text-sm font-bold text-dequino-secondary">
              {table2Data.type === 'global_products' ? 'Rendimiento de Productos en Consignación' : 'Inventario Actual en Tienda'}
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-x-auto max-h-[400px] overflow-y-auto">
            {table2Data.type === 'global_products' ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">
                    <th className="pb-3 pr-3">PT</th>
                    <th className="pb-3 px-3">Producto</th>
                    <th className="pb-3 px-3 text-center">Desp.</th>
                    <th className="pb-3 px-3 text-center">Cob.</th>
                    <th className="pb-3 px-3 text-center">En Stock</th>
                    <th className="pb-3 pl-3 text-right">% Rot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table2Data.rows.map((p: any) => {
                    const rotation = p.despachados > 0 ? (p.cobrados / p.despachados) * 100 : 0;
                    return (
                      <tr key={p.pt} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-2.5">
                        <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{p.pt}</td>
                        <td className="py-2.5 px-3 text-xs font-bold text-dequino-secondary truncate max-w-[150px]">{p.name}</td>
                        <td className="py-2.5 px-3 text-center text-xs text-slate-600">{p.despachados}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-semibold text-emerald-700">{p.cobrados}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-semibold text-dequino-primary">{p.enStock}</td>
                        <td className="py-2.5 pl-3 text-right text-xs font-bold text-slate-700">
                          {rotation.toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
                  {table2Data.rows.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-medium">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">
                    <th className="pb-3 pr-3">PT</th>
                    <th className="pb-3 px-3">Producto</th>
                    <th className="pb-3 px-3 text-center">En Poder</th>
                    <th className="pb-3 px-3 text-right">Valor Unit.</th>
                    <th className="pb-3 pl-3 text-right">Valor Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table2Data.rows.map((i: any) => (
                    <tr key={i.pt} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-2.5">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{i.pt}</td>
                      <td className="py-2.5 px-3 text-xs font-bold text-dequino-secondary truncate max-w-[200px]">{i.name}</td>
                      <td className="py-2.5 px-3 text-center text-xs font-extrabold text-slate-800">{i.unidades}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-slate-500">{formatCurrency(i.precio)}</td>
                      <td className="py-2.5 pl-3 text-right text-xs font-bold text-rose-600">{formatCurrency(i.valor)}</td>
                    </tr>
                  ))}
                  {table2Data.rows.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">Cliente sin inventario actualmente</td></tr>
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
