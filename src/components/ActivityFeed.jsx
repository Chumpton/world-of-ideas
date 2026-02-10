import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const ActivityFeed = () => {
    const { ideas, allUsers, setSelectedIdea, viewProfile } = useAppContext();
    const [isPaused, setIsPaused] = useState(false);

    const activities = [
        { id: 1, user: 'SarahJ', avatar: '#ff7675', action: 'forked', target: 'Universal Creative Income', time: '2m', type: 'idea' },
        { id: 2, user: 'CryptoDad', avatar: '#74b9ff', action: 'commented on', target: 'Maglev Logistics', time: '15m', type: 'idea' },
        { id: 3, user: 'EcoWarrior', avatar: '#55efc4', action: 'created group', target: 'Solarpunk Collective', time: '1h', type: 'group' },
        { id: 4, user: 'BuilderBob', avatar: '#fdcb6e', action: 'submitted', target: 'Urban Vertical Farms', time: '5m', type: 'idea' },
        { id: 5, user: 'PolicyWonk', avatar: '#a29bfe', action: 'red teamed', target: 'AI Copyright Law', time: '10m', type: 'idea' },
    ];

    const handleClick = (act) => {
        // 1. Try to find the User first (if clicking user part - for now clicked anywhere opens target or user)
        // Let's prioritize target (Idea)
        if (act.type === 'idea') {
            const idea = ideas.find(i => i.title.includes(act.target) || i.title === act.target);
            if (idea) {
                setSelectedIdea(idea);
                return;
            }
        }

        // Fallback: Open User Profile
        const user = allUsers.find(u => u.username === act.user);
        if (user) {
            viewProfile(user.id);
        } else {
            // If no real data match, just alert for prototype feel
            alert(`Viewing ${act.target}... (Prototype Only)`);
        }
    };

    return (
        <div
            className="activity-feed-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{ maxWidth: '100%', overflow: 'hidden', margin: '1rem 0', position: 'relative', padding: '0.5rem 0' }}
        >
            <style>
                {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-wrap {
            display: flex;
            width: max-content;
            animation: scroll 40s linear infinite;
          }
          .ticker-wrap:hover {
            animation-play-state: paused;
          }
        `}
            </style>
            <div className="ticker-wrap" style={{ animationPlayState: isPaused ? 'paused' : 'running' }}>
                {/* Duplicate list for infinite scroll effect */}
                {[...activities, ...activities].map((act, i) => (
                    <div
                        key={`${act.id}-${i}`}
                        onClick={() => handleClick(act)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            background: 'var(--bg-surface)',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: '1px solid var(--color-border)',
                            marginRight: '1rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            userSelect: 'none'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: act.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {act.user[0]}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{act.user}</span>
                            <span className="text-dim"> {act.action} </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{act.target}</span>
                        </div>
                        <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem' }}>→</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityFeed;
