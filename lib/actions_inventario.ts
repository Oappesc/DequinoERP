'use server';
import type { ActionResult } from '@/lib/actions';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from './actions';
import { Producto, ProductoReceta } from '@/types/database';

// Tipos base para conversiones
const conversions: Record<string, Record<string, number>> = {
  'kg': { 'kg': 1, 'g': 1000, 'mg': 1000000 },
  'g': { 'kg': 0.001, 'g': 1, 'mg': 1000 },
  'L': { 'L': 1, 'mL': 1000 },
  'mL': { 'L': 0.001, 'mL': 1 },
  'unidad': { 'unidad': 1 },
  'unico': { 'unico': 1 },
};

function convertUnits(value: number, from: string, to: string): number {
  if (from === to) return value;
  // Convertir todo a la unidad base de 'from' si existe
  const baseMap = conversions[from];
  if (!baseMap || !baseMap[to]) {
    // Si no hay conversión directa, lanzar advertencia o retornar el mismo valor (asumir 1:1)
    console.warn(`No conversion found from ${from} to ${to}`);
    return value;
  }
  return value * baseMap[to];
}

export async function getInventoryItems(type?: 'producto' | 'servicio' | 'materia_prima'): Promise<{ data?: Producto[], error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from('productos').select('*').eq('activo', true).order('descripcion');
    if (type) {
      query = query.eq('tipo', type);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error fetching inventory' };
  }
}

export async function getInventoryItemDetail(id: string): Promise<{ data?: { producto: Producto, recetas: ProductoReceta[] }, error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: producto, error: prodError } = await supabase.from('productos').select('*').eq('id', id).single();
    if (prodError || !producto) throw new Error(prodError?.message || 'Item no encontrado');

    const { data: recetas, error: recError } = await supabase
      .from('producto_recetas')
      .select('*, materia_prima:productos!materia_prima_id(*)')
      .eq('producto_id', id) as any;

    if (recError) throw new Error(recError.message);

    return { data: { producto, recetas: recetas || [] } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error fetching item detail' };
  }
}

export async function saveInventoryItem(payload: Partial<Producto>): Promise<{ data?: Producto, error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { id, ...data } = payload;
    
    let result;
    if (id) {
      result = await supabase.from('productos').update(data as any).eq('id', id).select().single();
    } else {
      result = await supabase.from('productos').insert({
        ...data,
        codigo: data.codigo || `ITEM-${Date.now()}`
      } as any).select().single();
    }

    if (result.error) throw new Error(result.error.message);
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error guardando item' };
  }
}

export async function deleteInventoryItem(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    // Soft delete to preserve order history
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error eliminando item' };
  }
}

export async function addBOMItem(producto_id: string, materia_prima_id: string, cantidad_requerida: number, unidad_medida: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('producto_recetas').insert({
      producto_id,
      materia_prima_id,
      cantidad_requerida,
      unidad_medida
    });
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error añadiendo materia prima' };
  }
}

export async function removeBOMItem(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('producto_recetas').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error eliminando materia prima' };
  }
}

export async function calculateCostFromBOM(producto_id: string): Promise<{ cost?: number, error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { data: recetas, error } = await supabase
      .from('producto_recetas')
      .select('*, materia_prima:productos!materia_prima_id(costo, unidad_medida)')
      .eq('producto_id', producto_id) as any;

    if (error) throw new Error(error.message);

    let totalCost = 0;
    for (const r of recetas) {
      const mp = r.materia_prima;
      if (mp && mp.costo) {
        // Necesitamos saber cuánto cuesta 1 unidad de la materia prima (en su unidad_medida base).
        // r.cantidad_requerida está en r.unidad_medida.
        // Convertimos la cantidad requerida a la unidad base de la materia prima.
        // Ej: MP está en 'kg' a $10. Receta pide 500 'g'. 
        // convertUnits(500, 'g', 'kg') => 0.5 kg. Costo = 0.5 * 10 = $5.
        const qtyInBaseUnit = convertUnits(r.cantidad_requerida, r.unidad_medida, mp.unidad_medida || 'unidad');
        totalCost += qtyInBaseUnit * mp.costo;
      }
    }

    // Actualizar el costo en el producto
    await supabase.from('productos').update({ costo: totalCost }).eq('id', producto_id);

    return { cost: totalCost };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Error calculando costo' };
  }
}


export async function deductInventory(orderId: string): Promise<void> {
  try {
    const supabase = await requireAdmin();

    // 1. Get the order to check if already deducted
    const { data: order } = await supabase.from('pedidos').select('inventario_descontado, estado').eq('id', orderId).single() as any;
    if (!order || order.inventario_descontado) return; // Already deducted or doesn't exist

    // 2. Get the order details
    const { data: details } = await supabase.from('pedido_detalles').select('cantidad, producto:productos(*)').eq('pedido_id', orderId);
    if (!details || details.length === 0) return;

    // 3. Process each detail
    for (const d of details) {
      const prod = d.producto as any;
      if (!prod) continue;

      if (prod.tipo === 'producto' || prod.tipo === 'materia_prima') {
        // Direct stock deduction
        const newStock = Math.max(0, (prod.stock || 0) - d.cantidad);
        await supabase.from('productos').update({ stock: newStock }).eq('id', prod.id);
      }
      
      // If it's a product or service, check BOM (producto_recetas)
      const { data: recetas } = await supabase.from('producto_recetas').select('*, materia_prima:productos!materia_prima_id(*)').eq('producto_id', prod.id) as any;
      if (recetas && recetas.length > 0) {
        for (const r of recetas) {
          const mp = r.materia_prima;
          if (mp) {
            // Need to deduct r.cantidad_requerida * d.cantidad
            const totalRequiredInBaseUnit = convertUnits(r.cantidad_requerida * d.cantidad, r.unidad_medida, mp.unidad_medida || 'unidad');
            const newMpStock = Math.max(0, (mp.stock || 0) - totalRequiredInBaseUnit);
            await supabase.from('productos').update({ stock: newMpStock }).eq('id', mp.id);
          }
        }
      }
    }

    // 4. Mark order as deducted
    await supabase.from('pedidos').update({ inventario_descontado: true } as any).eq('id', orderId);

  } catch (err) {
    console.error("Error deducting inventory:", err);
  }
}

export async function bulkInsertProducts(products: any[]): Promise<ActionResult<boolean>> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('productos').insert(products as any);
    if (error) throw error;
    revalidatePath('/admin');
    revalidatePath('/vendedor');
    return { data: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
