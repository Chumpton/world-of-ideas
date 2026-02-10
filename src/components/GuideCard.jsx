import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const GuideCard = ({ guide, onClick }) => {
    const { voteGuide, votedGuideIds } = useAppContext();
    const [isHovered, setIsHovered] = useState(false);

    // Color Logic
    const colors = {
        policy: '#efaa8d',
        invention: '#95afc0',
        infrastructure: '#f7b731',
        entertainment: '#a55eea',
        ecology: '#2bcbba',
        education: '#4b7bec',
        default: '#d1ccc0'
    };
    const typeColor = colors[(guide.category || 'default').toLowerCase()] || colors.default;

    // Check vote status
    const myVote = votedGuideIds ? votedGuideIds[guide.id] : undefined;
    const isUpvoted = myVote === 'up';

    // Simple vote tracking for UI feedback (in real app, check user vote status)
    const handleVote = (e, direction) => {
        e.stopPropagation();
        voteGuide(guide.id, direction);
    };

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.05)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.08)' : '0 2px 5px rgba(0,0,0,0.03)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Colored Banner */}
            <div style={{
                height: '8px',
                background: typeColor,
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0
            }} />

            {/* Category Tag */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1rem' }}>
                <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'white',
                    background: typeColor,
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}>
                    {guide.category || 'General'}
                </span>
            </div>

            {/* Header */}
            <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>
                    {guide.title}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>By <b>{guide.author}</b></span>
                    <span>•</span>
                    <span>{new Date(guide.timestamp).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Snippet */}
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                {guide.snippet}
            </p>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                    {/* Votes */}
                    <div
                        onClick={(e) => handleVote(e, 'up')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: isUpvoted ? typeColor : 'var(--color-text-muted)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{
                                stroke: isUpvoted ? typeColor : "currentColor",
                                fill: isUpvoted ? typeColor : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                        </svg>
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: isUpvoted ? typeColor : 'inherit' }}>{guide.votes}</span>
                    </div>

                    {/* Views */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {guide.views > 1000 ? (guide.views / 1000).toFixed(1) + 'k' : guide.views}
                    </div>

                    {/* Comments - New */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {guide.comments ? guide.comments.length : 0}
                    </div>
                </div>

                {/* Share Icon */}
                <button
                    onClick={(e) => { e.stopPropagation(); alert("Shared!"); }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 14 20 9 15 4" />
                        <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default GuideCard;
