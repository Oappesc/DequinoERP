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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden space-y-6">
      
      <div className="flex justify-between items-center pb-2">
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Historial de Cortes de Pago</h3>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm text-xs transition-all"
        >
          <Plus className="w-4 h-4" /> Cargar Corte
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-extrabold">Código Corte</th>
              <th className="pb-3 px-4 font-extrabold">Fecha Registro</th>
              <th className="pb-3 px-4 font-extrabold text-center">Estatus</th>
              <th className="pb-3 px-4 font-extrabold text-right">Total Liquidado</th>
              <th className="pb-3 pl-4 font-extrabold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 text-sm">
            {cortes.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">No hay cortes registrados.</td></tr>
            ) : cortes.map(c => (
              <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3.5 pr-4 font-mono font-bold text-slate-800 text-xs">{c.codigo}</td>
                <td className="py-3.5 px-4 text-slate-600 text-xs">
                  {new Date(c.created_at).toLocaleString()}
                  {c.fecha_confirmacion && <div className="text-[11px] text-emerald-700 font-bold mt-0.5">Pago: {new Date(c.fecha_confirmacion).toLocaleDateString()}</div>}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${
                    c.estado === 'pendiente' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : c.estado === 'confirmado' 
                        ? 'bg-[#EEF3EC] text-dequino-secondary border-dequino-tertiary/60' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {c.estado.toUpperCase()}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-rose-600">
                  {formatCurrency(c.total_usd)}
                </td>
                <td className="py-3.5 pl-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-dequino-primary hover:text-dequino-secondary hover:bg-[#EEF3EC] p-2 rounded-xl transition-colors" title="Ver Detalle">
                      <FileText className="w-4 h-4"/>
                    </button>
                    {c.estado === 'pendiente' && (
                      <button 
                        onClick={() => handleConfirmar(c.id)}
                        disabled={confirming === c.id}
                        className="bg-[#EEF3EC] text-dequino-secondary hover:bg-dequino-tertiary/60 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
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
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 bg-[#FAF8F5] border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-dequino-secondary text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" /> Nuevo Corte (Liquidación de Ventas)
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1 space-y-5">
                <div className="border-2 border-dashed border-dequino-tertiary/80 hover:border-dequino-primary bg-[#FAF8F5] rounded-2xl p-5 text-center transition-all space-y-2">
                  <h4 className="font-bold text-dequino-secondary text-xs uppercase tracking-wider">Carga Inteligente por PDF</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Sube el reporte de ventas en PDF.</p>
                  
                  <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingPdf}
                    className="bg-white hover:bg-slate-50 text-dequino-secondary border border-dequino-tertiary font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 mx-auto mt-3 shadow-sm transition-all disabled:opacity-50"
                  >
                    {loadingPdf ? <span className="animate-pulse">Procesando...</span> : <><Upload className="w-4 h-4 text-dequino-primary" /> Subir Archivo PDF</>}
                  </button>

                  {pdfText && <p className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1 mt-2"><CheckCircle className="w-3.5 h-3.5"/> {pdfText}</p>}
                </div>
                
                <div className="bg-[#FAF8F5]/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Agregar Producto Manual</h4>
                  <p className="text-xs text-slate-500 mb-1 leading-relaxed">Busca los productos que el cliente ha reportado como vendidos.</p>
                  
                  <input 
                    type="text" 
                    placeholder="Buscar en inventario en custodia..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
                  />
                  {searchTerm.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {filteredSearch.map(i => (
                        <div key={i.id} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 text-xs transition-colors">
                          <div className="truncate mr-2">
                            <div className="font-bold text-slate-800 font-mono">{i.productos.codigo}</div>
                            <div className="text-slate-500 truncate">{formatProductName(i.productos)}</div>
                            <div className="text-dequino-secondary font-bold text-[11px] mt-0.5">Disp: {i.cantidad_actual}</div>
                          </div>
                          <button 
                            onClick={() => handleAddToCorte(i)} 
                            className="p-1.5 bg-[#EEF3EC] text-dequino-secondary hover:bg-dequino-tertiary/60 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {filteredSearch.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No encontrado en custodia</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
                <div className="p-4 bg-[#FAF8F5] border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Productos a Liquidar
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 min-h-[220px]">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                      <Receipt className="w-12 h-12 mb-2 text-slate-300 stroke-1" />
                      <p className="text-xs font-medium text-slate-400">Agrega los productos que el cliente vendió</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5]/60 sticky top-0">
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] font-bold">
                          <th className="p-3">Producto</th>
                          <th className="p-3 text-right w-24">Vendidos</th>
                          <th className="p-3 text-right w-28">Subtotal</th>
                          <th className="p-3 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {cart.map(c => (
                          <tr key={c.producto_id} className="hover:bg-[#FAF8F5]/40 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800 font-mono">{c.producto.codigo}</div>
                              <div className="text-slate-500 truncate max-w-[200px]">{formatProductName(c.producto)}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">En custodia: {c.max_cantidad}</div>
                              {c.alerta && <div className="text-xs text-rose-600 font-bold bg-rose-50 inline-block px-2 py-0.5 rounded-md mt-1">{c.alerta}</div>}
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                min="1"
                                value={c.cantidad}
                                onChange={(e) => handleQtyChange(c.producto_id, parseInt(e.target.value) || 1, c.max_cantidad)}
                                className="w-16 rounded-xl border border-slate-200 bg-[#FCFCFA] px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-dequino-primary"
                              />
                            </td>
                            <td className="p-3 text-right font-extrabold text-slate-800">
                              {formatCurrency(c.precio * c.cantidad)}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleRemove(c.producto_id)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-5 bg-[#FAF8F5] border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto del Corte</p>
                    <p className="text-2xl font-extrabold text-rose-600">{formatCurrency(totalUSD)}</p>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || cart.length === 0}
                    className="bg-dequino-primary hover:bg-[#6C8264] text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 text-xs shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50"
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
