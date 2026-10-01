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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Reportes y Estadísticas</h1>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySwitcher />
            <DateRangeFilter />
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              title={tab.tooltip}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                tab.disabled ? 'opacity-50 cursor-not-allowed text-slate-400' :
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 border-t border-x border-slate-200 -mb-[1px]' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-transparent rounded-b-2xl">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-slate-500 animate-pulse">Cargando métricas...</p>
            </div>
          ) : !data ? (
            <div className="flex justify-center items-center h-64 text-red-500">
              Error al cargar datos.
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'ventas' && <VentasTab data={data.ventas} formatCurrency={formatCurrency} />}
              {activeTab === 'consignacion' && data.consignacion && <ConsignacionTab data={data.consignacion} formatCurrency={formatCurrency} />}
              {activeTab === 'inventario' && <InventarioTab data={data.inventario} formatCurrency={formatCurrency} />}
              {activeTab === 'finanzas' && (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-200">
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
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <ReportesContent />
    </Suspense>
  );
}
