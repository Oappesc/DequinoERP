'use client';
import { formatProductName } from '@/lib/productUtils';

import { useEffect, useMemo, useState } from 'react';
import { updateOrderStatus, getAdminReport, getAdminOrderDetail, updateAdminOrderData, downloadAdminOrderExcel } from '@/lib/actions';
import type { PedidoEstado } from '@/types/database';
import { PedidoBadge } from '@/components/PedidoBadge';
import { createBrowserClient } from '@supabase/ssr';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import CrearPedidoModal from '@/components/admin/CrearPedidoModal';
import Image from 'next/image';

type OrderStatus = PedidoEstado;

type AdminOrder = {
  id: string;
  correlativo: string;
  vendedor?: { nombre: string };
  cliente?: { id: string; razon_social: string; rif_cedula: string; direccion?: string; telefono?: string; email?: string };
  created_at: string;
  total: number;
  estado: OrderStatus;
  tipo_documento: 'factura' | 'nota_entrega';
  dias_credito?: number | null;
  fecha_limite_cobro?: string | null;
};




const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const monthOptions = () => Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index); return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(date) }; });

export default function AdminPage() {
  const { formatCurrency, currency, rate } = useCurrency();
  const esAtrasado = (pedido: AdminOrder) => {
    if (pedido.estado === 'pagado' || !pedido.fecha_limite_cobro) return false;
    return new Date() > new Date(pedido.fecha_limite_cobro);
  };
  const [tab, setTab] = useState<'en_proceso' | 'por_cobrar' | 'pagados'>('en_proceso');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | OrderStatus>('todos');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [viewedRegistrados, setViewedRegistrados] = useState<Set<string>>(new Set());

  // Modal State
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerEdit, setCustomerEdit] = useState({ razon_social: '', rif_cedula: '', direccion: '', telefono: '', email: '' });
  const [itemsEdit, setItemsEdit] = useState<any[]>([]);
  const [commissionPct, setCommissionPct] = useState(10);
  const [savingOrder, setSavingOrder] = useState(false);

  const months = useMemo(monthOptions, []);
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const loadData = () => {
    void getAdminReport().then((res) => {
      if (res.data) {
        setOrders(res.data.orders as AdminOrder[]);
        setProducts(res.data.products || []);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();

    const channel = supabase.channel('realtime_pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => loadData())
      .subscribe();

    const interval = setInterval(loadData, 60000);
    return () => { clearInterval(interval); void supabase.removeChannel(channel); };
  }, [supabase]);

  const handleStatusChange = async (e: React.MouseEvent, orderId: string, status: Extract<OrderStatus, 'en_proceso' | 'entregado' | 'en_revision' | 'pagado'>) => {
    e.stopPropagation();
    const result = await updateOrderStatus(orderId, status);
    setMessage(result.error ?? `Pedido actualizado a ${status.replace(/_/g, ' ')}.`);
    if (status as string !== 'registrado') {
      setViewedRegistrados(prev => {
        const next = new Set(prev);
        next.add(orderId);
        return next;
      });
    }
    if (!result.error) loadData();
  };

  const handleSelectPedido = async (pedido: AdminOrder) => {
    if (pedido.estado === 'registrado') {
      setViewedRegistrados(prev => {
        const next = new Set(prev);
        next.add(pedido.id);
        return next;
      });
    }
    
    // Set immediate basic info to open the modal instantly
    setSelectedPedido(pedido);
    setDetailLoading(true);
    setItemsEdit([]); // Clear old items while loading
    
    const res = await getAdminOrderDetail(pedido.id);
    if (res.data) {
      setSelectedPedido(res.data);
      const isNew = res.data.cliente?.razon_social?.includes('PENDIENTE RIF');
      setCustomerEdit({
        razon_social: isNew ? '' : res.data.cliente?.razon_social || '',
        rif_cedula: isNew ? '' : res.data.cliente?.rif_cedula || '',
        direccion: res.data.cliente?.direccion || '',
        telefono: res.data.cliente?.telefono || '',
        email: res.data.cliente?.email || '',
      });
      setItemsEdit(res.data.detalles || []);
      setCommissionPct(res.data.porcentaje_comision ?? 10);
    } else {
      setSelectedPedido(null);
      setMessage(res.error || 'Error cargando detalle');
    }
    setDetailLoading(false);
  };

  const allowedStatuses = tab === 'en_proceso' 
    ? ['registrado', 'en_proceso'] 
    : tab === 'por_cobrar' 
      ? ['entregado', 'en_revision'] 
      : ['pagado'];

  const filteredOrders = useMemo(() => {
      // 1. Atrasados globales
      const pedidosAtrasadosGlobales = orders.filter(p => p.estado !== 'pagado' && esAtrasado(p));
      const atrasadosIds = new Set(pedidosAtrasadosGlobales.map(p => p.id));
      
      // 2. Normales del mes
      const pedidosNormalesDelMes = orders.filter((order) => {
        if (atrasadosIds.has(order.id)) return false;
        
        const inTab = allowedStatuses.includes(order.estado);
        const statusMatches = selectedStatus === 'todos' ? true : order.estado === selectedStatus;
        const monthMatches = selectedMonth === 'todos' ? true : order.created_at.startsWith(selectedMonth);
        return inTab && statusMatches && monthMatches;
      });

      // Si estamos en la pestaña 'por_cobrar', los atrasadosSiempre aplican.
      // Si estamos en 'en_proceso', no deberían mostrarse los de 'entregado'.
      const atrasadosDelTab = tab === 'por_cobrar' ? pedidosAtrasadosGlobales : [];

      const listaFinal = [...atrasadosDelTab, ...pedidosNormalesDelMes];

      return listaFinal.sort((a, b) => {
        const aAtrasado = atrasadosIds.has(a.id);
        const bAtrasado = atrasadosIds.has(b.id);
        if (aAtrasado && !bAtrasado) return -1;
        if (!aAtrasado && bAtrasado) return 1;
        if (aAtrasado && bAtrasado && a.fecha_limite_cobro && b.fecha_limite_cobro) {
          return new Date(a.fecha_limite_cobro).getTime() - new Date(b.fecha_limite_cobro).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }, [orders, tab, selectedMonth, selectedStatus, allowedStatuses]);

  const metrics = useMemo(() => {
    const monthOrders = selectedMonth === 'todos' 
      ? orders 
      : orders.filter((o) => o.created_at.startsWith(selectedMonth));
    const totalMes = monthOrders.reduce((sum, order) => sum + order.total, 0);
    const totalCobrado = monthOrders.filter((o) => o.estado === 'pagado').reduce((sum, order) => sum + order.total, 0);
    
    // Conteo global de todos los pedidos no pagados (independiente del filtro de mes)
    const pedidosPendientes = orders.filter((o) => o.estado !== 'pagado').length;
    
    return { totalMes, totalCobrado, pedidosPendientes };
  }, [orders, selectedMonth]);
  
  const getMesLabel = () => {
    if (selectedMonth === 'todos') return 'Ventas Totales (Hist\u00F3rico)';
    const opt = months.find(m => m.value === selectedMonth);
    if (opt) return 'Ventas ' + opt.label.charAt(0).toUpperCase() + opt.label.slice(1);
    return 'Ventas del mes';
  };

  const countRegistrado = orders.filter((o) => o.estado === 'registrado' && !viewedRegistrados.has(o.id)).length;

  // Order Calculations
  const calculatedSubtotal = itemsEdit.reduce((sum, i) => sum + (i.cantidad * (i.precio_unitario || i.producto?.precio || 0)), 0);
  const isNotaEntrega = selectedPedido?.tipo_documento === 'nota_entrega';
    const calculatedIva = isNotaEntrega ? 0 : calculatedSubtotal * 0.16;
  const calculatedTotal = calculatedSubtotal + calculatedIva;
  const calculatedCommission = (calculatedTotal * commissionPct) / 100;

  const handleSaveOrder = async () => {
    if (!selectedPedido) return;
    setSavingOrder(true);
    const isNew = selectedPedido.cliente?.razon_social?.includes('PENDIENTE RIF');
    
    const payload = {
      clienteUpdate: isNew ? {
        id: selectedPedido.cliente.id,
        ...customerEdit
      } : undefined,
      items: itemsEdit.map(i => ({
        id: i.id,
        producto_id: i.producto_id,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario || i.producto?.precio)
      })),
      porcentaje_comision: Number(commissionPct),
      subtotal: calculatedSubtotal,
      total: calculatedTotal
    };

    const res = await updateAdminOrderData(selectedPedido.id, payload);
    setSavingOrder(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setSelectedPedido(null);
      loadData();
    }
  };

  
  const handleAddProduct = (prod: any) => {
    const existing = itemsEdit.findIndex(i => i.producto_id === prod.id);
    if (existing >= 0) {
      const newItems = [...itemsEdit];
      newItems[existing].cantidad += 1;
      setItemsEdit(newItems);
    } else {
      setItemsEdit([...itemsEdit, {
        producto_id: prod.id,
        cantidad: 1,
        precio_unitario: prod.precio,
        producto: prod
      }]);
    }
    setProductSearch('');
  };
  const searchResults = productSearch.length > 0 ? products.filter(p => formatProductName(p).toLowerCase().includes(productSearch.toLowerCase()) || p.codigo.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [];

  
  const isReadOnly = ['entregado', 'en_revision', 'pagado'].includes(selectedPedido?.estado || '');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    if (!selectedPedido) return;
    setDownloading(true);
    const res = await downloadAdminOrderExcel(selectedPedido.id);
    if (res.data) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
      link.download = `${selectedPedido.correlativo}.xlsx`;
      link.click();
    } else {
      alert(res.error);
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    if (!selectedPedido) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isFactura = selectedPedido.tipo_documento === 'factura';
    const html = `
      <html>
      <head>
        <title>Imprimir - ${selectedPedido.correlativo}</title>
        <style>
          @media print {
            @page { margin: 15mm; }
            body { -webkit-print-color-adjust: exact; }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 0; 
            margin: 0;
            font-size: 13px; 
            line-height: 1.4;
            color: #000;
          }
          .header { text-align: left; margin-bottom: 20px; }
          .header h2 { font-size: 16px; margin: 0 0 10px 0; font-weight: bold; }
          .header p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { 
            border: 1px solid #000; 
            padding: 6px 4px; 
            text-align: center; 
          }
          th { font-weight: bold; background-color: #fff; }
          td.desc { text-align: left; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .footer-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 10px; }
          .totals-table { width: 350px; border-collapse: collapse; }
          .totals-table th, .totals-table td { border: none; padding: 4px 8px; text-align: right; }
          .totals-table th { width: 60%; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${isFactura ? 'FACTURA' : 'NOTA DE ENTREGA'}: ${selectedPedido.correlativo}</h2>
          <p>Guarenas: ${new Date(selectedPedido.created_at).toLocaleDateString('es-VE')}</p>
          <p>Cliente: ${selectedPedido.cliente?.razon_social || 'N/A'} | R.I.F: ${selectedPedido.cliente?.rif_cedula || 'N/A'}</p>
          <p>Dirección: ${selectedPedido.cliente?.direccion || 'N/A'} | Teléfono: ${selectedPedido.cliente?.telefono || 'N/A'}</p>
          <br/>
          <p>Vendedor: ${selectedPedido.vendedor?.nombre || 'N/A'}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 15%">CODIGO</th>
              <th style="width: 40%">DESCRIPCION</th>
              <th style="width: 10%">CANTIDAD</th>
              <th style="width: 8%">UND</th>
              <th style="width: 10%">CAJAS</th>
              <th style="width: 15%">PRECIO UNITARIO</th>
              <th style="width: 15%">TOTAL $</th>
            </tr>
          </thead>
          <tbody>
            ${itemsEdit.map(item => {
              const qty = Number(item.cantidad);
              const udsPorBulto = item.producto?.unidades_por_bulto || 1;
              const cajas = qty / udsPorBulto;
              const precioU = Number(item.precio_unitario || item.producto?.precio || 0);
              const rowTotal = qty * precioU;
              return `
              <tr>
                <td>${item.producto?.codigo || 'PT-'}</td>
                <td class="desc">${item.producto?.descripcion || 'N/A'}</td>
                <td>${qty}</td>
                <td>UND</td>
                <td>${cajas > 0 ? cajas.toFixed(2).replace(/.00$/, '') : 0}</td>
                <td class="text-right">${formatCurrency(precioU)}</td>
                <td class="text-right">${formatCurrency(rowTotal)}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer-section">
          <table class="totals-table">
            <tr><th>TOTAL DE UNIDADES:</th><td>${itemsEdit.reduce((acc, i) => acc + Number(i.cantidad), 0)}</td></tr>
            <tr><th>TOTAL DE CAJAS:</th><td>${Number(itemsEdit.reduce((acc, i) => acc + (Number(i.cantidad) / (i.producto?.unidades_por_bulto || 1)), 0)).toFixed(2).replace(/.00$/, '')}</td></tr>
            <tr><th>SUB-TOTAL:</th><td>${formatCurrency(calculatedSubtotal)}</td></tr>
            <tr><th>${isFactura ? 'IVA (16%):' : 'IVA (0%):'}</th><td>${formatCurrency(calculatedIva)}</td></tr>
            <tr><th>TOTAL GRAL:</th><td>${formatCurrency(calculatedTotal)}</td></tr>
          </table>
        </div>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 font-sans font-lato">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1">ADMINISTRACIÓN</p>
            <h1 className="text-2xl font-extrabold text-white leading-tight">Dashboard de ventas</h1>
          </div>
          
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <button onClick={() => setIsCrearModalOpen(true)} className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm text-xs transition-all">
                + Crear Pedido
              </button>
              <CurrencySwitcher isAdmin={true} />
            </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{getMesLabel()}</p>
            <p className="text-3xl font-extrabold text-dequino-secondary">{formatCurrency(metrics.totalMes)}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total cobrado</p>
            <p className="text-3xl font-extrabold text-dequino-primary">{formatCurrency(metrics.totalCobrado)}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pedidos pendientes</p>
            <div className="flex items-center gap-2.5">
              <p className="text-3xl font-extrabold text-slate-800">{metrics.pedidosPendientes}</p>
              {metrics.pedidosPendientes > 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                  Por gestionar
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-dequino-secondary">Control de pedidos</h2>
            
            <div className="bg-[#F4F1EA] p-1 rounded-2xl flex gap-1 items-center">
                  <button 
                    onClick={() => { setTab('en_proceso'); setSelectedStatus('todos'); }}
                    className={`py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${tab === 'en_proceso' ? 'bg-white text-dequino-secondary font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
                  >
                    <span>Por Procesar</span>
                    {countRegistrado > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                        {countRegistrado}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => { setTab('por_cobrar'); setSelectedStatus('todos'); }}
                    className={`py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${tab === 'por_cobrar' ? 'bg-white text-dequino-secondary font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
                  >
                    <span>Por Cobrar</span>
                    {(() => {
                      const atrasados = orders.filter(p => p.estado !== 'pagado' && esAtrasado(p)).length;
                      return atrasados > 0 ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                          {atrasados}
                        </span>
                      ) : null;
                    })()}
                  </button>
                  <button 
                    onClick={() => { setTab('pagados'); setSelectedStatus('todos'); }}
                    className={`py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${tab === 'pagados' ? 'bg-white text-dequino-secondary font-bold shadow-sm' : 'text-slate-500 hover:text-slate-700 font-medium'}`}
                  >
                    <span>Pagados</span>
                    {(() => {
                      const pagados = orders.filter(p => p.estado === 'pagado' && p.created_at.startsWith(selectedMonth)).length;
                      return pagados > 0 ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {pagados}
                        </span>
                      ) : null;
                    })()}
                  </button>
                </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as 'todos' | OrderStatus)}
                className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
              >
                <option value="todos">Todos los estados</option>
                {allowedStatuses.map(status => (
                  <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
              >
                <option value="todos">Todos los meses</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          
          {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3">Pedido</th>
                  <th className="pb-3">Vendedor</th>
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Total</th>
                    {tab === 'por_cobrar' && <th className="pb-3">Crédito</th>}
                    {tab === 'por_cobrar' && <th className="pb-3">Fecha Tope</th>}
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && orders.length === 0 ? (
                  <tr><td colSpan={tab === "por_cobrar" ? 9 : 7} className="py-8 text-center text-slate-500">Cargando pedidos...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={tab === "por_cobrar" ? 9 : 7} className="py-8 text-center text-slate-500">No hay pedidos para mostrar en esta vista.</td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="text-sm text-slate-700 hover:bg-[#FAF8F5] transition-colors py-3 border-b border-slate-100/60 cursor-pointer" onClick={() => handleSelectPedido(order)}>
                      <td className="py-3 pr-4 font-medium text-slate-900 flex items-center">
                        {order.estado === 'registrado' && !viewedRegistrados.has(order.id) && (
                          <span className="mr-2 inline-flex relative h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                        )}
                        {order.correlativo}
                      </td>
                      <td className="py-3 pr-4">{order.vendedor?.nombre ?? 'Desconocido'}</td>
                      <td className="py-3 pr-4">{order.cliente?.razon_social ?? 'Cliente Nuevo - Foto RIF'}</td>
                      <td className="py-3 pr-4">{new Date(order.created_at).toLocaleDateString('es-VE')}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                        {tab === 'por_cobrar' && (
                          <td className="py-3 pr-4 text-slate-600 font-medium">
                            {order.dias_credito ? `${order.dias_credito} días` : '-'}
                          </td>
                        )}
                        {tab === 'por_cobrar' && (
                          <td className="py-3 pr-4">
                            {order.fecha_limite_cobro ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-slate-800">{new Date(order.fecha_limite_cobro).toLocaleDateString('es-VE')}</span>
                                {esAtrasado(order) && (
                                  <span className="inline-flex items-center gap-1 w-fit rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 animate-pulse">
                                    🔴 Atrasado
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                        )}
                      <td className="py-3 pr-4">
                        <PedidoBadge estado={order.estado} />
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {order.estado === 'registrado' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'en_proceso')} className="rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Iniciar proceso
                            </button>
                          )}
                          {order.estado === 'en_proceso' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'entregado')} className="rounded-xl bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white transition-all shadow-sm">
                              Marcar Entregado
                            </button>
                          )}
                          {order.estado === 'en_revision' && (
                            <button onClick={(e) => handleStatusChange(e, order.id, 'pagado')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                              Confirmar Pago
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setSelectedPedido(null)}>
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl mt-auto mb-auto border border-dequino-tertiary/40" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#B38E5D]">Detalle del Pedido</p>
                  <h2 className="text-2xl font-black mt-1 text-dequino-secondary">{selectedPedido.correlativo}</h2>
                  
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(selectedPedido.created_at).toLocaleString('es-VE')} • Vendedor: <span className="font-semibold">{selectedPedido.vendedor?.nombre ?? 'Desconocido'}</span>
                    </p>
                    {isReadOnly && (
                      <div className="bg-slate-100 text-slate-600 font-bold text-[11px] px-3 py-1 rounded-full w-fit mt-2 border border-slate-200">
                        Pedido en solo lectura (estado: {selectedPedido.estado.replace(/_/g, ' ')})
                      </div>
                    )}

                </div>
                <button onClick={() => setSelectedPedido(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  ✕
                </button>
              </div>

              {detailLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">Cargando detalles adicionales de base de datos...</div>
              ) : (
                <>
                  {/* Customer Section */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Datos del Cliente</h3>
                    {selectedPedido.cliente?.razon_social?.includes('PENDIENTE RIF') ? (
                      <div className="space-y-3">
                        {selectedPedido.observacion?.includes('http') && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Imagen recibida:</p>
                            <a href={selectedPedido.observacion.match(/https?:\/\/\S+/)?.[0]} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-sm font-semibold">
                              Ver imagen del RIF completa
                            </a>
                            <div className="mt-2 w-48 h-32 relative bg-slate-200 rounded-lg overflow-hidden border">
                              <Image src={selectedPedido.observacion.match(/https?:\/\/\S+/)?.[0]} alt="RIF" fill className="object-cover" unoptimized />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <input placeholder="Razón Social" value={customerEdit.razon_social} onChange={e => setCustomerEdit({...customerEdit, razon_social: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="RIF/Cédula" value={customerEdit.rif_cedula} onChange={e => setCustomerEdit({...customerEdit, rif_cedula: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="Dirección" value={customerEdit.direccion} onChange={e => setCustomerEdit({...customerEdit, direccion: e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                          <input placeholder="Teléfono" value={customerEdit.telefono} onChange={e => setCustomerEdit({...customerEdit, telefono: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                          <input placeholder="Email" value={customerEdit.email} onChange={e => setCustomerEdit({...customerEdit, email: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <p className="text-xs text-sky-600 font-semibold">* Al guardar los cambios, este cliente quedará registrado y vinculado a este pedido.</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p><strong>{selectedPedido.cliente?.razon_social ?? 'Cliente Desconocido'}</strong></p>
                        <p className="text-slate-600">{selectedPedido.cliente?.rif_cedula}</p>
                        <p className="text-slate-500 mt-1">{selectedPedido.cliente?.direccion || 'Sin dirección registrada'}</p>
                      </div>
                    )}
                  </div>

                  {/* Items Section */}
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Ítems del Pedido</h3>
                      
                      {!isReadOnly && (
                        <div className="relative mb-4">

                        <input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar producto para agregar..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-sky-500"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            {searchResults.map(p => (
                              <button key={p.id} type="button" onClick={() => handleAddProduct(p)} className="flex w-full justify-between rounded-lg px-3 py-2 hover:bg-slate-50 text-left text-sm">
                                <span><strong>{formatProductName(p)}</strong> ({p.codigo})</span>
                                <span className="font-semibold text-sky-700">{formatCurrency(p.precio)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      )}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left">Producto</th>
                            <th className="px-4 py-2 text-left">Precio U. (USD)</th>
                            <th className="px-4 py-2 text-left">Cantidad</th>
                            <th className="px-4 py-2 text-right">Subtotal</th>
                            <th className="px-4 py-2 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {itemsEdit.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3">{formatProductName(item.producto)}</td>
                              <td className="px-4 py-3">{formatCurrency(item.precio_unitario || item.producto?.precio || 0)}</td>
                              <td className="px-4 py-3">
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={item.cantidad} 
                                    disabled={isReadOnly}
                                    className={`w-16 border rounded px-2 py-1 text-center outline-none focus:border-sky-500 ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}
                                    onChange={e => {
                                      const val = Math.max(1, Number(e.target.value) || 1);
                                      const newItems = [...itemsEdit];
                                      newItems[index].cantidad = val;
                                      setItemsEdit(newItems);
                                    }} 
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {formatCurrency(item.cantidad * (item.precio_unitario || item.producto?.precio || 0))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => setItemsEdit(itemsEdit.filter((_, i) => i !== index))}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {itemsEdit.length === 0 && <p className="text-sm text-rose-600 mt-2 font-semibold">Debe haber al menos 1 ítem en el pedido.</p>}
                  </div>

                  {/* Financials & Commission */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h3 className="font-semibold text-slate-800 mb-3">Comisión del Vendedor</h3>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={commissionPct} 
                              disabled={isReadOnly}
                              className={`w-20 border rounded-lg px-3 py-2 text-right outline-none focus:border-sky-500 font-semibold ${isReadOnly ? 'bg-slate-50 text-slate-600 border-none' : ''}`}
                              onChange={e => setCommissionPct(Math.max(0, Number(e.target.value) || 0))} 
                          />
                          <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          {formatCurrency(calculatedCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-white text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(calculatedSubtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">IVA (16%)</span>
                        <span className="font-semibold">{formatCurrency(calculatedIva)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t text-lg font-black text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(calculatedTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comprobante */}
                  {selectedPedido.comprobante_pago_url && (
                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
                      <h3 className="font-semibold text-sky-800 mb-2">Comprobante de Pago</h3>
                      <a href={selectedPedido.comprobante_pago_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-sm font-semibold mb-2 inline-block">
                        Ver comprobante a tamaño completo
                      </a>
                      <div className="mt-2 w-48 h-48 relative rounded-lg overflow-hidden border border-slate-300">
                        <Image src={selectedPedido.comprobante_pago_url} alt="Comprobante" fill className="object-contain bg-slate-200" unoptimized />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t w-full">
                    <div className="flex gap-2">
                      <button onClick={handleDownloadExcel} disabled={downloading} className="px-4 py-2.5 rounded-2xl border border-dequino-tertiary/60 bg-[#FAF8F5] text-dequino-secondary font-semibold hover:bg-slate-100 transition disabled:opacity-50 text-sm">
                        {downloading ? 'Generando...' : 'Descargar Excel'}
                      </button>
                      <button onClick={handlePrint} className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition text-sm">
                        Imprimir
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedPedido(null)} className="px-5 py-2.5 rounded-2xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 text-sm">
                        Cancelar
                      </button>
                    <button 
                      onClick={() => void handleSaveOrder()} 
                      disabled={savingOrder || itemsEdit.length === 0}
                      className="px-5 py-2.5 rounded-2xl bg-dequino-primary text-white font-medium hover:bg-[#6C8264] shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50 text-sm"
                    >
                      {savingOrder ? 'Guardando...' : (selectedPedido.cliente?.razon_social?.includes('PENDIENTE RIF') ? 'Registrar Cliente y Guardar Cambios' : 'Guardar Cambios')}
                    </button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    
      {isCrearModalOpen && (
        <CrearPedidoModal 
          isOpen={isCrearModalOpen} 
          onClose={() => setIsCrearModalOpen(false)} 
          sellers={sellers} 
          onCreated={() => {
            setIsCrearModalOpen(false);
            window.location.reload();
          }}
        />
      )}
</div>
  );
}

