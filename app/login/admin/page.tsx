'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, requestAdminPasswordReset } from '@/lib/actions';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginAdmin(email, password);
    if (result.error) setError(result.error);
    else router.replace('/admin');
    setLoading(false);
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError('Escribe tu correo para solicitar la recuperación.');
      return;
    }
    setError('');
    const result = await requestAdminPasswordReset(email);
    setMessage(result.error ? '' : 'Revisa tu correo para restablecer la contraseña.');
    if (result.error) setError(result.error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFDF9] to-dequino-neutral flex flex-col items-center justify-between p-6 font-sans font-lato">
      
      {/* Cabecera Superior */}
      <div className="flex flex-col items-center mt-8">
        <img src="/logo-dequino.png" alt="Dequino Logo" className="h-16 w-auto object-contain mx-auto mb-2 drop-shadow-sm" />
        <p className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mt-3 mb-1">
          PANEL DE CONTROL
        </p>
        <h1 className="text-3xl font-bold text-dequino-secondary flex items-center gap-2">
          Dequino <span className="text-dequino-primary font-normal">ERP</span>
        </h1>
      </div>

      {/* Tarjeta Central del Formulario */}
      <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5 w-full max-w-sm border border-dequino-tertiary/40 flex flex-col relative my-auto">
        {/* Pastilla decorativa superior */}
        <div className="w-12 h-1 bg-gradient-to-r from-dequino-primary to-dequino-tertiary rounded-full mx-auto mb-6" />

        <h2 className="text-xl font-bold text-dequino-secondary mb-1">
          Acceso administrativo
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Gestiona pedidos, pagos y reportes.
        </p>

        <form onSubmit={submit} className="flex flex-col">
          {/* Campo Correo Electrónico */}
          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              CORREO ELECTRÓNICO
            </label>
            <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center px-4 py-3 transition-all">
              <Mail className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="text-slate-800 placeholder-slate-400 text-sm w-full outline-none bg-transparent"
                placeholder="admin@empresa.com"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              CONTRASEÑA
            </label>
            <div className="rounded-2xl border border-slate-200 bg-[#FCFCFA] focus-within:border-dequino-primary focus-within:ring-2 focus-within:ring-dequino-primary/20 flex items-center px-4 py-3 transition-all">
              <Lock className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="text-slate-800 placeholder-slate-400 text-sm w-full outline-none bg-transparent"
                placeholder="Tu contraseña"
              />
            </div>
          </div>

          {/* Mensajes de error / éxito */}
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-1 mb-2 border border-rose-100 text-center">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mt-1 mb-2 border border-emerald-100 text-center">
              {message}
            </p>
          ) : null}

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Validando...' : (
              <>
                <span>Ingresar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Enlace Olvidé mi contraseña */}
          <button
            type="button"
            onClick={() => void forgotPassword()}
            className="text-xs text-slate-400 hover:text-dequino-secondary font-medium transition-colors text-center mt-5 block w-full"
          >
            Olvidé mi contraseña
          </button>
        </form>
      </div>

      {/* Footer Inferior */}
      <footer className="text-center pb-4 mt-6">
        <p className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold text-center">
          DEQUINO LABORATORIOS & CUIDADO PERSONAL
        </p>
        <span className="text-[9px] text-slate-400 block mt-0.5 text-center">
          Panel Administrativo v2.4
        </span>
      </footer>

    </main>
  );
}