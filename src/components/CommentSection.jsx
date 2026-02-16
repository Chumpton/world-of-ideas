import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import RichTextEditor from './RichTextEditor';

const CommentItem = ({
    comment,
    depth = 0,
    activeReplyId,
    setActiveReplyId,
    replyText,
    setReplyText,
    onVote,
    onReplySubmit,
    onProfileClick
}) => {
    const { getUser, allUsers } = useAppContext();
    const [authorProfile, setAuthorProfile] = useState(null);

    // [CACHE] Fetch Author Profile
    useEffect(() => {
        let active = true;
        // If we have an author name but no ID, we might just rely on name or try to find ID from allUsers (slow)
        // Ideally comments have author_id. If not, we rely on the name.
        if (getUser && comment.author_id) {
            getUser(comment.author_id).then(p => {
                if (active && p) setAuthorProfile(p);
            });
        } else if (getUser && comment.author) {
            // Fallback: try to find user by username in allUsers if we don't have ID on comment
            // This is a bit of a hack for legacy comments without IDs
            const u = allUsers.find(u => u.username === comment.author);
            if (u && u.id) {
                getUser(u.id).then(p => {
                    if (active && p) setAuthorProfile(p);
                });
            }
        }
        return () => { active = false; };
    }, [comment, getUser, allUsers]);

    const displayAuthor = authorProfile ? authorProfile.username : comment.author;
    const displayAvatar = authorProfile ? authorProfile.avatar : (comment.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random`);

    // Find author for badges (using cached profile if available, else fallback to allUsers check)
    const userTier = authorProfile?.tier || allUsers.find(u => u.username === comment.author)?.tier || 'free';
    const isPro = userTier === 'pro';
    const isVisionary = userTier === 'visionary';

    // Thread line style
    const threadLineStyle = depth > 0 ? {
        borderLeft: '2px solid var(--color-border)',
        paddingLeft: '1rem',
        marginLeft: depth > 1 ? '0.5rem' : '0',
    } : {};

    const renderText = (text) => {
        const parts = text.split(/(\[\[.*?\]\])/g);
        return parts.map((part, index) => {
            if (part.startsWith('[[') && part.endsWith(']]')) {
                const content = part.slice(2, -2);
                return (
                    <span key={index} style={{
                        color: 'var(--color-primary)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                        title={`Link to idea: ${content}`}
                        onClick={() => alert(`Navigating to idea: ${content}`)}
                    >
                        {content}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div style={{ marginTop: '1rem', ...threadLineStyle }}>
            {/* Header: Avatar + Name + Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                <img
                    src={displayAvatar}
                    alt={displayAuthor}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', objectFit: 'cover' }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random`;
                    }}
                    onClick={() => onProfileClick(displayAuthor)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                        className={`name-plate ${isVisionary ? 'visionary' : isPro ? 'pro' : ''}`}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                        onClick={() => onProfileClick(displayAuthor)}
                        onMouseEnter={e => e.target.style.textDecoration = 'none'}
                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                    >
                        {displayAuthor}
                        {isVisionary && <span title="Visionary" style={{ fontSize: '0.8rem' }}>🔮</span>}
                        {isPro && <span title="Pro" style={{ fontSize: '0.8rem' }}>⚡</span>}
                    </span>
                    {comment.isOp && <span style={{ color: '#0984e3', fontWeight: 'bold', background: 'rgba(9, 132, 227, 0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>OP</span>}
                    <span style={{ color: 'var(--color-text-muted)' }}>• {comment.time}</span>
                </div>
            </div>

            {/* Content Body */}
            <div style={{ fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '0.4rem', paddingLeft: '34px', color: 'var(--color-text-main)' }}>
                {renderText(comment.text)}
            </div>

            {/* Action Bar: Votes + Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)', paddingLeft: '34px' }}>
                {/* Vote Cluster */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        className="vote-arrow up"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: comment.hasVoted ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: 0 }}
                        onClick={() => onVote(comment.id)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={comment.hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={comment.hasVoted ? "0" : "2.5"} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem', color: comment.votes < 0 ? '#d63031' : (comment.hasVoted ? 'var(--color-primary)' : 'var(--color-text-main)') }}>
                        {comment.votes}
                    </span>
                    <button
                        className="vote-arrow down"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: comment.hasDownvoted ? '#d63031' : 'var(--color-text-muted)', padding: 0 }}
                        onClick={() => onVote(comment.id, 'down')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={comment.hasDownvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={comment.hasDownvoted ? "0" : "2.5"} strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                            <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                        </svg>
                    </button>
                </div>
                <div style={{ width: '1px', height: '14px', background: 'var(--color-border)' }}></div>
                <div style={{ display: 'flex', gap: '1.2rem' }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: activeReplyId === comment.id ? 'var(--color-primary)' : 'inherit' }}
                        onClick={() => {
                            if (activeReplyId === comment.id) {
                                setActiveReplyId(null);
                            } else {
                                setActiveReplyId(comment.id);
                                setReplyText('');
                            }
                        }}
                    >
                        <span>Reply</span>
                    </div>
                </div>
            </div>

            {/* Inline Reply Box */}
            {activeReplyId === comment.id && (
                <div style={{ marginTop: '1rem', marginLeft: '34px', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <span>Replying to {displayAuthor}</span>
                        <span style={{ cursor: 'pointer', color: 'var(--color-text-main)', textDecoration: 'underline' }} onClick={() => setActiveReplyId(null)}>Cancel</span>
                    </div>
                    <RichTextEditor
                        value={replyText}
                        onChange={setReplyText}
                        placeholder={`Reply to ${displayAuthor}...`}
                        submitLabel="Reply"
                        onSubmit={() => onReplySubmit(comment.id, replyText)}
                    />
                </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="nested-replies" style={{ position: 'relative' }}>
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            activeReplyId={activeReplyId}
                            setActiveReplyId={setActiveReplyId}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            onVote={onVote}
                            onReplySubmit={onReplySubmit}
                            onProfileClick={onProfileClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CommentSection = ({ ideaId, comments = [], onAddComment, onAddReply }) => {
    const { user, tipUser, allUsers, voteIdeaComment } = useAppContext();
    const [localComments, setLocalComments] = useState(Array.isArray(comments) ? comments : []);
    const [newComment, setNewComment] = useState('');
    const [activeReplyId, setActiveReplyId] = useState(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        setLocalComments(Array.isArray(comments) ? comments : []);
    }, [comments]);

    const handleVote = async (commentId, direction = 'up') => {
        const updateVotes = (comments) => {
            return comments.map(c => {
                if (c.id === commentId) {
                    let voteChange = 0;
                    if (direction === 'up') voteChange = 1;
                    if (direction === 'down') voteChange = -1;
                    return {
                        ...c,
                        votes: (c.votes || 0) + voteChange,
                        hasVoted: direction === 'up' ? true : c.hasVoted,
                        hasDownvoted: direction === 'down' ? true : c.hasDownvoted
                    };
                } else if (c.replies && c.replies.length > 0) {
                    return { ...c, replies: updateVotes(c.replies) };
                }
                return c;
            });
        };
        setLocalComments(prev => updateVotes(prev));
        await voteIdeaComment(commentId, direction);
    };

    const handleProfileClick = (authorName) => {
        console.log(`Navigating to profile: ${authorName}`);
        alert(`Opening profile for: ${authorName}`);
    };

    // Recursive helper to add reply
    const addReplyRec = (comments, targetId, newReply) => {
        return comments.map(c => {
            if (c.id === targetId) {
                return { ...c, replies: [...(c.replies || []), newReply] };
            } else if (c.replies && c.replies.length > 0) {
                return { ...c, replies: addReplyRec(c.replies, targetId, newReply) };
            }
            return c;
        });
    };

    const handleReplySubmit = async (targetId, text) => {
        if (!text.trim()) return;
        if (onAddReply) {
            const added = await onAddReply(targetId, text);
            if (added) {
                setLocalComments(prev => addReplyRec(prev, targetId, added));
                setActiveReplyId(null);
                setReplyText('');
            }
        } else {
            // Fallback for mock/offline
            const newReply = {
                id: Date.now(),
                author: user?.username || "Guest",
                authorAvatar: user?.avatar,
                text: text,
                votes: 1,
                time: "Just now",
                replies: []
            };
            setLocalComments(prev => addReplyRec(prev, targetId, newReply));
            setActiveReplyId(null);
            setReplyText('');
        }
    };

    return (
        <div className="comments-section" style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#a29bfe', overflow: 'hidden', flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'Guest'}&background=random&color=fff`} alt="User" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <RichTextEditor
                        value={newComment}
                        onChange={setNewComment}
                        placeholder="Add to the discussion..."
                        onSubmit={async () => {
                            if (!newComment.trim()) return;
                            if (onAddComment) {
                                const added = await onAddComment(newComment);
                                if (added) {
                                    setLocalComments(prev => [added, ...prev]);
                                    setNewComment('');
                                }
                            } else {
                                setLocalComments(prev => [{
                                    id: Date.now(),
                                    author: user?.username || "Guest",
                                    text: newComment,
                                    votes: 1,
                                    time: "Just now",
                                    replies: []
                                }, ...prev]);
                                setNewComment('');
                            }
                        }}
                        submitLabel="Comment"
                    />
                </div>
            </div>

            <div className="comments-list">
                {localComments.map(c => (
                    <CommentItem
                        key={c.id}
                        comment={c}
                        activeReplyId={activeReplyId}
                        setActiveReplyId={setActiveReplyId}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onVote={handleVote}
                        onReplySubmit={handleReplySubmit}
                        onProfileClick={handleProfileClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default CommentSection;
