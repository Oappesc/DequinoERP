'use server';
import { requireAdmin } from './actions';
import { Pedido, PedidoDetalle, Producto } from '@/types/database';

export type ReportData = {
  general: {
    totalOrders: number;
    totalRevenue: number;
    avgMargin: number;
    revenueData: any[];
    statusData: any[];
    topSelling: any[];
  };
  ventas: {
    avgOrderValue: number;
    totalOrders: number;
    totalRevenue: number;
    topProducts: any[];
    bottomProducts: any[];
    evolutionData: any[];
    rawPedidos: any[];
    rawCortes: any[];
    rawInventario: any[];
    clientes: any[];
    productos: Producto[];
    allProductsMetrics: any[];
    topVendors: any[];
    bottomVendors: any[];
    topClients: any[];
  };
  inventario: {
    totalCostValue: number;
    totalRetailValue: number;
    totalItems: number;
    categoryData: any[];
    historyData: any[];
    priorityProducts: any[];
  };
  consignacion?: {
    capitalEnCalle: number;
    totalLiquidado: number;
    cortesPendientes: number;
    tasaLiquidacion: number;
    clientStats: any[];
    productStats: any[];
    evolutionData: any[];
    rawPedidos: any[];
    rawCortes: any[];
    rawInventario: any[];
    clientes: any[];
  };
};


function safeNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function getReportData(from?: string, to?: string): Promise<{ data?: ReportData, error?: string }> {
  try {
    const supabase = await requireAdmin();

    let queryPedidos = supabase.from('pedidos').select('*, vendedor:vendedores(*), cliente:clientes(*), detalles:pedido_detalles(*, producto:productos(*))');
    let queryPedidosConsig = supabase.from('pedidos_consignacion').select('*, cliente:clientes_consignacion(*), detalles:pedido_consignacion_items(*, producto:productos(*))');
    let queryCortesConsig = supabase.from('cortes_consignacion').select('*, cliente:clientes_consignacion(*), detalles:corte_consignacion_items(*, producto:productos(*))');
    
    if (from) {
      queryPedidos = queryPedidos.gte('created_at', from);
      queryPedidosConsig = queryPedidosConsig.gte('created_at', from);
      queryCortesConsig = queryCortesConsig.gte('created_at', from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      queryPedidos = queryPedidos.lt('created_at', toDate.toISOString());
      queryPedidosConsig = queryPedidosConsig.lt('created_at', toDate.toISOString());
      queryCortesConsig = queryCortesConsig.lt('created_at', toDate.toISOString());
    }

    const [pedidosRes, productosRes, invConsigRes, pedConsigRes, cortesConsigRes, clientesConsigRes] = await Promise.all([
      queryPedidos,
      supabase.from('productos').select('*').eq('activo', true),
      supabase.from('inventario_consignacion').select('*, producto:productos(*)'),
      queryPedidosConsig,
      queryCortesConsig,
      supabase.from('clientes_consignacion').select('*')
    ]);


    if (pedidosRes.error) throw new Error(pedidosRes.error.message);
    if (productosRes.error) throw new Error(productosRes.error.message);

    const orders = pedidosRes.data || [];
    const products = productosRes.data || [];

    // --- AGGREGATIONS ---
    let totalRevenue = 0;
    let totalCost = 0;
    
    // For Status Pie Chart
    let pagadoTotal = 0;
    let porCobrarTotal = 0;

    
    
    const clientStats: Record<string, {
      name: string;
      rif: string;
      ordersCount: number;
      paidSales: number;
      pendingSales: number;
      totalSold: number;
      productsMap: Record<string, { name: string, qty: number }>;
    }> = {};

    const vendorStats: Record<string, {
      name: string;
      ordersCount: number;
      paidSales: number;
      pendingSales: number;
      totalSold: number;
      totalCommission: number;
    }> = {};

    // For Daily Evolution
    const dailyMap: Record<string, { revenue: number, cost: number }> = {};
    const productStats: Record<string, { product: Producto, units: number, revenue: number, cost: number }> = {};

    orders.forEach((order: any) => {
      const isPagado = order.estado === 'pagado';
      if (isPagado) {
        pagadoTotal += order.total;
      } else if (order.estado !== 'registrado' && order.estado !== 'por_procesar') {
        porCobrarTotal += order.total;
      }

      totalRevenue += order.total;
      
      
      // Client Stats
      const cliente = (order as any).cliente;
      if (cliente) {
        if (!clientStats[cliente.id]) {
          clientStats[cliente.id] = {
            name: cliente.nombre_empresa,
            rif: cliente.rif,
            ordersCount: 0,
            paidSales: 0,
            pendingSales: 0,
            totalSold: 0,
            productsMap: {}
          };
        }
        clientStats[cliente.id].ordersCount += 1;
        clientStats[cliente.id].totalSold += order.total;
        
        if (isPagado) {
          clientStats[cliente.id].paidSales += order.total;
        } else if (order.estado === 'pedido_entregado' || order.estado === 'pago_en_revision') {
          clientStats[cliente.id].pendingSales += order.total;
        }
      }

      // Vendor Stats
      const vendedor = (order as any).vendedor;
      if (vendedor) {
        if (!vendorStats[vendedor.id]) {
          vendorStats[vendedor.id] = {
            name: vendedor.nombre,
            ordersCount: 0,
            paidSales: 0,
            pendingSales: 0,
            totalSold: 0,
            totalCommission: 0
          };
        }
        
        vendorStats[vendedor.id].ordersCount += 1;
        vendorStats[vendedor.id].totalSold += order.total;
        vendorStats[vendedor.id].totalCommission += order.total * ((order.porcentaje_comision || 0) / 100);
        
        if (isPagado) {
          vendorStats[vendedor.id].paidSales += order.total;
        } else if (order.estado === 'pedido_entregado' || order.estado === 'pago_en_revision') {
          vendorStats[vendedor.id].pendingSales += order.total;
        }
      }

      const day = order.created_at.split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, cost: 0 };
      
      let orderCost = 0;

      // Group details
      order.detalles.forEach((det: any) => {
        const prod = det.producto as Producto;
        if (!prod) return;
        
        const costo = prod.costo ?? (prod.precio * 0.70); // Fallback: 30% margin
        const itemCost = costo * det.cantidad;
        orderCost += itemCost;
        
        if (!productStats[prod.id]) {
          productStats[prod.id] = { product: prod, units: 0, revenue: 0, cost: 0 };
        }
        productStats[prod.id].units += det.cantidad;
        productStats[prod.id].revenue += det.subtotal;
        productStats[prod.id].cost += itemCost;

        if (cliente) {
          if (!clientStats[cliente.id].productsMap[prod.id]) {
            clientStats[cliente.id].productsMap[prod.id] = { name: prod.descripcion, qty: 0 };
          }
          clientStats[cliente.id].productsMap[prod.id].qty += det.cantidad;
        }

      });

      dailyMap[day].revenue += order.total;
      dailyMap[day].cost += orderCost;
      totalCost += orderCost;
    });

    const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    const revenueData = Object.keys(dailyMap).sort().map(date => {
      const rev = dailyMap[date].revenue;
      const cst = dailyMap[date].cost;
      return {
        date,
        Facturación: rev,
        Gastos: cst,
        Utilidad: rev - cst
      };
    });

    const statusData = [
      { name: 'Pagado', value: pagadoTotal, fill: '#10b981' },
      { name: 'Por Cobrar', value: porCobrarTotal, fill: '#f43f5e' }
    ];

    const sortedProducts = Object.values(productStats).sort((a: any, b: any) => b.units - a.units);
    const topProductsFormatted = sortedProducts.map(s => {
      const util = s.revenue - s.cost;
      const marg = s.revenue > 0 ? (util / s.revenue) * 100 : 0;
      return {
        id: s.product.id,
        name: s.product.descripcion,
        units: s.units,
        revenue: s.revenue,
        util: util,
        margin: marg,
        stock: s.product.stock
      };
    });

    
    
    const sortedClients = Object.values(clientStats).map((c: any) => {
      let topProduct = '-';
      let maxQty = 0;
      Object.values(c.productsMap).forEach((p: any) => {
        if (p.qty > maxQty) {
          maxQty = p.qty;
          topProduct = p.name;
        }
      });
      return {
        name: c.name,
        rif: c.rif,
        ordersCount: c.ordersCount,
        paidSales: c.paidSales,
        pendingSales: c.pendingSales,
        totalSold: c.totalSold,
        topProduct
      };
    }).sort((a: any, b: any) => b.totalSold - a.totalSold);

    const sortedVendors = Object.values(vendorStats).sort((a: any, b: any) => b.totalSold - a.totalSold);

    // --- INVENTARIO AGGREGATIONS ---
    let invTotalCost = 0;
    let invTotalRetail = 0;
    const invPriority: any[] = [];

    // Assuming we calculate historical sales for the last 30 days to get avg sales/day
    // For simplicity, we just use the global productStats if they queried last 30 days,
    // but ideally we should fetch explicitly 30 days. We'll approximate with `productStats`.
    const daysFiltered = (from && to) 
      ? Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24)))
      : 30; // Default to 30 days if no filter

    products.forEach((p: any) => {
      const costo = p.costo ?? (p.precio * 0.70);
      invTotalCost += costo * p.stock;
      invTotalRetail += p.precio * p.stock;

      const soldInPeriod = productStats[p.id]?.units || 0;
      const avgDay = soldInPeriod / daysFiltered;
      const daysLeft = avgDay > 0 ? p.stock / avgDay : 999;
      
      let status = 'ok';
      if (p.stock <= 0) status = 'critical';
      else if (daysLeft < 7) status = 'critical';
      else if (daysLeft < 15) status = 'attention';

      invPriority.push({
        id: p.id,
        name: p.descripcion,
        stock: p.stock,
        sold30: soldInPeriod,
        avgDay: avgDay,
        daysLeft: daysLeft,
        status
      });
    });


    // --- CONSIGNACION AGGREGATIONS ---
    let capitalEnCalle = 0;
    let totalLiquidado = 0;
    let totalPendiente = 0;
    
    const clientMapConsig: Record<string, any> = {};
    const productMapConsig: Record<string, any> = {};
    const dailyMapConsig: Record<string, { despachado: number, liquidado: number }> = {};

    // Base maps
    const clientesConsig = clientesConsigRes?.data || [];
    clientesConsig.forEach((c: any) => {
      clientMapConsig[c.id] = {
        id: c.id,
        name: c.razon_social || c.nombre || 'Desconocido',
        totalDespachado: 0,
        totalLiquidado: 0,
        saldoPendiente: 0,
        ultimoCorte: null
      };
    });

    const invConsig = invConsigRes?.data || [];
    invConsig.forEach((item: any) => {
      if (item.producto) {
        capitalEnCalle += item.cantidad_actual * (item.producto.precio || 0);
        
        if (clientMapConsig[item.cliente_id]) {
          clientMapConsig[item.cliente_id].saldoPendiente += item.cantidad_actual * (item.producto.precio || 0);
        }
      }
    });

    const pedConsig = pedConsigRes?.data || [];
    pedConsig.forEach((ped: any) => {
      const day = ped.created_at.split('T')[0];
      if (!dailyMapConsig[day]) dailyMapConsig[day] = { despachado: 0, liquidado: 0 };
      
      let pedTotal = 0;
      ped.detalles.forEach((det: any) => {
        if (!det.producto) return;
        const pt = det.producto.codigo;
        if (!productMapConsig[pt]) {
          productMapConsig[pt] = { pt, name: det.producto.descripcion, despachados: 0, cobrados: 0, enStock: 0 };
        }
        productMapConsig[pt].despachados += safeNum(det.cantidad_despachada ?? det.cantidad ?? 0);
        pedTotal += safeNum(det.cantidad_despachada ?? det.cantidad ?? 0) * (det.producto.precio || 0);
      });
      dailyMapConsig[day].despachado += (safeNum(ped.total ?? ped.monto_despachado ?? pedTotal) || pedTotal);
      if (clientMapConsig[ped.cliente_id]) {
        clientMapConsig[ped.cliente_id].totalDespachado += (safeNum(ped.total ?? ped.monto_despachado ?? pedTotal) || pedTotal);
      }
    });

    const cortesConsig = cortesConsigRes?.data || [];
    cortesConsig.forEach((corte: any) => {
      if (corte.estado === 'confirmado') {
        totalLiquidado += corte.total_usd || 0;
        const day = corte.created_at.split('T')[0];
        if (!dailyMapConsig[day]) dailyMapConsig[day] = { despachado: 0, liquidado: 0 };
        dailyMapConsig[day].liquidado += corte.total_usd || 0;
        
        if (clientMapConsig[corte.cliente_id]) {
          clientMapConsig[corte.cliente_id].totalLiquidado += corte.total_usd || 0;
          const currentLast = clientMapConsig[corte.cliente_id].ultimoCorte;
          if (!currentLast || new Date(corte.created_at) > new Date(currentLast)) {
            clientMapConsig[corte.cliente_id].ultimoCorte = corte.created_at;
          }
        }
        
        corte.detalles.forEach((det: any) => {
          if (!det.producto) return;
          const pt = det.producto.codigo;
          if (!productMapConsig[pt]) {
            productMapConsig[pt] = { pt, name: det.producto.descripcion, despachados: 0, cobrados: 0, enStock: 0 };
          }
          productMapConsig[pt].cobrados += safeNum(det.cantidad_vendida ?? det.cantidad ?? 0);
        });
      } else if (corte.estado === 'pendiente') {
        totalPendiente += corte.total_usd || 0;
      }
    });

    // Populate enStock productMap
    invConsig.forEach((item: any) => {
      if (item.producto) {
        const pt = item.producto.codigo;
        if (!productMapConsig[pt]) {
          productMapConsig[pt] = { pt, name: item.producto.descripcion, despachados: 0, cobrados: 0, enStock: 0 };
        }
        productMapConsig[pt].enStock += item.cantidad_actual;
      }
    });

    const tasaLiquidacion = totalLiquidado > 0 && capitalEnCalle + totalLiquidado > 0 ? (totalLiquidado / (capitalEnCalle + totalLiquidado)) * 100 : 0;

    const evoConsig = Object.keys(dailyMapConsig).sort().map(date => ({
      date,
      "Despachado ($)": dailyMapConsig[date].despachado,
      "Liquidado ($)": dailyMapConsig[date].liquidado
    }));

    const clientStatsConsigList = Object.values(clientMapConsig).sort((a: any, b: any) => b.totalDespachado - a.totalDespachado);
    const productStatsConsigList = Object.values(productMapConsig).sort((a: any, b: any) => b.despachados - a.despachados);


    // Sort inventory priority: critical first, then attention, then OK, then by days left
    invPriority.sort((a: any, b: any) => {
      const order = { 'critical': 0, 'attention': 1, 'ok': 2 };
      const valA = order[a.status as keyof typeof order];
      const valB = order[b.status as keyof typeof order];
      if (valA !== valB) return valA - valB;
      return a.daysLeft - b.daysLeft;
    });

    // Top 5 inventory by value
    const catData = products
      .map((p: any) => ({ name: p.descripcion, value: (p.costo ?? p.precio * 0.7) * p.stock }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);
      
    // Sum the rest as "Otros"
    const restValue = products
      .sort((a: any, b: any) => ((b.costo ?? b.precio * 0.7) * b.stock) - ((a.costo ?? a.precio * 0.7) * a.stock))
      .slice(5)
      .reduce((sum: any, p: any) => sum + ((p.costo ?? p.precio * 0.7) * p.stock), 0);
      
    if (restValue > 0) catData.push({ name: 'Otros', value: restValue });

    return {
      data: {
        general: {
          totalOrders: orders.length,
          totalRevenue,
          avgMargin,
          revenueData,
          statusData,
          topSelling: topProductsFormatted.slice(0, 10), // top 10
        },
        ventas: {
          rawPedidos: [], rawCortes: [], rawInventario: [], clientes: [], avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
          totalOrders: orders.length,
          totalRevenue,
          topProducts: topProductsFormatted.slice(0, 5),
          bottomProducts: [...topProductsFormatted].reverse().slice(0, 5),
          topVendors: sortedVendors.slice(0, 5),
          bottomVendors: [...sortedVendors].reverse().slice(0, 5),
          topClients: sortedClients.slice(0, 10),
          evolutionData: revenueData,
          productos: products, allProductsMetrics: topProductsFormatted,
        },
        inventario: {
          totalCostValue: invTotalCost,
          totalRetailValue: invTotalRetail,
          totalItems: products.length,
          categoryData: catData,
          historyData: [], // Would require historical stock tracking DB table
          priorityProducts: invPriority,
        },
        consignacion: {
          capitalEnCalle,
          totalLiquidado,
          cortesPendientes: totalPendiente,
          tasaLiquidacion,
          clientStats: clientStatsConsigList,
          productStats: productStatsConsigList,
          evolutionData: evoConsig,
          rawPedidos: pedConsig,
          rawCortes: cortesConsig,
          rawInventario: invConsig,
          clientes: clientesConsig
        }
      }
    };

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error cargando reportes' };
  }
}
