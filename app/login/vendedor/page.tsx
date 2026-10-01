'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSeller } from '@/lib/actions';
import { CreditCard, ArrowRight, HelpCircle } from 'lucide-react';

export default function SellerLoginPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginSeller(cedula);
    if (result.error) setError(result.error);
    else router.replace('/vendedor');
    setLoading(false);
  }

  return (
    <main className="bg-gradient-to-b from-[#FFFDF9] to-dequino-neutral min-h-screen flex flex-col items-center justify-between p-6 font-lato">
      
      {/* Cabecera */}
      <div className="flex flex-col items-center mt-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B38E5D] to-[#8C6D45] flex items-center justify-center shadow-lg mb-4 text-white font-black text-2xl tracking-tighter">
          DQ
        </div>
        <p className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1">Portal Comercial</p>
        <h1 className="text-2xl font-bold text-dequino-secondary flex gap-2">
          Dequino <span className="font-normal text-dequino-primary">ERP</span>
        </h1>
      </div>

      {/* Tarjeta Central */}
      <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5 w-full max-w-sm border border-dequino-tertiary/40 flex flex-col relative my-auto">
        <div className="w-12 h-1 bg-gradient-to-r from-dequino-primary to-[#D1DDD0] rounded-full mx-auto mb-6"></div>
        
        <h2 className="text-xl font-bold text-dequino-secondary mb-1">Ingreso de vendedor</h2>
        <p className="text-sm text-slate-500 mb-6">Identifícate con tu número de cédula.</p>

        <form onSubmit={submit} className="flex flex-col">
          <div className="mb-4">
            <label htmlFor="cedula" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Número de cédula
            </label>
            <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center px-4 py-3 transition-all duration-200">
              <CreditCard className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input 
                id="cedula" 
                value={cedula} 
                onChange={(event) => setCedula(event.target.value)} 
                required 
                autoFocus 
                inputMode="numeric" 
                className="text-slate-800 placeholder-slate-400 text-sm w-full outline-none bg-transparent" 
                placeholder="Ej: 20234567" 
              />
            </div>
          </div>
          
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-2 border border-rose-100 text-center">
              {error}
            </p>
          )}

          <button 
            disabled={loading} 
            className="w-full mt-6 bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Validando...' : 'Ingresar'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Enlace Soporte */}
        <div className="text-xs text-slate-400 hover:text-dequino-secondary cursor-pointer mt-6 text-center flex items-center justify-center gap-1.5 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
          ¿Problemas para acceder? Contactar soporte
        </div>
      </div>

      {/* Footer Inferior */}
      <footer className="text-center pb-4">
        <p className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
          Dequino Laboratorios & Cuidado Personal
        </p>
        <span className="text-[9px] text-slate-400 block mt-0.5">
          Sistema de Ventas v2.4
        </span>
      </footer>

    </main>
  );
}