import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import CommentSection from './CommentSection';

const DiscussionDetails = () => {
    const {
        selectedDiscussion,
        setSelectedDiscussion,
        getDiscussionComments,
        addDiscussionComment,
        voteDiscussionComment,
        voteDiscussion,
        votedDiscussionIds,
        getUser
    } = useAppContext();

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authorProfile, setAuthorProfile] = useState(null);
    const [voteCount, setVoteCount] = useState(selectedDiscussion?.votes || 0);

    // Load comments and author profile
    useEffect(() => {
        let active = true;
        if (selectedDiscussion) {
            setLoading(true);
            setVoteCount(selectedDiscussion.votes || 0);

            getDiscussionComments(selectedDiscussion.id).then((fetchedComments) => {
                if (active) {
                    setComments(Array.isArray(fetchedComments) ? fetchedComments : []);
                    setLoading(false);
                }
            }).catch(() => {
                if (active) setLoading(false);
            });

            if (selectedDiscussion.author_id && getUser) {
                getUser(selectedDiscussion.author_id).then((profile) => {
                    if (active && profile) setAuthorProfile(profile);
                }).catch(() => { });
            }
        }
        return () => { active = false; };
    }, [selectedDiscussion, getDiscussionComments, getUser]);

    if (!selectedDiscussion) return null;

    // Display Helpers
    const displayAuthor = authorProfile ? authorProfile.username : selectedDiscussion.author;
    const displayAvatar = authorProfile ? authorProfile.avatar : (selectedDiscussion.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random`);
    const isVoted = votedDiscussionIds.includes(selectedDiscussion.id);

    const handleVote = async (direction) => {
        // Optimistic update
        const change = direction === 'up' ? 1 : -1;
        if (!isVoted) {
            setVoteCount(prev => prev + change);
            voteDiscussion(selectedDiscussion.id, direction);
        }
    };

    const handleAddComment = async (text, parentId = null) => {
        const result = await addDiscussionComment(selectedDiscussion.id, text, parentId);
        if (result) {
            // Non-blocking background reconcile.
            setTimeout(async () => {
                const freshComments = await getDiscussionComments(selectedDiscussion.id);
                if (Array.isArray(freshComments)) setComments(freshComments);
            }, 800);
            return result;
        }
        return null;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.98)',
            zIndex: 2000,
            overflowY: 'auto',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', minHeight: '100vh', paddingBottom: '4rem' }}>

                {/* Back Button */}
                <button
                    onClick={() => setSelectedDiscussion(null)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        padding: '0.5rem 0'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>←</span> Back to Discussions
                </button>

                {/* Main Content */}
                <div style={{ marginBottom: '2rem' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#f1f2f6' }}>
                            <img
                                src={displayAvatar}
                                alt={displayAuthor}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random`;
                                }}
                            />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{displayAuthor}</h3>
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Posted recently in {selectedDiscussion.category}</span>
                        </div>
                    </div>

                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: '1.3' }}>{selectedDiscussion.title}</h1>

                    {/* Vote & Share Bar */}
                    <div style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#f8f9fa', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <button
                                onClick={() => handleVote('up')}
                                style={{
                                    background: isVoted ? 'var(--color-primary)' : 'transparent',
                                    color: isVoted ? 'white' : 'var(--color-text-muted)',
                                    border: '1px solid transparent',
                                    borderRadius: '50%',
                                    width: '24px', height: '24px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem', padding: 0
                                }}
                            >▲</button>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0 8px', color: isVoted ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                                {voteCount}
                            </span>
                            <button
                                onClick={() => handleVote('down')}
                                style={{
                                    background: 'transparent',
                                    color: 'var(--color-text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem', padding: 0,
                                    width: '24px', height: '24px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >▼</button>
                        </div>
                    </div>

                </div>

                {/* Reuse CommentSection */}
                <h3>Discussion ({comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0)})</h3>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading comments...</div>
                ) : (
                    <CommentSection
                        comments={comments}
                        // Wrapper to handle submit with parentId logic if needed, 
                        // but CommentSection expects onAddComment/onAddReply
                        onAddComment={(text) => handleAddComment(text)}
                        onAddReply={(parentId, text) => handleAddComment(text, parentId)}
                    />
                )}
            </div>
        </div>
    );
};

export default DiscussionDetails;
