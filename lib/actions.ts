'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import type { Cliente, DocumentoTipo, PedidoEstado, Producto, Vendedor } from '@/types/database';

const sellerCookie = 'dq_seller_session';
const sessionSecret = process.env.SESSION_SECRET ?? 'change-this-session-secret';

export type ActionResult<T> = { data?: T; error?: string };

function sign(value: string) {
  return createHmac('sha256', sessionSecret).update(value).digest('hex');
}

function encodeSession(sellerId: string) {
  const payload = Buffer.from(sellerId, 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return Buffer.from(payload, 'base64url').toString('utf8');
}

async function currentSellerId() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(sellerCookie)?.value);
}

export async function loginSeller(cedula: string): Promise<ActionResult<Vendedor>> {
  const supabase = await createServerSupabaseClient();
  const { data: seller, error } = await supabase
    .from('vendedores')
    .select('*')
    .eq('cedula', cedula.trim())
    .eq('activo', true)
    .maybeSingle();

  if (error || !seller) return { error: 'La cÃ©dula ingresada no estÃ¡ registrada como vendedor' };

  const cookieStore = await cookies();
  cookieStore.set(sellerCookie, encodeSession(seller.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return { data: seller };
}

export async function loginAdmin(email: string, password: string): Promise<ActionResult<{ email: string }>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user?.email) return { error: error?.message ?? 'No se pudo iniciar sesiÃ³n.' };
  return { data: { email: data.user.email } };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(sellerCookie);
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
}

export async function getSellerSession(): Promise<ActionResult<Vendedor>> {
  const sellerId = await currentSellerId();
  if (!sellerId) return { error: 'SesiÃ³n de vendedor no encontrada.' };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('vendedores').select('*').eq('id', sellerId).eq('activo', true).maybeSingle();
  return error || !data ? { error: 'SesiÃ³n de vendedor no vÃ¡lida.' } : { data };
}

export async function getSellerData(month?: string): Promise<ActionResult<{ seller: Vendedor; customers: Cliente[]; products: Producto[]; orders: unknown[] }>> {
  const session = await getSellerSession();
  if (!session.data) return { error: session.error };
  const supabase = await createServerSupabaseClient();
  const [customers, products, orders] = await Promise.all([
    supabase.from('clientes').select('*').eq('activo', true).order('razon_social'),
    supabase.from('productos').select('*').eq('activo', true).order('descripcion'),
    supabase.from('pedidos').select('*, cliente:clientes(*), detalles:pedido_detalles(*)').eq('vendedor_id', session.data.id).order('created_at', { ascending: false }),
  ]);
  const filteredOrders = month ? (orders.data ?? []).filter((order) => order.created_at.startsWith(month)) : orders.data ?? [];
  if (customers.error || products.error || orders.error) return { error: 'No se pudo cargar la informaciÃ³n del vendedor.' };
  return { data: { seller: session.data, customers: customers.data ?? [], products: products.data ?? [], orders: filteredOrders } };
}

export async function getSellerOrders(input: { month: string; status?: PedidoEstado }): Promise<ActionResult<unknown[]>> {
    const session = await getSellerSession();
    if (!session.data) return { error: session.error };
    if (!/^\d{4}-\d{2}$/.test(input.month)) return { error: 'El periodo seleccionado no es valido.' };
  
    const start = `${input.month}-01T00:00:00.000Z`;
    const [year, month] = input.month.split('-').map(Number);
    const end = new Date(Date.UTC(year, month, 1)).toISOString();
    const supabase = await createServerSupabaseClient();
    
    // Paso A: Obtener atrasados globales
    const { data: atrasadosRes } = await supabase
      .from('pedidos')
      .select('*, cliente:clientes(*)')
      .eq('vendedor_id', session.data.id)
      .neq('estado', 'pagado')
      .not('fecha_limite_cobro', 'is', null)
      .lt('fecha_limite_cobro', new Date().toISOString());
      
    const atrasados = atrasadosRes ?? [];
  
    // Paso B: Obtener normales del mes
    let query = supabase
      .from('pedidos')
      .select('*, cliente:clientes(*)')
      .eq('vendedor_id', session.data.id)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false });
    if (input.status) query = query.eq('estado', input.status);
  
    const { data: monthOrders, error } = await query;
    if (error) return { error: 'No se pudieron cargar los pedidos.' };
    
    // Consolidar listas excluyendo duplicados
    const atrasadosIds = new Set(atrasados.map((o: any) => o.id));
    const normales = (monthOrders ?? []).filter((o: any) => !atrasadosIds.has(o.id));
    
    // Paso C: Se devuelve la lista consolidada. El frontend hace el paso D (ordenamiento)
    return { data: [...atrasados, ...normales] };
  }
  
  export async function subirComprobantePago(orderId: string, comprobanteUrl: string): Promise<ActionResult<{ url: string }>> {
  const sellerId = await currentSellerId();
  if (!sellerId) return { error: 'Debes iniciar sesión como vendedor.' };
  const supabase = createServiceRoleSupabaseClient();
  const { data: order } = await supabase.from('pedidos').select('id, correlativo, total, cliente:clientes(razon_social)').eq('id', orderId).eq('vendedor_id', sellerId).maybeSingle();
  if (!order) return { error: 'El pedido no está disponible para recibir comprobante.' };
  const { error: updateError } = await supabase.from('pedidos').update({ comprobante_pago_url: comprobanteUrl, estado: 'pago_en_revision', fecha_pago_en_revision: new Date().toISOString() }).eq('id', orderId);
  if (updateError) return { error: updateError.message };
  return { data: { url: comprobanteUrl } };
}

export async function getSellerOrderDetail(orderId: string): Promise<ActionResult<any>> {
  const sellerId = await currentSellerId();
  if (!sellerId) return { error: 'Debes iniciar sesión como vendedor.' };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('pedidos').select('*, cliente:clientes(*), detalles:pedido_detalles(*, producto:productos(*))').eq('id', orderId).eq('vendedor_id', sellerId).single();
  if (error || !data) return { error: 'No se encontró el detalle del pedido.' };
  return { data };
}

export async function deleteSellerOrder(orderId: string): Promise<ActionResult<true>> {
  const sellerId = await currentSellerId();
  if (!sellerId) return { error: 'Debes iniciar sesión como vendedor.' };
  const supabase = createServiceRoleSupabaseClient();
  const { error: errorDetalles } = await supabase.from('pedido_detalles').delete().eq('pedido_id', orderId);
  if (errorDetalles) return { error: errorDetalles.message };
  const { error } = await supabase.from('pedidos').delete().eq('id', orderId).eq('vendedor_id', sellerId);
  if (error) return { error: error.message };
  return { data: true };
}

export async function getAdminReport(filters?: { month?: string; sellerId?: string; customerId?: string }): Promise<ActionResult<{ orders: unknown[]; sellers: any[]; customers: any[]; products?: any[] }>> {
  try {
    const supabase = await requireAdmin();
    let query = supabase.from('pedidos').select('*, vendedor:vendedores(*), cliente:clientes(*)').order('created_at', { ascending: false });
    if (filters?.month) {
      const year = filters.month.split('-')[0];
      const month = filters.month.split('-')[1];
      const start = new Date(Number(year), Number(month) - 1, 1).toISOString();
      const end = new Date(Number(year), Number(month), 1).toISOString();
      query = query.gte('created_at', start).lt('created_at', end);
    }
    if (filters?.sellerId) query = query.eq('vendedor_id', filters.sellerId);
    if (filters?.customerId) query = query.eq('cliente_id', filters.customerId);
    const [orders, sellers, customers, products] = await Promise.all([query, supabase.from('vendedores').select('*').eq('activo', true).order('nombre'), supabase.from('clientes').select('*').order('razon_social'), supabase.from('productos').select('*').eq('activo', true).order('descripcion')]);
    if (orders.error || sellers.error || customers.error || products.error) return { error: 'No se pudo cargar el reporte.' };
    return { data: { orders: orders.data ?? [], sellers: sellers.data ?? [], customers: customers.data ?? [], products: products.data ?? [] } as any };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No autorizado.' };
  }
}

export async function requestAdminPasswordReset(email: string): Promise<ActionResult<true>> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: error.message };
  return { data: true };
}

export async function crearYNotificarPedido(data: FormData | any): Promise<ActionResult<{ orderId: string }>> {
  const isFormData = typeof data?.get === 'function';
  const getVal = (key: string) => isFormData ? data.get(key) : data[key];
  
  const clientMode = String((getVal('clientMode') ?? getVal('clienteMode')) ?? '');
  const supabase = createServiceRoleSupabaseClient();
  let rifUrl: string | null = null;
  
  const rifImage = getVal('rifImage');
  if (clientMode === 'nuevo' && typeof rifImage === 'object' && rifImage !== null && 'name' in rifImage) {
    const file = rifImage as File;
    const path = `rifs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'rif'}`;
    const res = await supabase.storage.from('comprobantes_pago').upload(path, file, { contentType: file.type, upsert: false });
    if (!res.error) {
      const { data: { publicUrl } } = supabase.storage.from('comprobantes_pago').getPublicUrl(path);
      rifUrl = publicUrl;
    } else {
      return { error: 'Error al subir la imagen del RIF.' };
    }
  }

  let itemsParam = getVal('items');
  let itemsParsed = [];
  if (typeof itemsParam === 'string') {
    itemsParsed = JSON.parse(itemsParam);
  } else if (Array.isArray(itemsParam)) {
    itemsParsed = itemsParsed = itemsParam;
  }

  const input = {
      clienteId: String(getVal('clienteId') ?? '') || undefined,
      nuevoCliente: clientMode === 'nuevo' ? { rifUrl: rifUrl || String(getVal('rifUrl') ?? '') } : undefined,
      tipoDocumento: String((getVal('tipoDocumento') ?? getVal('documentType')) ?? ''),
      items: itemsParsed as Array<{ productoId: string; cantidad: number }>,
  };

  const sellerId = await currentSellerId();
  if (!sellerId) return { error: 'Debes iniciar sesión como vendedor.' };
  if ((!input.clienteId && !input.nuevoCliente) || input.items.length === 0) return { error: 'Selecciona un cliente y al menos un producto.' };

  let clienteId = input.clienteId;
  let customer: any;

  if (input.nuevoCliente) {
      const newCustomer = input.nuevoCliente;
      if (!newCustomer.rifUrl) return { error: 'Falta la URL de la imagen del RIF.' };
      rifUrl = newCustomer.rifUrl;
    const { data: newCustomerData, error } = await supabase.from('clientes').insert({
      razon_social: 'NUEVO CLIENTE - PENDIENTE RIF',
      rif_cedula: `PENDIENTE-${Date.now()}`,
      telefono: null,
    }).select('*').single();
    if (error || !newCustomerData) return { error: error?.message ?? 'No se pudo registrar el cliente.' };
    customer = newCustomerData;
    clienteId = newCustomerData.id;
  } else {
    const { data: existingCustomerData, error } = await supabase.from('clientes').select('*').eq('id', clienteId as string).single();
    if (error || !existingCustomerData) return { error: 'El cliente seleccionado ya no está disponible.' };
    customer = existingCustomerData;
  }

  const { data: seller, error: sellerError } = await supabase.from('vendedores').select('*').eq('id', sellerId).single();
  if (sellerError || !seller) return { error: 'No se encontró la información del vendedor.' };
  const productIds = input.items.map((item) => item.productoId);
  const { data: products, error: productsError } = await supabase.from('productos').select('*').in('id', productIds).eq('activo', true);
  
  const details = input.items.flatMap((item) => {
    const product = products?.find((candidate) => candidate.id === item.productoId);
    const quantity = Math.max(1, Math.floor(item.cantidad));
    if (!product) return [];
    return [{ product, quantity, subtotal: product.precio * quantity }];
  });
  const subtotal = details.reduce((sum, detail) => sum + detail.subtotal, 0);
  const iva = input.tipoDocumento === 'nota_entrega' ? 0 : subtotal * 0.16;
  const total = subtotal + iva;
  const correlativo = `PED-${Date.now().toString().slice(-8)}`;
  const observacion = rifUrl ? `RIF del cliente nuevo: ${rifUrl}` : null;
  const { data: order, error: orderError } = await supabase.from('pedidos').insert({
    correlativo,
    vendedor_id: sellerId,
    cliente_id: clienteId as string,
    tipo_documento: input.tipoDocumento as DocumentoTipo,
    total,
    estado: 'registrado',
    observacion,
    porcentaje_comision: 10,
  }).select('id').single();
  if (orderError || !order) return { error: orderError?.message ?? 'No se pudo crear el pedido.' };

  const { error: detailsError } = await supabase.from('pedido_detalles').insert(details.map(({ product, quantity, subtotal: itemSubtotal }) => ({
    pedido_id: order.id,
    producto_id: product.id,
    cantidad: quantity,
    precio_unitario: product.precio,
    subtotal: itemSubtotal,
  })));
  
  return { data: { orderId: order.id } };
}

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  return supabase;
}




export async function updateOrderStatus(orderId: string, estado: string): Promise<ActionResult<true>> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('pedidos').update({ estado: estado as PedidoEstado }).eq('id', orderId);
    if (error) return { error: error.message };
    revalidatePath('/admin');
    return { data: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getAdminOrderDetail(orderId: string): Promise<ActionResult<any>> {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase.from('pedidos').select('*, cliente:clientes(*), vendedor:vendedores(*), detalles:pedido_detalles(*, producto:productos(*))').eq('id', orderId).single();
    if (error || !data) return { error: 'No se encontro el pedido' };
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateAdminOrderData(orderId: string, payload: any): Promise<ActionResult<true>> {
  try {
    const supabase = await requireAdmin();
    if (payload.clienteUpdate) {
      const { id, ...updates } = payload.clienteUpdate;
      await supabase.from('clientes').update(updates).eq('id', id);
    }
    if (payload.items) {
      await supabase.from('pedido_detalles').delete().eq('pedido_id', orderId);
      const detailsToInsert = payload.items.map((i: any) => ({
        pedido_id: orderId,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.cantidad * i.precio_unitario
      }));
      await supabase.from('pedido_detalles').insert(detailsToInsert);
    }
    if (payload.total !== undefined) {
      await supabase.from('pedidos').update({ total: payload.total }).eq('id', orderId);
    }
    revalidatePath('/admin');
    return { data: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function downloadAdminOrderExcel(orderId: string): Promise<ActionResult<{ url: string } | { buffer: string }>> {
  return { error: 'No implementado' };
}

export async function obtenerTasaBCVDB(): Promise<number | null> {
  return null;
}
