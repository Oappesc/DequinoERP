'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from './actions';
import { revalidatePath } from 'next/cache';

// --- CLIENTES CONSIGNACION ---

export async function getClientesConsignacion() {
  const supabase = await createServerSupabaseClient();
  
  // We need to fetch clients and calculate their deuda and last order/corte.
  // We can fetch related tables separately if PostgREST struggles, but let's try a join.
  // Wait, in Supabase, joining nested tables from children to calculate sum in JS is fine for small datasets.
  const { data: clientes, error } = await supabase
    .from('clientes_consignacion')
    .select(`
      *,
      pedidos_consignacion ( id, created_at, pedido_consignacion_items ( cantidad_pendiente, precio_unitario ) ),
      cortes_consignacion ( id, created_at )
    `)
    .order('created_at', { ascending: false }) as any;

  if (error) return { error: error.message };

  const formatted = clientes.map((c: any) => {
    // Ultimo pedido
    const pedidos = c.pedidos_consignacion || [];
    const ultimo_pedido = pedidos.length > 0 
      ? pedidos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
      : null;

    // Ultimo corte
    const cortes = c.cortes_consignacion || [];
    const ultimo_corte = cortes.length > 0 
      ? cortes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
      : null;

    // Deuda
    let deuda = 0;
    pedidos.forEach((p: any) => {
      const items = p.pedido_consignacion_items || [];
      items.forEach((item: any) => {
        deuda += (item.cantidad_pendiente * item.precio_unitario);
      });
    });

    return {
      id: c.id,
      rif_cedula: c.rif_cedula,
      razon_social: c.razon_social,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      activo: c.activo,
      notas: c.notas,
      created_at: c.created_at,
      ultimo_pedido,
      ultimo_corte,
      deuda_total: deuda
    };
  });

  return { data: formatted };
}

export async function saveClienteConsignacion(data: any) {
  const supabase = await requireAdmin();
  let result;
  
  if (data.id) {
    const { id, ...updateData } = data;
    result = await supabase.from('clientes_consignacion').update(updateData).eq('id', id).select().single() as any;
  } else {
    result = await supabase.from('clientes_consignacion').insert(data).select().single() as any;
  }

  if (result.error) return { error: result.error.message };
  revalidatePath('/admin/consignacion');
  return { data: result.data };
}

export async function getClienteConsignacion(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('clientes_consignacion').select('*').eq('id', id).single() as any;
  if (error) return { error: error.message };
  return { data };
}


// --- PEDIDOS CONSIGNACION ---

export async function crearPedidoConsignacion(cliente_id: string, pdf_url: string | null, items: any[]) {
  const supabase = await requireAdmin();

  // 1. Crear Pedido
  const codigo = 'PDC-' + Date.now();
  const total_usd = items.reduce((acc, it) => acc + (it.cantidad * it.precio), 0);

  const { data: pedido, error: pedError } = await supabase
    .from('pedidos_consignacion')
    .insert({
      cliente_id,
      codigo,
      pdf_url,
      total_usd,
      estado: 'abierto'
    })
    .select()
    .single() as any;

  if (pedError) return { error: pedError.message };

  // 2. Crear Items
  const insertItems = items.map(it => ({
    pedido_id: pedido.id,
    producto_id: it.producto_id,
    cantidad_despachada: it.cantidad,
    cantidad_pendiente: it.cantidad,
    precio_unitario: it.precio,
    subtotal: it.cantidad * it.precio
  }));

  const { error: itemsError } = await supabase.from('pedido_consignacion_items').insert(insertItems);
  if (itemsError) return { error: itemsError.message };

  // 3. Actualizar Inventario Consignacion (Suma)
  for (const it of items) {
    // Check if exists
    const { data: inv }: any = await supabase
      .from('inventario_consignacion')
      .select('id, cantidad_actual')
      .eq('cliente_id', cliente_id)
      .eq('producto_id', it.producto_id)
      .single() as any;

    if (inv) {
      await supabase
        .from('inventario_consignacion')
        .update({ cantidad_actual: inv.cantidad_actual + it.cantidad, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
    } else {
      await supabase
        .from('inventario_consignacion')
        .insert({
          cliente_id,
          producto_id: it.producto_id,
          cantidad_actual: it.cantidad
        });
    }
  }

  revalidatePath('/admin/consignacion');
  revalidatePath('/admin/consignacion/' + cliente_id);
  return { data: pedido };
}

export async function getPedidosCliente(cliente_id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('pedidos_consignacion')
    .select('*, pedido_consignacion_items(*, productos(*))')
    .eq('cliente_id', cliente_id)
    .order('created_at', { ascending: false }) as any;
    
  if (error) return { error: error.message };
  return { data };
}

// --- INVENTARIO CONSIGNACION ---

export async function getInventarioCliente(cliente_id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('inventario_consignacion')
    .select('*, productos(*)')
    .eq('cliente_id', cliente_id)
    .order('updated_at', { ascending: false }) as any;
    
  if (error) return { error: error.message };
  return { data };
}

// --- CORTES CONSIGNACION ---

export async function crearCorteConsignacion(cliente_id: string, items: any[]) {
  const supabase = await requireAdmin();

  const codigo = 'CTC-' + Date.now();
  const total_usd = items.reduce((acc, it) => acc + (it.cantidad * it.precio), 0);

  const { data: corte, error: cortError } = await supabase
    .from('cortes_consignacion')
    .insert({
      cliente_id,
      codigo,
      total_usd,
      estado: 'pendiente'
    })
    .select()
    .single() as any;

  if (cortError) return { error: cortError.message };

  const insertItems = items.map(it => ({
    corte_id: corte.id,
    producto_id: it.producto_id,
    cantidad_vendida: it.cantidad,
    precio_unitario: it.precio,
    subtotal: it.cantidad * it.precio
  }));

  const { error: itemsError } = await supabase.from('corte_consignacion_items').insert(insertItems);
  if (itemsError) return { error: itemsError.message };

  revalidatePath('/admin/consignacion');
  revalidatePath('/admin/consignacion/' + cliente_id);
  return { data: corte };
}

export async function getCortesCliente(cliente_id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cortes_consignacion')
    .select('*, corte_consignacion_items(*, productos(*))')
    .eq('cliente_id', cliente_id)
    .order('created_at', { ascending: false }) as any;
    
  if (error) return { error: error.message };
  return { data };
}

export async function confirmarCorteConsignacion(corte_id: string) {
  const supabase = await requireAdmin();
  
  // 1. Get corte and items
  const { data: corte, error: cortError } = await supabase
    .from('cortes_consignacion')
    .select('*, corte_consignacion_items(*)')
    .eq('id', corte_id)
    .single() as any;
    
  if (cortError) return { error: cortError.message };
  if (corte.estado === 'confirmado') return { error: 'Ya está confirmado' };

  // 2. FIFO Logic
  // Fetch all open orders for this client, ascending (oldest first)
  const { data: pedidosAbiertos }: any = await supabase
    .from('pedidos_consignacion')
    .select('id, pedido_consignacion_items(id, producto_id, cantidad_pendiente)')
    .eq('cliente_id', corte.cliente_id)
    .eq('estado', 'abierto')
    .order('created_at', { ascending: true }) as any;

  for (const corteItem of corte.corte_consignacion_items) {
    let cantALiquidar = corteItem.cantidad_vendida;
    
    // a) Descontar del inventario general
    const { data: inv }: any = await supabase
      .from('inventario_consignacion')
      .select('id, cantidad_actual')
      .eq('cliente_id', corte.cliente_id)
      .eq('producto_id', corteItem.producto_id)
      .single() as any;
      
    if (inv) {
      const nuevaCantidad = Math.max(0, inv.cantidad_actual - corteItem.cantidad_vendida);
      await supabase.from('inventario_consignacion').update({ cantidad_actual: nuevaCantidad }).eq('id', inv.id);
    }

    // b) FIFO: descontar de cantidad_pendiente de pedidos
    if (pedidosAbiertos) {
      for (const pedido of pedidosAbiertos) {
        if (cantALiquidar <= 0) break;
        
        const itemEnPedido = pedido.pedido_consignacion_items.find((i: any) => i.producto_id === corteItem.producto_id && i.cantidad_pendiente > 0);
        
        if (itemEnPedido) {
          if (itemEnPedido.cantidad_pendiente >= cantALiquidar) {
            // Can fulfill entirely from this order
            itemEnPedido.cantidad_pendiente -= cantALiquidar;
            await supabase.from('pedido_consignacion_items').update({ cantidad_pendiente: itemEnPedido.cantidad_pendiente }).eq('id', itemEnPedido.id);
            cantALiquidar = 0;
          } else {
            // Can only partially fulfill, take what's left and continue to next order
            cantALiquidar -= itemEnPedido.cantidad_pendiente;
            itemEnPedido.cantidad_pendiente = 0;
            await supabase.from('pedido_consignacion_items').update({ cantidad_pendiente: 0 }).eq('id', itemEnPedido.id);
          }
        }
      }
    }
  }

  // 3. Re-evaluate open orders status. If an order has 0 total pendiente, set to cerrado.
  if (pedidosAbiertos) {
    for (const pedido of pedidosAbiertos) {
      const totalPendiente = pedido.pedido_consignacion_items.reduce((acc: number, cur: any) => acc + cur.cantidad_pendiente, 0);
      if (totalPendiente === 0) {
        await supabase.from('pedidos_consignacion').update({ estado: 'cerrado' }).eq('id', pedido.id);
      }
    }
  }

  // 4. Update corte status to confirmado
  await supabase.from('cortes_consignacion').update({ 
    estado: 'confirmado',
    fecha_confirmacion: new Date().toISOString()
  }).eq('id', corte_id);

  revalidatePath('/admin/consignacion');
  revalidatePath('/admin/consignacion/' + corte.cliente_id);
  
  return { data: true };
}
