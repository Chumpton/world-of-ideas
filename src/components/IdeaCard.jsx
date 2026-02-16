import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';

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

const IdeaCard = ({ idea, rank, onOpen }) => {
    const { voteIdea, boostIdea, allUsers, votedIdeaIds, downvotedIdeaIds, incrementIdeaShares, getUser } = useAppContext();
    const isVoted = votedIdeaIds ? votedIdeaIds.includes(idea.id) : false;
    const isUpvoted = votedIdeaIds.includes(idea.id);
    const isDownvoted = downvotedIdeaIds && downvotedIdeaIds.includes(idea.id);
    const [isHovered, setIsHovered] = useState(false);
    const [authorProfile, setAuthorProfile] = useState(null);

    // [CACHE] Load author profile securely
    useEffect(() => {
        let active = true;
        if (idea.author_id && getUser) {
            getUser(idea.author_id).then(p => {
                if (active && p) setAuthorProfile(p);
            });
        }
        return () => { active = false; };
    }, [idea.author_id, getUser]);

    // Use cached profile if available, else fall back to idea string
    const displayAuthor = authorProfile ? authorProfile.username : (idea.author || "Community Member");
    const displayAvatar = authorProfile ? authorProfile.avatar : (idea.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random&color=fff`);
    const userTier = authorProfile?.tier || 'free';
    const isPro = userTier === 'pro';
    const isVisionary = userTier === 'visionary';

    // Fork detection (mock logic for now, using a property or random determination if missing)
    const isForked = idea.isForked || idea.forkParentId;

    // Color mapping for categories - Prefer source of truth
    const getTypeColor = (type) => {
        const category = CATEGORIES.find(c => c.id === type);
        if (category) return category.color;

        const colors = {
            policy: '#efaa8d', // Muted Orange
            invention: '#95afc0', // Cool Blue/Grey
            infrastructure: '#f7b731', // Yellow
            entertainment: '#a55eea', // Purple
            default: '#d1ccc0' // Grey
        };
        return colors[type] || colors.default;
    };

    const typeColor = getTypeColor(idea.type);

    // Collaborators
    const collaborators = Array.isArray(idea.collaborators) ? idea.collaborators : [];

    const viewCount = Number(idea.views ?? idea.view_count ?? 0);
    const commentCount = Number(idea.commentCount ?? idea.comment_count ?? (Array.isArray(idea.comments) ? idea.comments.length : 0));
    const boostCount = Array.isArray(idea.boosters) ? idea.boosters.length : 0;

    // Robust content selector
    const getContentPreview = () => {
        // Try specific fields first
        if (idea.type === 'invention' && idea.solution) return idea.solution;
        if (idea.proposedChange) return idea.proposedChange;
        if (idea.solution) return idea.solution;
        if (idea.problem) return idea.problem;
        if (idea.body) return idea.body;
        if (idea.description) return idea.description;
        return 'No description provided...';
    };

    // Subtle gradient background - Enhanced for Dark Mode
    // Using a more transparent overlay on top of the base panel color
    const bgGradient = `linear-gradient(135deg, var(--bg-panel) 0%, ${typeColor}25 100%)`;

    const handleBoost = async (e) => {
        e.stopPropagation();
        const result = await boostIdea(idea.id);
        if (result.success) {
            alert(`Boosted "${idea.title}"`);
        } else {
            alert(`Boost failed: ${result.reason}`);
        }
    };

    return (
        <div
            className="idea-card"
            onClick={() => onOpen && onOpen(idea)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                borderTop: `4px solid ${typeColor}`,
                backgroundColor: 'var(--bg-panel)', // Uses theme variable
                backgroundImage: bgGradient, // Layer gradient on top
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                transform: isHovered ? 'translateY(-8px)' : 'none', // Enhanced lift
                boxShadow: isHovered ? '0 16px 32px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minWidth: '300px' // Prevent squishing
            }}
        >
            {/* Content Wrapper with Padding */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* 1. New Header Layout: Tag | Avatars | Time */}
                <div className="idea-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>

                        {/* Forked Icon Badge */}
                        {isForked && (
                            <span title="This is a Forked Idea" style={{
                                background: 'transparent',
                                border: `1px solid ${typeColor}`,
                                color: typeColor,
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                marginRight: '0.4rem'
                            }}>
                                ⑂
                            </span>
                        )}

                        {/* Category Tag */}
                        <span
                            className={`tag-badge`}
                            style={{ background: typeColor, color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                            {idea.type}
                        </span>

                        {/* Collaborator Cluster */}
                        <div style={{ display: 'flex', paddingLeft: '12px' }}>
                            <img
                                src={avatarUrl}
                                alt={authorName}
                                title={`Author: ${authorName}`}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid white', marginLeft: '0', zIndex: 3 }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&color=fff`;
                                }}
                            />
                            {collaborators.slice(0, 3).map((c, i) => (
                                <img
                                    key={i}
                                    src={c.url || c.avatar}
                                    alt={c.name || "Collaborator"}
                                    title={`Collaborator: ${c.name}`}
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid white', marginLeft: '-10px', zIndex: 2 - i }}
                                />
                            ))}
                        </div>

                        {/* Author Name */}
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginLeft: '-0.3rem' }}>
                            {authorName}
                        </span>

                        {/* Author Badge */}
                        {(isPro || isVisionary) && (
                            <span title={isVisionary ? "Visionary Subscriber" : "Pro Subscriber"} style={{ marginLeft: '0.4rem', fontSize: '1rem' }}>
                                {isVisionary ? '🔮' : '⚡'}
                            </span>
                        )}
                    </div>

                    <span className="idea-meta" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {formatTime(idea.timestamp)}
                    </span>
                </div>

                {/* 2. Typography: Title - Heavier */}
                <h3 className="idea-card-title" style={{ margin: '0 0 0.8rem 0', fontSize: '1.4rem', lineHeight: '1.25', fontWeight: '900', color: 'var(--color-text-main)' }}>
                    {idea.title}
                </h3>

                {/* 3. Description Body - Softer */}
                <div className="idea-card-body" style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: '1.6', minHeight: '3rem' }}>
                    {getContentPreview()}...
                </div>

                {/* Placeholder Image filling the void */}
                <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginTop: 'auto',
                    marginBottom: '0.5rem',
                    position: 'relative'
                }}>
                    <img
                        src={idea.titleImage || idea.thumbnail || (() => {
                            const IMAGES = {
                                invention: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80', // Tech/Lab
                                education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80', // School/Learning
                                ecology: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5b43?auto=format&fit=crop&w=600&q=80', // Forest/Nature
                                health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80', // Health/Medical
                                infrastructure: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80', // City/Buildings
                                policy: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80', // Gavel/Law
                                business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80', // Graph/Office
                                entertainment: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=600&q=80', // Cinema/Movie
                                spiritual: 'https://images.unsplash.com/photo-1507692049790-de58293a4697?auto=format&fit=crop&w=600&q=80', // Stars/Sky
                                arts: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80', // Art/Paint
                                philosophy: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=600&q=80', // Statue
                                apps: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=600&q=80', // Mobile/Code
                                philanthropy: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80', // Hands/Help
                                offgrid: 'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?auto=format&fit=crop&w=600&q=80', // Cabin/Nature
                                gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80', // Controller
                                default: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80' // General/Abstract
                            };
                            const type = (idea.type || 'default').toLowerCase();
                            return IMAGES[type] || IMAGES.default;
                        })()}
                        alt={idea.type}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                    />
                </div>

                {/* Hover Reveal: Read More Arrow */}
                <div style={{
                    position: 'absolute',
                    right: '1.5rem',
                    bottom: '4.5rem', // aligned above footer
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'all 0.3s ease',
                    color: typeColor,
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'none'
                }}>
                    Read More <span>→</span>
                </div>
            </div>

            {/* 5. Action Bar (Footer): votes + view count bottom-left, other options bottom-right */}
            <div className="action-bar" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 1rem',
                background: 'var(--bg-surface)',
                width: '100%',
                marginTop: 'auto',
                gap: '0.2rem',
                flexWrap: 'nowrap',
                minHeight: 'auto'
            }}>
                {/* Bottom left: vote bubble, then small view count on the right (off-center, lower) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <div className="action-group action-bar-votes" onClick={(e) => e.stopPropagation()} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        padding: '0.2rem 0.5rem', // Tighter padding
                        background: `color-mix(in srgb, ${typeColor}, transparent 88%)`, // Balanced opacity
                        borderRadius: '100px'
                    }}>
                        <span
                            onClick={(e) => { e.stopPropagation(); voteIdea(idea.id, 'up'); }}
                            className={`vote-arrow up ${isUpvoted ? 'active' : ''}`}
                            style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            title="Upvote"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                stroke={isUpvoted ? typeColor : "currentColor"}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    fill: isUpvoted ? typeColor : 'none', // Override CSS
                                    filter: isUpvoted ? `drop-shadow(0 0 2px ${typeColor})` : 'none',
                                    transition: 'all 0.2s ease',
                                    stroke: isUpvoted ? typeColor : 'currentColor' // Ensure stroke color matches fill when voted
                                }}
                            >
                                <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                            </svg>
                        </span>
                        <span className="action-count" style={{ fontSize: '1.2rem', fontWeight: '800', color: typeColor, lineHeight: '1', minWidth: '1.5ch', textAlign: 'center' }}>
                            {idea.votes}
                        </span>
                        <span
                            onClick={(e) => { e.stopPropagation(); voteIdea(idea.id, 'down'); }}
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

                    {/* View Count - Lower and Off-Kilter */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        lineHeight: 1,
                        opacity: 0.7,
                        transform: 'translateY(8px)' // Pushed down visually to keep position while parent moves up
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>{viewCount.toLocaleString()}</span>
                    </div>
                </div>

                {/* Bottom right: Comments, Forks, Share (far right) */}
                <div className="action-items-group" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'nowrap' }}>

                    {/* Comments - Outline Bubble */}
                    <div
                        className="action-item comments"
                        onClick={(e) => { e.stopPropagation(); onOpen && onOpen(idea, 'discussion'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '16px', cursor: 'pointer' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{commentCount}</span>
                    </div>

                    {/* Forks - Outline Branch */}
                    <div
                        className="action-item forks"
                        onClick={(e) => { e.stopPropagation(); onOpen && onOpen(idea, 'forks'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '16px', cursor: 'pointer' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                            <line x1="6" y1="3" x2="6" y2="15"></line>
                            <circle cx="18" cy="6" r="3"></circle>
                            <circle cx="6" cy="18" r="3"></circle>
                            <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                        <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{idea.forks || 0}</span>
                    </div>

                    {/* Share - Outline Curve Arrow (Forward) with Count */}
                    <div
                        className="action-item share"
                        onClick={async (e) => {
                            e.stopPropagation();
                            await incrementIdeaShares(idea.id);
                            const url = `${window.location.origin}/idea/${idea.id}`;
                            navigator.clipboard.writeText(url).then(() => alert('Link copied!')).catch(() => alert('Failed to copy'));
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '16px', cursor: 'pointer' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                            <polyline points="15 14 20 9 15 4" />
                            <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                        </svg>
                        <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{idea.shares || 0}</span>
                    </div>




                </div>
            </div>
        </div >
    );
};

export default IdeaCard;
