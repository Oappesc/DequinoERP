'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DateRange, DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  });
  const [isOpen, setIsOpen] = useState(false);

  const applyFilters = (range: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (range?.from) {
      params.set('from', format(range.from, 'yyyy-MM-dd'));
    } else {
      params.delete('from');
    }
    
    if (range?.to) {
      params.set('to', format(range.to, 'yyyy-MM-dd'));
    } else {
      params.delete('to');
    }
    
    router.push(`${pathname}?${params.toString()}` as any);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-medium text-white transition-all shadow-sm"
      >
        <CalendarIcon className="h-4 w-4 text-white/80" />
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, 'dd/MM/yyyy')} - {format(date.to, 'dd/MM/yyyy')}
            </>
          ) : (
            format(date.from, 'dd/MM/yyyy')
          )
        ) : (
          <span>Filtrar por fecha</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-dequino-secondary">Selecciona el rango</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <DayPicker
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range) => {
              setDate(range);
              if (range?.from && range?.to) {
                applyFilters(range);
              }
            }}
          />
          <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-100">
            <button 
              onClick={() => {
                setDate(undefined);
                applyFilters(undefined);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              Limpiar
            </button>
            <button 
              onClick={() => applyFilters(date)}
              className="rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
