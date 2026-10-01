import { useState, useEffect, useRef } from 'react';
import { formatProductName } from '@/lib/productUtils';
import { getInventoryItems } from '@/lib/actions_inventario';
import { Receipt, Plus, Save, Trash2, CheckCircle, FileText, Upload } from 'lucide-react';
import { crearCorteConsignacion, confirmarCorteConsignacion } from '@/lib/actions_consignacion';

export default function CortesTab({ 
  cortes, 
  inventario,
  clienteId, 
  formatCurrency, 
  onRefresh 
}: { 
  cortes: any[], 
  inventario: any[],
  clienteId: string, 
  formatCurrency: (v: number) => string,
  onRefresh: () => void 
}) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    getInventoryItems().then((res: any) => {
      if (res.data) setProductos(res.data.filter((p: any) => p.activo));
    });
  }, []);

  
  // Cart for the "Corte"
  const [cart, setCart] = useState<any[]>([]);

  // Only products that the client actually has in inventory can be liquidated
  const activos = inventario.filter(i => i.cantidad_actual > 0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
      const result = await res.json();
      
      if (result.items) {
        const newCart = [...cart];
        
        result.items.forEach((pdfItem: any) => {
          const normalize = (s: string) => (s||'').replace(/[-.\s]/g, '').toUpperCase();
          const pdfCode = normalize(pdfItem.pt);

          const dbProd = productos.find(p => normalize(p.codigo) === pdfCode);
          if (dbProd) {
            const invItem = inventario.find(i => i.producto_id === dbProd.id);
            const max = invItem ? invItem.cantidad_actual : 0;
            
            let alerta = null;
            if (max === 0) alerta = 'No hay en custodia';
            else if (pdfItem.cantidad > max) alerta = 'Excede la custodia';

            const existing = newCart.find(c => c.producto_id === dbProd.id);
            if (existing) {
              existing.cantidad += pdfItem.cantidad;
              if (existing.cantidad > max) existing.alerta = 'Excede la custodia';
            } else {
              newCart.push({
                producto_id: dbProd.id,
                producto: dbProd,
                cantidad: pdfItem.cantidad,
                max_cantidad: max,
                precio: dbProd.precio || 0,
                alerta
              });
            }
          }
        });
        setCart(newCart);
        setPdfText(`PDF Procesado: ${result.items.length} productos detectados.`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (e) {
      alert('Error procesando PDF');
    }
    setLoadingPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddToCorte = (invItem: any) => {
    const existing = cart.find(c => c.producto_id === invItem.producto_id);
    if (existing) {
      if (existing.cantidad < invItem.cantidad_actual) {
        setCart(cart.map(c => c.producto_id === invItem.producto_id ? { ...c, cantidad: c.cantidad + 1 } : c));
      }
    } else {
      setCart([...cart, { 
        producto_id: invItem.producto_id, 
        producto: invItem.productos, 
        cantidad: 1, 
        max_cantidad: invItem.cantidad_actual,
        precio: invItem.productos.precio || 0 
      }]);
    }
    setSearchTerm('');
  };

  const handleRemove = (id: string) => {
    setCart(cart.filter(c => c.producto_id !== id));
  };

  const handleQtyChange = (id: string, qty: number, max: number) => {
    if (qty < 1) qty = 1;
    // if (qty > max) qty = max; // Allow exceeding for review
    setCart(cart.map(c => c.producto_id === id ? { ...c, cantidad: qty, alerta: qty > c.max_cantidad ? 'Excede la custodia' : (c.max_cantidad === 0 ? 'No hay en custodia' : null) } : c));
  };

  const handleSave = async () => {
    if (cart.length === 0) return alert('El corte no tiene productos');
    setSaving(true);
    
    const items = cart.map(c => ({
      producto_id: c.producto_id,
      cantidad: c.cantidad,
      precio: c.precio
    }));
    
    const res = await crearCorteConsignacion(clienteId, items);
    setSaving(false);
    if (res.error) {
      alert('Error al guardar corte: ' + res.error);
    } else {
      setShowModal(false);
      setCart([]);
      onRefresh();
    }
  };

  const handleConfirmar = async (corte_id: string) => {
    if (!confirm('¿Estás seguro de confirmar este pago? Esto descontará el inventario del cliente de forma permanente.')) return;
    setConfirming(corte_id);
    const res = await confirmarCorteConsignacion(corte_id);
    setConfirming(null);
    if (res.error) {
      alert('Error al confirmar: ' + res.error);
    } else {
      onRefresh();
    }
  };

  const filteredSearch = activos
    .filter(i => formatProductName(i.productos).toLowerCase().includes(searchTerm.toLowerCase()) || i.productos.codigo?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5);

  const totalUSD = cart.reduce((acc, c) => acc + (c.cantidad * c.precio), 0);

  return (
    <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 overflow-hidden">
      
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-700">Historial de Cortes de Pago</h3>
        <button onClick={() => setShowModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors text-sm shadow-sm shadow-rose-200">
          <Plus className="w-4 h-4" /> Cargar Corte
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-semibold">Código Corte</th>
              <th className="p-4 font-semibold">Fecha Registro</th>
              <th className="p-4 font-semibold text-center">Estatus</th>
              <th className="p-4 font-semibold text-right">Total Liquidado</th>
              <th className="p-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cortes.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500">No hay cortes registrados.</td></tr>
            ) : cortes.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-700">{c.codigo}</td>
                <td className="p-4 text-slate-600">
                  {new Date(c.created_at).toLocaleString()}
                  {c.fecha_confirmacion && <div className="text-xs text-emerald-600 font-medium mt-1">Pago: {new Date(c.fecha_confirmacion).toLocaleDateString()}</div>}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    c.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 
                    c.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.estado.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right font-black text-rose-600">
                  {formatCurrency(c.total_usd)}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-2" title="Ver Detalle"><FileText className="w-4 h-4"/></button>
                    {c.estado === 'pendiente' && (
                      <button 
                        onClick={() => handleConfirmar(c.id)}
                        disabled={confirming === c.id}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {confirming === c.id ? '...' : 'Confirmar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR CORTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-6 h-6 text-rose-600" /> Nuevo Corte (Liquidación de Ventas)
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3 mb-6">
                  <h4 className="font-semibold text-slate-700 text-sm">Carga Inteligente por PDF</h4>
                  <p className="text-xs text-slate-500">Sube el reporte de ventas en PDF.</p>
                  
                  <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingPdf}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl p-4 font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingPdf ? <span className="animate-pulse">Procesando...</span> : <><Upload className="w-5 h-5" /> Subir Archivo PDF</>}
                  </button>

                  {pdfText && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {pdfText}</p>}
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-slate-700 text-sm">Agregar Producto Manual</h4>
                  <p className="text-xs text-slate-500 mb-2">Busca los productos que el cliente ha reportado como vendidos.</p>
                  
                  <input 
                    type="text" 
                    placeholder="Buscar en inventario en custodia..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500"
                  />
                  {searchTerm.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {filteredSearch.map(i => (
                        <div key={i.id} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 text-xs">
                          <div className="truncate mr-2">
                            <div className="font-bold text-slate-700">{i.productos.codigo}</div>
                            <div className="text-slate-500 truncate">{formatProductName(i.productos)}</div>
                            <div className="text-blue-600 font-medium">Disp: {i.cantidad_actual}</div>
                          </div>
                          <button onClick={() => handleAddToCorte(i)} className="p-1.5 bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {filteredSearch.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No encontrado en custodia</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                  Productos a Liquidar
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                      <Receipt className="w-12 h-12 mb-2 opacity-50" />
                      <p>Agrega los productos que el cliente vendió</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 sticky top-0">
                        <tr className="text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-medium">Producto</th>
                          <th className="p-3 font-medium text-right w-24">Vendidos</th>
                          <th className="p-3 font-medium text-right w-28">Subtotal</th>
                          <th className="p-3 font-medium text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cart.map(c => (
                          <tr key={c.producto_id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{c.producto.codigo}</div>
                              <div className="text-slate-500 truncate max-w-[200px]">{formatProductName(c.producto)}</div>
                              <div className="text-xs text-blue-500 mt-0.5">En custodia: {c.max_cantidad}</div>
                              {c.alerta && <div className="text-xs text-rose-600 font-bold bg-rose-50 inline-block px-2 py-0.5 rounded mt-1">{c.alerta}</div>}
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                min="1"
                                
                                value={c.cantidad}
                                onChange={(e) => handleQtyChange(c.producto_id, parseInt(e.target.value) || 1, c.max_cantidad)}
                                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-center outline-none focus:border-rose-500"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {formatCurrency(c.precio * c.cantidad)}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleRemove(c.producto_id)} className="text-slate-400 hover:text-slate-600 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm text-slate-500">Monto del Corte</p>
                    <p className="text-xl font-black text-rose-600">{formatCurrency(totalUSD)}</p>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || cart.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Generar Corte'}
                  </button>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
