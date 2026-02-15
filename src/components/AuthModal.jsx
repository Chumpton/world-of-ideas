import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AuthModal = ({ onClose, initialMode = 'login' }) => {
    const { login, register, user, authDiagnostics, clearAuthDiagnostics } = useAppContext();
    const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        skills: '',
        bio: '',
        location: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const withTimeout = (promise, timeoutMs = 20000) => {
        let timer;
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs / 1000}s`)), timeoutMs);
            })
        ]).finally(() => clearTimeout(timer));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setError('');
        setDebugInfo(null);

        // HONEYPOT CHECK
        if (formData.website_url) {
            console.warn("Bot detected via honeypot.");
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                const result = await withTimeout(login(formData.email, formData.password));
                if (result.success) onClose();
                else {
                    setError(result.reason || 'Login failed');
                    if (result.debug) setDebugInfo(result.debug);
                }
            } else {
                const result = await withTimeout(register({
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                    skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
                    bio: formData.bio,
                    location: formData.location,
                    avatarFile: avatarFile || null
                }));
                if (result.success) {
                    onClose();
                } else if (result.needsEmailConfirmation) {
                    setError(result.reason || 'Please verify your email, then log in.');
                    setMode('login');
                } else {
                    setError(result.reason || 'Registration failed');
                    if (result.debug) setDebugInfo(result.debug);
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (user) onClose();
    }, [user, onClose]);

    const safeAuthDiagnostics = Array.isArray(authDiagnostics) ? authDiagnostics : [];


    return (
        <div className="dimmer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div
                className="auth-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-panel)', // Improved for dark mode
                    padding: '3rem',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '500px', // Slightly wider
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    position: 'relative',
                    fontFamily: "'Quicksand', sans-serif",
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>

                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                    {mode === 'login' ? 'Welcome Back' : 'Join the Foundry'}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    {mode === 'login' ? 'Log in to spark ideas and forge community.' : 'Start sharing your inventions and policies today.'}
                </p>

                <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>Auth Diagnostics</span>
                        <button
                            type="button"
                            onClick={clearAuthDiagnostics}
                            style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--color-secondary)', cursor: 'pointer', fontWeight: '700' }}
                        >
                            Clear
                        </button>
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {safeAuthDiagnostics.length === 0 && <div>No auth events yet.</div>}
                        {safeAuthDiagnostics.slice(-8).reverse().map((entry) => (
                            <div key={entry.id} style={{ marginBottom: '0.35rem', lineHeight: 1.25 }}>
                                <span style={{ fontWeight: '700' }}>{new Date(entry.ts).toLocaleTimeString()}</span>
                                {' · '}
                                <span>{entry.stage}</span>
                                {' · '}
                                <span style={{ textTransform: 'uppercase' }}>{entry.status}</span>
                                {' · '}
                                <span>{entry.message}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* HONEYPOT FIELD - Invisible to humans */}
                    <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
                        <label htmlFor="website_url">Website</label>
                        <input
                            type="text"
                            id="website_url"
                            name="website_url"
                            tabIndex="-1"
                            autoComplete="off"
                            value={formData.website_url || ''}
                            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Username</label>
                            <input
                                type="text"
                                name="username"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="e.g. InnovatorX"
                                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@example.com"
                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Min. 6 characters"
                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                        />
                    </div>

                    {mode === 'signup' && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Tell us about yourself..."
                                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)', minHeight: '80px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Location (Optional)</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="City, Country"
                                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Profile Picture</label>
                                    <div
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-secondary)'; }}
                                        onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = 'var(--color-border)';
                                            const file = e.dataTransfer.files[0];
                                            if (file && file.type.startsWith('image/')) {
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (ev) => {
                                                const file = ev.target.files[0];
                                                if (file) {
                                                    setAvatarFile(file);
                                                    setAvatarPreview(URL.createObjectURL(file));
                                                }
                                            };
                                            input.click();
                                        }}
                                        style={{
                                            border: '2px dashed var(--color-border)',
                                            borderRadius: '12px',
                                            padding: avatarPreview ? '0.5rem' : '1.2rem 1rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: 'var(--bg-app)',
                                            transition: 'border-color 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '1.5rem' }}>📷</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Drop or click to upload</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Skills (Comma separated)</label>
                                <input
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="e.g. Design, Engineering, Law"
                                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                                />
                            </div>
                        </>
                    )}

                    {error && <div style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600' }}>{error}</div>}
                    {debugInfo && (
                        <div style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.04)', padding: '0.6rem', borderRadius: '8px', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontWeight: '700', marginBottom: '0.3rem' }}>Auth Debug</div>
                            <div>stage: {debugInfo.stage || 'unknown'}</div>
                            {debugInfo.status !== null && <div>status: {String(debugInfo.status)}</div>}
                            {debugInfo.code && <div>code: {debugInfo.code}</div>}
                            {debugInfo.hint && <div>hint: {debugInfo.hint}</div>}
                            {debugInfo.details && <div>details: {debugInfo.details}</div>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '1.1rem',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.8 : 1,
                            marginTop: '0.5rem',
                            boxShadow: '0 4px 15px rgba(0, 184, 148, 0.2)'
                        }}
                    >
                        {isSubmitting ? 'Please wait…' : (mode === 'login' ? 'Log In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                    >
                        {mode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
