'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClientesConsignacion, saveClienteConsignacion } from '@/lib/actions_consignacion';
import { useCurrency } from '@/components/CurrencyProvider';
import { Plus, Search, Eye, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Banner Superior */}
        <header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors" title="Volver al Dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1 block">ADMINISTRACIÓN</span>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                Gestión de Consignaciones
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm transition-all text-xs font-sans self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </header>

        {/* Contenedor de Tabla y Buscador */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden">
          <div className="pb-4 flex gap-4">
            <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-800 focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center gap-2 w-full max-w-md transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar por RIF o Razón Social..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4 whitespace-nowrap">Cliente</th>
                  <th className="pb-3 px-4 whitespace-nowrap">Estatus</th>
                  <th className="pb-3 px-4 whitespace-nowrap">Último Pedido</th>
                  <th className="pb-3 px-4 whitespace-nowrap">Último Corte</th>
                  <th className="pb-3 px-4 text-right whitespace-nowrap">Deuda Total</th>
                  <th className="pb-3 pl-4 text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">Cargando clientes...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-medium">No hay clientes registrados en consignación.</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-dequino-secondary text-sm">{c.razon_social}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.rif_cedula}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                        c.activo 
                          ? 'bg-[#EEF3EC] text-dequino-secondary border border-dequino-tertiary/60' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('es-VE') : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {c.ultimo_corte ? new Date(c.ultimo_corte).toLocaleDateString('es-VE') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(c.deuda_total || 0)}
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center justify-center">
                        <Link 
                          href={`/admin/consignacion/${c.id}`} 
                          className="p-2 text-dequino-primary hover:text-dequino-secondary hover:bg-[#EEF3EC] rounded-xl transition-colors inline-flex items-center justify-center" 
                          title="Ver Dashboard"
                        >
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
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-dequino-tertiary/40">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-0.5 block">NUEVO REGISTRO</span>
                <h3 className="text-xl font-bold text-dequino-secondary">Cliente Consignación</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-100 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">RIF / Cédula</label>
                  <input required type="text" value={formData.rif_cedula} onChange={e => setFormData({...formData, rif_cedula: e.target.value})} className="w-full border border-slate-200 bg-[#FCFCFA] rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full border border-slate-200 bg-[#FCFCFA] rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Razón Social / Nombre</label>
                  <input required type="text" value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full border border-slate-200 bg-[#FCFCFA] rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dirección (Opcional)</label>
                  <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full border border-slate-200 bg-[#FCFCFA] rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl font-medium transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-dequino-primary text-white px-6 py-2.5 rounded-2xl font-medium hover:bg-[#6C8264] shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50 text-sm">
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
