import { useState, useRef, useEffect } from 'react';
import { formatProductName } from '@/lib/productUtils';
import { ClipboardList, Upload, Plus, Trash2, Save, FileText, CheckCircle, XCircle } from 'lucide-react';
import { crearPedidoConsignacion } from '@/lib/actions_consignacion';
import { getInventoryItems } from '@/lib/actions_inventario';

export default function PedidosTab({ 
  pedidos, 
  clienteId, 
  formatCurrency, 
  onRefresh 
}: { 
  pedidos: any[], 
  clienteId: string, 
  formatCurrency: (v: number) => string,
  onRefresh: () => void 
}) {
  const [showModal, setShowModal] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfText, setPdfText] = useState('');
  
  // State for the cart (pedido items)
  const [cart, setCart] = useState<any[]>([]);
  
  // Master products list to cross-reference PT codes
  const [productos, setProductos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load all products once
    getInventoryItems().then((res: any) => {
      if (res.data) setProductos(res.data.filter((p: any) => p.activo));
    });
  }, []);

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
        // Cross reference with DB products
        const newCart = [...cart];
        
        result.items.forEach((pdfItem: any) => {
          // Normalize PT
          const normalize = (s: string) => (s||'').replace(/[-.\s]/g, '').toUpperCase(); const dbProd = productos.find(p => normalize(p.codigo) === normalize(pdfItem.pt));
          if (dbProd) {
            // Check if already in cart
            const existing = newCart.find(c => c.producto_id === dbProd.id);
            if (existing) {
              existing.cantidad += pdfItem.cantidad;
            } else {
              newCart.push({
                producto_id: dbProd.id,
                producto: dbProd,
                cantidad: pdfItem.cantidad,
                precio: dbProd.precio || 0
              });
            }
          }
        });
        setCart(newCart);
      }
      if (result.text) {
        setPdfText('PDF Procesado con éxito.');
      }
    } catch (err) {
      alert('Error procesando el PDF');
    }
    setLoadingPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddManual = (prod: any) => {
    const existing = cart.find(c => c.producto_id === prod.id);
    if (existing) {
      setCart(cart.map(c => c.producto_id === prod.id ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setCart([...cart, { producto_id: prod.id, producto: prod, cantidad: 1, precio: prod.precio || 0 }]);
    }
    setSearchTerm('');
  };

  const handleRemove = (id: string) => {
    setCart(cart.filter(c => c.producto_id !== id));
  };

  const handleQtyChange = (id: string, qty: number) => {
    if (qty < 1) qty = 1;
    setCart(cart.map(c => c.producto_id === id ? { ...c, cantidad: qty } : c));
  };

  const handleSave = async () => {
    if (cart.length === 0) return alert('El pedido no tiene productos');
    setSaving(true);
    // mapped items
    const items = cart.map(c => ({
      producto_id: c.producto_id,
      cantidad: c.cantidad,
      precio: c.precio
    }));
    
    const res = await crearPedidoConsignacion(clienteId, null, items);
    setSaving(false);
    if (res.error) {
      alert('Error al guardar: ' + res.error);
    } else {
      setShowModal(false);
      setCart([]);
      setPdfText('');
      onRefresh();
    }
  };

  const filteredSearch = productos
    .filter(p => formatProductName(p).toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 5); // top 5 results

  const totalUSD = cart.reduce((acc, c) => acc + (c.cantidad * c.precio), 0);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden space-y-6">
      
      {/* HEADER TABS ACCIONES */}
      <div className="flex justify-between items-center pb-2">
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Historial de Pedidos</h3>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm text-xs transition-all"
        >
          <Plus className="w-4 h-4" /> Cargar Pedido
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-extrabold">Código</th>
              <th className="pb-3 px-4 font-extrabold">Fecha</th>
              <th className="pb-3 px-4 font-extrabold text-center">Estatus</th>
              <th className="pb-3 px-4 font-extrabold text-right">Total</th>
              <th className="pb-3 pl-4 font-extrabold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70 text-sm">
            {pedidos.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">No hay pedidos registrados.</td></tr>
            ) : pedidos.map(p => (
              <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3.5 pr-4 font-mono font-bold text-slate-800 text-xs">{p.codigo}</td>
                <td className="py-3.5 px-4 text-slate-600 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center">
                  <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${
                    p.estado === 'abierto' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : p.estado === 'cerrado' 
                        ? 'bg-[#EEF3EC] text-dequino-secondary border-dequino-tertiary/60' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {p.estado.toUpperCase()}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                  {formatCurrency(p.total_usd)}
                </td>
                <td className="py-3.5 pl-4 text-center">
                  <button className="text-dequino-primary hover:text-dequino-secondary hover:bg-[#EEF3EC] p-2 rounded-xl transition-colors">
                    <FileText className="w-4 h-4"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR PEDIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 bg-[#FAF8F5] border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-dequino-secondary text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-dequino-primary" /> Nuevo Pedido de Consignación
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* IZQUIERDA: Herramientas de Carga */}
              <div className="md:col-span-1 space-y-5">
                
                {/* Parseador PDF */}
                <div className="border-2 border-dashed border-dequino-tertiary/80 hover:border-dequino-primary bg-[#FAF8F5] rounded-2xl p-5 text-center transition-all space-y-2">
                  <h4 className="font-bold text-dequino-secondary text-xs uppercase tracking-wider">Carga Inteligente por PDF</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Sube una nota de entrega o factura en PDF. El sistema extraerá los códigos PT automáticamente.</p>
                  
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

                {/* Búsqueda Manual */}
                <div className="bg-[#FAF8F5]/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Agregar Producto Manual</h4>
                  <input 
                    type="text" 
                    placeholder="Buscar producto por nombre o PT..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#FCFCFA] px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 transition-all"
                  />
                  {searchTerm.length > 1 && (
                    <div className="space-y-1 mt-2">
                      {filteredSearch.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 text-xs transition-colors">
                          <span className="font-semibold text-slate-700 truncate mr-2">{formatProductName(p)}</span>
                          <button 
                            onClick={() => handleAddManual(p)} 
                            className="p-1.5 bg-[#EEF3EC] text-dequino-secondary hover:bg-dequino-tertiary/60 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {filteredSearch.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No encontrado</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* DERECHA: Carrito de Consignación */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
                <div className="p-4 bg-[#FAF8F5] border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pre-visualización del Pedido
                </div>
                
                <div className="flex-1 overflow-y-auto p-0 min-h-[220px]">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                      <ClipboardList className="w-12 h-12 mb-2 text-slate-300 stroke-1" />
                      <p className="text-xs font-medium text-slate-400">Agrega productos manual o sube un PDF</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5]/60 sticky top-0">
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] font-bold">
                          <th className="p-3">Producto</th>
                          <th className="p-3 text-right w-24">Cant.</th>
                          <th className="p-3 text-right w-28">Precio</th>
                          <th className="p-3 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {cart.map(c => (
                          <tr key={c.producto_id} className="hover:bg-[#FAF8F5]/40 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800 font-mono">{c.producto.codigo}</div>
                              <div className="text-slate-500 truncate max-w-[200px]">{formatProductName(c.producto)}</div>
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                min="1"
                                value={c.cantidad}
                                onChange={(e) => handleQtyChange(c.producto_id, parseInt(e.target.value) || 1)}
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pedido</p>
                    <p className="text-2xl font-extrabold text-dequino-secondary">{formatCurrency(totalUSD)}</p>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || cart.length === 0}
                    className="bg-dequino-primary hover:bg-[#6C8264] text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 text-xs shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Confirmar Pedido'}
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
