import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

const ActivityFeed = () => {
    const { ideas, allUsers, setSelectedIdea, getDiscussions, viewProfile } = useAppContext();
    const [isPaused, setIsPaused] = useState(false);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch and merge activities
    useEffect(() => {
        let active = true;

        const fetchActivities = async () => {
            try {
                // 1. Recent Ideas & Forks (from Context)
                // Filter ideas created in last 7 days? Or just take last 10.
                const recentIdeas = ideas
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
                    .map(idea => ({
                        id: `idea-${idea.id}`,
                        type: 'idea',
                        user: idea.author, // username
                        userId: idea.author_id,
                        avatar: idea.author_avatar,
                        action: idea.forked_from ? 'forked' : 'created',
                        target: idea.title,
                        targetId: idea.id,
                        time: new Date(idea.created_at)
                    }));

                // 2. Recent Discussions (Fetch or use context if available)
                const discussions = await getDiscussions('all');
                const recentDiscussions = (Array.isArray(discussions) ? discussions : [])
                    .slice(0, 5)
                    .map(d => ({
                        id: `discuss-${d.id}`,
                        type: 'discussion',
                        user: d.author_name,
                        userId: d.author_id,
                        avatar: d.author_avatar,
                        action: 'asked',
                        target: d.title,
                        targetId: d.id, // Discussion ID (might need handling in nav)
                        time: new Date(d.created_at)
                    }));

                // 3. Recent Comments (Direct Fetch)
                const { data: comments, error } = await supabase
                    .from('idea_comments')
                    .select('id, content, created_at, user_id, idea_id, profiles(username, avatar_url), ideas(title)')
                    .order('created_at', { ascending: false })
                    .limit(5);

                const recentComments = (comments || []).map(c => ({
                    id: `comment-${c.id}`,
                    type: 'comment',
                    user: c.profiles?.username || 'Unknown',
                    userId: c.user_id,
                    avatar: c.profiles?.avatar_url,
                    action: 'commented on',
                    target: c.ideas?.title || 'an idea',
                    targetId: c.idea_id,
                    time: new Date(c.created_at)
                }));

                // Merge and Sort
                if (active) {
                    const merged = [...recentIdeas, ...recentDiscussions, ...recentComments]
                        .sort((a, b) => b.time - a.time)
                        .slice(0, 15); // Keep top 15

                    setActivities(merged);
                }
            } catch (err) {
                console.error("Error fetching activity feed:", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchActivities();
        return () => { active = false; };
    }, [ideas]); // Re-run when ideas change (e.g. new post)

    const formatTime = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return "now";
    };

    const handleClick = (activity) => {
        if (activity.type === 'idea' || activity.type === 'comment') {
            const idea = ideas.find(i => i.id === activity.targetId);
            if (idea) setSelectedIdea(idea);
        } else if (activity.type === 'discussion') {
            // Setup discussion view if needed, or just warn
            // For discussion we might need to change tabs in Feed, which is harder from here without prop drilling
            // But we can check if we can access the 'setViewMode' from context? No.
            // Just alert for now or try to viewProfile if user clicked
            alert("Discussion view coming soon to direct link!");
        }
    };

    if (loading && activities.length === 0) {
        return (
            <div className="activity-feed-container" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading sparks...
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="activity-feed-container" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Waiting for the first sparks of creativity...
            </div>
        );
    }

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
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', overflow: 'hidden' }}>
                            {act.avatar ? (
                                <img src={act.avatar} alt={act.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                    {act.user[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontWeight: 'bold' }}>{act.user}</span>
                            <span className="text-dim" style={{ fontSize: '0.8rem' }}>{act.action}</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{act.target}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '0.2rem' }}>{formatTime(act.time)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default ActivityFeed;
