'use client';

import { useEffect, useState, useMemo } from 'react';
import { getInventoryItems } from '@/lib/actions_inventario';
import { Package, Search, Plus, Upload, Filter, AlertTriangle, AlertCircle, CheckCircle2, Box } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Inventario y Catálogo</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Carga Masiva (CSV)</span>
            </button>
            <Link 
              href={"/admin/inventario/nuevo" as any} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Producto</span>
            </Link>
          </div>
        </header>

        {/* Controles: Tabs y Buscador */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('producto')}
              className="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors bg-white text-blue-600 shadow-sm"
            >
              Productos
            </button>
            <button disabled className="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-400 opacity-60 cursor-not-allowed">
              Servicios
            </button>
            <button disabled className="px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap text-slate-400 opacity-60 cursor-not-allowed">
              Materia Prima
            </button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">PT</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Nombre</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Descripción</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Tamaño</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Precio Cadena</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Precio Dist.</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Cargando inventario...</td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 flex flex-col items-center">
                      <Package className="w-8 h-8 text-slate-300 mb-2" />
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.codigo || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{item.nombre || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{item.descripcion || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.tamano_valor ? `${item.tamano_valor} ${item.unidad_medida || ''}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-blue-600">{formatCurrency(item.precio)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-emerald-600">{item.precio_mayorista ? formatCurrency(item.precio_mayorista) : '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/inventario/${item.id}` as any}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
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