import './globals.css';
import type { Metadata } from 'next';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { obtenerTasaBCVDB } from '@/lib/actions';
import { Lato } from 'next/font/google';

const lato = Lato({
  weight: ['100', '300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
});

export const metadata: Metadata = {
  title: 'Gestión de Ventas DQ',
  description: 'Sistema móvil de pedidos y cobranza',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialRate = await obtenerTasaBCVDB();
  
  return (
    <html lang="es" className={`${lato.variable}`}>
      <body suppressHydrationWarning className="font-lato">
        <CurrencyProvider initialRate={initialRate || undefined}>
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}
