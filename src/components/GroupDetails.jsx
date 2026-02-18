import React, { useState } from 'react';

const GroupDetails = ({ group, onBack }) => {
    const [activeTab, setActiveTab] = useState('chat');

    const tabs = [
        { id: 'chat', label: 'Live Chat', icon: '💬' },
        { id: 'discussions', label: 'Discussions', icon: '🎙️' },
        { id: 'ideas', label: 'Idea Board', icon: '💡' },
        { id: 'vault', label: 'Vault', icon: '📚' },
    ];

    return (
        <div className="group-details-container" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {/* HERDER */}
            <div style={{
                background: `linear-gradient(135deg, ${group.color}, #2c3e50)`,
                color: 'white',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <button
                    onClick={onBack}
                    style={{
                        position: 'absolute', top: '1rem', left: '1rem',
                        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                        padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    ← Back
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                    <div style={{
                        fontSize: '3rem', background: 'rgba(255,255,255,0.2)',
                        width: '80px', height: '80px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                        {group.icon}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{group.name}</h1>
                        <div style={{ opacity: 0.9, marginTop: '0.5rem', fontSize: '1.1rem' }}>
                            {group.members} Members • Verified Collective
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>

                {/* SIDEBAR NAVIGATION */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', height: 'fit-content', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Command Center</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                                    padding: '0.8rem 1rem',
                                    background: activeTab === tab.id ? `${group.color}22` : 'transparent',
                                    color: activeTab === tab.id ? group.color : 'var(--color-text-main)',
                                    border: 'none', borderRadius: '10px',
                                    fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                    cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div style={{ background: 'white', minHeight: '500px', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>

                    {activeTab === 'chat' && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Live Channel: #general</h3>
                            </div>
                            <div style={{ flex: 1, background: '#f8f9fa', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '400px' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ width: '35px', height: '35px', background: '#ccc', borderRadius: '50%' }}></div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Alice <span style={{ fontWeight: 'normal', color: '#999', fontSize: '0.8rem' }}>10:42 AM</span></div>
                                        <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '0 10px 10px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            Has anyone reviewed the hydroponics proposal updates?
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row-reverse' }}>
                                    <div style={{ width: '35px', height: '35px', background: group.color, borderRadius: '50%' }}></div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>You <span style={{ fontWeight: 'normal', color: '#999', fontSize: '0.8rem' }}>10:45 AM</span></div>
                                        <div style={{ background: group.color, color: 'white', padding: '0.5rem 1rem', borderRadius: '10px 0 10px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            I'm looking at it now. Seems like a heavy lift for one person.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input type="text" name="group_message" placeholder="Message #general..." style={{ flex: 1, padding: '0.8rem', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }} />
                                <button style={{ background: group.color, color: 'white', border: 'none', width: '45px', borderRadius: '50%', cursor: 'pointer' }}>➤</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'discussions' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Discussion Board</h3>
                                <button style={{ background: group.color, color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Topic</button>
                            </div>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div style={{ fontSize: '1.2rem', color: '#ccc' }}>💬</div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.3rem 0' }}>Planning the quarterly meetup</h4>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}>Last active 2 hours ago • 15 comments</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'ideas' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Group Idea Board</h3>
                                <button style={{ background: group.color, color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>+ Submit Idea</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '0.8rem', color: group.color, fontWeight: 'bold', marginBottom: '0.5rem' }}>IN PROGRESS</div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Community Garden Project</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>Expanding the rooftop selection to include medicinal herbs.</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'vault' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Team Vault (Wiki)</h3>
                                <input type="text" name="group_file_search" placeholder="Search files..." style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #ddd' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                {['Manifesto v1.pdf', 'Brand Assets', 'Meeting Notes', 'Financials 2025', 'Component Library'].map((file, i) => (
                                    <div key={i} style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.1s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fefefe'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{file}</div>
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

export default GroupDetails;
