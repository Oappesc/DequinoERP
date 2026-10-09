'use client';

import { formatProductName } from '@/lib/productUtils';



import { useEffect, useMemo, useState, useRef } from 'react';

import { deleteSellerOrder, getSellerOrderDetail, getSellerOrders, subirComprobantePago } from '@/lib/actions';

import { createClient } from '@/lib/supabase/client';

import { useCurrency } from '@/components/CurrencyProvider';

import type { PedidoEstado } from '@/types/database';

import { PedidoBadge } from '@/components/PedidoBadge';

import { TriangleAlert, ChevronDown, Calendar, Filter, Clock, CheckCircle, Upload, X } from 'lucide-react';



type Customer = { razon_social: string; rif_cedula?: string | null };

type Detail = { cantidad: number; precio_unitario: number; subtotal: number; producto?: { descripcion: string } | null };

type Order = { id: string; correlativo: string; total: number; estado: PedidoEstado; tipo_documento: "factura" | "nota_entrega"; created_at?: string; dias_credito?: number | null; fecha_limite_cobro?: string | null; cliente?: Customer | Customer[] | null; observacion?: string | null; comprobante_pago_url?: string | null; detalles?: Detail[]; porcentaje_comision?: number };

type StatusFilter = 'todos' | PedidoEstado;



const statuses: Array<{ value: StatusFilter; label: string }> = [

  { value: 'todos', label: 'Todos los estatus' }, 

  { value: 'registrado', label: 'Registrado' }, 

  { value: 'en_proceso', label: 'En Proceso' },

   

  { value: 'entregado', label: 'Entregado' }, 

  { value: 'en_revision', label: 'En Revisión' }, 

  { value: 'pagado', label: 'Pagado' },

];



const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };

const monthOptions = () => Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index); return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(date) }; });



export default function ListaPedidos() {

  const { formatCurrency } = useCurrency();

  const esAtrasado = (pedido: any) => {

    if (pedido.estado === 'pagado' || !pedido.fecha_limite_cobro) return false;

    return new Date() > new Date(pedido.fecha_limite_cobro);

  };

  

  const [month, setMonth] = useState(currentMonth);

  const [status, setStatus] = useState<StatusFilter>('todos');

  const [orders, setOrders] = useState<Order[]>([]);

  const [selected, setSelected] = useState<Order | null>(null);

  const [proof, setProof] = useState<File | null>(null);

  const [showProofUpload, setShowProofUpload] = useState(false);

  const [loading, setLoading] = useState(true);

  const [detailLoading, setDetailLoading] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const months = useMemo(monthOptions, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSummary, setShowSummary] = useState(false);

  

  const { totalSales, totalCommissions } = useMemo(() => {

    let sales = 0;

    let commissions = 0;

    for (const order of orders) {

      sales += order.total;

      commissions += (order.total * (order.porcentaje_comision ?? 10)) / 100;

    }

    return { totalSales: sales, totalCommissions: commissions };

  }, [orders]);



  const loadOrders = () => { 

    setLoading(true); 

    setError(''); 

    void getSellerOrders({ month, status: status === 'todos' ? undefined : status }).then((result) => { 

      if (result.error) setError(result.error); 

      else setOrders((result.data ?? []) as Order[]); 

      setLoading(false); 

    }); 

  };

  

  useEffect(loadOrders, [month, status]);

  

  const openDetail = (order: Order) => { 

    setSelected(order); 

    setProof(null); 

    setShowProofUpload(false); 

    setDetailLoading(true); 

    void getSellerOrderDetail(order.id).then((result) => { 

      if (!result.error) setSelected(result.data as Order); 

      setDetailLoading(false); 

    }); 

  };

  

  const customerOf = (order: Order) => Array.isArray(order.cliente) ? order.cliente[0] : order.cliente;

  

  const submitProof = async () => {

    if (!selected || !proof) return;

    setBusy(true); setError('');

    const supabase = createClient();

    const path = `${selected.id}/${Date.now()}-${proof.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'comprobante'}`;

    let uploadError = null;

    try {

      const res = await supabase.storage.from('comprobantes_pago').upload(path, proof, { contentType: proof.type, upsert: false });

      uploadError = res.error;

    } catch (err: any) {

      uploadError = err;

    }

    if (uploadError) {

      setError(uploadError.message || 'Error al subir el comprobante');

      setBusy(false);

      return;

    }

    const { data: { publicUrl } } = supabase.storage.from('comprobantes_pago').getPublicUrl(path);

    const result = await subirComprobantePago(selected.id, publicUrl);

    if (result.error) setError(result.error);

    else {

      setSelected(null);

      loadOrders();

    }

    setBusy(false);

  };



  const removeOrder = async () => {

    if (!selected) return;

    if (!confirm('Â¿Seguro que deseas eliminar este pedido?')) return;

    setBusy(true); setError('');

    const result = await deleteSellerOrder(selected.id);

    if (result.error) setError(result.error);

    else { setSelected(null); loadOrders(); }

    setBusy(false);

  };



  const sortedOrders = useMemo(() => {

    return [...orders].sort((a, b) => {

      const aVencido = esAtrasado(a);

      const bVencido = esAtrasado(b);

      if (aVencido && !bVencido) return -1;

      if (!aVencido && bVencido) return 1;



      const isAPaid = a.estado === "pagado" || a.estado === "en_revision";

      const isBPaid = b.estado === "pagado" || b.estado === "en_revision";

      if (!isAPaid && isBPaid) return -1;

      if (isAPaid && !isBPaid) return 1;



      const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;

      const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;

      return bAt - aAt;

    });

  }, [orders]);



  const vencidosCount = useMemo(() => orders.filter(esAtrasado).length, [orders]);



  return (

    <section className="flex flex-col gap-4 font-lato">

      

      {/* Cabecera y Contadores Superiores */}

      <div>

        <div className="flex items-center justify-between">

          <p className="text-[11px] font-bold text-dequino-primary tracking-wider uppercase">HISTORIAL DE VENTAS • {orders.length} registros</p>

          {vencidosCount > 0 && (

            <div className="bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm">

              <TriangleAlert className="w-3.5 h-3.5" />

              {vencidosCount} Vencidos

            </div>

          )}

        </div>

        <h1 className="text-2xl font-extrabold text-dequino-secondary mt-1 mb-3">Tus pedidos</h1>

      </div>



      {/* Card contenedora de Filtros */}

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">

        <div className="flex flex-col sm:flex-row gap-3">

          <div className="flex-1 flex flex-col gap-1.5">

            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">

              <Calendar className="w-3.5 h-3.5" /> Mes de Facturación

            </label>

            <select 

              value={month} 

              onChange={(e) => setMonth(e.target.value)}

              className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-dequino-primary focus:ring-1 focus:ring-dequino-primary outline-none"

            >

              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}

            </select>

          </div>

          <div className="flex-1 flex flex-col gap-1.5">

            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">

              <Filter className="w-3.5 h-3.5" /> Estatus del Pedido

            </label>

            <select 

              value={status} 

              onChange={(e) => setStatus(e.target.value as StatusFilter)}

              className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-dequino-primary focus:ring-1 focus:ring-dequino-primary outline-none"

            >

              {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}

            </select>

          </div>

        </div>

      </div>



      {/* Desplegable de "Resumen de Ventas y Comisiones" */}

      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col gap-0 cursor-pointer overflow-hidden transition-all" onClick={() => setShowSummary(!showSummary)}>

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="bg-[#D1DDD0] w-6 h-6 rounded-lg shrink-0 flex items-center justify-center">

              <span className="text-dequino-secondary text-xs font-bold">$</span>

            </div>

            <span className="text-sm font-bold text-slate-800">Resumen de Ventas y Comisiones</span>

          </div>

          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showSummary ? 'rotate-180' : ''}`} />

        </div>

        {showSummary && (

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">

            <div className="flex justify-between items-center">

              <span className="text-xs font-semibold text-slate-500">Total Vendido</span>

              <span className="font-bold text-slate-900">{formatCurrency(totalSales)}</span>

            </div>

            <div className="flex justify-between items-center">

              <span className="text-xs font-semibold text-slate-500">Total Comisiones</span>

              <span className="font-bold text-dequino-primary">{formatCurrency(totalCommissions)}</span>

            </div>

          </div>

        )}

      </div>



      <h3 className="text-base font-bold text-slate-800 mt-2">Pedidos Recientes</h3>



      {loading ? (

        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Cargando pedidos...</div>

      ) : error ? (

        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">{error}</div>

      ) : orders.length === 0 ? (

        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No hay pedidos registrados en este perÃ­odo</div>

      ) : (

        <div className="space-y-3">

          {sortedOrders.map((order) => {

            const isVencido = esAtrasado(order);

            const isPagado = order.estado === 'pagado';

            

            // Determinar color de la barra lateral absoluta

            let barClass = 'bg-slate-300';

            if (isVencido) barClass = 'bg-red-600';

            else if (isPagado) barClass = 'bg-dequino-secondary';

            else if (order.estado === 'entregado') barClass = 'bg-dequino-primary';

            else if (order.estado === 'en_revision') barClass = 'bg-amber-500';



            // Determinar estilo del badge de estado superior derecho

            let badgeStyle = 'bg-slate-100 text-slate-600';

            if (isPagado) badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

            else if (order.estado === 'en_revision') badgeStyle = 'bg-orange-50 text-orange-600 border border-orange-200';



            return (

              <article 

                key={order.id} 

                role="button" 

                tabIndex={0} 

                onClick={() => openDetail(order)} 

                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetail(order); }} 

                className="bg-white rounded-2xl py-2.5 px-3 pl-5 shadow-sm border border-slate-100 flex flex-col gap-1.5 relative overflow-hidden transition-all hover:shadow-md cursor-pointer"

              >

                {/* Barra lateral de estado */}

                <div className={`absolute left-0 top-0 bottom-0 w-2 ${barClass}`}></div>



                {/* Fila superior */}

                <div className="flex items-center justify-between">

                  <span className="text-xs font-bold text-slate-700">{order.correlativo || order.id.slice(0, 8)}</span>

                  <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${badgeStyle}`}>

                    {isPagado && <CheckCircle className="w-3 h-3" />}

                    {statuses.find((item) => item.value === order.estado)?.label}

                  </div>

                </div>



                {/* Nombre del Cliente */}

                <p className="text-sm font-bold text-dequino-secondary leading-snug truncate">

                  {customerOf(order)?.razon_social ?? 'Cliente Nuevo - Foto RIF'}

                </p>



                {/* Fecha */}

                <div className="text-[11px] text-slate-400 flex items-center gap-1">

                  <Clock className="w-3 h-3" />

                  {order.created_at ? new Date(order.created_at).toLocaleString('es-VE') : 'Fecha no disponible'}

                </div>



                {/* Bloque de Cobranza Vencida o Crédito Vigente */}

                {['entregado', 'en_revision'].includes(order.estado) && order.fecha_limite_cobro && (

                  isVencido ? (

                    <div className="bg-red-50/80 border border-red-200/60 rounded-lg px-2 py-0.5 text-[10px] text-red-600 font-medium flex items-center gap-1 w-fit mt-0.5">

                      <TriangleAlert className="w-3 h-3" />

                      Cobranza Vencida • Límite {new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')} ({order.dias_credito} días)

                    </div>

                  ) : (

                    <div className="bg-[#FFF9F0] border border-[#FCE6C7] rounded-xl px-2.5 py-1 flex items-center justify-between text-[11px] text-[#8C5D19] font-medium mt-1 mb-1">

                      <span>📅 Límite: {new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')}</span>

                      <span className="font-bold text-[#754C11]">{order.dias_credito} días</span>

                    </div>

                  )

                )}



                {/* Caja inferior de Monto */}

                <div className="bg-[#FAF8F5] rounded-xl px-3 py-1.5 border border-slate-100/80 flex items-center justify-between mt-1">

                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">

                    {order.tipo_documento === 'factura' ? 'Factura' : 'Nota de entrega'}

                  </span>

                  <span className="text-base font-extrabold text-slate-900">

                    {formatCurrency(order.total)}

                  </span>

                </div>

              </article>

            );

          })}

        </div>

      )}



      {/* Modal / Drawer de Detalle del Pedido */}

      {selected && (

        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>

          <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[92vh] w-full overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl sm:max-w-md font-lato flex flex-col gap-4 relative">

            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-1"></div>

            

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] font-extrabold text-dequino-primary tracking-widest uppercase">Detalle del pedido</p>

                <h2 id="order-detail-title" className="text-2xl font-black text-dequino-secondary leading-none mt-1">

                  {selected.correlativo || selected.id.slice(0, 8)}

                </h2>

              </div>

              <button type="button" onClick={() => setSelected(null)} className="bg-slate-100 text-slate-500 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center transition-colors">

                <X className="w-4 h-4" />

              </button>

            </div>



            {detailLoading ? (

              <p className="py-8 text-center text-sm text-slate-500">Cargando detalle...</p>

            ) : (

              <>

                {/* Ficha del Cliente */}

                <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-100 flex items-center justify-between">

                  <div>

                    <p className="text-sm font-bold text-slate-800">{customerOf(selected)?.razon_social ?? 'Cliente Nuevo - Foto RIF'}</p>

                    {customerOf(selected)?.rif_cedula && <p className="text-xs text-slate-400 mt-0.5">{customerOf(selected)?.rif_cedula}</p>}

                  </div>

                  

                  {/* Badge estado detalle */}

                  <div className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 ${

                    selected.estado === 'pagado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 

                    esAtrasado(selected) ? 'bg-red-50 text-red-600 border border-red-200' : 

                    'bg-slate-100 text-slate-600'

                  }`}>

                    {selected.estado === 'pagado' ? 'Pagado' : esAtrasado(selected) ? 'Cobranza Vencida' : statuses.find(s => s.value === selected.estado)?.label}

                  </div>

                </div>



                {/* Bloque Alerta PolÃ­tica de CrÃ©dito */}

                {['entregado', 'en_revision'].includes(selected.estado) && selected.fecha_limite_cobro && (

                  <div className={`${esAtrasado(selected) ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'} border rounded-2xl p-3.5 flex flex-col gap-1`}>

                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">

                      {esAtrasado(selected) && <TriangleAlert className="w-3.5 h-3.5" />}

                      • POLÍTICA DE CRÉDITO

                    </p>

                    <div className="flex justify-between items-center text-xs">

                      <span className="font-medium">Fecha Tope: {new Date(selected.fecha_limite_cobro).toLocaleDateString('es-VE')}</span>

                      <span className="font-semibold">{selected.dias_credito} días</span>

                    </div>

                  </div>

                )}



                {/* Links de Documentos */}
                {(selected.observacion?.includes('http') || selected.comprobante_pago_url || ['en_revision', 'pagado'].includes(selected.estado)) && (
                  <div className="flex flex-col gap-2 mt-1">
                    {selected.observacion?.includes('http') && (
                      <button 
                        type="button"
                        onClick={() => window.open(selected.observacion!.match(/https?:\/\/[^\s]+/)?.[0], '_blank')}
                        className="w-full py-2.5 px-4 bg-[#FAF8F5] border border-dequino-tertiary/60 hover:bg-[#F3EFEA] text-dequino-secondary font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <Upload className="w-4 h-4 text-dequino-primary" />
                        Ver foto del RIF subida
                      </button>
                    )}
                    
                    {(selected.comprobante_pago_url || ['en_revision', 'pagado'].includes(selected.estado)) && (
                      <button 
                        type="button"
                        onClick={() => selected.comprobante_pago_url ? window.open(selected.comprobante_pago_url, '_blank') : alert('El comprobante no está disponible o no se cargó correctamente.')}
                        className="w-full py-2.5 px-4 bg-[#FAF8F5] border border-dequino-tertiary/60 hover:bg-[#F3EFEA] text-dequino-secondary font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-dequino-primary" />
                        Ver comprobante de pago
                      </button>
                    )}
                  </div>
                )}

                {/* Totales y Comisiones */}

                <div className="flex flex-col gap-2 mt-2">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-slate-500">{selected.tipo_documento === 'factura' ? 'Factura' : 'Nota de Entrega'}</span>

                    <strong className="text-lg font-black text-slate-900">{formatCurrency(selected.total)}</strong>

                  </div>

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-slate-500">Comisión Asesor (10%)</span>

                    <strong className="text-base font-bold text-dequino-primary">{formatCurrency((selected.total * (selected.porcentaje_comision ?? 10)) / 100)}</strong>

                  </div>

                </div>



                {/* Botones de AcciÃ³n */}

                <div className="mt-2">

                  {selected.estado === 'entregado' || selected.estado === 'en_revision' ? (

                    <>

                      <input ref={fileInputRef} id="payment-proof" type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="hidden" />

                      {proof && (

                        <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">

                          <span className="font-semibold text-slate-700 truncate max-w-[200px]">{proof.name}</span>

                          <button onClick={() => setProof(null)} className="text-red-500 font-medium">Quitar</button>

                        </div>

                      )}

                      <button 

                        type="button" 

                        disabled={busy} 

                        onClick={() => { if (!proof) { fileInputRef.current?.click(); } else { void submitProof(); } }} 

                        className="w-full bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all text-sm disabled:cursor-not-allowed disabled:opacity-50"

                      >

                        <Upload className="w-4 h-4" />

                        {!proof ? 'Cargar comprobante de pago' : busy ? 'Enviando comprobante...' : 'Enviar comprobante'}

                      </button>

                    </>

                  ) : (

                    <button type="button" disabled className="w-full bg-slate-100 text-slate-400 font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200/60 text-sm">

                      <Upload className="w-4 h-4" />

                      {selected.estado === 'pagado' ? 'El pago ya fue conciliado' : 'Cargar comprobante de pago'}

                    </button>

                  )}

                  

                  {selected.estado === 'registrado' && (

                    <button type="button" disabled={busy} onClick={() => void removeOrder()} className="mt-3 w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">

                      Eliminar Pedido

                    </button>

                  )}

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </section>

  );

}







