'use client';

import { formatProductName } from '@/lib/productUtils';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { useEffect, useMemo, useState } from 'react';
import { adminCrearPedido } from '@/lib/actions';
import { Search, X, Camera } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

type Product = { id: string; codigo: string; descripcion: string; precio: number; stock: number };
type Customer = { id: string; rif_cedula: string; razon_social: string; telefono?: string | null };

export default function CrearPedidoModal({ isOpen, onClose, onCreated, sellers: propSellers }: { isOpen: boolean, onClose: () => void, onCreated: () => void, sellers?: any[] }) {
  const { formatCurrency } = useCurrency();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [sellers, setSellers] = useState<any[]>(propSellers || []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedSeller, setSelectedSeller] = useState('');
  const [clientMode, setClientMode] = useState<'existente' | 'nuevo'>('existente');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [rifImage, setRifImage] = useState<File | null>(null);
  const [rifImagePreview, setRifImagePreview] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Record<string, string>>({});
  const [docType, setDocType] = useState<'factura' | 'nota_entrega'>('factura');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoadingData(true);
      const [vRes, cRes, pRes] = await Promise.all([
        supabase.from('vendedores').select('id, nombre, cedula').eq('activo', true).order('nombre'),
        supabase.from('clientes').select('id, rif_cedula, razon_social, telefono').order('razon_social'),
        supabase.from('productos').select('id, codigo, descripcion, precio, stock').eq('activo', true).order('descripcion')
      ]);
      if (vRes.data && (!propSellers || propSellers.length === 0)) setSellers(vRes.data);
      if (cRes.data) setCustomers(cRes.data);
      if (pRes.data) setProducts(pRes.data);
      setLoadingData(false);
    };
    fetchData();
  }, [isOpen, supabase, propSellers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.razon_social.toLowerCase().includes(q) || c.rif_cedula.toLowerCase().includes(q)).slice(0, 5);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => p.descripcion.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 10);
  }, [products, productSearch]);

  const cartTotal = useMemo(() => {
    let sub = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const p = products.find(x => x.id === id);
      if (p && qty) sub += p.precio * parseInt(qty);
    });
    return sub;
  }, [cart, products]);

  const tax = docType === 'factura' ? cartTotal * 0.16 : 0;
  const grandTotal = cartTotal + tax;
  const isCartEmpty = Object.keys(cart).length === 0;

  const handleSubmit = async () => {
    if (!selectedSeller) {
      setMessage('Debe seleccionar un Asesor / Vendedor.');
      return;
    }
    if (!selectedCustomer && clientMode === 'existente') {
      setMessage('Debe seleccionar un cliente.');
      return;
    }
    if (clientMode === 'nuevo' && !rifImage) {
      setMessage('Debe subir la foto del RIF.');
      return;
    }
    if (isCartEmpty) {
      setMessage('Agregue al menos un producto.');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('vendedorId', selectedSeller);
      formData.append('clientMode', clientMode);
      
      if (clientMode === 'existente' && selectedCustomer) {
        formData.append('clienteId', selectedCustomer.id);
      } else if (clientMode === 'nuevo' && rifImage) {
        formData.append('rifImage', rifImage);
      }
      
      formData.append('tipoDocumento', docType);
      
      const itemsParam = Object.entries(cart).map(([productoId, cantidad]) => ({
        productoId,
        cantidad: parseInt(cantidad, 10)
      }));
      formData.append('items', JSON.stringify(itemsParam));

      const res = await adminCrearPedido(formData);
      if (res.error) throw new Error(res.error);

      // Limpiar y cerrar
      setCart({});
      setSelectedCustomer(null);
      setClientMode('existente');
      setCustomerSearch('');
      setRifImage(null);
      setRifImagePreview('');
      setProductSearch('');
      setSelectedSeller('');
      
      onCreated();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-bold text-dequino-primary">Crear Nuevo Pedido</h2>
          <div className="flex items-center gap-4">
            <CurrencySwitcher />
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido Desplazable */}
        <div className="overflow-y-auto p-6 flex-1 bg-[#FAF8F5]">
          {loadingData ? (
            <div className="flex items-center justify-center py-20 text-slate-400">Cargando datos...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Columna Izquierda: Formulario */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Asesor */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Asignar a Asesor / Vendedor *</h3>
                  <div className="relative inline-block w-full">
                  <select 
                    value={selectedSeller} 
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option className="bg-white text-slate-700 py-1.5" value="">-- Seleccionar Asesor --</option>
                    {sellers.map((v: any) => (
                      <option className="bg-white text-slate-700 py-1.5" key={v.id} value={v.id}>{v.nombre} {v.cedula ? `(${v.cedula})` : ''}</option>
                    ))}
                  </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Cliente */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Paso 1 <br/><span className="text-lg text-slate-800 normal-case">Elige tu cliente</span></h3>
                  <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-2xl">
                    <button onClick={() => setClientMode('existente')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${clientMode === 'existente' ? 'bg-white text-dequino-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Existente</button>
                    <button onClick={() => setClientMode('nuevo')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${clientMode === 'nuevo' ? 'bg-white text-dequino-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Nuevo</button>
                  </div>
                  {clientMode === 'existente' ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Buscar por nombre o RIF/Cédula..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-dequino-primary outline-none" />
                      {customerSearch && !selectedCustomer && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl overflow-hidden z-20">
                          {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                            <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.razon_social); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                              <div className="font-medium text-slate-800">{c.razon_social}</div>
                              <div className="text-xs text-slate-500">{c.rif_cedula}</div>
                            </button>
                          )) : <div className="p-4 text-sm text-slate-500 text-center">No se encontraron clientes.</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input type="text" placeholder="Ingresar RIF o Cédula..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-dequino-primary outline-none" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Foto del RIF <span className="text-rose-500">*</span></label>
                        <input type="file" accept="image/*" className="hidden" id="rif-upload" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setRifImage(file); setRifImagePreview(URL.createObjectURL(file)); }
                        }} />
                        <label htmlFor="rif-upload" className="cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-dequino-primary hover:bg-dequino-primary/5 transition-all">
                          {rifImagePreview ? <img src={rifImagePreview} alt="RIF" className="h-32 object-contain" /> : <><Camera className="text-slate-400" size={32} /><span className="text-sm text-slate-500">Tocar para subir foto</span></>}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Productos */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Paso 2 <br/><span className="text-lg text-slate-800 normal-case">Agrega productos</span></h3>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por código o nombre..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-dequino-primary outline-none" />
                  </div>
                  {productSearch && (
                    <div className="space-y-2 mb-6">
                      {filteredProducts.map(p => {
                        const qty = cart[p.id] || '';
                        return (
                          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-dequino-primary/30 transition-colors gap-3 bg-slate-50/50">
                            <div>
                              <div className="font-medium text-slate-800 text-sm">{formatProductName(p.descripcion)}</div>
                              <div className="flex gap-3 mt-1 text-xs text-slate-500"><span>Cód: {p.codigo}</span><span className="text-dequino-primary font-medium">{formatCurrency(p.precio)}</span></div>
                            </div>
                            <div className="flex items-center gap-2 sm:w-1/3">
                              <input type="number" min="0" placeholder="Cant." value={qty} onChange={(e) => {
                                const val = e.target.value;
                                setCart(prev => {
                                  const next = { ...prev };
                                  if (!val || val === '0') delete next[p.id]; else next[p.id] = val;
                                  return next;
                                });
                              }} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-sm focus:ring-2 focus:ring-dequino-primary outline-none" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Resumen */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 3 de 3 <br/><span className="text-lg text-slate-800 normal-case">Resumen</span></h3>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{Object.keys(cart).length} Productos</span>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6 scrollbar-thin">
                  {isCartEmpty ? (
                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Busca un producto para comenzar.
                    </div>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const p = products.find(x => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-slate-50">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="font-medium text-slate-800 truncate">{formatProductName(p.descripcion)}</div>
                            <div className="text-slate-500 text-xs">{qty} x {formatCurrency(p.precio)}</div>
                          </div>
                          <div className="font-semibold text-slate-800 shrink-0">{formatCurrency(p.precio * parseInt(qty))}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">TIPO DE DOCUMENTO</label>
                    <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
                      <button onClick={() => setDocType('nota_entrega')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${docType === 'nota_entrega' ? 'bg-white text-dequino-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Nota de entrega</button>
                      <button onClick={() => setDocType('factura')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${docType === 'factura' ? 'bg-white text-dequino-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✓ Factura</button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pt-2">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
                    {docType === 'factura' && <div className="flex justify-between text-slate-500"><span>IVA (16%)</span><span>{formatCurrency(tax)}</span></div>}
                    <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-100 mt-2">
                      <span>Total</span><span>{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right uppercase tracking-wider mt-1">Impuestos incluidos</div>
                  </div>

                  {message && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl text-center border border-rose-100 mt-4">{message}</div>}

                  <button 
                    onClick={handleSubmit} 
                    disabled={sending || isCartEmpty || !selectedSeller || (!selectedCustomer && clientMode === 'existente')} 
                    className="w-full mt-6 bg-dequino-primary hover:bg-[#6C8264] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {sending ? 'Guardando...' : 'Enviar pedido ->'}
                  </button>
                  <div className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest">Dequino ERP • Conexión protegida</div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
