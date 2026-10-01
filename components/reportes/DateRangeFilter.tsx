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
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CalendarIcon className="h-4 w-4 text-slate-500" />
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
        <div className="absolute right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">Selecciona el rango</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
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
          <div className="mt-4 flex justify-between">
            <button 
              onClick={() => {
                setDate(undefined);
                applyFilters(undefined);
              }}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Limpiar
            </button>
            <button 
              onClick={() => applyFilters(date)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
