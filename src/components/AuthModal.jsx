import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AuthModal = ({ onClose, initialMode = 'login' }) => {
    const { login, register } = useAppContext();
    const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '', // Simplified for mock
        skills: '',
        bio: '',
        location: '',
        avatar: ''
    });
    const [error, setError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // HONEYPOT CHECK
        if (formData.website_url) {
            console.warn("Bot detected via honeypot.");
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                const result = await login(formData.email, formData.password);
                if (result.success) onClose();
                else setError(result.reason || 'Login failed');
            } else {
                const result = await register({
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                    skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
                    bio: formData.bio,
                    location: formData.location,
                    avatar: formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}&background=random&color=fff`
                });
                if (result.success) onClose();
                else setError(result.reason || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
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
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="City, Country"
                                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '150px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Profile Picture URL</label>
                                    <input
                                        type="text"
                                        value={formData.avatar}
                                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                        placeholder="Image URL"
                                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Skills (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="e.g. Design, Engineering, Law"
                                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: 'var(--bg-app)', color: 'var(--color-text-main)' }}
                                />
                            </div>
                        </>
                    )}

                    {error && <div style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: '600' }}>{error}</div>}

                    <button
                        type="submit"
                        style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '1.1rem',
                            cursor: 'pointer',
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
