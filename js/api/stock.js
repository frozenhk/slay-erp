import { supabase } from '../supabase.js';

export async function listStockOverview(businessId) {
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select(`
      id, name, sku, selling_price, cost_price, is_active,
      products!inner(id, name, reorder_level, track_stock, is_active)
    `)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('products.is_active', true);
  if (vErr) throw vErr;

  const variantIds = (variants || []).map((v) => v.id);
  let levels = [];
  if (variantIds.length) {
    const { data, error } = await supabase
      .from('stock_levels')
      .select('variant_id, location_id, quantity')
      .eq('business_id', businessId)
      .in('variant_id', variantIds);
    if (error) throw error;
    levels = data || [];
  }

  const byVariant = {};
  for (const v of variants || []) {
    byVariant[v.id] = {
      variant_id: v.id,
      variant_name: v.name,
      sku: v.sku,
      product_id: v.products.id,
      product_name: v.products.name,
      reorder_level: Number(v.products.reorder_level || 0),
      track_stock: !!v.products.track_stock,
      cost_price: Number(v.cost_price || 0),
      selling_price: Number(v.selling_price || 0),
      total: 0,
      levels: {},
    };
  }
  for (const l of levels) {
    const row = byVariant[l.variant_id];
    if (!row) continue;
    const qty = Number(l.quantity || 0);
    row.total += qty;
    row.levels[l.location_id] = qty;
  }
  return Object.values(byVariant);
}

export async function listMovements(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('stock_movements')
    .select(`
      id, movement_type, quantity, note, reference_type, created_at, reversed_at,
      variant_id, location_id,
      product_variants(name, product_id, products(name))
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(f.limit || 100);
  if (f.variantId) q = q.eq('variant_id', f.variantId);
  if (f.type) q = q.eq('movement_type', f.type);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function adjustStock(businessId, variantId, locationId, change, type, note) {
  const { data, error } = await supabase.rpc('adjust_stock', {
    p_business: businessId,
    p_variant: variantId,
    p_location: locationId,
    p_change: change,
    p_type: type,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function reverseStockMovement(businessId, movementId) {
  const { error } = await supabase.rpc('reverse_stock_movement', {
    p_business: businessId,
    p_movement: movementId,
  });
  if (error) throw error;
}
