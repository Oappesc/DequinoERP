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

  if (loading) return <div className="p-8 text-center text-slate-500 flex items-center justify-center min-h-screen">Cargando producto...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 animate-in fade-in duration-500">
      <div className="mx-auto max-w-4xl space-y-6">
        
        <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <Link href="/admin/inventario" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">
              {isNew ? 'Registrar Producto' : formData.nombre || 'Editar Producto'}
            </h1>
          </div>
          {!isNew && (
            <button type="button" onClick={handleDelete} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </header>

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0" />
            <p>Todos los productos registrados en este módulo están configurados como <strong>disponibles bajo pedido</strong>. No se requiere control de stock mínimo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
              <input required type="text" name="nombre" placeholder="Ej. Champu para mascotas" value={formData.nombre || ''} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Variante</label>
              <input required type="text" name="descripcion" placeholder="Ej. Pelaje Blanco" value={formData.descripcion || ''} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código / PT (Opcional)</label>
              <input type="text" name="codigo" placeholder="Ej. PT-12254" value={formData.codigo || ''} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tamaño / Presentación</label>
              <div className="flex gap-2">
                <input required type="number" step="0.01" name="tamano_valor" placeholder="Ej. 240" value={formData.tamano_valor ?? ''} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
                <select name="unidad_medida" value={formData.unidad_medida || 'unidad'} onChange={handleChange} className="w-32 border border-slate-200 rounded-xl px-4 py-2 bg-white outline-none focus:border-sky-500">
                  <option value="unidad">unidades</option>
                  <option value="kg">kg</option>
                  <option value="g">gramos (g)</option>
                  <option value="L">litros (L)</option>
                  <option value="mL">mililitros (mL)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio Cadena ($ USD)</label>
              <input required type="number" step="0.01" name="precio" value={formData.precio ?? 0} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio Distribuidor ($ USD)</label>
              <input required type="number" step="0.01" name="precio_mayorista" value={formData.precio_mayorista ?? 0} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-sky-500" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
