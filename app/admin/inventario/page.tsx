'use client';

import { useEffect, useState, useMemo } from 'react';
import { getInventoryItems } from '@/lib/actions_inventario';
import { Package, Search, Plus, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyProvider';
import ModalCargaMasivaInventario from '@/components/inventario/ModalCargaMasivaInventario';

export default function InventarioPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'producto'>('producto');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { formatCurrency } = useCurrency();

  const loadItems = async () => {
    setLoading(true);
    const res = await getInventoryItems('producto');
    if (res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    return items.filter(i => 
      (i.nombre && i.nombre.toLowerCase().includes(search.toLowerCase())) ||
      i.descripcion.toLowerCase().includes(search.toLowerCase()) || 
      (i.codigo && i.codigo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [items, search]);

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
              <h1 className="text-2xl font-extrabold text-white leading-tight">Inventario y Catálogo</h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium py-2.5 px-4 rounded-2xl flex items-center gap-2 transition-all text-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Carga Masiva (CSV)</span>
            </button>
            <Link 
              href={"/admin/inventario/nuevo" as any} 
              className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm transition-all text-xs font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Producto</span>
            </Link>
          </div>
        </header>

        {/* Controles: Tabs y Buscador */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="bg-[#F4F1EA] p-1 rounded-2xl inline-flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('producto')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'producto' 
                  ? 'bg-white text-dequino-secondary shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Productos
            </button>
            <button disabled className="py-2 px-4 rounded-xl text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed">
              Servicios
            </button>
            <button disabled className="py-2 px-4 rounded-xl text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed">
              Materia Prima
            </button>
          </div>
          
          <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs font-medium text-slate-800 focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center gap-2 w-full md:w-80 transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">PT</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Tamaño</th>
                  <th className="px-6 py-4 text-right">Precio Cadena</th>
                  <th className="px-6 py-4 text-right">Precio Dist.</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-400 font-medium">Cargando inventario...</td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-400 font-medium flex flex-col items-center">
                      <Package className="w-8 h-8 text-slate-300 mb-2" />
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors border-b border-slate-100/70 py-3">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.codigo || '-'}</td>
                    <td className="px-6 py-4 font-bold text-dequino-secondary text-sm">{item.nombre || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{item.descripcion || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {item.tamano_valor ? `${item.tamano_valor} ${item.unidad_medida || ''}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-extrabold text-slate-800">{formatCurrency(item.precio)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-extrabold text-dequino-primary">{item.precio_mayorista ? formatCurrency(item.precio_mayorista) : '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/inventario/${item.id}` as any}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-dequino-primary hover:text-dequino-secondary hover:bg-[#EEF3EC] rounded-xl transition-colors"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <ModalCargaMasivaInventario 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={() => {
          setIsUploadModalOpen(false);
          loadItems();
        }}
      />
    </div>
  );
}