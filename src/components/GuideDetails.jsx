import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const GuideDetails = ({ guide, onClose }) => {
    const { getGuideComments, addGuideComment, user, voteGuide } = useAppContext();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [localGuide, setLocalGuide] = useState(guide);
    const commentInputRef = useRef(null);

    useEffect(() => {
        if (guide) {
            setComments(getGuideComments(guide.id));
            setLocalGuide(guide);
        }
    }, [guide, getGuideComments]);

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        const comment = addGuideComment(guide.id, newComment);
        if (comment) {
            setComments(prev => [...prev, comment]);
            setNewComment("");
        }
    };

    const handleVote = (direction) => {
        const result = voteGuide(guide.id, direction);
        if (result.success) {
            setLocalGuide(prev => ({ ...prev, votes: result.guide.votes }));
        }
    };

    const handleShare = () => {
        // Mock share functionality
        const url = window.location.href; // In real app, would be specific guide URL
        navigator.clipboard.writeText(url).then(() => {
            alert("Guide link copied to clipboard!");
        }).catch(() => {
            alert("Thanks for sharing!");
        });
    };

    const scrollToComments = () => {
        if (commentInputRef.current) {
            commentInputRef.current.focus();
            commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (!guide) return null;

    // Color Logic (matching GuideCard)
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

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-panel)',
                width: '90%', maxWidth: '800px',
                height: '85vh',
                borderRadius: '16px',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <span style={{
                            background: typeColor, color: 'white', padding: '4px 8px', borderRadius: '4px',
                            fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'inline-block'
                        }}>
                            {guide.category}
                        </span>
                        <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', color: 'var(--color-text-main)' }}>{guide.title}</h2>
                        <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            By <b>{guide.author}</b> • {new Date(guide.timestamp).toLocaleDateString()}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', paddingBottom: '100px' }}>
                    {/* Content Section */}
                    <div style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--color-text-main)', marginBottom: '3rem', whiteSpace: 'pre-wrap' }}>
                        {guide.content || guide.snippet}
                    </div>

                    {/* Comments Section */}
                    <div>
                        <h3 style={{ marginBottom: '1.5rem' }}>Discussion ({comments.length})</h3>

                        {/* Comment List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                            {comments.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No discussion yet. Be the first!</div>}
                            {comments.map(c => (
                                <div key={c.id} style={{ display: 'flex', gap: '1rem' }}>
                                    <img src={c.authorAvatar || `https://ui-avatars.com/api/?name=${c.author}&background=random`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt={c.author} />
                                    <div>
                                        <div style={{ marginBottom: '0.2rem' }}>
                                            <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{c.author}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(c.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ lineHeight: '1.5', color: 'var(--color-text-main)' }}>{c.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment Form */}
                        {user ? (
                            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '1rem' }}>
                                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt={user.username} />
                                <div style={{ flex: 1 }}>
                                    <textarea
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Add to the discussion..."
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                        <button type="submit" disabled={!newComment.trim()} style={{ padding: '0.6rem 1.2rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', opacity: !newComment.trim() ? 0.6 : 1 }}>
                                            Post Comment
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                Please log in to join the discussion.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div style={{
                    padding: '1rem 2rem',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--bg-panel)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 10
                }}>
                    {/* Vote Counter */}
                    <button
                        onClick={() => handleVote('up')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '50px',
                            border: `2px solid ${typeColor}`,
                            background: 'transparent',
                            color: typeColor,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.background = `${typeColor}10`}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                        ▲ {localGuide.votes}
                    </button>

                    {/* Right Actions */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleShare}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '50px',
                                border: 'none',
                                background: 'var(--bg-surface)',
                                color: 'var(--color-text-main)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}
                        >
                            🔗 Share
                        </button>
                        <button
                            onClick={scrollToComments}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '50px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            💬 Comment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuideDetails;
