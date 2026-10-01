'use client';
import { useEffect, useState, useMemo } from 'react';
import { getClientesData, toggleClienteStatus, ClienteStats } from '@/lib/actions_clientes';
import { Search, Plus, UploadCloud, Edit, MoreVertical, ArrowLeft, CheckCircle, XCircle, Users } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Gestión de Clientes</h1>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySwitcher />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{kpis.activos}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes Inactivos</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">{kpis.inactivos}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Clientes</p>
              <p className="text-3xl font-bold text-violet-600 mt-2">{kpis.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, RIF o dirección..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 flex-grow lg:flex-grow-0"
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
            
            <button 
              onClick={() => setModalCarga(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex-grow lg:flex-grow-0"
            >
              <UploadCloud className="w-4 h-4" />
              Carga Masiva
            </button>
            <button 
              onClick={() => setModalRegistrar(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex-grow lg:flex-grow-0"
            >
              <Plus className="w-4 h-4" />
              Registrar
            </button>
          </div>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">Cliente</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-center">Estatus</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">RIF / Cédula</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Top Producto</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-center">Órdenes</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Última Compra</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Total Gastado</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Ticket Promedio</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">Cargando clientes...</td>
                  </tr>
                ) : filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">No se encontraron clientes.</td>
                  </tr>
                ) : (
                  filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{c.razon_social}</p>
                        {c.telefono && <p className="text-xs text-slate-500 mt-0.5">{c.telefono}</p>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleToggleStatus(c.id, c.activo ?? true)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            c.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                          title="Click para cambiar estatus"
                        >
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">{c.rif_cedula}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block max-w-[140px] truncate px-2 py-1 bg-slate-100 rounded text-slate-600 text-xs">
                          {c.topProduct}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">{c.totalOrders}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {c.lastOrderDate ? formatDistanceToNow(new Date(c.lastOrderDate), { addSuffix: true, locale: es }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">
                        {formatCurrency(c.totalSpent)}
                        {c.hasDebt && <span className="block text-[10px] text-rose-500 font-medium">Deuda Pendiente</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {c.totalOrders > 0 ? formatCurrency(c.totalSpent / c.totalOrders) : '$0.00'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link href={`/admin/clientes/${c.id}` as any} className="p-1.5 inline-block text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
