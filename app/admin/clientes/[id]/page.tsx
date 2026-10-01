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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Cabecera Horizontal */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div className="flex items-start gap-4">
              <Link href="/admin/clientes" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{cliente.razon_social}</h1>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${cliente.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {cliente.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{cliente.rif_cedula}</span>
                  </div>
                  {cliente.telefono && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  {cliente.direccion && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 w-full md:w-auto">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate max-w-md">{cliente.direccion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-11 md:ml-0">
              <button onClick={() => alert('Edición disponible próximamente')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                <Edit className="w-5 h-5" />
              </button>
              <button 
                onClick={handleToggle} 
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${cliente.activo ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
              >
                {cliente.activo ? 'Inactivar' : 'Activar'}
              </button>
              <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        
        {/* Sección de Notas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div 
            className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setShowNotes(!showNotes)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Notas Internas
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">{notas?.length || 0}</span>
                </h3>
                <p className="text-sm text-slate-500">Apuntes, recordatorios o seguimientos de este cliente.</p>
              </div>
            </div>
            {showNotes ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </div>

          {showNotes && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
              <form onSubmit={handleAddNote} className="flex gap-3">
                <input 
                  type="text" 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Escribe una nueva nota..."
                  className="flex-grow rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  disabled={savingNote}
                />
                <button 
                  type="submit" 
                  disabled={savingNote || !newNote.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {savingNote ? 'Guardando...' : 'Guardar'}
                </button>
              </form>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {(notas || []).map((nota: any) => (
                  <div key={nota.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{nota.contenido}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">
                      {new Date(nota.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(!notas || notas.length === 0) && (
                  <p className="text-center text-sm text-slate-500 py-4">No hay notas para este cliente.</p>
                )}
              </div>
            </div>
          )}
        </div>


        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Ticket Promedio</p>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.avgOrder)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Total Comprado</p>
              <ShoppingCart className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(kpis.totalSpent)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Deuda Pendiente</p>
              <FileText className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-600">{formatCurrency(kpis.pendingSales)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Última Compra</p>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {kpis.lastOrderDate ? formatDistanceToNow(new Date(kpis.lastOrderDate), { addSuffix: true, locale: es }) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historial de Órdenes */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Historial de Órdenes</h3>
              <span className="text-sm font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{orders.length} pedidos</span>
            </div>
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600">Código</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Fecha</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Vendedor</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">Monto</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((o: any) => (
                    <tr 
                      key={o.id} 
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono text-slate-900">{o.correlativo || `PED-${o.id.substring(0,6)}`}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-slate-700">{o.vendedor?.nombre || 'N/A'}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(o.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[o.estado] || 'bg-slate-100 text-slate-700'}`}>
                          {statusLabels[o.estado] || o.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">Este cliente no tiene pedidos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          {/* Productos Más Comprados */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Top Productos</h3>
            <div className="space-y-4">
              {topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4 overflow-hidden pr-4">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-blue-100 text-blue-600 font-bold rounded-full text-sm">
                      {i + 1}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-sm text-slate-500">{p.qty} unidades compradas</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-emerald-600">{formatCurrency(p.total)}</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">Sin compras registradas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Solo Lectura */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Pedido {selectedOrder.correlativo || `PED-${selectedOrder.id.substring(0,6)}`}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Solo lectura</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Fecha</p>
                  <p className="text-sm font-medium text-slate-900">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Estado</p>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedOrder.estado]}`}>
                    {statusLabels[selectedOrder.estado] || selectedOrder.estado}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Vendedor</p>
                  <p className="text-sm font-medium text-slate-900">{selectedOrder.vendedor?.nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Monto Total</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase">Ítems del Pedido</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-semibold text-slate-600">Producto</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-center">Cant.</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-right">Precio</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedOrder.detalles || []).map((d: any) => (
                        <tr key={d.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{d.producto?.descripcion || 'Producto no encontrado'}</td>
                          <td className="px-4 py-3 text-center">{d.cantidad}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(d.precio_unitario)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(d.cantidad * d.precio_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => alert('Descarga Excel disponible pronto.')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Excel
              </button>
              <button 
                onClick={() => alert('Descarga PDF disponible pronto.')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors"
              >
                <FileText className="w-4 h-4" />
                Imprimir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
