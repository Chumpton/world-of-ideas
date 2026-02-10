import React from 'react';
import { useAppContext } from '../context/AppContext';
import Stories from './Stories';

const RecommendedFollowers = () => {
    const { user, allUsers, followUser } = useAppContext();

    if (!user) return null;

    // Filter potential mentors/creators
    // 1. Not me
    // 2. Not already following
    // 3. Has Influence > 0 (or is "Active")
    const recommendations = allUsers
        .filter(u => u.id !== user.id && (!user.following || !user.following.includes(u.id)))
        .sort((a, b) => b.influence - a.influence) // Sort by highest influence
        .slice(0, 4); // Top 4

    if (recommendations.length === 0) return null;

    return (
        <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-main)' }}>Who to Follow</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Top creators and mentors in the community</p>
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <Stories />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {recommendations.map(u => (
                    <div key={u.id} style={{
                        padding: '1rem',
                        background: 'var(--bg-panel)',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}
                        className="card-hover"
                    >
                        <img
                            src={u.avatar}
                            alt={u.username}
                            style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '0.8rem', border: '2px solid white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                        />
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--color-text-main)', marginBottom: '0.2rem' }}>{u.username}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {u.jobTitle || u.vibe || 'Visionary'}
                        </div>

                        {/* Badges */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', justifyContent: 'center' }}>
                            {u.mentorship?.isMentor && <span title="Mentor">🧠</span>}
                            {u.badges?.includes('Founder') && <span title="Founder">👑</span>}
                            {u.badges?.slice(0, 2).map((b, i) => <span key={i} title={b} style={{ fontSize: '0.8rem', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{b.substring(0, 1)}</span>)}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                followUser(u.id);
                            }}
                            style={{
                                marginTop: 'auto',
                                width: '100%',
                                padding: '0.5rem',
                                border: 'none',
                                borderRadius: '50px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Follow
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendedFollowers;
