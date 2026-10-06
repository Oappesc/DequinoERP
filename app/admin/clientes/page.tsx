'use client';
import { useEffect, useState, useMemo } from 'react';
import { getClientesData, toggleClienteStatus, ClienteStats } from '@/lib/actions_clientes';
import { Search, Plus, UploadCloud, Edit, ArrowLeft, CheckCircle, XCircle, Users } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import Link from 'next/link';
import ModalRegistrarCliente from '@/components/clientes/ModalRegistrarCliente';
import ModalCargaMasiva from '@/components/clientes/ModalCargaMasiva';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [modalRegistrar, setModalRegistrar] = useState(false);
  const [modalCarga, setModalCarga] = useState(false);
  
  const { formatCurrency } = useCurrency();

  const loadData = async () => {
    setLoading(true);
    const res = await getClientesData();
    if (res.data) setClientes(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    // optimistic update
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: !currentStatus } : c));
    await toggleClienteStatus(id, currentStatus);
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // 1. Search Filter
      const term = search.toLowerCase();
      const matchSearch = 
        c.razon_social.toLowerCase().includes(term) || 
        c.rif_cedula.toLowerCase().includes(term) ||
        (c.direccion && c.direccion.toLowerCase().includes(term));
      
      if (!matchSearch) return false;

      // 2. Select Filter
      if (filter === 'activos') return c.activo;
      if (filter === 'inactivos') return !c.activo;
      if (filter === 'con_deuda') return c.hasDebt;

      return true;
    }).sort((a, b) => {
      if (filter === 'mayor_volumen') return b.totalSpent - a.totalSpent;
      if (filter === 'menor_volumen') return a.totalSpent - b.totalSpent;
      return 0; // maintain original alphabetical sort if 'todos' or others
    });
  }, [clientes, search, filter]);

  // KPIs
  const kpis = {
    total: clientes.length,
    activos: clientes.filter(c => c.activo).length,
    inactivos: clientes.filter(c => !c.activo).length,
  };

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER / BANNER */}
        <header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors" title="Volver al Dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1 block">ADMINISTRACIÓN</span>
              <h1 className="text-2xl font-extrabold text-white leading-tight">Gestión de Clientes</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <CurrencySwitcher />
            <button 
              onClick={() => setModalCarga(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium py-2.5 px-4 rounded-2xl flex items-center gap-2 transition-all text-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Carga Masiva</span>
            </button>
            <button 
              onClick={() => setModalRegistrar(true)}
              className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm transition-all text-xs font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Cliente</span>
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clientes Activos</p>
              <p className="text-3xl font-extrabold text-dequino-primary mt-1">{kpis.activos}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#EEF3EC] flex items-center justify-center text-dequino-secondary">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clientes Inactivos</p>
              <p className="text-3xl font-extrabold text-slate-700 mt-1">{kpis.inactivos}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Clientes</p>
              <p className="text-3xl font-extrabold text-dequino-secondary mt-1">{kpis.total}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-slate-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-800 focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center gap-2 w-full lg:w-96 transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, RIF o dirección..."
              className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select 
              className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all flex-grow lg:flex-grow-0"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="todos">Todos los clientes</option>
              <option value="con_deuda">Con deudas</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="mayor_volumen">Mayor volumen ($)</option>
              <option value="menor_volumen">Menor volumen ($)</option>
            </select>
          </div>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="pb-3 px-4 text-center">Estatus</th>
                  <th className="pb-3 px-4">RIF / Cédula</th>
                  <th className="pb-3 px-4">Top Producto</th>
                  <th className="pb-3 px-4 text-center">Órdenes</th>
                  <th className="pb-3 px-4">Última Compra</th>
                  <th className="pb-3 px-4 text-right">Total Gastado</th>
                  <th className="pb-3 px-4 text-right">Ticket Promedio</th>
                  <th className="pb-3 pl-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-xs text-slate-400 font-medium">Cargando clientes...</td>
                  </tr>
                ) : filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-xs text-slate-400 font-medium">No se encontraron clientes.</td>
                  </tr>
                ) : (
                  filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                      <td className="py-3 pr-4">
                        <p className="font-bold text-dequino-secondary text-sm">{c.razon_social}</p>
                        {c.telefono && <p className="text-xs text-slate-400 mt-0.5">{c.telefono}</p>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleToggleStatus(c.id, c.activo ?? true)}
                          className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-full transition-all ${
                            c.activo 
                              ? 'bg-[#EEF3EC] text-dequino-secondary border border-dequino-tertiary/60 hover:bg-rose-50 hover:text-rose-700' 
                              : 'bg-slate-100 text-slate-600 hover:bg-[#EEF3EC] hover:text-dequino-secondary'
                          }`}
                          title="Click para cambiar estatus"
                        >
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{c.rif_cedula}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block max-w-[140px] truncate px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-xs">
                          {c.topProduct}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">{c.totalOrders}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {c.lastOrderDate ? formatDistanceToNow(new Date(c.lastOrderDate), { addSuffix: true, locale: es }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                        {formatCurrency(c.totalSpent)}
                        {c.hasDebt && <span className="block text-[10px] text-rose-500 font-medium">Deuda Pendiente</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {c.totalOrders > 0 ? formatCurrency(c.totalSpent / c.totalOrders) : '$0.00'}
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <Link 
                          href={`/admin/clientes/${c.id}` as any} 
                          className="p-2 inline-flex items-center justify-center text-dequino-primary hover:text-dequino-secondary hover:bg-[#EEF3EC] rounded-xl transition-colors"
                          title="Editar Cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {modalRegistrar && (
        <ModalRegistrarCliente 
          onClose={() => setModalRegistrar(false)} 
          onSuccess={() => { setModalRegistrar(false); loadData(); }} 
        />
      )}

      {modalCarga && (
        <ModalCargaMasiva 
          onClose={() => setModalCarga(false)} 
          onSuccess={() => { setModalCarga(false); loadData(); }} 
        />
      )}
    </div>
  );
}
