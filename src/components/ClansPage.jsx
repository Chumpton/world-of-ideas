import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const ClansPage = () => {
    const { getClans, joinClan, leaveClan, user, viewProfile, allUsers } = useAppContext();
    const [clans, setClans] = useState([]);
    const [selectedClan, setSelectedClan] = useState(null); // For member list modal

    // Load clans on mount
    useEffect(() => {
        setClans(getClans());
    }, []);

    const handleJoin = (clanId) => {
        if (!user) return alert("Please login to join a clan.");
        if (confirm(`Join this clan? You will leave your current clan.`)) {
            const result = joinClan(clanId, user.id);
            if (result.success) {
                setClans(getClans()); // Refresh functionality
            }
        }
    };

    const handleLeave = () => {
        if (confirm("Are you sure you want to leave your clan?")) {
            const result = leaveClan(user.id);
            if (result.success) {
                setClans(getClans());
            }
        }
    };

    // Get member user data for modal
    const getClanMembers = (clan) => {
        return clan.members.map(memberId => allUsers.find(u => u.id === memberId)).filter(Boolean);
    };

    return (
        <div className="feed-container">
            <h2 className="section-title">Clans & Collectives</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Join a specialized group to amplify your impact. Clans provide verification, resources, and community.
            </p>

            <div className="clans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {clans.map(clan => {
                    const isMember = user?.clanId === clan.id;

                    return (
                        <div key={clan.id} className="glass-panel" style={{
                            padding: '0',
                            overflow: 'hidden',
                            border: isMember ? `2px solid ${clan.color}` : '1px solid rgba(255,255,255,0.1)',
                            position: 'relative'
                        }}>
                            <div style={{
                                height: '100px',
                                background: `url(${clan.banner}) center/cover`,
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                                }} />
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, color: clan.color }}>{clan.name}</h3>
                                    <span
                                        className="pill"
                                        style={{ fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => setSelectedClan(clan)}
                                        onMouseEnter={(e) => e.target.style.background = clan.color}
                                        onMouseLeave={(e) => e.target.style.background = ''}
                                    >{clan.members.length} Members</span>
                                </div>

                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', height: '60px' }}>
                                    {clan.description}
                                </p>

                                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    {isMember ? (
                                        <button
                                            onClick={handleLeave}
                                            className="action-btn"
                                            style={{ width: '100%', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                        >
                                            Leave Clan
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleJoin(clan.id)}
                                            className="action-btn primary"
                                            style={{ width: '100%', background: clan.color, border: 'none', color: '#000' }}
                                        >
                                            Join Clan
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MEMBER LIST MODAL */}
            {selectedClan && (
                <div
                    onClick={() => setSelectedClan(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.75)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-panel)', borderRadius: '20px',
                            width: '90%', maxWidth: '500px', maxHeight: '80vh',
                            overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid var(--color-border)',
                            background: `linear-gradient(135deg, ${selectedClan.color}22, transparent)`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: selectedClan.color }}>{selectedClan.name}</h3>
                                    <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        {selectedClan.members.length} member{selectedClan.members.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedClan(null)}
                                    style={{
                                        background: 'var(--bg-surface)', border: 'none', borderRadius: '50%',
                                        width: '36px', height: '36px', cursor: 'pointer',
                                        fontSize: '1.2rem', color: 'var(--color-text-muted)'
                                    }}
                                >×</button>
                            </div>
                        </div>

                        {/* Member List */}
                        <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {getClanMembers(selectedClan).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                    No members yet. Be the first to join!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {getClanMembers(selectedClan).map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => { setSelectedClan(null); viewProfile(member.id); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.75rem', borderRadius: '12px',
                                                background: 'var(--bg-surface)', cursor: 'pointer',
                                                transition: 'all 0.2s', border: '1px solid var(--color-border)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = selectedClan.color + '22'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                                        >
                                            <img
                                                src={member.avatar}
                                                alt={member.username}
                                                style={{
                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                    border: `2px solid ${member.borderColor || selectedClan.color}`
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                                    {member.username}
                                                    {member.isVerified && <span style={{ marginLeft: '4px' }}>✓</span>}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {member.influence || 0} influence
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.2rem' }}>→</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClansPage;
