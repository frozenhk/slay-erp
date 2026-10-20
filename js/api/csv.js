import { supabase } from '../supabase.js';
import { listProducts, listCategories } from './products.js';
import { listLocations } from './locations.js';
import { adjustStock } from './stock.js';

export function downloadTemplate() {
  const headers = ['Product Name', 'SKU', 'Category', 'Description', 'Buying Price', 'Selling Price', 'Initial Stock Quantity', 'Minimum Stock Level', 'Barcode', 'Variant', 'Location/Warehouse'];
  const csv = Papa.unparse([headers]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Slay_ERP_Product_Template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProducts(businessId) {
  const products = await listProducts(businessId, { includeArchived: true });
  const rows = [];
  
  for (const p of products) {
    const variants = p.product_variants || [];
    if (variants.length === 0) {
      rows.push([p.name, '', p.category?.name || '', p.description || '', 0, 0, 0, p.reorder_level, '', '', '']);
    } else {
      for (const v of variants) {
        rows.push([
          p.name,
          v.sku || '',
          p.category?.name || '',
          p.description || '',
          v.cost_price,
          v.selling_price,
          0, // We don't easily get total stock per variant here without extra query, but for export we can put a placeholder or fetch it. Let's put a 0 for now or use a bulk stock fetch.
          p.reorder_level,
          v.barcode || '',
          v.name === 'Default' ? '' : v.name,
          ''
        ]);
      }
    }
  }

  const headers = ['Product Name', 'SKU', 'Category', 'Description', 'Buying Price', 'Selling Price', 'Current Stock', 'Minimum Stock Level', 'Barcode', 'Variant', 'Location/Warehouse'];
  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Slay_ERP_Products_Export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function validateCSV(file, businessId) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const errors = [];
        const validRows = [];
        
        // Fetch existing SKUs and categories to check against
        const [existingProducts, cats, locs] = await Promise.all([
          listProducts(businessId, {}),
          listCategories(businessId),
          listLocations(businessId)
        ]);
        
        const existingSkus = new Set();
        existingProducts.forEach(p => (p.product_variants || []).forEach(v => { if(v.sku) existingSkus.add(v.sku.toLowerCase()); }));
        
        const catMap = {}; cats.forEach(c => catMap[c.name.toLowerCase()] = c.id);
        const locMap = {}; locs.forEach(l => locMap[l.name.toLowerCase()] = l.id);
        const defaultLocId = locs[0]?.id;

        const seenSkusInFile = new Set();
        const seenNamesInFile = new Set();

        rows.forEach((row, index) => {
          const rowNum = index + 2; // +2 because of header and 0-index
          const name = row['Product Name']?.trim();
          const sku = row['SKU']?.trim();
          const category = row['Category']?.trim();
          const buyPrice = Number(row['Buying Price']);
          const sellPrice = Number(row['Selling Price']);
          const qty = Number(row['Initial Stock Quantity']);
          const minStock = Number(row['Minimum Stock Level']) || 0;
          const barcode = row['Barcode']?.trim();
          const variantName = row['Variant']?.trim();
          const location = row['Location/Warehouse']?.trim();

          let rowErrors = [];

          if (!name) rowErrors.push('Product Name is required.');
          if (isNaN(buyPrice) || buyPrice < 0) rowErrors.push('Buying Price must be a positive number.');
          if (isNaN(sellPrice) || sellPrice < 0) rowErrors.push('Selling Price must be a positive number.');
          if (isNaN(qty) || qty < 0) rowErrors.push('Initial Stock must be a positive number.');

          if (sku) {
            if (existingSkus.has(sku.toLowerCase())) rowErrors.push('SKU already exists in database.');
            if (seenSkusInFile.has(sku.toLowerCase())) rowErrors.push('Duplicate SKU in file.');
            seenSkusInFile.add(sku.toLowerCase());
          }

          if (name) {
            const nameLower = name.toLowerCase();
            if (seenNamesInFile.has(nameLower)) {
              rowErrors.push('Possible duplicate product name in file.');
            }
            seenNamesInFile.add(nameLower);
          }

          if (rowErrors.length > 0) {
            errors.push({ row: rowNum, name: name || 'Unknown', messages: rowErrors });
          } else {
            validRows.push({
              name, sku, category, buyPrice, sellPrice, qty, minStock, barcode, variantName, location,
              categoryId: catMap[category?.toLowerCase()] || null,
              locationId: locMap[location?.toLowerCase()] || defaultLocId
            });
          }
        });

        resolve({ total: rows.length, valid: validRows.length, errors, validRows });
      },
      error: (err) => reject(err)
    });
  });
}

export async function executeImport(businessId, validRows) {
  let importedCount = 0;
  
  for (const row of validRows) {
    try {
      // 1. Create Product
      const { data: prod, error: pErr } = await supabase.from('products').insert({
        business_id: businessId,
        name: row.name,
        category_id: row.categoryId,
        reorder_level: row.minStock,
        track_stock: true,
        is_active: true
      }).select().single();
      
      if (pErr) throw pErr;

      // 2. Create Variant (SKU is auto-generated by DB trigger if blank)
      const { data: variant, error: vErr } = await supabase.from('product_variants').insert({
        business_id: businessId,
        product_id: prod.id,
        name: row.variantName || 'Default',
        sku: row.sku || null,
        barcode: row.barcode || null,
        cost_price: row.buyPrice,
        selling_price: row.sellPrice,
        is_active: true
      }).select().single();

      if (vErr) throw vErr;

      // 3. Add Initial Stock
      if (row.qty > 0 && row.locationId) {
        await adjustStock(businessId, variant.id, row.locationId, row.qty, 'opening', 'CSV Import');
      }
      
      importedCount++;
    } catch (err) {
      console.error('Row import failed', row.name, err);
      // We continue to try other rows, but we could collect these as errors too.
    }
  }
  return importedCount;
}
