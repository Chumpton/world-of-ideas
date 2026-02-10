// Supabase CRUD helper wrappers for AppContext
// All functions return data or null/[] on error, with console logging.

import { supabase } from '../supabaseClient';

export async function fetchRows(table, filters = {}, options = {}) {
    let query = supabase.from(table).select(options.select || '*');
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) { console.error(`[Supabase] fetchRows(${table}):`, error.message); return []; }
    return data || [];
}

export async function fetchSingle(table, filters = {}) {
    let query = supabase.from(table).select('*');
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    const { data, error } = await query.single();
    if (error) { console.error(`[Supabase] fetchSingle(${table}):`, error.message); return null; }
    return data;
}

export async function insertRow(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) { console.error(`[Supabase] insertRow(${table}):`, error.message); return null; }
    return data;
}

export async function updateRow(table, id, updates) {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    if (error) { console.error(`[Supabase] updateRow(${table}):`, error.message); return null; }
    return data;
}

export async function deleteRows(table, filters) {
    let query = supabase.from(table).delete();
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    const { error } = await query;
    if (error) { console.error(`[Supabase] deleteRows(${table}):`, error.message); return false; }
    return true;
}

export async function upsertRow(table, row, options = {}) {
    const { data, error } = await supabase.from(table).upsert(row, options).select().single();
    if (error) { console.error(`[Supabase] upsertRow(${table}):`, error.message); return null; }
    return data;
}

// Re-export supabase for direct access when helpers aren't enough
export { supabase };
