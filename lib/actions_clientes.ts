'use server';
import { requireAdmin } from './actions';
import { Cliente } from '@/types/database';

export type ClienteStats = Cliente & {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  topProduct: string;
  hasDebt: boolean;
  paidSales: number;
  pendingSales: number;
};

export async function getClientesData(): Promise<{ data?: ClienteStats[], error?: string }> {
  try {
    const supabase = await requireAdmin();

    const [clientesRes, pedidosRes] = await Promise.all([
      supabase.from('clientes').select('*').order('razon_social', { ascending: true }),
      supabase.from('pedidos').select('*, detalles:pedido_detalles(*, producto:productos(*))') as any
    ]);

    if (clientesRes.error) throw new Error(clientesRes.error.message);
    if (pedidosRes.error) throw new Error(pedidosRes.error.message);

    const clientes = clientesRes.data || [];
    const pedidos: any[] = pedidosRes.data || [];

    // Map clients to their stats
    const statsMap: Record<string, ClienteStats> = {};
    
    clientes.forEach(c => {
      statsMap[c.id] = {
        ...c,
        activo: c.activo ?? true, // ensure boolean
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        topProduct: '-',
        hasDebt: false,
        paidSales: 0,
        pendingSales: 0
      };
    });

    // Helper to track products per client
    const clientProductsMap: Record<string, Record<string, { name: string, qty: number }>> = {};

    pedidos.forEach(p => {
      const cId = p.cliente_id;
      if (!statsMap[cId]) return;

      const stat = statsMap[cId];
      stat.totalOrders += 1;
      stat.totalSpent += p.total;
      
      // Update last order date
      if (!stat.lastOrderDate || new Date(p.created_at) > new Date(stat.lastOrderDate)) {
        stat.lastOrderDate = p.created_at;
      }

      // Debt and sales status
      if (p.estado === 'pagado') {
        stat.paidSales += p.total;
      } else if (p.estado === 'pedido_entregado' || p.estado === 'pago_en_revision') {
        stat.pendingSales += p.total;
        stat.hasDebt = true;
      } else if (p.estado === 'por_procesar' || p.estado === 'registrado') {
        // usually not counted as debt until delivered, but we track pendingSales if you want
      }

      // Products tracking
      if (!clientProductsMap[cId]) clientProductsMap[cId] = {};
      
      (p.detalles || []).forEach((det: any) => {
        const prod = det.producto;
        if (prod) {
          if (!clientProductsMap[cId][prod.id]) {
            clientProductsMap[cId][prod.id] = { name: prod.descripcion, qty: 0 };
          }
          clientProductsMap[cId][prod.id].qty += det.cantidad;
        }
      });
    });

    // Determine top product
    Object.keys(clientProductsMap).forEach(cId => {
      let topProduct = '-';
      let maxQty = 0;
      Object.values(clientProductsMap[cId]).forEach(p => {
        if (p.qty > maxQty) {
          maxQty = p.qty;
          topProduct = p.name;
        }
      });
      if (statsMap[cId]) {
        statsMap[cId].topProduct = topProduct;
      }
    });

    return { data: Object.values(statsMap) };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error cargando clientes' };
  }
}

export async function createCliente(payload: {
  razon_social: string;
  rif_cedula: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('clientes').insert({
      ...payload,
      activo: true
    });
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error creando cliente' };
  }
}

export async function toggleClienteStatus(id: string, currentStatus: boolean): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('clientes').update({ activo: !currentStatus }).eq('id', id);
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error actualizando estado' };
  }
}

export async function bulkImportClientes(clientes: any[]): Promise<{ error?: string, count?: number }> {
  try {
    const supabase = await requireAdmin();
    
    // Prepare payload
    const payload = clientes.map(c => ({
      razon_social: c.razon_social || c.nombre || 'Sin Nombre',
      rif_cedula: c.rif_cedula || c.rif || 'S/N',
      direccion: c.direccion || null,
      telefono: c.telefono || null,
      email: c.email || null,
      activo: true
    }));

    const { error } = await supabase.from('clientes').insert(payload);
    if (error) throw new Error(error.message);

    return { count: payload.length };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error en carga masiva' };
  }
}

export async function getClienteDetail(id: string): Promise<{ data?: any, error?: string }> {
  try {
    const supabase = await requireAdmin();

    const { data: cliente, error: clienteError } = await supabase.from('clientes').select('*').eq('id', id).single();
    if (clienteError || !cliente) throw new Error(clienteError?.message || 'Cliente no encontrado');

    const { data: notas } = await supabase.from('cliente_notas').select('*').eq('cliente_id', id).order('created_at', { ascending: false });

    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select('*, vendedor:vendedores(*), detalles:pedido_detalles(*, producto:productos(*))')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }) as any;
      
    if (pedidosError) throw new Error(pedidosError.message);

    const orders = pedidos || [];
    let totalSpent = 0;
    let paidSales = 0;
    let pendingSales = 0;
    let topProduct = '-';
    let maxQty = 0;

    const productsMap: Record<string, { name: string, qty: number, total: number }> = {};

    orders.forEach((p: any) => {
      totalSpent += p.total;
      if (p.estado === 'pagado') {
        paidSales += p.total;
      } else if (p.estado === 'pedido_entregado' || p.estado === 'pago_en_revision') {
        pendingSales += p.total;
      }

      (p.detalles || []).forEach((det: any) => {
        const prod = det.producto;
        if (prod) {
          if (!productsMap[prod.id]) {
            productsMap[prod.id] = { name: prod.descripcion, qty: 0, total: 0 };
          }
          productsMap[prod.id].qty += det.cantidad;
          productsMap[prod.id].total += (det.precio_unitario * det.cantidad);
        }
      });
    });

    const topProducts = Object.values(productsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    if (topProducts.length > 0) topProduct = topProducts[0].name;

    return { 
      data: {
        cliente,
        notas: notas || [],
        orders,
        kpis: {
          totalSpent,
          paidSales,
          pendingSales,
          totalOrders: orders.length,
          avgOrder: orders.length > 0 ? totalSpent / orders.length : 0,
          lastOrderDate: orders.length > 0 ? orders[0].created_at : null,
          topProduct
        },
        topProducts
      }
    };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error cargando detalle del cliente' };
  }
}

export async function deleteCliente(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se puede eliminar el cliente (puede tener pedidos asociados).' };
  }
}

export async function updateCliente(id: string, payload: any): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('clientes').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error actualizando cliente.' };
  }
}


export async function createClienteNota(cliente_id: string, contenido: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('cliente_notas').insert({ cliente_id, contenido });
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error creando nota' };
  }
}
