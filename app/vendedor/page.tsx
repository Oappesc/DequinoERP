'use client';

import { formatProductName } from '@/lib/productUtils';
import Image from 'next/image';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { useEffect, useMemo, useState } from 'react';
import { crearYNotificarPedido, getSellerData, logout } from '@/lib/actions';
import ListaPedidos from '@/components/vendedor/ListaPedidos';
import { Search, X, Camera, Plus, LogOut } from 'lucide-react';

type Product = { id: string; codigo: string; descripcion: string; precio: number; stock: number };
type Customer = { id: string; rif_cedula: string; razon_social: string; telefono?: string | null };
type Tab = 'nuevo' | 'pedidos';

export default function SellerPage() {
  const { formatCurrency, currency, toggleCurrency } = useCurrency();

  const [tab, setTab] = useState<Tab>('nuevo');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerName, setSellerName] = useState('Vendedor');
  const [loadingData, setLoadingData] = useState(true);
  const [clientMode, setClientMode] = useState<'existente' | 'nuevo'>('existente');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [rifImage, setRifImage] = useState<File | null>(null);
  const [rifImagePreview, setRifImagePreview] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Record<string, string>>({});
  const [documentType, setDocumentType] = useState<'factura' | 'nota_entrega'>('factura');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    void getSellerData().then((result) => {
      if (result.error || !result.data) setMessage({ text: result.error ?? 'No se pudo cargar el panel.', error: true });
      else {
        setSellerName(result.data.seller.nombre);
        setCustomers(result.data.customers);
        setProducts(result.data.products);
      }
      setLoadingData(false);
    });
  }, []);

  useEffect(() => {
    if (rifImage) {
      const url = URL.createObjectURL(rifImage);
      setRifImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setRifImagePreview('');
  }, [rifImage]);

  const customerSuggestions = useMemo(() => {
    const search = customerSearch.toLowerCase().trim();
    if (!search) return [];
    return customers.filter((c) => c.razon_social.toLowerCase().includes(search) || c.rif_cedula.toLowerCase().includes(search)).slice(0, 5);
  }, [customers, customerSearch]);

  const productSuggestions = useMemo(() => {
    const search = productSearch.toLowerCase().trim();
    if (!search) return [];
    return products.filter((p) => formatProductName(p).toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search)).slice(0, 10);
  }, [products, productSearch]);

const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantityStr]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;
        const quantity = Number(quantityStr) || 0;
        if (quantity <= 0) return null;
        return { ...product, quantity, subtotal: product.precio * quantity };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [cart, products]);

  const { subtotal, iva, total } = useMemo(() => {
const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const iva = documentType === "nota_entrega" ? 0 : subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [cartItems, documentType]);

const hasValidItems = cartItems.length > 0;

  function addProduct(product: Product) {
    setCart((prev) => ({ ...prev, [product.id]: String((Number(prev[product.id]) || 0) + 1) }));
    setProductSearch('');
  }

  function updateQuantity(productId: string, quantity: number | string) {
    setCart((prev) => {
      const newCart = { ...prev };
      if (quantity === 0 || quantity === '0') delete newCart[productId];
      else newCart[productId] = String(quantity);
      return newCart;
    });
  }

  async function submitOrder() {
    setSubmitting(true);
    setMessage(null);

    const items = cartItems.map((item) => ({ productoId: item.id, cantidad: item.quantity, precio_unitario: item.precio }));

    const result = await crearYNotificarPedido({
      clienteMode: clientMode,
      clienteId: selectedCustomer?.id,
      rifImage,
      items,
      documentType
    });

    if (result.error) setMessage({ text: result.error, error: true });
    else {
      setMessage({ text: 'Pedido enviado correctamente.', error: false });
      setCart({});
      setClientMode('existente');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setRifImage(null);
      setDocumentType('factura');
      setTab('pedidos');
    }
    setSubmitting(false);
  }

  if (loadingData) return <div className="flex min-h-screen items-center justify-center p-4 font-lato"><p className="text-lg font-medium text-slate-500">Cargando...</p></div>;

  return (
    <main className="min-h-screen bg-dequino-neutral p-4 flex flex-col gap-4 font-lato pb-24">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-4">
        
        {/* Cabecera del Vendedor y PestaÃ±as Superiores */}
        <header className="flex flex-col gap-4">
          <div className="bg-dequino-secondary text-white rounded-3xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <img src="/logo-dequino.png" alt="Dequino Logo" className="h-12 w-auto object-contain shrink-0 drop-shadow-sm" />
              <div>
                <p className="text-base font-bold text-white leading-tight">{sellerName}</p>
                <div className="bg-white/15 text-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 mt-0.5">
                  VENDEDOR • ACTIVO
                </div>
              </div>
            </div>
            <button type="button" onClick={() => void logout()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition-colors mr-1">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          
          
          
          <div className="bg-white p-1.5 rounded-3xl shadow-sm flex gap-2 border border-slate-100">
            <button 
              type="button" 
              onClick={() => setTab('nuevo')} 
              className={`flex-1 font-medium py-2.5 px-4 rounded-2xl text-center text-sm transition-all flex items-center justify-center gap-1 ${tab === 'nuevo' ? 'bg-dequino-primary text-white shadow-sm' : 'text-dequino-secondary hover:bg-slate-50'}`}
            >
              + Nuevo Pedido
            </button>
            <button 
              type="button" 
              onClick={() => setTab('pedidos')} 
              className={`flex-1 font-medium py-2.5 px-4 rounded-2xl text-center text-sm transition-all flex items-center justify-center gap-1 ${tab === 'pedidos' ? 'bg-dequino-primary text-white shadow-sm' : 'text-dequino-secondary hover:bg-slate-50'}`}
            >
              Ver Pedidos
            </button>
          </div>
        </header>

        {tab === 'pedidos' ? (
          <ListaPedidos />
        ) : (
          <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
            
            <div className="space-y-5">
              {/* PASO 1: Elige tu cliente */}
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
                <div>
                  <p className="text-[11px] font-extrabold tracking-wider text-dequino-primary uppercase">Paso 1</p>
                  <h2 className="text-lg font-bold text-dequino-secondary">Elige tu cliente</h2>
                </div>
                
                <div className="bg-[#F4F1EA] p-1 rounded-2xl flex gap-1">
                  <button type="button" onClick={() => setClientMode('existente')} className={`py-2 px-4 rounded-xl flex-1 text-xs text-center flex items-center justify-center gap-1.5 transition-colors ${clientMode === 'existente' ? 'bg-white text-dequino-secondary font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setClientMode('nuevo')} className={`py-2 px-4 rounded-xl flex-1 text-xs text-center flex items-center justify-center gap-1.5 transition-colors ${clientMode === 'nuevo' ? 'bg-white text-dequino-secondary font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Nuevo
                  </button>
                </div>
                
                {clientMode === 'existente' ? (
                  <div className="relative mt-2">
                    <div className="rounded-2xl border border-dequino-primary/60 bg-white px-4 py-2.5 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input 
                        value={customerSearch} 
                        onChange={(event) => { setCustomerSearch(event.target.value); setSelectedCustomer(null); }} 
                        placeholder="Buscar por nombre o RIF / Cédula" 
                        className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400" 
                      />
                      {customerSearch && (
                        <button onClick={() => setCustomerSearch('')}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
                      )}
                    </div>
                    {customerSearch.trim().length > 0 && !selectedCustomer && customerSuggestions.length > 0 ? (
                      <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                        {customerSuggestions.map((customer) => (
                          <button key={customer.id} type="button" onClick={() => { setSelectedCustomer(customer); setCustomerSearch(''); }} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-slate-50">
                            <span><strong className="block text-sm text-slate-800">{customer.razon_social}</strong><span className="text-xs text-slate-500">{customer.rif_cedula}</span></span>
                            <span className="text-xs text-slate-500">{customer.telefono ?? 'Sin telÃ©fono'}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    
                    {selectedCustomer ? (
                      <div className="mt-3 bg-[#EEF3EC] border border-dequino-tertiary/60 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-dequino-primary"></div>
                          <strong className="text-sm">{selectedCustomer.razon_social}</strong>
                        </div>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">Activo</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-dequino-secondary">Imagen del RIF</p>
                      <p className="text-xs text-amber-600 font-medium">Requerido</p>
                    </div>
                    <p className="text-xs text-slate-500 -mt-1 mb-1">Sube una foto desde la galerÃ­a o abre la cÃ¡mara.</p>
                    <input id="rif-image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setRifImage(event.target.files?.[0] ?? null)} className="sr-only" />
                    {rifImagePreview ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <Image src={rifImagePreview} alt="Vista previa del RIF" width={1200} height={800} unoptimized className="h-48 w-full object-contain" />
                        <div className="flex gap-2 border-t border-slate-200 p-3 bg-white">
                          <label htmlFor="rif-image" className="flex-1 cursor-pointer rounded-xl bg-dequino-primary hover:bg-[#6C8264] px-3 py-2 text-center text-sm font-bold text-white transition-colors">
                            Cambiar imagen
                          </label>
                          <button type="button" onClick={() => setRifImage(null)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="rif-image" className="border-2 border-dashed border-dequino-primary/50 bg-[#F3F6F2] hover:bg-[#E9EFE7] rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors min-h-32">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-dequino-secondary">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-dequino-secondary">Seleccionar foto del RIF</p>
                          <p className="text-[10px] tracking-wider text-slate-400 font-semibold mt-0.5">JPG, PNG O WEBP</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </section>

              {/* PASO 2: Agrega productos */}
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
                <div>
                  <p className="text-[11px] font-extrabold text-dequino-primary uppercase">Paso 2</p>
                  <h2 className="text-lg font-bold text-dequino-secondary">Agrega productos</h2>
                </div>
                <div className="relative mt-2">
                  <div className="rounded-2xl border border-dequino-primary/60 bg-white px-4 py-2.5 flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      value={productSearch} 
                      onChange={(event) => setProductSearch(event.target.value)} 
                      placeholder="Buscar por código o nombre" 
                      className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400" 
                    />
                    {productSearch && (
                      <button onClick={() => setProductSearch('')}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
                    )}
                  </div>
                  {productSuggestions.length > 0 ? (
                    <div className="absolute z-10 w-full border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-xl max-h-64 overflow-y-auto">
                      {productSuggestions.map((product) => (
                        <button key={product.id} type="button" onClick={() => addProduct(product)} className="flex w-full items-center justify-between p-3 hover:bg-[#FAF8F5] transition-colors text-left">
                          <div>
                            <strong className="block text-xs font-bold text-slate-800">{formatProductName(product)}</strong>
                            <div className="flex gap-1 mt-1">
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">[{product.codigo}]</span>
                              
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <strong className="text-sm font-bold text-dequino-secondary">{formatCurrency(product.precio)}</strong>
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            {/* PASO 3: Resumen del pedido */}
            <aside className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 h-fit lg:sticky lg:top-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-dequino-primary uppercase block">Paso 3 de 3</span>
                  <h2 className="text-lg font-bold text-dequino-secondary">Resumen del pedido</h2>
                </div>
                <div className="bg-[#EEF3EC] text-dequino-secondary font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
{cartItems.length} Productos
                </div>
              </div>

              <div className="flex flex-col gap-3">
{cartItems.length === 0 ? (
                  <p className="rounded-2xl bg-[#FAF8F5] p-4 text-sm text-slate-500 text-center border border-slate-100">
                    Busca un producto para comenzar.
                  </p>
                ) : (
cartItems.map((item) => (
                    <div key={item.id} className="bg-[#FCFCFA] rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-2 relative">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800 pr-14">{formatProductName(item)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(item.precio)} c/u</p>
                        </div>
                        <button type="button" onClick={() => updateQuantity(item.id, 0)} className="text-xs text-rose-500 font-medium hover:underline absolute top-4 right-4">
                          Eliminar
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="bg-white border border-slate-200 rounded-xl flex items-center px-2 py-1 gap-3 w-fit shadow-xs">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 text-slate-500 hover:text-slate-700 font-bold">-</button>
                          <input 
                            type="number" 
                            aria-label={`Cantidad de ${formatProductName(item)}`} 
                            value={cart[item.id] ?? ''} 
                            onFocus={(event) => event.target.select()} 
                            onChange={(event) => updateQuantity(item.id, event.target.value)} 
                            onBlur={(event) => updateQuantity(item.id, Math.max(1, Number(event.target.value) || 1))} 
                            className="w-8 py-0.5 text-center text-sm font-bold text-slate-800 bg-transparent outline-none" 
                            inputMode="numeric" 
                            min="1" 
                          />
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 text-slate-500 hover:text-slate-700 font-bold">+</button>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block text-right">Subtotal</span>
                          <strong className="text-sm font-bold text-slate-800 text-right block">{formatCurrency(item.subtotal)}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selector Tipo Documento */}
              <div className="mt-2 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de documento</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setDocumentType('nota_entrega')} className={`flex-1 text-center py-2.5 px-4 text-xs font-bold rounded-2xl transition-all ${documentType === 'nota_entrega' ? 'border border-dequino-primary bg-[#F2F6F1] text-dequino-secondary shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    {documentType === 'nota_entrega' && '✓ '}Nota de entrega
                  </button>
                  <button type="button" onClick={() => setDocumentType('factura')} className={`flex-1 text-center py-2.5 px-4 text-xs font-bold rounded-2xl transition-all ${documentType === 'factura' ? 'border border-dequino-primary bg-[#F2F6F1] text-dequino-secondary shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    {documentType === 'factura' && '✓ '}Factura
                  </button>
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-100 flex flex-col gap-1.5 text-xs mt-2">
                <div className="text-slate-600 flex justify-between font-medium">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="text-slate-600 flex justify-between font-medium">
                  <span>IVA (16%)</span><span>{formatCurrency(iva)}</span>
                </div>
                <div className="text-base font-extrabold text-dequino-secondary flex justify-between pt-2 border-t border-slate-200/60 mt-1">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Impuestos incluidos</span>
              </div>

              {message ? (
                <p className={`rounded-xl px-3 py-2 text-sm text-center font-medium ${message.error ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-[#EEF3EC] text-dequino-secondary border border-dequino-tertiary/60'}`}>
                  {message.text}
                </p>
              ) : null}

<button type="button" disabled={submitting || !hasValidItems || (clientMode === 'nuevo' && !rifImage)} onClick={() => void submitOrder()} className="w-full mt-2 bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all text-sm disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? 'Procesando...' : 'Enviar pedido ->'}
              </button>

              <span className="text-[10px] text-slate-400 text-center block mt-1">
                Dequino ERP • Conexión protegida
              </span>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
