import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const BuyCoinsModal = ({ onClose }) => {
    const { user } = useAppContext();
    const [activeTab, setActiveTab] = useState('membership'); // membership (includes coins), boosts

    const tiers = [
        {
            name: 'Free',
            price: '$0',
            period: '',
            badge: '🌱',
            color: '#95a5a6',
            features: [
                { text: '📝 Submit unlimited ideas', note: 'Share your vision' },
                { text: '🗳️ Vote and comment', note: 'Participate freely' },
                { text: '👥 Join Groups', note: 'Find your community' }
            ],
            cta: 'Current Plan',
            disabled: true
        },
        {
            name: 'Pro',
            price: '$6.99',
            period: '/mo',
            badge: '⚡',
            color: '#f39c12',
            gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
            popular: true,
            features: [
                { text: '💰 600 monthly coins', note: '$6 value included' },
                { text: '🚀 3x Post Boosts', note: 'Get ~300% more views' },
                { text: '✅ Pro Badge (Checkmark)', note: 'Stand out in feeds' },
                { text: '🏗️ Create & Lead Groups', note: 'Build your tribe' },
                { text: '💸 Earn Coins from Posts', note: 'Get rewarded for quality' }
            ],
            cta: 'Upgrade to Pro'
        },
        {
            name: 'Visionary',
            price: '$21.99',
            period: '/mo',
            badge: '🔮',
            color: '#9b59b6',
            gradient: 'linear-gradient(135deg, #8e44ad, #3498db)',
            features: [
                { text: '💎 2500 monthly coins', note: '$25 value included' },
                { text: '🚀 10x Post Boosts', note: 'Dominate the feed' },
                { text: '🔮 Visionary Badge', note: 'Elite status symbol' },
                { text: '📊 Advanced Analytics', note: 'Full audience insights' },
                { text: '📈 Higher Earning Rates', note: 'Max rewards per vote' }
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

    const boostPackages = [
        { name: 'Single Boost', duration: '48 Hours', price: 100, save: 0, icon: '🚀' },
        { name: '5 Boost Pack', duration: '5x 48 Hours', price: 450, save: '10%', icon: '🚀', popular: true },
        { name: '10 Boost Pack', duration: '10x 48 Hours', price: 850, save: '15%', icon: '🔥' },
        { name: 'Mega Campaign', duration: '1 Week Visibility', price: 2000, save: 'High Impact', icon: '🌍' }
    ];

    const handleSubscribe = (tierName) => {
        alert(`🎉 Thank you for choosing ${tierName}! This is a demo - no actual payment processed.`);
    };

    const handleBuyCoins = (pkg) => {
        alert(`🪙 Purchased ${pkg.amount + pkg.bonus} coins for ${pkg.price}! (Demo mode)`);
    };

    const handleBuyBoost = (pkg) => {
        alert(`🚀 Purchased ${pkg.name} for ${pkg.price} coins!`);
    };

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(5px)'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                maxWidth: '960px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-panel)',
                color: 'var(--color-text-main)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--color-border)'
            }}>
                {/* Header with Tabs */}
                <div style={{
                    background: 'var(--bg-surface)',
                    padding: '1rem 2rem 0 2rem',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Store & Plans</h2>
                            {user && (
                                <div style={{
                                    background: 'rgba(243, 156, 18, 0.15)',
                                    color: '#f39c12',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    border: '1px solid rgba(243, 156, 18, 0.3)'
                                }}>
                                    <span>🪙</span> {user.coins?.toLocaleString() || 0}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            color: 'var(--color-text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>&times;</button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.05)', padding: '0.4rem', borderRadius: '100px', width: 'fit-content' }}>
                        {['membership', 'boosts'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: activeTab === tab ? 'white' : 'transparent',
                                    color: activeTab === tab ? 'black' : 'var(--color-text-muted)',
                                    border: 'none',
                                    padding: '0.6rem 1.4rem',
                                    borderRadius: '24px',
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    boxShadow: activeTab === tab ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{tab === 'membership' ? '💎' : '🚀'}</span>
                                {tab === 'membership' ? 'Membership' : 'Boosts'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>

                    {/* PLANS + COINS TAB */}
                    {activeTab === 'membership' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {/* Membership Tiers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                {tiers.map((tier) => (
                                    <div key={tier.name} style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '16px',
                                        padding: '1.2rem',
                                        border: tier.popular ? '2px solid #f39c12' : '1px solid var(--color-border)',
                                        position: 'relative',
                                        boxShadow: tier.popular ? '0 8px 25px rgba(243, 156, 18, 0.15)' : 'none',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        {tier.popular && (
                                            <div style={{
                                                position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                                                background: '#f39c12', color: 'white', padding: '2px 12px', borderRadius: '12px',
                                                fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase'
                                            }}>Most Popular</div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '2rem' }}>{tier.badge}</div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: tier.color }}>{tier.name}</h3>
                                                <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                                                    {tier.price}<span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>{tier.period}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', flex: 1 }}>
                                            {tier.features.map((feat, i) => (
                                                <li key={i} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-main)' }}>{feat.text}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{feat.note}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => !tier.disabled && handleSubscribe(tier.name)}
                                            disabled={tier.disabled}
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '10px', border: 'none',
                                                background: tier.disabled ? 'rgba(255,255,255,0.1)' : (tier.gradient || tier.color),
                                                color: tier.disabled ? 'var(--color-text-muted)' : 'white',
                                                fontWeight: 'bold', cursor: tier.disabled ? 'not-allowed' : 'pointer',
                                                marginTop: 'auto'
                                            }}
                                        >
                                            {tier.cta}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Coin Packs Section */}
                            <div>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: '800', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                                    🪙 Top-Up Coins
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                    gap: '1.5rem',
                                    maxWidth: '100%',
                                    margin: '0 auto'
                                }}>
                                    {coinPackages.map((pkg, i) => (
                                        <div
                                            key={i}
                                            onClick={() => handleBuyCoins(pkg)}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '16px',
                                                padding: '1.5rem 1rem',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                border: pkg.popular ? '2px solid #f39c12' : '1px solid var(--color-border)',
                                                transition: 'transform 0.2s',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            {pkg.popular && (
                                                <div style={{
                                                    position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                                                    background: '#f39c12', color: 'white', padding: '2px 10px', borderRadius: '10px',
                                                    fontSize: '0.65rem', fontWeight: 'bold'
                                                }}>BEST VALUE</div>
                                            )}
                                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
                                            <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>{pkg.amount}</div>
                                            {pkg.bonus > 0 && <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 'bold' }}>+{pkg.bonus} Bonus</div>}
                                            <div style={{ marginTop: '0.5rem', fontWeight: '700', color: '#6c5ce7', fontSize: '1rem' }}>{pkg.price}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOOSTS TAB */}
                    {activeTab === 'boosts' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
                                <p>Boosts push your ideas to the top of the feed and increase visibility by 300% on average.</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                {boostPackages.map((pkg, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        border: pkg.popular ? '2px solid #e74c3c' : '1px solid var(--color-border)',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center'
                                    }}>
                                        {pkg.popular && (
                                            <div style={{
                                                position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                                                background: '#e74c3c', color: 'white', padding: '2px 10px', borderRadius: '10px',
                                                fontSize: '0.65rem', fontWeight: 'bold'
                                            }}>HOT</div>
                                        )}
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{pkg.icon}</div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{pkg.name}</h3>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{pkg.duration}</div>

                                        <div style={{ marginTop: 'auto', width: '100%' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{pkg.price} 🪙</div>
                                            <button
                                                onClick={() => handleBuyBoost(pkg)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '20px',
                                                    border: 'none',
                                                    background: 'var(--color-text-main)',
                                                    color: 'var(--bg-panel)',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Buy
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuyCoinsModal;
