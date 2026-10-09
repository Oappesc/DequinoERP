import React from 'react';
import type { PedidoEstado } from '@/types/database';

export const getBadgeStyle = (estado: PedidoEstado) => {
  switch (estado) {
    case 'registrado': return { label: 'Registrado', classes: 'bg-[#F1F3F0] text-[#556353] border border-[#D8DFD7]' };
    case 'en_proceso': return { label: 'En Proceso', classes: 'bg-[#FFF6E7] text-[#9A6715] border border-[#F5E0B8]' };
    case 'entregado': return { label: 'Entregado', classes: 'bg-[#EEF4FB] text-[#34608C] border border-[#CDE0F5]' };
    case 'en_revision': return { label: 'Revisión', classes: 'bg-[#F4EFFB] text-[#6A478F] border border-[#DDD0F3]' };
    case 'pagado': return { label: 'Pagado', classes: 'bg-[#EAF3E7] text-[#3D6B35] border border-[#C4DFC0]' };
    default: return { label: estado, classes: 'bg-gray-100 text-gray-600 border border-gray-200' };
  }
};

export const PedidoBadge = ({ estado }: { estado: PedidoEstado }) => {
  const { label, classes } = getBadgeStyle(estado);
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide inline-flex items-center gap-1 ${classes}`}>
      {label}
    </span>
  );
};
