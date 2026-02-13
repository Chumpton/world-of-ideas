import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { debugError, debugInfo, getDebugSnapshot, installGlobalDebugHooks } from './debug/runtimeDebug'

if (typeof window !== 'undefined') {
    const showFatalOverlay = (title, detail) => {
        const root = document.getElementById('root');
        const box = document.createElement('div');
        box.style.position = 'fixed';
        box.style.inset = '0';
        box.style.background = '#111';
        box.style.color = '#fff';
        box.style.padding = '24px';
        box.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        box.style.whiteSpace = 'pre-wrap';
        box.style.zIndex = '999999';
        const snapshot = getDebugSnapshot();
        const recent = (snapshot.events || []).slice(-8);
        const recentText = recent.map((e) => `${e.ts} [${e.level}] ${e.scope}: ${e.message}`).join('\n');
        box.textContent = `${title}\n\n${detail || 'No details'}\n\nRecent Debug Events:\n${recentText || '(none)'}`;
        if (root) {
            root.innerHTML = '';
            root.appendChild(box);
        } else {
            document.body.appendChild(box);
        }
    };

    installGlobalDebugHooks();
    debugInfo('bootstrap', 'main.jsx loaded');

    window.addEventListener('error', (event) => {
        const msg = String(event?.error?.message || event?.message || 'Unknown runtime error');
        showFatalOverlay('Runtime Error', msg);
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event?.reason;
        const msg = String(reason?.message || '');
        const isAbortError = reason?.name === 'AbortError' || msg.includes('signal is aborted');
        if (isAbortError) {
            event.preventDefault();
            return;
        }
        showFatalOverlay('Unhandled Promise Rejection', msg || String(reason || 'Unknown rejection'));
    });

    const bootstrap = async () => {
        try {
            debugInfo('bootstrap', 'App import starting');
            const { default: App } = await import('./App.jsx');
            debugInfo('bootstrap', 'App import complete');

            const root = document.getElementById('root');
            if (!root) {
                throw new Error('Missing #root element. React cannot mount.');
            }

            ReactDOM.createRoot(root).render(
                <React.StrictMode>
                    <App />
                </React.StrictMode>,
            );
            debugInfo('bootstrap', 'React root render invoked');
        } catch (err) {
            debugError('bootstrap', 'Fatal bootstrap failure', err);
            const message = `${err?.message || String(err)}\n\n${err?.stack || ''}`;
            showFatalOverlay('App Bootstrap Failed', message);
        }
    };

    bootstrap();
}
