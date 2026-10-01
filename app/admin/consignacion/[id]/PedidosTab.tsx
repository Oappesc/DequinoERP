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
    <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 overflow-hidden">
      
      {/* HEADER TABS ACCIONES */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-700">Historial de Pedidos</h3>
        <button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Cargar Pedido
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-semibold">Código</th>
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold text-center">Estatus</th>
              <th className="p-4 font-semibold text-right">Total</th>
              <th className="p-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pedidos.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-500">No hay pedidos registrados.</td></tr>
            ) : pedidos.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-700">{p.codigo}</td>
                <td className="p-4 text-slate-600">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    p.estado === 'abierto' ? 'bg-amber-100 text-amber-700' : 
                    p.estado === 'cerrado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.estado.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-right font-bold text-slate-800">
                  {formatCurrency(p.total_usd)}
                </td>
                <td className="p-4 text-center">
                  {/* For now just a placeholder for actions like view detail */}
                  <button className="text-violet-600 hover:text-violet-800 p-2"><FileText className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR PEDIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-violet-600" /> Nuevo Pedido de Consignación
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* IZQUIERDA: Herramientas de Carga */}
              <div className="md:col-span-1 space-y-6">
                
                {/* Parseador PDF */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-slate-700 text-sm">Carga Inteligente por PDF</h4>
                  <p className="text-xs text-slate-500">Sube una nota de entrega o factura en PDF. El sistema extraerá los códigos PT automáticamente.</p>
                  
                  <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingPdf}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl p-4 font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingPdf ? <span className="animate-pulse">Procesando...</span> : <><Upload className="w-5 h-5" /> Subir Archivo PDF</>}
                  </button>

                  {pdfText && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {pdfText}</p>}
                </div>

                {/* Búsqueda Manual */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h4 className="font-semibold text-slate-700 text-sm">Agregar Producto Manual</h4>
                  <input 
                    type="text" 
                    placeholder="Buscar producto por nombre o PT..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  {searchTerm.length > 1 && (
                    <div className="space-y-1 mt-2">
                      {filteredSearch.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 text-xs">
                          <span className="font-medium text-slate-700 truncate mr-2">{formatProductName(p)}</span>
                          <button onClick={() => handleAddManual(p)} className="p-1 bg-violet-100 text-violet-700 rounded-md hover:bg-violet-200">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {filteredSearch.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No encontrado</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* DERECHA: Carrito de Consignación */}
              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                  Pre-visualización del Pedido
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                      <ClipboardList className="w-12 h-12 mb-2 opacity-50" />
                      <p>Agrega productos manual o sube un PDF</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 sticky top-0">
                        <tr className="text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-medium">Producto</th>
                          <th className="p-3 font-medium text-right w-24">Cant.</th>
                          <th className="p-3 font-medium text-right w-28">Precio</th>
                          <th className="p-3 font-medium text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cart.map(c => (
                          <tr key={c.producto_id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{c.producto.codigo}</div>
                              <div className="text-slate-500 truncate max-w-[200px]">{formatProductName(c.producto)}</div>
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                min="1"
                                value={c.cantidad}
                                onChange={(e) => handleQtyChange(c.producto_id, parseInt(e.target.value) || 1)}
                                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-center outline-none focus:border-violet-500"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {formatCurrency(c.precio * c.cantidad)}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleRemove(c.producto_id)} className="text-rose-400 hover:text-rose-600 p-1">
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
                    <p className="text-sm text-slate-500">Total Pedido</p>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(totalUSD)}</p>
                  </div>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || cart.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
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
