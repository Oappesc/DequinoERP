'use client';
import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type DateRange = { from: Date | undefined; to: Date | undefined };

export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  
  const [range, setRange] = useState<DateRange>({
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  });
  
  const [currentMonth, setCurrentMonth] = useState<Date>(
    fromParam ? new Date(fromParam) : new Date()
  );

  const [isOpen, setIsOpen] = useState(false);

  const applyFilters = (newRange: DateRange) => {
    const params = new URLSearchParams(searchParams);
    if (newRange.from) {
      params.set('from', format(newRange.from, 'yyyy-MM-dd'));
    } else {
      params.delete('from');
    }
    
    if (newRange.to) {
      params.set('to', format(newRange.to, 'yyyy-MM-dd'));
    } else {
      params.delete('to');
    }
    
    router.push(`${pathname}?${params.toString()}` as any);
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDayClick = (day: Date) => {
    if (!range.from || (range.from && range.to)) {
      setRange({ from: day, to: undefined });
    } else {
      if (isBefore(day, range.from)) {
        setRange({ from: day, to: undefined });
      } else {
        setRange({ ...range, to: day });
      }
    }
  };

  const getDayClass = (day: Date) => {
    let cls = "w-8 h-8 flex items-center justify-center text-xs font-medium rounded-xl transition-all cursor-pointer ";
    
    const isSelectedFrom = range.from && isSameDay(day, range.from);
    const isSelectedTo = range.to && isSameDay(day, range.to);
    const isBetween = range.from && range.to && isWithinInterval(day, { start: range.from, end: range.to }) && !isSelectedFrom && !isSelectedTo;

    if (!isSameMonth(day, currentMonth)) {
      cls += "text-slate-300 pointer-events-none ";
    } else if (isSelectedFrom || isSelectedTo) {
      cls += "bg-dequino-primary text-white font-bold ";
    } else if (isBetween) {
      cls += "bg-dequino-tertiary/30 text-dequino-secondary font-medium ";
    } else {
      cls += "text-slate-600 hover:bg-slate-100 ";
    }

    return cls;
  };

  const formatCapitalizedMonth = (date: Date) => {
    const f = format(date, 'MMMM yyyy', { locale: es });
    return f.charAt(0).toUpperCase() + f.slice(1);
  };

  return (
    <div className="relative font-sans">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-medium text-white transition-all shadow-sm"
      >
        <CalendarIcon className="h-4 w-4 text-white/80" />
        {range.from ? (
          range.to ? (
            <>
              {format(range.from, 'dd/MM/yyyy')} - {format(range.to, 'dd/MM/yyyy')}
            </>
          ) : (
            format(range.from, 'dd/MM/yyyy')
          )
        ) : (
          <span>Filtrar por fecha</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl w-80 font-sans">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Selecciona el rango</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="font-bold text-slate-700 text-sm">{formatCapitalizedMonth(currentMonth)}</div>
            <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(day => (
              <div key={day} className="text-[11px] font-bold text-slate-400 text-center w-8">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, i) => (
              <div 
                key={i} 
                onClick={() => {
                  if (isSameMonth(day, currentMonth)) {
                    handleDayClick(day);
                  }
                }}
                className={getDayClass(day)}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between items-center pt-4 border-t border-slate-100">
            <button 
              onClick={() => {
                setRange({ from: undefined, to: undefined });
                setCurrentMonth(new Date());
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Limpiar
            </button>
            <button 
              onClick={() => applyFilters(range)}
              className="rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
