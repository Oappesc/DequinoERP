'use client';
import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { createCliente } from '@/lib/actions_clientes';

export default function ModalRegistrarCliente({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createCliente({
      razon_social: formData.get('razon_social') as string,
      rif_cedula: formData.get('rif_cedula') as string,
      direccion: formData.get('direccion') as string,
      telefono: formData.get('telefono') as string,
      email: formData.get('email') as string,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-dequino-tertiary/40">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#FAF8F5]">
          <div>
            <span className="text-[10px] font-semibold tracking-widest text-[#B38E5D] uppercase mb-0.5 block">FORMULARIO</span>
            <h2 className="text-xl font-bold text-dequino-secondary">Registrar Cliente</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Razón Social / Nombre *</label>
            <input 
              required 
              name="razon_social" 
              type="text" 
              className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              placeholder="Ej. Inversiones ABC, C.A."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">RIF / Cédula *</label>
            <input 
              required 
              name="rif_cedula" 
              type="text" 
              className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              placeholder="Ej. J-12345678-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dirección</label>
            <input 
              name="direccion" 
              type="text" 
              className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
              placeholder="Dirección fiscal o de entrega"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Teléfono</label>
              <input 
                name="telefono" 
                type="tel" 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
                placeholder="0414-0000000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Email</label>
              <input 
                name="email" 
                type="email" 
                className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all" 
                placeholder="correo@empresa.com"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-dequino-primary hover:bg-[#6C8264] rounded-2xl shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
