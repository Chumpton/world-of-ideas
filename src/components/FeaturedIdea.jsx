import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const FeaturedIdea = ({ onOpen }) => {
    const { ideas, voteIdea, votedIdeaIds, downvotedIdeaIds, getFeaturedIdea } = useAppContext();
    const [featured, setFeatured] = useState(null);
    const safeIdeas = Array.isArray(ideas) ? ideas : [];

    const isUpvoted = featured && votedIdeaIds ? votedIdeaIds.includes(featured.id) : false;
    const isDownvoted = featured && downvotedIdeaIds ? downvotedIdeaIds.includes(featured.id) : false;

    // Load real top idea on mount
    useEffect(() => {
        let active = true;
        if (getFeaturedIdea) {
            getFeaturedIdea().then(idea => {
                if (active && idea) {
                    setFeatured(idea);
                }
            });
        }
        return () => { active = false; };
    }, [getFeaturedIdea]);

    useEffect(() => {
        if (safeIdeas.length > 0) {
            if (featured) {
                // Try to keep the same idea updated if it exists in the feed
                const updated = safeIdeas.find(i => i.id === featured.id);
                if (updated) {
                    setFeatured(updated);
                }
                // If we already have a featured idea (from DB or prev selection), don't replace it randomly
                return;
            }

            // Initial Fallback: Find a high-voted idea or just random for now
            // Prefer an idea with a clear category for better visuals
            const candidates = safeIdeas.filter(i => (i?.votes || 0) > 10);
            const selection = candidates.length > 0
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : safeIdeas[0];
            setFeatured(selection);
        }
    }, [safeIdeas, featured]);

    if (!featured) return null;

    // ... (keep categories and helpers) ...

    // Map categories to images (placeholders for now)
    const categoryImages = {
        invention: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
        policy: "https://images.unsplash.com/photo-1541872703-74c5963631df?auto=format&fit=crop&w=800&q=80",
        infrastructure: "https://images.unsplash.com/photo-1590486803833-1c5dc8cefea1?auto=format&fit=crop&w=800&q=80",
        ecology: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=800&q=80",
        default: "https://images.unsplash.com/photo-1493612276216-9c59019558f7?auto=format&fit=crop&w=800&q=80"
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '2h ago';
        const normalizedTs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
        const seconds = Math.floor((Date.now() - normalizedTs) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    // Color mapping (simplified from IdeaCard)
    const getTypeColor = (type) => {
        const colors = {
            policy: '#efaa8d',
            invention: '#95afc0',
            infrastructure: '#f7b731',
            entertainment: '#a55eea',
            default: '#d1ccc0'
        };
        return colors[type] || colors.default;
    };

    const featuredType = (featured?.type || 'default').toLowerCase();
    const typeColor = getTypeColor(featuredType);
    const imageUrl = categoryImages[featuredType] || categoryImages.default;

    return (
        <>
            {/* Breathing animation keyframes */}
            <style>{`
                @keyframes breathe {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
            <div
                className="featured-idea-container"
                onClick={() => onOpen && onOpen(featured)}
                style={{
                    maxWidth: '1000px',
                    margin: '3rem auto 2rem auto',
                    background: 'var(--bg-panel)',
                    borderRadius: '30px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column', // Stack top section and footer
                    boxShadow: '0 0 40px rgba(247, 183, 49, 0.4), 0 20px 50px rgba(0,0,0,0.06)', // Yellow glow + shadow
                    minHeight: '400px',
                    border: `2px solid ${typeColor}`, // Subtle colored border
                    borderTop: `6px solid ${typeColor}`, // Thicker top border like IdeaCard
                    cursor: 'pointer',
                    animation: 'breathe 4s ease-in-out infinite' // Slow breathing
                }}>

                {/* Top Section: Image + Content Side-by-Side */}
                <div className="featured-top-section" style={{ display: 'flex', flex: 1, minHeight: '320px' }}>
                    {/* Left Box: Image */}
                    <div
                        className="featured-idea-image"
                        style={{
                            flex: 1,
                            minWidth: '300px',
                            backgroundImage: `url(${imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative'
                        }}>
                        <div style={{
                            position: 'absolute',
                            top: '1.5rem',
                            left: '1.5rem',
                            background: 'white',
                            padding: '0.8rem 1.8rem',
                            borderRadius: '30px',
                            fontWeight: '900',
                            fontSize: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            boxShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 4px 15px rgba(0,0,0,0.1)',
                            zIndex: 2
                        }}>
                            FEATURED
                        </div>

                        {/* Temp Icon Overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.1)', // Slight overlay
                            zIndex: 1
                        }}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </div>
                    </div>

                    {/* Right Box: Info */}
                    <div
                        className="featured-idea-content"
                        style={{ flex: 1.2, padding: '3rem 3rem 1rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>

                        {/* Header: Tag | User | Time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <span
                                className={`tag-badge`}
                                style={{ background: typeColor, color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                            >
                                {featured.type}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#a29bfe',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                }}>
                                    👤
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{featured.author || 'Community Architect'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(featured.timestamp)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2
                            className="featured-idea-title"
                            style={{
                                fontFamily: "'Quicksand', sans-serif",
                                fontSize: '2.5rem',
                                fontWeight: '700',
                                lineHeight: '1.2',
                                margin: '0 0 1.5rem 0',
                                color: 'var(--color-text-main)'
                            }}>
                            {featured.title}
                        </h2>

                        <p style={{
                            fontSize: '1.1rem',
                            lineHeight: '1.6',
                            color: 'var(--color-text-muted)',
                            marginBottom: '1rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {featured.solution || featured.utility || featured.body || featured.problem}
                        </p>
                    </div>
                </div>

                {/* Bottom Bar: Stats (Matched to IdeaCard) */}
                <div className="featured-footer" style={{
                    display: 'flex',
                    flexWrap: 'wrap', // Allow wrapping on mobile
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem', // Gap for wrapping
                    padding: '0.8rem 2rem',
                    background: 'var(--bg-surface)',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    {/* Left: Vote Bubble + View Count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="action-group action-bar-votes" onClick={(e) => e.stopPropagation()} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            padding: '0.2rem 0.5rem',
                            background: `color-mix(in srgb, ${typeColor}, transparent 88%)`, // Balanced opacity
                            borderRadius: '100px'
                        }}>
                            <span
                                onClick={(e) => { e.stopPropagation(); voteIdea(featured.id, 'up'); }}
                                className={`vote-arrow up ${isUpvoted ? 'active' : ''}`}
                                style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                title="Upvote"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    stroke={isUpvoted ? typeColor : "currentColor"}
                                    strokeWidth={isUpvoted ? "0" : "2.5"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        fill: isUpvoted ? typeColor : 'none', // Override CSS
                                        filter: isUpvoted ? `drop-shadow(0 0 2px ${typeColor})` : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                </svg>
                            </span>
                            <span className="action-count" style={{ fontSize: '1.2rem', fontWeight: '800', color: typeColor, lineHeight: '1', minWidth: '1.5ch', textAlign: 'center' }}>
                                {featured.votes}
                            </span>
                            <span
                                onClick={(e) => { e.stopPropagation(); voteIdea(featured.id, 'down'); }}
                                className={`vote-arrow down ${isDownvoted ? 'active' : ''}`}
                                style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: isDownvoted ? typeColor : 'var(--color-text-muted)', opacity: isDownvoted ? 1 : 0.7 }}
                                title="Downvote"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={isDownvoted ? typeColor : "currentColor"}
                                    strokeWidth={isDownvoted ? "0" : "2.5"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        transform: 'rotate(180deg)',
                                        fill: isDownvoted ? typeColor : 'none',
                                        filter: isDownvoted ? `drop-shadow(0 0 2px ${typeColor})` : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                </svg>
                            </span>
                        </div>

                        {/* View Count */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: '600',
                            opacity: 0.7, transform: 'translateY(1px)' // Small alignment adjustment
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>{featured.views || 1205}</span>
                        </div>
                    </div>

                    {/* Right: Comments, Forks, Share */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {/* Comments Pill */}
                        <div
                            className="action-item comments"
                            onClick={(e) => { e.stopPropagation(); onOpen && onOpen(featured, 'discussion'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '16px', cursor: 'pointer' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{featured.commentCount || 12}</span>
                        </div>

                        {/* Forks Pill */}
                        <div
                            className="action-item forks"
                            onClick={(e) => { e.stopPropagation(); onOpen && onOpen(featured, 'forks'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '16px', cursor: 'pointer' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                <circle cx="18" cy="6" r="3"></circle>
                                <circle cx="6" cy="18" r="3"></circle>
                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{featured.forks || 3}</span>
                        </div>

                        {/* Share Pill (New Swing Arrow + Count) */}
                        <div
                            className="action-item share"
                            onClick={(e) => { e.stopPropagation(); onOpen && onOpen(featured, 'share'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '16px', cursor: 'pointer' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <polyline points="15 14 20 9 15 4" />
                                <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{featured.shares || 12}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FeaturedIdea;
