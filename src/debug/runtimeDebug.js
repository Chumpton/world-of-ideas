const DEBUG_STORE_KEY = '__WOI_DEBUG__';

function getStore() {
    if (typeof window === 'undefined') return null;
    if (!window[DEBUG_STORE_KEY]) {
        window[DEBUG_STORE_KEY] = {
            startedAt: new Date().toISOString(),
            events: [],
            maxEvents: 500,
        };
    }
    return window[DEBUG_STORE_KEY];
}

function toErrorShape(err) {
    if (!err) return null;
    return {
        name: err.name || 'Error',
        message: err.message || String(err),
        stack: err.stack || null,
    };
}

function pushEvent(level, scope, message, data = null) {
    const store = getStore();
    const event = {
        ts: new Date().toISOString(),
        level,
        scope,
        message,
        data,
    };

    if (store) {
        store.events.push(event);
        if (store.events.length > store.maxEvents) {
            store.events.splice(0, store.events.length - store.maxEvents);
        }
    }

    const prefix = `[WOI:${scope}]`;
    if (level === 'error') {
        console.error(prefix, message, data ?? '');
    } else if (level === 'warn') {
        console.warn(prefix, message, data ?? '');
    } else {
        console.log(prefix, message, data ?? '');
    }
}

export function debugInfo(scope, message, data = null) {
    pushEvent('info', scope, message, data);
}

export function debugWarn(scope, message, data = null) {
    pushEvent('warn', scope, message, data);
}

export function debugError(scope, message, err = null, data = null) {
    pushEvent('error', scope, message, {
        ...(data || {}),
        error: toErrorShape(err),
    });
}

export function getDebugSnapshot() {
    const store = getStore();
    if (!store) return { startedAt: null, events: [] };
    return {
        startedAt: store.startedAt,
        events: [...store.events],
    };
}

export function installGlobalDebugHooks() {
    if (typeof window === 'undefined') return;
    if (window.__WOI_DEBUG_HOOKS_INSTALLED__) return;
    window.__WOI_DEBUG_HOOKS_INSTALLED__ = true;

    debugInfo('bootstrap', 'Global debug hooks installed');

    window.addEventListener('error', (event) => {
        debugError('window.error', 'Global runtime error', event?.error || null, {
            message: event?.message || null,
            filename: event?.filename || null,
            lineno: event?.lineno || null,
            colno: event?.colno || null,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event?.reason;
        const isAbortError = reason?.name === 'AbortError'
            || String(reason?.message || '').includes('signal is aborted');
        if (isAbortError) return;

        debugError('window.rejection', 'Unhandled promise rejection', reason || null, {
            reasonType: typeof reason,
        });
    });
}

