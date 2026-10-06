'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInventoryItemDetail, saveInventoryItem, deleteInventoryItem } from '@/lib/actions_inventario';
import { ArrowLeft, Save, Trash2, Info } from 'lucide-react';
import Link from 'next/link';

export default function InventarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;
  const isNew = id === 'nuevo';
  
  const [initialData, setInitialData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    nombre: '',
    descripcion: '',
    codigo: '',
    tipo: 'producto',
    tamano_valor: '',
    unidad_medida: 'unidad',
    precio: 0,
    precio_mayorista: 0,
    bajo_pedido: true,
    activo: true,
    stock: 0
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!isNew && id) {
        setLoading(true);
        const res = await getInventoryItemDetail(id);
        if (res.data) {
          setInitialData(res.data.producto);
          setFormData(res.data.producto);
        } else {
          alert('Error cargando producto: ' + res.error);
        }
        setLoading(false);
      }
    };
    init();
  }, [id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'number') val = value === '' ? '' : (parseFloat(value) || 0);
    if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
    setFormData((prev: any) => ({ ...prev, [name]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let submitData: any = {};
    if (isNew) {
      submitData = { ...formData, bajo_pedido: true, stock: 0, tipo: 'producto' };
    } else {
      // Calculate delta
      submitData.id = id;
      for (const key of Object.keys(formData)) {
        if (initialData && formData[key] !== initialData[key]) {
          submitData[key] = formData[key];
        }
      }
      
      if (Object.keys(submitData).length === 1) { // Only ID is present
        alert('No hay cambios para guardar');
        setSaving(false);
        router.push('/admin/inventario');
        return;
      }
    }
    
    const res = await saveInventoryItem(submitData);
    setSaving(false);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Producto guardado exitosamente');
      router.push(`/admin/inventario`);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Seguro de eliminar este producto?')) return;
    const res = await deleteInventoryItem(id);
    if (!res.error) router.push('/admin/inventario');
  };

  if (loading) return <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-screen font-sans font-lato">Cargando producto...</div>;

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato animate-in fade-in duration-500">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Banner Superior */}
        <div className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/inventario" className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1 block">
                ADMINISTRACIÓN
              </span>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                {isNew ? 'Registrar Producto' : `Editar: ${formData.nombre || 'Producto'}`}
              </h1>
            </div>
          </div>
          {!isNew && (
            <button 
              type="button" 
              onClick={handleDelete} 
              className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl transition-colors"
              title="Eliminar producto"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Banner Informativo */}
        <div className="bg-[#F4F7F3] border border-dequino-tertiary/60 rounded-2xl p-4 text-xs text-dequino-secondary flex items-center gap-3 mb-6">
          <Info className="w-5 h-5 shrink-0 text-dequino-primary" />
          <p>
            Todos los productos registrados en este módulo están configurados como <strong className="font-bold">disponibles bajo pedido</strong>. No se requiere control de stock mínimo.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nombre del Producto</label>
              <input 
                required 
                type="text" 
                name="nombre" 
                placeholder="Ej. Talco para gatos" 
                value={formData.nombre || ''} 
                onChange={handleChange} 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Descripción / Variante</label>
              <input 
                required 
                type="text" 
                name="descripcion" 
                placeholder="Ej. Antipulgas y Garrapatas" 
                value={formData.descripcion || ''} 
                onChange={handleChange} 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Código / PT (Opcional)</label>
              <input 
                type="text" 
                name="codigo" 
                placeholder="Ej. PT-252" 
                value={formData.codigo || ''} 
                onChange={handleChange} 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tamaño / Presentación</label>
              <div className="flex gap-2">
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  name="tamano_valor" 
                  placeholder="Ej. 225" 
                  value={formData.tamano_valor ?? ''} 
                  onChange={handleChange} 
                  className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
                />
                <select 
                  name="unidad_medida" 
                  value={formData.unidad_medida || 'unidad'} 
                  onChange={handleChange} 
                  className="w-36 rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
                >
                  <option value="unidad">unidades</option>
                  <option value="kg">kg</option>
                  <option value="g">gramos (g)</option>
                  <option value="L">litros (L)</option>
                  <option value="mL">mililitros (mL)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Precio Cadena ($ USD)</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                name="precio" 
                value={formData.precio ?? 0} 
                onChange={handleChange} 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Precio Distribuidor ($ USD)</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                name="precio_mayorista" 
                value={formData.precio_mayorista ?? 0} 
                onChange={handleChange} 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={saving} 
              className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3.5 px-7 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all text-sm ml-auto disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
