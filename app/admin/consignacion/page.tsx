'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClientesConsignacion, saveClienteConsignacion } from '@/lib/actions_consignacion';
import { useCurrency } from '@/components/CurrencyProvider';
import { Plus, Search, Eye, Edit, Power, Store } from 'lucide-react';

export default function ConsignacionPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { formatCurrency } = useCurrency();

  // Modal de registro
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    rif_cedula: '',
    razon_social: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: ''
  });

  const loadClientes = async () => {
    setLoading(true);
    const res = await getClientesConsignacion();
    if (res.data) setClientes(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveClienteConsignacion(formData);
    setSaving(false);
    if (!res.error) {
      setShowModal(false);
      setFormData({ rif_cedula: '', razon_social: '', telefono: '', email: '', direccion: '', notas: '' });
      loadClientes();
    } else {
      alert('Error: ' + res.error);
    }
  };

  const filtered = clientes.filter(c => 
    c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    c.rif_cedula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Store className="w-7 h-7 text-violet-600" />
              Gestión de Consignaciones
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Panel administrativo de clientes y liquidaciones.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm shadow-violet-200"
          >
            <Plus className="w-5 h-5" />
            Registrar Cliente
          </button>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por RIF o Razón Social..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                  <th className="p-4 font-semibold whitespace-nowrap">Cliente</th>
                  <th className="p-4 font-semibold whitespace-nowrap">Estatus</th>
                  <th className="p-4 font-semibold whitespace-nowrap">Último Pedido</th>
                  <th className="p-4 font-semibold whitespace-nowrap">Último Corte</th>
                  <th className="p-4 font-semibold whitespace-nowrap text-right">Deuda Total</th>
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Cargando clientes...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay clientes registrados en consignación.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{c.razon_social}</div>
                      <div className="text-sm text-slate-500">{c.rif_cedula}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        c.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {c.ultimo_corte ? new Date(c.ultimo_corte).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-right font-medium text-rose-600 whitespace-nowrap">
                      {formatCurrency(c.deuda_total || 0)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/consignacion/${c.id}`} className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors" title="Ver Dashboard">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Nuevo Cliente Consignación</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">RIF / Cédula</label>
                  <input required type="text" value={formData.rif_cedula} onChange={e => setFormData({...formData, rif_cedula: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-500" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social / Nombre</label>
                  <input required type="text" value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección (Opcional)</label>
                  <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-violet-500" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
