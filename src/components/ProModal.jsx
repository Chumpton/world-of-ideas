import React, { useState } from 'react';

const ProModal = ({ onClose }) => {
    const [selectedCoinPackage, setSelectedCoinPackage] = useState(null);

    const tiers = [
        {
            name: 'Free',
            price: '$0',
            period: 'forever',
            badge: '🌱',
            color: '#95a5a6',
            features: [
                '50 monthly coins',
                'Submit unlimited ideas',
                'Vote and comment',
                'Join groups',
                'Basic profile'
            ],
            cta: 'Current Plan',
            disabled: true
        },
        {
            name: 'Pro',
            price: '$6.99',
            period: '/month',
            badge: '⚡',
            color: '#f39c12',
            gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
            popular: true,
            features: [
                '600 monthly coins',
                '3x Post Boosts',
                'Pro Badge (Checkmark)',
                'Create groups',
                'Basic analytics',
                'Boosted Replies',
                'Earn Coins from Posts'
            ],
            cta: 'Upgrade to Pro'
        },
        {
            name: 'Visionary',
            price: '$21.99',
            period: '/month',
            badge: '🔮',
            color: '#9b59b6',
            gradient: 'linear-gradient(135deg, #8e44ad, #3498db)',
            features: [
                '2500 monthly coins',
                '10x Post Boosts',
                'Verified Visionary Badge',
                'Advanced analytics',
                'Custom Emoji Packs',
                'Early access to features',
                'Direct Dev Access'
            ],
            cta: 'Go Visionary'
        }
    ];

    const coinPackages = [
        { amount: 100, price: '$1.79', bonus: 0 },
        { amount: 300, price: '$4.99', bonus: 50, popular: true },
        { amount: 700, price: '$9.99', bonus: 150 },
        { amount: 2000, price: '$24.99', bonus: 500 }
    ];

    const handleSubscribe = (tierName) => {
        alert(`🎉 Thank you for choosing ${tierName}! This is a demo - no actual payment processed.`);
    };

    const handleBuyCoins = (pkg) => {
        alert(`🪙 Purchased ${pkg.amount + pkg.bonus} coins for ${pkg.price}! (Demo mode)`);
    };

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                maxWidth: '1000px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#FDFCF8',
                borderRadius: '24px',
                padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '2.5rem 2rem',
                    borderRadius: '24px 24px 0 0',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1.5rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >×</button>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>
                        ✨ Unlock Your Potential
                    </h2>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>
                        Choose the plan that fits your vision
                    </p>
                </div>

                {/* Tier Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    padding: '2rem'
                }}>
                    {tiers.map((tier, i) => (
                        <div key={tier.name} style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '2rem',
                            border: tier.popular ? '3px solid #f39c12' : '1px solid rgba(0,0,0,0.1)',
                            position: 'relative',
                            boxShadow: tier.popular ? '0 10px 40px rgba(243, 156, 18, 0.2)' : '0 4px 15px rgba(0,0,0,0.05)',
                            transform: tier.popular ? 'scale(1.02)' : 'none',
                            transition: 'transform 0.2s'
                        }}>
                            {tier.popular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#f39c12',
                                    color: 'white',
                                    padding: '4px 16px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}>Most Popular</div>
                            )}

                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '2.5rem' }}>{tier.badge}</span>
                                <h3 style={{
                                    margin: '0.5rem 0',
                                    fontSize: '1.5rem',
                                    fontWeight: '800',
                                    background: tier.gradient || 'none',
                                    WebkitBackgroundClip: tier.gradient ? 'text' : 'none',
                                    WebkitTextFillColor: tier.gradient ? 'transparent' : tier.color,
                                    color: tier.color
                                }}>{tier.name}</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-text-main)' }}>
                                    {tier.price}
                                    <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--color-text-muted)' }}>
                                        {tier.period}
                                    </span>
                                </div>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                                {tier.features.map((feature, j) => (
                                    <li key={j} style={{
                                        padding: '0.5rem 0',
                                        borderBottom: j < tier.features.length - 1 ? '1px solid #f1f2f6' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.95rem',
                                        color: 'var(--color-text-main)'
                                    }}>
                                        <span style={{ color: tier.color }}>✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => !tier.disabled && handleSubscribe(tier.name)}
                                disabled={tier.disabled}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: tier.disabled ? '#e0e0e0' : (tier.gradient || tier.color),
                                    color: tier.disabled ? '#999' : 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: tier.disabled ? 'not-allowed' : 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => !tier.disabled && (e.target.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                            >
                                {tier.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Coins Section */}
                <div style={{
                    background: '#f8f9fa',
                    padding: '2rem',
                    borderRadius: '0 0 24px 24px'
                }}>
                    <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>
                        🪙 Buy Coins
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem',
                        maxWidth: '700px',
                        margin: '0 auto'
                    }}>
                        {coinPackages.map((pkg, i) => (
                            <div
                                key={i}
                                onClick={() => handleBuyCoins(pkg)}
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '1.5rem 1rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    border: pkg.popular ? '2px solid #f39c12' : '1px solid rgba(0,0,0,0.1)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {pkg.popular && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: '#f39c12',
                                        color: 'white',
                                        padding: '2px 10px',
                                        borderRadius: '10px',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold'
                                    }}>BEST</div>
                                )}
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
                                <div style={{ fontWeight: '800', fontSize: '1.3rem', color: 'var(--color-text-main)' }}>
                                    {pkg.amount}
                                </div>
                                {pkg.bonus > 0 && (
                                    <div style={{ color: '#27ae60', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        +{pkg.bonus} bonus!
                                    </div>
                                )}
                                <div style={{ marginTop: '0.5rem', fontWeight: '700', color: '#667eea' }}>
                                    {pkg.price}
                                </div>
                            </div>
                        ))}
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                        Use coins to boost ideas, tip creators, and unlock exclusive features
                    </p>

                    {/* Donate Button */}
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button
                            onClick={() => alert('💖 Thank you for your support! This would open a donation page.')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #e74c3c',
                                color: '#e74c3c',
                                padding: '0.5rem 1.2rem',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                e.target.style.background = '#e74c3c';
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = '#e74c3c';
                            }}
                        >
                            ❤️ Donate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProModal;
