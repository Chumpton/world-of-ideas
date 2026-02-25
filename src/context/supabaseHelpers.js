// Supabase CRUD helper wrappers for AppContext
// All functions return data or null/[] on error, with console logging.

import { supabase } from '../supabaseClient';

let lastSupabaseError = null;
const abortWarnLastAt = new Map();
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const READ_CACHE_TTL_MS = 5000;
const readRowsInFlight = new Map();
const readRowsCache = new Map();
const readSingleInFlight = new Map();
const readSingleCache = new Map();

function isAbortLikeError(error) {
    const message = String(error?.message || '');
    const details = String(error?.details || '');
    return error?.name === 'AbortError'
        || message.includes('AbortError')
        || message.includes('signal is aborted')
        || message.includes('timed out')
        || error?.code === 'CLIENT_TIMEOUT'
        || details.includes('AbortError')
        || details.includes('signal is aborted')
        || details.includes('timed out');
}

function shouldLogAbortWarn(key, minIntervalMs = 30000) {
    const now = Date.now();
    const last = abortWarnLastAt.get(key) || 0;
    if ((now - last) < minIntervalMs) return false;
    abortWarnLastAt.set(key, now);
    return true;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stableStringify(value) {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function getReadCacheEntry(cacheMap, key, ttlMs) {
    const cached = cacheMap.get(key);
    if (!cached) return null;
    if ((Date.now() - cached.ts) > ttlMs) {
        cacheMap.delete(key);
        return null;
    }
    return cached.value;
}

function setLastSupabaseError(stage, table, error = null, extra = null) {
    lastSupabaseError = error ? {
        stage,
        table,
        code: error.code || null,
        message: error.message || String(error),
        details: error.details || null,
        hint: error.hint || null,
        extra: extra || null,
        ts: new Date().toISOString(),
    } : null;
    if (typeof window !== 'undefined') {
        window.__WOI_LAST_SUPABASE_ERROR__ = lastSupabaseError;
    }
}

async function withAbortRetry(op, attempts = 3, baseDelayMs = 150) {
    let lastResult = null;
    let lastThrown = null;

    const runWithTimeout = async () => {
        let timer;
        const timeoutError = {
            code: 'CLIENT_TIMEOUT',
            message: `Supabase request timed out after ${DEFAULT_REQUEST_TIMEOUT_MS}ms`,
            details: 'Request did not complete within timeout window'
        };
        try {
            return await Promise.race([
                op(),
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve({ data: null, error: timeoutError }), DEFAULT_REQUEST_TIMEOUT_MS);
                })
            ]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    };

    for (let i = 0; i < attempts; i += 1) {
        try {
            const result = await runWithTimeout();
            lastResult = result;
            if (!result?.error || !isAbortLikeError(result.error)) {
                return result;
            }
        } catch (err) {
            lastThrown = err;
            if (!isAbortLikeError(err)) {
                throw err;
            }
            lastResult = { data: null, error: err };
        }

        if (i < attempts - 1) {
            await sleep(baseDelayMs * (i + 1));
        }
    }

    return lastResult || { data: null, error: lastThrown || new Error('Supabase operation failed') };
}


export async function fetchRows(table, filters = {}, options = {}) {
    const cacheMs = Number(options?.cacheMs ?? READ_CACHE_TTL_MS);
    const force = Boolean(options?.force);
    const cacheKey = `rows:${table}:${stableStringify(filters)}:${stableStringify(options)}`;
    if (!force && cacheMs > 0) {
        const cachedRows = getReadCacheEntry(readRowsCache, cacheKey, cacheMs);
        if (cachedRows) return cachedRows;
    }
    if (!force && readRowsInFlight.has(cacheKey)) {
        return readRowsInFlight.get(cacheKey);
    }

    const runQuery = () => {
        let query = supabase.from(table).select(options.select || '*');
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }
        if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
        }
        if (options.limit) query = query.limit(options.limit);
        return query;
    };
    const run = (async () => {
        const { data, error } = await withAbortRetry(runQuery, 3);
        if (error) {
            if (isAbortLikeError(error)) {
                setLastSupabaseError('fetchRows', table, error, { filters, options });
                if (shouldLogAbortWarn(`fetchRows:${table}`)) {
                    console.warn(`[Supabase] fetchRows(${table}) request aborted`, {
                        name: error?.name,
                        message: error?.message,
                        details: error?.details,
                    });
                }
                return [];
            }
            setLastSupabaseError('fetchRows', table, error, { filters, options });
            console.error(`[Supabase] fetchRows(${table}):`, {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            });
            return [];
        }
        setLastSupabaseError('fetchRows', table, null);
        const rows = data || [];
        if (cacheMs > 0) {
            readRowsCache.set(cacheKey, { ts: Date.now(), value: rows });
        }
        return rows;
    })();

    readRowsInFlight.set(cacheKey, run);
    try {
        return await run;
    } finally {
        readRowsInFlight.delete(cacheKey);
    }
}

export async function fetchSingle(table, filters = {}) {
    const cacheKey = `single:${table}:${stableStringify(filters)}`;
    const cached = getReadCacheEntry(readSingleCache, cacheKey, READ_CACHE_TTL_MS);
    if (cached) return cached;
    if (readSingleInFlight.has(cacheKey)) {
        return readSingleInFlight.get(cacheKey);
    }

    const runQuery = () => {
        let query = supabase.from(table).select('*');
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }
        return query.single();
    };
    const run = (async () => {
        const { data, error } = await withAbortRetry(runQuery, 3);
        if (error) {
            if (isAbortLikeError(error)) {
                setLastSupabaseError('fetchSingle', table, error, { filters });
                if (shouldLogAbortWarn(`fetchSingle:${table}`)) {
                    console.warn(`[Supabase] fetchSingle(${table}) request aborted`, {
                        name: error?.name,
                        message: error?.message,
                        details: error?.details,
                    });
                }
                return null;
            }
            setLastSupabaseError('fetchSingle', table, error, { filters });
            console.error(`[Supabase] fetchSingle(${table}):`, {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            });
            return null;
        }
        setLastSupabaseError('fetchSingle', table, null);
        readSingleCache.set(cacheKey, { ts: Date.now(), value: data });
        return data;
    })();

    readSingleInFlight.set(cacheKey, run);
    try {
        return await run;
    } finally {
        readSingleInFlight.delete(cacheKey);
    }
}

export async function insertRow(table, row) {
    const { data, error } = await withAbortRetry(
        () => supabase.from(table).insert(row).select().single(),
        3
    );
    if (error) {
        if (isAbortLikeError(error)) {
            setLastSupabaseError('insertRow', table, error, { row });
            if (shouldLogAbortWarn(`insertRow:${table}`)) {
                console.warn(`[Supabase] insertRow(${table}) request aborted`, {
                    name: error?.name,
                    message: error?.message,
                    details: error?.details,
                });
            }
            return null;
        }
        setLastSupabaseError('insertRow', table, error, { row });
        console.error(`[Supabase] insertRow(${table}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            row,
        });
        return null;
    }
    setLastSupabaseError('insertRow', table, null);
    return data;
}

export async function updateRow(table, id, updates) {
    const { data, error } = await withAbortRetry(
        () => supabase.from(table).update(updates).eq('id', id).select().single(),
        3
    );
    if (error) {
        if (isAbortLikeError(error)) {
            setLastSupabaseError('updateRow', table, error, { id, updates });
            if (shouldLogAbortWarn(`updateRow:${table}`)) {
                console.warn(`[Supabase] updateRow(${table}) request aborted`, {
                    name: error?.name,
                    message: error?.message,
                    details: error?.details,
                });
            }
            return null;
        }
        setLastSupabaseError('updateRow', table, error, { id, updates });
        console.error(`[Supabase] updateRow(${table}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            id,
            updates,
        });
        return null;
    }
    setLastSupabaseError('updateRow', table, null);
    return data;
}

export async function deleteRows(table, filters) {
    const runQuery = () => {
        let query = supabase.from(table).delete();
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }
        return query;
    };
    const { error } = await withAbortRetry(runQuery, 3);
    if (error) {
        if (isAbortLikeError(error)) {
            setLastSupabaseError('deleteRows', table, error, { filters });
            if (shouldLogAbortWarn(`deleteRows:${table}`)) {
                console.warn(`[Supabase] deleteRows(${table}) request aborted`, {
                    name: error?.name,
                    message: error?.message,
                    details: error?.details,
                });
            }
            return false;
        }
        setLastSupabaseError('deleteRows', table, error, { filters });
        console.error(`[Supabase] deleteRows(${table}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            filters,
        });
        return false;
    }
    setLastSupabaseError('deleteRows', table, null);
    return true;
}

export async function upsertRow(table, row, options = {}) {
    const { data, error } = await withAbortRetry(
        () => supabase.from(table).upsert(row, options).select().single(),
        3
    );
    if (error) {
        if (isAbortLikeError(error)) {
            setLastSupabaseError('upsertRow', table, error, { row, options });
            if (shouldLogAbortWarn(`upsertRow:${table}`)) {
                console.warn(`[Supabase] upsertRow(${table}) request aborted`, {
                    name: error?.name,
                    message: error?.message,
                    details: error?.details,
                });
            }
            return null;
        }
        setLastSupabaseError('upsertRow', table, error, { row, options });
        console.error(`[Supabase] upsertRow(${table}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            row,
            options,
        });
        return null;
    }
    setLastSupabaseError('upsertRow', table, null);
    return data;
}

// Re-export supabase for direct access when helpers aren't enough
export { supabase };
export function getLastSupabaseError() {
    return lastSupabaseError;
}
