'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClienteDetail, deleteCliente, toggleClienteStatus, createClienteNota } from '@/lib/actions_clientes';
import { ArrowLeft, User, Phone, Mail, MapPin, Edit, Trash2, Calendar, ShoppingCart, DollarSign, Download, FileText, X, MessageSquare, ChevronDown, ChevronUp, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyProvider';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  
  // Notes
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    const res = await createClienteNota(params.id as string, newNote);
    if (!res.error) {
      setNewNote('');
      loadData();
    } else {
      alert(res.error);
    }
    setSavingNote(false);
  };

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getClienteDetail(params.id as string);
    if (res.error) setError(res.error);
    else setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente permanentemente?')) return;
    const res = await deleteCliente(params.id as string);
    if (res.error) {
      alert(res.error);
    } else {
      router.push('/admin/clientes');
    }
  };

  const handleToggle = async () => {
    const res = await toggleClienteStatus(params.id as string, data.cliente.activo);
    if (res.error) {
      alert(res.error);
    } else {
      loadData();
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando detalles...</div>;
  if (error || !data) return <div className="p-8 text-center text-red-500">{error || 'No encontrado'}</div>;

  const { cliente, orders, kpis, topProducts, notas } = data;
  const paginatedOrders = orders.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // Status mapping
  const statusColors: any = {
    registrado: 'bg-slate-100 text-slate-600 border-slate-200',
    por_procesar: 'bg-orange-100 text-orange-700 border-orange-200',
    pedido_entregado: 'bg-blue-100 text-blue-700 border-blue-200',
    pago_en_revision: 'bg-purple-100 text-purple-700 border-purple-200',
    pagado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  const statusLabels: any = {
    registrado: 'Registrado',
    por_procesar: 'Por Procesar',
    pedido_entregado: 'Entregado (Por Cobrar)',
    pago_en_revision: 'Pago en Revisión',
    pagado: 'Pagado',
  };

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Cabecera Superior Banner */}
        <div className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link href="/admin/clientes" className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex-shrink-0 mt-0.5">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1">
                ADMINISTRACIÓN DE CLIENTES
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold text-white leading-tight">{cliente.razon_social}</h1>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${cliente.activo ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
                  {cliente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2 text-xs text-white/80 font-normal">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#B38E5D]" />
                  <span className="font-mono">{cliente.rif_cedula}</span>
                </div>
                {cliente.telefono && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#B38E5D]" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#B38E5D]" />
                    <span>{cliente.email}</span>
                  </div>
                )}
                {cliente.direccion && (
                  <div className="flex items-center gap-1.5 w-full md:w-auto">
                    <MapPin className="w-3.5 h-3.5 text-[#B38E5D]" />
                    <span className="truncate max-w-md">{cliente.direccion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button 
              onClick={() => alert('Edición disponible próximamente')} 
              className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-3 py-2 text-xs border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
            <button 
              onClick={handleToggle} 
              className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-3 py-2 text-xs border border-white/10 transition-all font-medium"
            >
              {cliente.activo ? 'Inactivar' : 'Activar'}
            </button>
            <button 
              onClick={handleDelete} 
              className="bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-200 rounded-2xl px-3 py-2 text-xs border border-white/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sección de Notas */}
        <div className="bg-[#FFFDF9] border border-amber-200/60 rounded-2xl p-4 shadow-sm overflow-hidden">
          <div 
            className="flex justify-between items-center cursor-pointer p-1"
            onClick={() => setShowNotes(!showNotes)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 flex items-center justify-center text-amber-700">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Notas Internas
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{notas?.length || 0}</span>
                </h3>
                <p className="text-xs text-slate-500">Apuntes, recordatorios o seguimientos de este cliente.</p>
              </div>
            </div>
            {showNotes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {showNotes && (
            <div className="pt-4 mt-3 border-t border-amber-200/40 space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input 
                  type="text" 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Escribe una nueva nota..."
                  className="flex-grow rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-dequino-primary focus:ring-1 focus:ring-dequino-primary/20"
                  disabled={savingNote}
                />
                <button 
                  type="submit" 
                  disabled={savingNote || !newNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-dequino-primary hover:bg-[#6C8264] rounded-xl transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {savingNote ? 'Guardando...' : 'Guardar'}
                </button>
              </form>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(notas || []).map((nota: any) => (
                  <div key={nota.id} className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {new Date(nota.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(!notas || notas.length === 0) && (
                  <p className="text-center text-xs text-slate-400 py-3">No hay notas para este cliente.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</p>
              <div className="w-8 h-8 rounded-xl bg-[#EEF3EC] text-dequino-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-dequino-primary">{formatCurrency(kpis.avgOrder)}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Comprado</p>
              <div className="w-8 h-8 rounded-xl bg-[#EEF3EC] text-dequino-secondary flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-dequino-secondary">{formatCurrency(kpis.totalSpent)}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Pendiente</p>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-rose-600">{formatCurrency(kpis.pendingSales)}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Última Compra</p>
              <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-slate-500 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-800 mt-1">
              {kpis.lastOrderDate ? formatDistanceToNow(new Date(kpis.lastOrderDate), { addSuffix: true, locale: es }) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historial de Órdenes */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Historial de Órdenes</h3>
              <span className="text-xs font-bold bg-[#FAF8F5] text-slate-600 px-3 py-1 rounded-full border border-slate-200/60">{orders.length} pedidos</span>
            </div>
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3 font-extrabold">Código</th>
                    <th className="px-6 py-3 font-extrabold">Fecha</th>
                    <th className="px-6 py-3 font-extrabold">Vendedor</th>
                    <th className="px-6 py-3 font-extrabold text-right">Monto</th>
                    <th className="px-6 py-3 font-extrabold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {paginatedOrders.map((o: any) => (
                    <tr 
                      key={o.id} 
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800">{o.correlativo || `PED-${o.id.substring(0,6)}`}</td>
                      <td className="px-6 py-3.5 text-slate-600">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-slate-700">{o.vendedor?.nombre || 'N/A'}</td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-slate-800">{formatCurrency(o.total)}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[o.estado] || 'bg-slate-100 text-slate-700'}`}>
                          {statusLabels[o.estado] || o.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">Este cliente no tiene pedidos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#FAF8F5]/40">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500 font-medium">Página {page} de {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          {/* Productos Más Comprados */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-800 mb-6 tracking-tight">Top Productos</h3>
            <div className="space-y-3">
              {topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 overflow-hidden pr-3">
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-[#EEF3EC] text-dequino-secondary font-bold rounded-full text-xs">
                      {i + 1}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate text-xs">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{p.qty} unidades compradas</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-dequino-secondary text-xs">{formatCurrency(p.total)}</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">Sin compras registradas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Solo Lectura */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-[#FAF8F5]">
              <div>
                <h2 className="text-lg font-bold text-dequino-secondary">
                  Pedido {selectedOrder.correlativo || `PED-${selectedOrder.id.substring(0,6)}`}
                </h2>
                <p className="text-xs text-slate-500">Solo lectura</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              <div className="bg-[#FAF8F5]/60 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</p>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[selectedOrder.estado]}`}>
                    {statusLabels[selectedOrder.estado] || selectedOrder.estado}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedOrder.vendedor?.nombre}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto Total</p>
                  <p className="text-sm font-extrabold text-dequino-secondary mt-0.5">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ítems del Pedido</h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-slate-100">
                      <tr className="text-slate-400 text-[10px] font-bold uppercase">
                        <th className="px-4 py-2.5">Producto</th>
                        <th className="px-4 py-2.5 text-center">Cant.</th>
                        <th className="px-4 py-2.5 text-right">Precio</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                      {(selectedOrder.detalles || []).map((d: any) => (
                        <tr key={d.id} className="hover:bg-[#FAF8F5]/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{d.producto?.descripcion || 'Producto no encontrado'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">{d.cantidad}</td>
                          <td className="px-4 py-3 text-right text-slate-600 font-medium">{formatCurrency(d.precio_unitario)}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-dequino-secondary">{formatCurrency(d.cantidad * d.precio_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-[#FAF8F5] flex justify-end gap-2.5">
              <button 
                onClick={() => alert('Descarga Excel disponible pronto.')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-dequino-secondary bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-dequino-primary" />
                Descargar Excel
              </button>
              <button 
                onClick={() => alert('Descarga PDF disponible pronto.')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-dequino-primary hover:bg-[#6C8264] rounded-2xl transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
