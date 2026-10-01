'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, requestAdminPasswordReset } from '@/lib/actions';

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-900 px-6 py-8 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">DQ Sales</p>
          <h1 className="mt-3 text-3xl font-bold">Acceso administrativo</h1>
          <p className="mt-2 text-sm text-slate-300">Gestiona pedidos, pagos y reportes.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Correo electrónico</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:bg-white" placeholder="admin@empresa.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:bg-white" placeholder="Tu contraseña" />
          </div>
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
          <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? 'Validando...' : 'Ingresar'}</button>
          <button type="button" onClick={() => void forgotPassword()} className="w-full text-sm font-medium text-sky-700 hover:text-sky-900">Olvidé mi contraseña</button>
        </form>
      </div>
    </main>
  );
}