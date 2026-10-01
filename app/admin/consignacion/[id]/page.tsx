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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* CABECERA Y KPIs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex gap-4">
              <Link href="/admin/consignacion" className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors h-fit">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cliente.razon_social}</h1>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${cliente.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {cliente.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-2 space-y-1">
                  <p><span className="font-medium text-slate-700">RIF:</span> {cliente.rif_cedula}</p>
                  <p><span className="font-medium text-slate-700">Teléfono:</span> {cliente.telefono || 'N/A'}</p>
                  <p><span className="font-medium text-slate-700">Dirección:</span> {cliente.direccion || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" /> Editar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                <Package className="w-4 h-4 text-violet-500" /> Último Pedido
              </div>
              <p className="text-lg font-bold text-slate-800">
                {ultimoPedido ? new Date(ultimoPedido).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                <Receipt className="w-4 h-4 text-sky-500" /> Último Corte
              </div>
              <p className="text-lg font-bold text-slate-800">
                {ultimoCorte ? new Date(ultimoCorte).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-2">
                <Wallet className="w-4 h-4 text-rose-500" /> Deuda Pendiente
              </div>
              <p className="text-2xl font-black text-rose-600">
                {formatCurrency(deudaTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <button onClick={() => setActiveTab('pedidos')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'pedidos' ? 'bg-white text-violet-600 border-t border-x border-slate-200 -mb-[1px]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
            <ClipboardList className="w-4 h-4" /> Pedidos
          </button>
          <button onClick={() => setActiveTab('inventario')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'inventario' ? 'bg-white text-violet-600 border-t border-x border-slate-200 -mb-[1px]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
            <Package className="w-4 h-4" /> Inventario
          </button>
          <button onClick={() => setActiveTab('cortes')} className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'cortes' ? 'bg-white text-violet-600 border-t border-x border-slate-200 -mb-[1px]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
            <Receipt className="w-4 h-4" /> Cortes de Pago
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
