import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AuthModal = ({ onClose, initialMode = 'login' }) => {
    const { login, register, user } = useAppContext();
    const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

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

        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                const result = await withTimeout(login(formData.email, formData.password));
                if (result.success) onClose();
                else {
                    setError(result.reason || 'Login failed');
                }
            } else {
                const result = await withTimeout(register({
                    email: formData.email,
                    password: formData.password,
                    displayName: formData.displayName
                }));
                if (result.success) {
                    onClose();
                } else if (result.needsEmailConfirmation) {
                    setError(result.reason || 'Please verify your email, then log in.');
                    setMode('login');
                } else {
                    const failReason = result.reason || 'Registration failed';

                    // Smart Redirect: If user exists, offer to switch to Login
                    if (failReason.includes('already_exists') || failReason.includes('already registered')) {
                        setError('Account already exists! Switching to Login...');
                        setTimeout(() => {
                            setError('');
                            setMode('login');
                        }, 1500);
                    } else {
                        setError(failReason);
                    }
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        // Only close if we have a valid user ID (confirmed login)
        // Prevents closing on transient states or empty objects
        if (user && user.id) {
            onClose();
        }
    }, [user, onClose]);

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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {mode === 'signup' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Display Name</label>
                            <input
                                type="text"
                                name="displayName"
                                required
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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



                    {error && <div style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600' }}>{error}</div>}

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
