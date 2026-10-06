'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getClienteConsignacion, saveClienteConsignacion } from '@/lib/actions_consignacion';
import { useCurrency } from '@/components/CurrencyProvider';
import { ArrowLeft, Package, Receipt, ClipboardList, Wallet, Edit, Power, Calendar } from 'lucide-react';
// We will separate tabs into components later, for now placeholders
import PedidosTab from './PedidosTab';
import InventarioTab from './InventarioTab';
import CortesTab from './CortesTab';
import { getPedidosCliente, getInventarioCliente, getCortesCliente } from '@/lib/actions_consignacion';

export default function ConsignacionClientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [cliente, setCliente] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [cortes, setCortes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'inventario' | 'cortes'>('pedidos');
  const { formatCurrency } = useCurrency();

  const loadAllData = async () => {
    setLoading(true);
    const [resCli, resPed, resInv, resCort] = await Promise.all([
      getClienteConsignacion(id),
      getPedidosCliente(id),
      getInventarioCliente(id),
      getCortesCliente(id)
    ]);
    if (resCli.data) setCliente(resCli.data);
    if (resPed.data) setPedidos(resPed.data);
    if (resInv.data) setInventario(resInv.data);
    if (resCort.data) setCortes(resCort.data);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500">Cargando datos del cliente...</div>;
  if (!cliente) return <div className="p-12 text-center text-rose-500">Cliente no encontrado.</div>;

  
  const ultimoPedido = pedidos.length > 0 ? pedidos[0].created_at : null;
  const ultimoCorte = cortes.length > 0 ? cortes[0].created_at : null;
  
  // Deuda: suma de cantidad_pendiente * precio_unitario en todos los pedidos abiertos (o de los items de pedidos)
  let deudaTotal = 0;
  pedidos.forEach(p => {
    p.pedido_consignacion_items.forEach((item: any) => {
      deudaTotal += (item.cantidad_pendiente * item.precio_unitario);
    });
  });

  return (
    <div className="min-h-screen bg-dequino-neutral p-4 md:p-6 pb-20 font-sans font-lato animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* CABECERA SUPERIOR */}
        <div className="bg-dequino-secondary text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/consignacion" className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-semibold tracking-widest text-[#B38E5D] uppercase mb-1">
                CONSIGNACIÓN
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {cliente.razon_social}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  cliente.activo ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {cliente.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <div className="text-xs text-white/80 font-normal mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong className="text-white">RIF:</strong> {cliente.rif_cedula}</span>
                <span><strong className="text-white">Teléfono:</strong> {cliente.telefono || 'N/A'}</span>
                <span><strong className="text-white">Dirección:</strong> {cliente.direccion || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium py-2 px-4 rounded-2xl flex items-center gap-2 text-xs transition-all">
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        </div>

        {/* TARJETAS DE RESUMEN (KPIS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Último Pedido</span>
              <div className="w-8 h-8 rounded-xl bg-[#EEF3EC] text-dequino-secondary flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-dequino-secondary">
              {ultimoPedido ? new Date(ultimoPedido).toLocaleDateString() : '-'}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Último Corte</span>
              <div className="w-8 h-8 rounded-xl bg-[#EEF3EC] text-dequino-secondary flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-dequino-secondary">
              {ultimoCorte ? new Date(ultimoCorte).toLocaleDateString() : '-'}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Pendiente</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-rose-600">
              {formatCurrency(deudaTotal)}
            </p>
          </div>
        </div>

        {/* TABS CÁPSULA */}
        <div className="bg-[#F4F1EA] p-1 rounded-2xl inline-flex gap-1 mb-4">
          <button 
            onClick={() => setActiveTab('pedidos')} 
            className={`py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all ${
              activeTab === 'pedidos' 
                ? 'bg-white text-dequino-secondary font-bold shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('inventario')} 
            className={`py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all ${
              activeTab === 'inventario' 
                ? 'bg-white text-dequino-secondary font-bold shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Inventario
          </button>
          <button 
            onClick={() => setActiveTab('cortes')} 
            className={`py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all ${
              activeTab === 'cortes' 
                ? 'bg-white text-dequino-secondary font-bold shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Cortes de Pago
          </button>
        </div>

        {/* CONTENIDO TABS */}
        <div className="bg-transparent">
          {activeTab === 'pedidos' && (
            <PedidosTab pedidos={pedidos} clienteId={id} formatCurrency={formatCurrency} onRefresh={loadAllData} />
          )}
          {activeTab === 'inventario' && (
            <InventarioTab inventario={inventario} formatCurrency={formatCurrency} />
          )}
          {activeTab === 'cortes' && (
            <CortesTab cortes={cortes} inventario={inventario} clienteId={id} formatCurrency={formatCurrency} onRefresh={loadAllData} />
          )}
        </div>

      </div>
    </div>
  );
}
