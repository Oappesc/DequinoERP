'use client';

import { formatProductName } from '@/lib/productUtils';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { useEffect, useMemo, useState } from 'react';
import { adminCrearPedido } from '@/lib/actions';
import { Search, X, Paperclip, Plus } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

type Product = {
  id: string;
  codigo: string;
  nombre?: string | null;
  descripcion: string;
  tamano_valor?: number | null;
  unidad_medida?: string | null;
  precio: number;
  stock: number;
};

type Customer = {
  id: string;
  rif_cedula: string;
  razon_social: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
};

export default function CrearPedidoModal({
  isOpen,
  onClose,
  onCreated,
  sellers: propSellers
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  sellers?: any[];
}) {
  const { formatCurrency } = useCurrency();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [sellers, setSellers] = useState<any[]>(propSellers || []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [selectedSeller, setSelectedSeller] = useState('');
  const [clientMode, setClientMode] = useState<'existente' | 'nuevo'>('existente');
  
  // Existing client
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New client fields
  const [newClient, setNewClient] = useState({
    razonSocial: '',
    rifCedula: '',
    telefono: '',
    email: '',
    direccion: ''
  });
  const [rifImage, setRifImage] = useState<File | null>(null);

  // Products & Cart
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [docType, setDocType] = useState<'factura' | 'nota_entrega'>('factura');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoadingData(true);
      const [vRes, cRes, pRes] = await Promise.all([
        supabase.from('vendedores').select('id, nombre, cedula').eq('activo', true).order('nombre'),
        supabase.from('clientes').select('id, rif_cedula, razon_social, telefono, email, direccion').order('razon_social'),
        supabase.from('productos').select('*').eq('activo', true).order('descripcion')
      ]);
      if (vRes.data && (!propSellers || propSellers.length === 0)) setSellers(vRes.data);
      if (cRes.data) setCustomers(cRes.data);
      if (pRes.data) setProducts(pRes.data);
      setLoadingData(false);
    };
    fetchData();
  }, [isOpen, supabase, propSellers]);

  const customerSuggestions = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return [];
    return customers
      .filter(c => c.razon_social.toLowerCase().includes(q) || c.rif_cedula.toLowerCase().includes(q))
      .slice(0, 5);
  }, [customers, customerSearch]);

  const productSuggestions = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter(p => formatProductName(p).toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [products, productSearch]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find(p => p.id === id);
        if (!product || quantity <= 0) return null;
        return {
          ...product,
          quantity,
          subtotal: product.precio * quantity
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [cart, products]);

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const iva = docType === 'nota_entrega' ? 0 : sub * 0.16;
    return { subtotal: sub, tax: iva, total: sub + iva };
  }, [cartItems, docType]);

  const isCartEmpty = cartItems.length === 0;

  const isNewClientValid = 
    newClient.razonSocial.trim().length > 0 && 
    newClient.rifCedula.trim().length > 0;

  const canSubmit = 
    Boolean(selectedSeller) &&
    !isCartEmpty &&
    (clientMode === 'existente' ? Boolean(selectedCustomer) : isNewClientValid);

  const addProduct = (product: Product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
    setProductSearch('');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedSeller) {
      setMessage('Debe seleccionar un Asesor / Vendedor.');
      return;
    }
    if (clientMode === 'existente' && !selectedCustomer) {
      setMessage('Debe seleccionar un cliente existente.');
      return;
    }
    if (clientMode === 'nuevo' && !isNewClientValid) {
      setMessage('Razón Social y RIF/Cédula son obligatorios para el nuevo cliente.');
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
      } else {
        formData.append('nuevoRazonSocial', newClient.razonSocial.trim());
        formData.append('nuevoRifCedula', newClient.rifCedula.trim());
        if (newClient.telefono.trim()) formData.append('nuevoTelefono', newClient.telefono.trim());
        if (newClient.email.trim()) formData.append('nuevoEmail', newClient.email.trim());
        if (newClient.direccion.trim()) formData.append('nuevoDireccion', newClient.direccion.trim());
        if (rifImage) formData.append('rifImage', rifImage);
      }

      formData.append('tipoDocumento', docType);

      const itemsParam = cartItems.map(item => ({
        productoId: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio
      }));
      formData.append('items', JSON.stringify(itemsParam));

      const res = await adminCrearPedido(formData);
      if (res.error) throw new Error(res.error);

      // Limpiar estado
      setCart({});
      setSelectedCustomer(null);
      setClientMode('existente');
      setCustomerSearch('');
      setNewClient({ razonSocial: '', rifCedula: '', telefono: '', email: '', direccion: '' });
      setRifImage(null);
      setProductSearch('');
      setSelectedSeller('');
      setDocType('factura');

      onCreated();
    } catch (err: any) {
      setMessage(err.message || 'Error al crear el pedido.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
          <h2 className="text-xl font-bold text-dequino-secondary">Crear Nuevo Pedido</h2>
          <div className="flex items-center gap-4">
            <CurrencySwitcher />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Contenido Desplazable */}
        <div className="overflow-y-auto p-6 flex-1 bg-[#FAF8F5]">
          {loadingData ? (
            <div className="flex items-center justify-center py-20 text-slate-400 font-medium">Cargando datos...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Columna Izquierda: Formulario */}
              <div className="space-y-6">
                {/* Asesor */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                    Asignar a Asesor / Vendedor *
                  </h3>
                  <div className="relative inline-block w-full">
                    <select
                      value={selectedSeller}
                      onChange={e => setSelectedSeller(e.target.value)}
                      className="w-full appearance-none bg-[#FCFCFA] border border-slate-200 text-slate-700 font-medium text-xs rounded-2xl px-4 py-2.5 pr-8 focus:border-dequino-primary focus:ring-2 focus:ring-dequino-primary/20 outline-none transition-all cursor-pointer shadow-sm"
                    >
                      <option className="bg-white text-slate-700 py-1.5" value="">
                        -- Seleccionar Asesor --
                      </option>
                      {sellers.map((v: any) => (
                        <option className="bg-white text-slate-700 py-1.5" key={v.id} value={v.id}>
                          {v.nombre} {v.cedula ? `(${v.cedula})` : ''}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dequino-secondary w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* PASO 1: Cliente */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold text-dequino-primary uppercase">Paso 1</p>
                    <h2 className="text-lg font-bold text-dequino-secondary">Elige tu cliente</h2>
                  </div>

                  <div className="bg-[#F4F1EA] p-1 rounded-2xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => setClientMode('existente')}
                      className={`py-2 px-4 rounded-xl flex-1 text-xs text-center flex items-center justify-center gap-1.5 transition-colors ${
                        clientMode === 'existente'
                          ? 'bg-white text-dequino-secondary font-medium shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('nuevo')}
                      className={`py-2 px-4 rounded-xl flex-1 text-xs text-center flex items-center justify-center gap-1.5 transition-colors ${
                        clientMode === 'nuevo'
                          ? 'bg-white text-dequino-secondary font-medium shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Nuevo
                    </button>
                  </div>

                  {clientMode === 'existente' ? (
                    <div className="relative mt-2">
                      <div className="rounded-2xl border border-dequino-primary/60 bg-white px-4 py-2.5 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                          value={customerSearch}
                          onChange={e => {
                            setCustomerSearch(e.target.value);
                            setSelectedCustomer(null);
                          }}
                          placeholder="Buscar por nombre o RIF / Cédula"
                          className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400"
                        />
                        {customerSearch && (
                          <button onClick={() => setCustomerSearch('')}>
                            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>

                      {customerSearch.trim().length > 0 && !selectedCustomer && customerSuggestions.length > 0 ? (
                        <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                          {customerSuggestions.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearch('');
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                            >
                              <span>
                                <strong className="block text-sm text-slate-800">{customer.razon_social}</strong>
                                <span className="text-xs text-slate-500">{customer.rif_cedula}</span>
                              </span>
                              <span className="text-xs text-slate-500">{customer.telefono ?? 'Sin teléfono'}</span>
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
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                            {selectedCustomer.rif_cedula}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    /* Formulario de Nuevo Cliente */
                    <div className="mt-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Razón Social / Nombre <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Distribuidora Central C.A."
                            value={newClient.razonSocial}
                            onChange={e => setNewClient({ ...newClient, razonSocial: e.target.value })}
                            className="w-full bg-[#FCFCFA] border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            RIF / Cédula <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. J-12345678-9 o V-12345678"
                            value={newClient.rifCedula}
                            onChange={e => setNewClient({ ...newClient, rifCedula: e.target.value })}
                            className="w-full bg-[#FCFCFA] border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Teléfono <span className="text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. 0414-1234567"
                            value={newClient.telefono}
                            onChange={e => setNewClient({ ...newClient, telefono: e.target.value })}
                            className="w-full bg-[#FCFCFA] border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Correo electrónico <span className="text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="email"
                            placeholder="cliente@ejemplo.com"
                            value={newClient.email}
                            onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                            className="w-full bg-[#FCFCFA] border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Dirección de entrega <span className="text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Dirección física o local comercial..."
                            value={newClient.direccion}
                            onChange={e => setNewClient({ ...newClient, direccion: e.target.value })}
                            className="w-full bg-[#FCFCFA] border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-dequino-primary focus:border-dequino-primary outline-none"
                          />
                        </div>
                      </div>

                      {/* Adjuntar RIF (Opcional) en formato píldora */}
                      <div className="pt-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="admin-rif-upload"
                          onChange={e => setRifImage(e.target.files?.[0] ?? null)}
                        />
                        <div className="flex items-center gap-3">
                          <label
                            htmlFor="admin-rif-upload"
                            className="bg-[#FAF8F5] border border-dequino-tertiary/70 text-dequino-secondary text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#F3EFEA] transition-all cursor-pointer w-fit"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            {rifImage ? `Archivo: ${rifImage.name}` : '📎 Adjuntar foto RIF/Cédula (opcional)'}
                          </label>
                          {rifImage && (
                            <button
                              type="button"
                              onClick={() => setRifImage(null)}
                              className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PASO 2: Agrega productos */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold text-dequino-primary uppercase">Paso 2</p>
                    <h2 className="text-lg font-bold text-dequino-secondary">Agrega productos</h2>
                  </div>

                  <div className="relative mt-2">
                    <div className="rounded-2xl border border-dequino-primary/60 bg-white px-4 py-2.5 flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar por código o nombre..."
                        className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400"
                      />
                      {productSearch && (
                        <button onClick={() => setProductSearch('')}>
                          <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        </button>
                      )}
                    </div>

                    {productSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-xl max-h-64 overflow-y-auto">
                        {productSuggestions.map(product => (
                          <div
                            key={product.id}
                            className="flex w-full items-center justify-between p-3 hover:bg-[#FAF8F5] transition-colors text-left"
                          >
                            <div>
                              <strong className="block text-xs font-bold text-dequino-secondary">
                                {formatProductName(product)}
                              </strong>
                              <div className="flex gap-1 mt-1">
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  [{product.codigo || 'PT-DQ'}]
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <strong className="text-sm font-bold text-dequino-secondary">
                                {formatCurrency(product.precio)}
                              </strong>
                              <button
                                type="button"
                                onClick={() => addProduct(product)}
                                className="bg-dequino-tertiary/30 text-dequino-secondary hover:bg-dequino-primary hover:text-white p-2 rounded-xl transition-all"
                                title="Agregar al pedido"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: PASO 3 - Resumen */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 h-fit sticky top-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold text-dequino-primary uppercase block">Paso 3 de 3</span>
                    <h2 className="text-lg font-bold text-dequino-secondary">Resumen del pedido</h2>
                  </div>
                  <div className="bg-[#EEF3EC] text-dequino-secondary font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    {cartItems.length} Productos
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {isCartEmpty ? (
                    <p className="rounded-2xl bg-[#FAF8F5] p-4 text-sm text-slate-500 text-center border border-slate-100">
                      Busca un producto para comenzar.
                    </p>
                  ) : (
                    cartItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-[#FCFCFA] rounded-2xl p-4 border border-slate-200/60 flex flex-col gap-2 relative"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-800 pr-14">{formatProductName(item)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(item.precio)} c/u</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 0)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 absolute top-4 right-4"
                          >
                            Eliminar
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="bg-white border border-slate-200 rounded-xl flex items-center px-2 py-1 gap-3 w-fit shadow-xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 text-slate-500 hover:text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 py-0.5 text-center text-sm font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 text-slate-500 hover:text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block text-right">Subtotal</span>
                            <strong className="text-sm font-bold text-slate-800 text-right block">
                              {formatCurrency(item.subtotal)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tipo de Documento */}
                <div className="mt-2 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tipo de documento
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDocType('nota_entrega')}
                      className={`flex-1 text-center py-2.5 px-4 text-xs font-bold rounded-2xl transition-all ${
                        docType === 'nota_entrega'
                          ? 'border border-dequino-primary bg-[#F2F6F1] text-dequino-secondary shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {docType === 'nota_entrega' && '✓ '}Nota de entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocType('factura')}
                      className={`flex-1 text-center py-2.5 px-4 text-xs font-bold rounded-2xl transition-all ${
                        docType === 'factura'
                          ? 'border border-dequino-primary bg-[#F2F6F1] text-dequino-secondary shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {docType === 'factura' && '✓ '}Factura
                    </button>
                  </div>
                </div>

                {/* Totales */}
                <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-100 flex flex-col gap-1.5 text-xs mt-2">
                  <div className="text-slate-600 flex justify-between font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {docType === 'factura' && (
                    <div className="text-slate-600 flex justify-between font-medium">
                      <span>IVA (16%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                  )}
                  <div className="text-base font-extrabold text-dequino-secondary flex justify-between pt-2 border-t border-slate-200/60 mt-1">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Impuestos incluidos</span>
                </div>

                {message && (
                  <p className="rounded-xl px-3 py-2 text-xs text-center font-medium bg-rose-50 text-rose-700 border border-rose-100">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sending || !canSubmit}
                  className="w-full mt-2 bg-dequino-primary hover:bg-[#6C8264] text-white font-medium py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-dequino-primary/20 transition-all text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Guardando...' : 'Enviar pedido ->'}
                </button>

                <span className="text-[10px] text-slate-400 text-center block mt-1">
                  Dequino ERP • Conexión protegida
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
