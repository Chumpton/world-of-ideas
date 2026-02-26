import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

const ACTIVITY_CACHE_KEY = 'woi_cached_activity_feed_v1';
const ACTIVITY_CACHE_META_KEY = 'woi_cached_activity_feed_meta_v1';

const readCachedActivities = () => {
    try {
        const raw = localStorage.getItem(ACTIVITY_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((a) => ({ ...a, time: a?.time ? new Date(a.time) : new Date() }))
            .filter((a) => a && a.id);
    } catch {
        return [];
    }
};

const ActivityFeed = () => {
    const { ideas, allUsers, setSelectedIdea, getDiscussions, viewProfile } = useAppContext();
    const [isPaused, setIsPaused] = useState(false);
    const [activities, setActivities] = useState(() => readCachedActivities());
    const [loading, setLoading] = useState(() => readCachedActivities().length === 0);

    const fetchActivities = async ({ force = false, minIntervalMs = 60_000 } = {}) => {
        const now = Date.now();
        let lastSyncedAt = 0;
        try {
            const rawMeta = localStorage.getItem(ACTIVITY_CACHE_META_KEY);
            const parsedMeta = rawMeta ? JSON.parse(rawMeta) : null;
            lastSyncedAt = Number(parsedMeta?.lastSyncedAt || 0) || 0;
        } catch (_) { }

        if (!force && lastSyncedAt > 0 && (now - lastSyncedAt) < minIntervalMs && activities.length > 0) {
            setLoading(false);
            return;
        }

        try {
            // 1) Recent Ideas / Forks
            const recentIdeas = [...(ideas || [])]
                .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
                .slice(0, 5)
                .map(idea => ({
                    id: `idea-${idea.id}`,
                    type: 'idea',
                    user: idea.author,
                    userId: idea.author_id,
                    avatar: idea.author_avatar,
                    action: idea.forked_from ? 'forked' : 'created',
                    target: idea.title,
                    targetId: idea.id,
                    time: new Date(idea.created_at || idea.timestamp || Date.now())
                }));

            // 2) Discussions
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
                    targetId: d.id,
                    time: new Date(d.created_at || Date.now())
                }));

            // 3) Comments (use text column, fallback-friendly joins)
            const { data: comments } = await supabase
                .from('idea_comments')
                .select('id, text, created_at, user_id, idea_id, profiles(username, avatar_url), ideas(title)')
                .order('created_at', { ascending: false })
                .limit(5);

            const recentComments = (comments || []).map(c => {
                const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                const idea = Array.isArray(c.ideas) ? c.ideas[0] : c.ideas;
                return {
                    id: `comment-${c.id}`,
                    type: 'comment',
                    user: profile?.username || 'Unknown',
                    userId: c.user_id,
                    avatar: profile?.avatar_url,
                    action: 'commented on',
                    target: idea?.title || 'an idea',
                    targetId: c.idea_id,
                    time: new Date(c.created_at || Date.now())
                };
            });

            const merged = [...recentIdeas, ...recentDiscussions, ...recentComments]
                .sort((a, b) => b.time - a.time)
                .slice(0, 15);

            setActivities(merged);
            try {
                localStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(merged));
                localStorage.setItem(ACTIVITY_CACHE_META_KEY, JSON.stringify({ lastSyncedAt: now }));
            } catch (_) { }
        } catch (err) {
            console.error('Error fetching activity feed:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch and merge activities
    useEffect(() => {
        void fetchActivities({ force: false, minIntervalMs: 30_000 });
        const interval = setInterval(() => { void fetchActivities({ force: true }); }, 60_000);
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                void fetchActivities({ force: false, minIntervalMs: 20_000 });
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
        // Intentionally mount-only to prevent interval/fetch recreation loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    <ActivityItem
                        key={`${act.id}-${i}`}
                        activity={act}
                        onClick={() => handleClick(act)}
                    />
                ))}
            </div>
        </div>
    );
};

const ActivityItem = ({ activity, onClick }) => {
    const { getUser } = useAppContext();
    const [profile, setProfile] = useState(null);

    // [CACHE] Fetch Author Profile
    useEffect(() => {
        let active = true;
        if (getUser && activity.userId) {
            getUser(activity.userId).then(p => {
                if (active && p) setProfile(p);
            });
        }
        return () => { active = false; };
    }, [activity, getUser]);

    const displayUser = profile ? profile.username : activity.user;
    const displayAvatar = profile ? profile.avatar : (activity.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser)}&background=random`);

    return (
        <div
            onClick={onClick}
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
                <img
                    src={displayAvatar}
                    alt={displayUser}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser)}&background=random`;
                    }}
                />
            </div>
            <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontWeight: 'bold' }}>{displayUser}</span>
                <span className="text-dim" style={{ fontSize: '0.8rem' }}>{activity.action}</span>
                <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{activity.target}</span>
                {/* Re-calculate time or pass it in. If formatted time is passed in activity.time (which is an object), we need to format it. 
                    The activity object has 'time' as Date object. We need formatTime function. 
                    Ideally pass formatTime or format inside. */}
                <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '0.2rem' }}>
                    {(() => {
                        const date = activity.time;
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
                    })()}
                </span>
            </div>
        </div>
    );
};
export default ActivityFeed;
