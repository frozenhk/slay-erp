import { supabase } from '../supabase.js';

export async function listCategories(businessId) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory(businessId, name) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ business_id: businessId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listProducts(businessId, opts) {
  const f = opts || {};
  let q = supabase
    .from('products')
    .select(`
      id, name, description, image_url, tax_rate, reorder_level,
      track_stock, is_active, created_at, category_id,
      category:categories(id, name),
      product_variants(id, name, sku, barcode, cost_price, selling_price, is_active)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (f.search) q = q.ilike('name', '%' + f.search + '%');
  if (f.categoryId) q = q.eq('category_id', f.categoryId);
  if (!f.includeArchived) q = q.eq('is_active', true);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getProduct(productId, businessId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, description, image_url, tax_rate, reorder_level,
      track_stock, is_active, category_id,
      product_variants(id, name, sku, barcode, cost_price, selling_price, is_active)
    `)
    .eq('id', productId)
    .eq('business_id', businessId)
    .single();
  if (error) throw error;
  return data;
}

export async function getStockByVariant(businessId, variantIds) {
  if (!variantIds || !variantIds.length) return {};
  const { data, error } = await supabase
    .from('stock_levels')
    .select('variant_id, quantity')
    .eq('business_id', businessId)
    .in('variant_id', variantIds);
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    map[row.variant_id] = (map[row.variant_id] || 0) + Number(row.quantity || 0);
  }
  return map;
}

export async function createProduct(businessId, data) {
  const { data: product, error } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      name: data.name,
      category_id: data.category_id || null,
      description: data.description || null,
      tax_rate: Number(data.tax_rate) || 0,
      reorder_level: Number(data.reorder_level) || 0,
      track_stock: !!data.track_stock,
    })
    .select()
    .single();
  if (error) throw error;
  await insertVariants(businessId, product.id, data.variants);
  return product;
}

export async function updateProduct(productId, businessId, data) {
  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      category_id: data.category_id || null,
      description: data.description || null,
      tax_rate: Number(data.tax_rate) || 0,
      reorder_level: Number(data.reorder_level) || 0,
      track_stock: !!data.track_stock,
    })
    .eq('id', productId)
    .eq('business_id', businessId);
  if (error) throw error;
  await syncVariants(businessId, productId, data.variants);
}

async function insertVariants(businessId, productId, variants) {
  const list = (variants && variants.length)
    ? variants
    : [{ name: 'Default', cost_price: 0, selling_price: 0 }];
  const rows = list.map((v) => ({
    business_id: businessId,
    product_id: productId,
    name: (v.name || 'Default').trim(),
    sku: v.sku ? v.sku.trim() : null,
    barcode: v.barcode ? v.barcode.trim() : null,
    cost_price: Number(v.cost_price) || 0,
    selling_price: Number(v.selling_price) || 0,
    is_active: true,
  }));
  const { error } = await supabase.from('product_variants').insert(rows);
  if (error) throw error;
}

async function syncVariants(businessId, productId, variants) {
  const { data: existing, error: exErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (exErr) throw exErr;
  const existingIds = new Set((existing || []).map((r) => r.id));

  const list = (variants && variants.length)
    ? variants
    : [{ name: 'Default', cost_price: 0, selling_price: 0 }];

  const incomingIds = new Set();
  const toInsert = [];

  for (const v of list) {
    const row = {
      business_id: businessId,
      product_id: productId,
      name: (v.name || 'Default').trim(),
      sku: v.sku ? v.sku.trim() : null,
      barcode: v.barcode ? v.barcode.trim() : null,
      cost_price: Number(v.cost_price) || 0,
      selling_price: Number(v.selling_price) || 0,
      is_active: true,
    };
    if (v.id && existingIds.has(v.id)) {
      incomingIds.add(v.id);
      const { error } = await supabase.from('product_variants').update(row).eq('id', v.id);
      if (error) throw error;
    } else {
      toInsert.push(row);
    }
  }

  const removed = [...existingIds].filter((id) => !incomingIds.has(id));
  if (removed.length) {
    await supabase.from('product_variants').update({ is_active: false }).in('id', removed);
  }

  if (toInsert.length) {
    const { error } = await supabase.from('product_variants').insert(toInsert);
    if (error) throw error;
  }
}

export async function archiveProduct(productId, businessId) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId)
    .eq('business_id', businessId);
  if (error) throw error;
}

export async function uploadProductImage(businessId, productId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = businessId + '/products/' + productId + '.' + ext;
  const { error: upErr } = await supabase.storage
    .from('public-assets')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function setProductImage(businessId, productId, url) {
  const { error } = await supabase
    .from('products')
    .update({ image_url: url })
    .eq('id', productId)
    .eq('business_id', businessId);
  if (error) throw error;
}
