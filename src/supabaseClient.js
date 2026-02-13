import { createClient } from '@supabase/supabase-js';
import { debugError, debugInfo, debugWarn } from './debug/runtimeDebug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const nativeUrlConstructor = typeof globalThis !== 'undefined' ? globalThis.URL : undefined;

debugInfo('supabase', 'Supabase env inspection', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseKey,
    urlLength: supabaseUrl ? String(supabaseUrl).length : 0,
    keyLength: supabaseKey ? String(supabaseKey).length : 0,
});

if (!supabaseUrl || !supabaseKey) {
    const configError = new Error(
        'Missing Supabase environment variables. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
    debugError('supabase', 'Supabase client config invalid', configError, {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseKey,
    });
    throw configError;
}

export const ensureRuntimeUrlConstructor = () => {
    if (typeof globalThis === 'undefined') return;
    if (typeof globalThis.URL === 'function') return;
    if (typeof nativeUrlConstructor === 'function') {
        const previousType = typeof globalThis.URL;
        try {
            globalThis.URL = nativeUrlConstructor;
            debugWarn('supabase', 'Recovered invalid global URL constructor', { previousType });
        } catch (err) {
            debugError('supabase', 'Failed to restore global URL constructor', err, { previousType });
        }
    }
};

const fetchWithoutAbortSignal = (input, init = {}) => {
    ensureRuntimeUrlConstructor();
    const safeInit = { ...(init || {}) };
    if (safeInit && 'signal' in safeInit) {
        delete safeInit.signal;
    }
    return fetch(input, safeInit);
};

const client = createClient(supabaseUrl, supabaseKey, {
    global: {
        fetch: fetchWithoutAbortSignal,
    },
});

const baseFrom = client.from.bind(client);
client.from = (...args) => {
    ensureRuntimeUrlConstructor();
    return baseFrom(...args);
};

if (client.storage && typeof client.storage.from === 'function') {
    const baseStorageFrom = client.storage.from.bind(client.storage);
    client.storage.from = (...args) => {
        ensureRuntimeUrlConstructor();
        return baseStorageFrom(...args);
    };
}

export const supabase = client;
