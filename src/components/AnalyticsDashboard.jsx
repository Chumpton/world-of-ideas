import React, { useState } from 'react';

const AnalyticsDashboard = ({ onClose }) => {
    const [botProtection, setBotProtection] = useState(true);
    const [shadowBanMode, setShadowBanMode] = useState(true);

    // Mock Data for Charts
    const trafficData = [20, 35, 45, 30, 60, 75, 90];
    const reportQueue = [
        { id: 1, user: 'SpamBot_9000', reason: 'Automated Posting', score: 98 },
        { id: 2, user: 'AngryUser123', reason: 'Harassment', score: 75 },
        { id: 3, user: 'CryptoShill', reason: 'Scam Link', score: 88 },
    ];

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-panel)',
                    width: '100%',
                    maxWidth: '1000px',
                    height: '85vh',
                    borderRadius: '24px',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', background: '#2d3436', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>📊</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Platform Analytics & Moderation</h2>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Admin Console • v2.1.0</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Sidebar */}
                    <div style={{ width: '220px', background: 'var(--bg-surface)', borderRight: '1px solid var(--color-border)', padding: '1.5rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Main</div>
                        <div style={{ padding: '0.6rem', background: 'var(--bg-pill)', borderRadius: '8px', fontWeight: 'bold', marginBottom: '0.5rem', cursor: 'pointer' }}>Overview</div>
                        <div style={{ padding: '0.6rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>User Growth</div>
                        <div style={{ padding: '0.6rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Engagement</div>

                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Security</div>
                        <div style={{ padding: '0.6rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Bot Defense</div>
                        <div style={{ padding: '0.6rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Moderation Q</div>
                    </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

                        {/* Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                            {[{ l: 'Active Users', v: '12,405', c: '#0984e3' }, { l: 'New Ideas', v: '84', c: '#00b894' }, { l: 'Forks', v: '32', c: '#6c5ce7' }, { l: 'Reports', v: '12', c: '#d63031' }].map((s, i) => (
                                <div key={i} style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{s.l}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: s.c }}>{s.v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Chart Area */}
                        <div style={{ padding: '2rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0' }}>Traffic & Engagement</h3>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '1rem' }}>
                                {trafficData.map((h, i) => (
                                    <div key={i} style={{ flex: 1, background: '#dfe6e9', borderRadius: '8px 8px 0 0', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: 'var(--color-secondary)', opacity: 0.7, transition: 'height 0.5s' }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Bot Protection */}
                            <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>🛡️ Bot Protection</h3>
                                    <div
                                        onClick={() => setBotProtection(!botProtection)}
                                        style={{
                                            width: '50px', height: '28px', background: botProtection ? '#00b894' : '#b2bec3', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                                        }}
                                    >
                                        <div style={{ width: '22px', height: '22px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: botProtection ? '25px' : '3px', transition: 'left 0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}></div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>AI-driven pattern recognition is currently <b>{botProtection ? 'ACTIVE' : 'DISABLED'}</b>.</p>
                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', fontSize: '0.85rem' }}>
                                    <div>Blocked IPs (24h): <b>142</b></div>
                                    <div>Flagged Accounts: <b>8</b></div>
                                </div>
                            </div>

                            {/* Moderation Queue */}
                            <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>👮 Moderation Queue</h3>
                                    <span style={{ fontSize: '0.8rem', background: '#ffeaa7', padding: '2px 8px', borderRadius: '10px' }}>Priority High</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {reportQueue.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--bg-app)', borderRadius: '10px' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.user}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.reason}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => alert(`Shadow banning ${item.user}`)} style={{ border: 'none', background: '#d63031', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>Ban</button>
                                                <button style={{ border: 'none', background: '#b2bec3', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>Ignore</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
