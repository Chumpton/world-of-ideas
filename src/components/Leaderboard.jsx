import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const Leaderboard = () => {
    const { getLeaderboard, viewProfile, voteIdea } = useAppContext();
    const [data, setData] = useState({ topUsers: [], topIdeas: [], topGroups: [] });
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        const load = async () => {
            const res = await getLeaderboard();
            setData(res);
        };
        load();
    }, []);

    const TabButton = ({ id, label }) => (
        <button
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
        >
            {label}
        </button>
    );

    return (
        <div className="feed-container">
            <h2 className="section-title">Leaderboard</h2>

            <div className="tabs-header" style={{ marginBottom: '2rem' }}>
                <TabButton id="users" label="Top Visionaries" />
                <TabButton id="ideas" label="Top Ideas" />
                <TabButton id="groups" label="Top Groups" />
            </div>

            <div className="leaderboard-list">
                {activeTab === 'users' && data.topUsers.map((u, index) => (
                    <div key={u.id} className="glass-panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '30px', color: index < 3 ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                            #{index + 1}
                        </div>
                        <img
                            src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`}
                            alt={u.username}
                            className="avatar"
                            style={{ width: '50px', height: '50px', cursor: 'pointer' }}
                            onClick={() => viewProfile(u.id)}
                        />
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, cursor: 'pointer' }} onClick={() => viewProfile(u.id)}>{u.username}</h4>
                            <span style={{ fontSize: '0.9rem', color: u.borderColor }}>{u.vibe}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{u.influence}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Influence</span>
                        </div>
                    </div>
                ))}

                {activeTab === 'ideas' && data.topIdeas.map((idea, index) => (
                    <div key={idea.id} className="glass-panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '30px', color: index < 3 ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                            #{index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0 }}>{idea.title}</h4>
                            <span className={`category-tag ${idea.type}`}>{idea.type}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>⚡ {idea.votes}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Votes</span>
                        </div>
                    </div>
                ))}

                {activeTab === 'groups' && data.topGroups.map((group, index) => (
                    <div key={group.id} className="glass-panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderLeft: `4px solid ${group.color}` }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '30px', color: index < 3 ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                            #{index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: group.color }}>{group.name}</h4>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{(group.members || []).length} Members</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{group.totalRep}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Reputation</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
