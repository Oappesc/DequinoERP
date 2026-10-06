'use client';

import { useEffect, useState, Suspense } from 'react';
import { getReportData, ReportData } from '@/lib/actions_reportes';
import { useSearchParams } from 'next/navigation';
import DateRangeFilter from '@/components/reportes/DateRangeFilter';
import VentasTab from '@/components/reportes/VentasTab';
import ConsignacionTab from '@/components/reportes/ConsignacionTab';
import InventarioTab from '@/components/reportes/InventarioTab';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';

function ReportesContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const [activeTab, setActiveTab] = useState<'ventas' | 'consignacion' | 'inventario' | 'finanzas'>('ventas');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getReportData(from, to);
      if (res.data) {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, [from, to]);

  const tabs = [
    { id: 'ventas', label: 'Ventas' },
    { id: 'consignacion', label: 'Consignación' },
    { id: 'inventario', label: 'Inventario', disabled: true, tooltip: 'Próximamente' },
    { id: 'finanzas', label: 'Finanzas', disabled: true, tooltip: 'Próximamente' },
  ];

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Banner Superior */}
        <header className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors" title="Volver al Dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1 block">ADMINISTRACIÓN</span>
              <h1 className="text-2xl font-extrabold text-white leading-tight">Reportes y Estadísticas</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CurrencySwitcher />
            <DateRangeFilter />
          </div>
        </header>

        {/* Pestañas de Sub-navegación formato cápsula */}
        <div className="bg-[#F4F1EA] p-1 rounded-2xl inline-flex gap-1 mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              title={tab.tooltip}
              className={`py-2 px-4 rounded-xl text-xs transition-all whitespace-nowrap ${
                tab.disabled 
                  ? 'opacity-50 cursor-not-allowed text-slate-400' 
                  : activeTab === tab.id 
                    ? 'bg-white text-dequino-secondary font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-transparent">
          {loading ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-slate-100">
              <p className="text-slate-400 text-xs font-medium animate-pulse">Cargando métricas...</p>
            </div>
          ) : !data ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-slate-100 text-rose-500 text-xs font-semibold">
              Error al cargar datos.
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'ventas' && <VentasTab data={data.ventas} formatCurrency={formatCurrency} />}
              {activeTab === 'consignacion' && data.consignacion && <ConsignacionTab data={data.consignacion} formatCurrency={formatCurrency} />}
              {activeTab === 'inventario' && <InventarioTab data={data.inventario} formatCurrency={formatCurrency} />}
              {activeTab === 'finanzas' && (
                <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-3xl shadow-sm border border-slate-100">
                  Módulo de Finanzas en construcción...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Cargando...</div>}>
      <ReportesContent />
    </Suspense>
  );
}
