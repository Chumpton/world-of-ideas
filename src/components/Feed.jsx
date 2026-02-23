import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import IdeaCard from './IdeaCard';
import IdeaDetails from './IdeaDetails';
import FeaturedIdea from './FeaturedIdea';
import { CATEGORIES } from '../data/categories';

import { debugInfo } from '../debug/runtimeDebug';
// Stories moved to messaging only


const GROUPS = ['All', 'Society', 'Creative', 'Business', 'Tech', 'Lifestyle'];

const FeedTabIcon = ({ type }) => {
    if (type === 'hot') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3s.5 2.5-1.5 4.5S8 11.5 8 14a4 4 0 0 0 8 0c0-3-2-4.5-1.5-7 .3-1.3 1.2-2.3 1.2-2.3" />
                <path d="M9.5 14.5a2.5 2.5 0 0 0 5 0c0-1.3-1-2.2-1.7-3.2-.3 1-.8 1.6-1.6 2.2-.8.5-1.7.6-1.7 1z" />
            </svg>
        );
    }

    if (type === 'following') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c1.7-3.4 4.3-5 8-5s6.3 1.6 8 5" />
            </svg>
        );
    }

    if (type === 'discover') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="2.5" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V9l7-4 7 4v12" />
            <path d="M9 21V12h6v9" />
            <path d="M4 9h16" />
        </svg>
    );
};

const Feed = () => {
    const { user, ideas, allUsers, loading, refreshIdeas, getDiscussions, addDiscussion, requestCategory, newlyCreatedIdeaId, clearNewIdeaId, selectedIdea, setSelectedIdea, savedIdeaIds, voteDiscussion, votedDiscussionIds, incrementIdeaViews, setCurrentPage } = useAppContext();
    const [activeTab, setActiveTab] = useState('hot'); // 'hot', 'following', 'discover', 'groups', or categoryID
    const [activeGroup, setActiveGroup] = useState('All'); // For Category filtering
    const [initialDetailView, setInitialDetailView] = useState('details'); // New State
    const [searchQuery, setSearchQuery] = useState(''); // Search functionality
    const [showFakeLoading, setShowFakeLoading] = useState(false); // UI transition state
    const [isRetrying, setIsRetrying] = useState(false);
    const emptyFeedRetryAttemptsRef = useRef(0);
    const emptyFeedRetryTimerRef = useRef(null);

    const [viewMode, setViewMode] = useState('ideas'); // 'ideas' | 'discussions'
    const [discussions, setDiscussions] = useState([]);
    const [visibleCount, setVisibleCount] = useState(15);
    const lastNonEmptyDisplayIdeasRef = useRef([]);

    useEffect(() => {
        debugInfo('feed', 'Feed mounted');
        return () => debugInfo('feed', 'Feed unmounted');
    }, []);

    // Combine real loading state with UI transition
    const isLoading = showFakeLoading || (loading && ideas.length === 0) || isRetrying;

    useEffect(() => {
        let active = true;
        const loadDiscussions = async () => {
            if (viewMode !== 'discussions') return;
            const category = activeTab === 'hot' || activeTab === 'discover' ? 'all' : activeTab;
            const rows = await getDiscussions(category);
            if (active) setDiscussions(Array.isArray(rows) ? rows : []);
        };
        loadDiscussions();
        return () => { active = false; };
    }, [viewMode, activeTab, getDiscussions]);

    // Global map is temporarily disabled; normalize stale state.
    useEffect(() => {
        if (activeTab === 'map') {
            setActiveTab('hot');
        }
    }, [activeTab]);

    const scrollContainerRef = useRef(null);

    const handleIdeaOpen = (idea, view = 'details') => {
        setSelectedIdea(idea);
        setInitialDetailView(view);
        incrementIdeaViews(idea?.id);
    };

    // Fake Loading effect for Skeleton Demo (smooth transitions)
    useEffect(() => {
        setShowFakeLoading(true);
        const timer = setTimeout(() => setShowFakeLoading(false), 800);
        return () => clearTimeout(timer);
    }, [activeTab, viewMode]);

    const handleRetry = async () => {
        if (!refreshIdeas) return;
        setIsRetrying(true);
        await refreshIdeas();
        setTimeout(() => setIsRetrying(false), 500); // Minimum spinner time
    };

    useEffect(() => {
        if (!refreshIdeas) return;
        if (viewMode !== 'ideas') return;

        if (Array.isArray(ideas) && ideas.length > 0) {
            emptyFeedRetryAttemptsRef.current = 0;
            if (emptyFeedRetryTimerRef.current) {
                clearTimeout(emptyFeedRetryTimerRef.current);
                emptyFeedRetryTimerRef.current = null;
            }
            return;
        }

        if (loading || isRetrying) return;
        if (emptyFeedRetryAttemptsRef.current >= 4) return;

        const delayMs = 1200 * Math.max(1, emptyFeedRetryAttemptsRef.current + 1);
        emptyFeedRetryTimerRef.current = setTimeout(async () => {
            emptyFeedRetryAttemptsRef.current += 1;
            try {
                await refreshIdeas();
            } catch (_) { }
        }, delayMs);

        return () => {
            if (emptyFeedRetryTimerRef.current) {
                clearTimeout(emptyFeedRetryTimerRef.current);
                emptyFeedRetryTimerRef.current = null;
            }
        };
    }, [ideas.length, loading, isRetrying, refreshIdeas, viewMode]);

    useEffect(() => {
        if (!refreshIdeas) return;
        const refreshIfEmpty = () => {
            if (viewMode !== 'ideas') return;
            if (!Array.isArray(ideas) || ideas.length === 0) {
                refreshIdeas().catch(() => { });
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshIfEmpty();
            }
        };
        const onOnline = () => refreshIfEmpty();

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('online', onOnline);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('online', onOnline);
        };
    }, [ideas.length, refreshIdeas, viewMode]);

    // Scroll to start of tags when group changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    }, [activeGroup]);

    // Sorting Logic
    const getSortedIdeas = () => {
        let filtered = [...ideas];

        // SEARCH FILTER - takes precedence over all other filters
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(idea => {
                const searchFields = [
                    idea.title,
                    idea.problem,
                    idea.solution,
                    idea.utility,
                    idea.proposedChange,
                    idea.currentLaw,
                    idea.impact,
                    idea.body,
                    idea.author,
                    idea.type
                ].filter(Boolean).map(f => f.toLowerCase());

                return searchFields.some(field => field.includes(query));
            });
            // When searching, sort by relevance (title matches first, then by votes)
            return filtered.sort((a, b) => {
                const aTitle = (a.title || '').toLowerCase().includes(query);
                const bTitle = (b.title || '').toLowerCase().includes(query);
                if (aTitle && !bTitle) return -1;
                if (!aTitle && bTitle) return 1;
                return b.votes - a.votes;
            });
        }

        // 'For You' (Hot) Logic: Mocking "Top Ideas + Following"
        if (activeTab === 'hot') {
            // Blend momentum + recency so new ideas are still visible.
            return filtered.sort((a, b) => {
                const aVotes = Number(a?.votes || 0);
                const bVotes = Number(b?.votes || 0);
                const aTs = Number(a?.timestamp || 0);
                const bTs = Number(b?.timestamp || 0);
                const aScore = (aVotes * 3) + (aTs / 1e10);
                const bScore = (bVotes * 3) + (bTs / 1e10);
                return bScore - aScore;
            });
        }

        if (activeTab === 'following') {
            const savedSet = new Set((Array.isArray(savedIdeaIds) ? savedIdeaIds : []).map(v => String(v)));
            if (savedSet.size > 0) {
                return filtered
                    .filter((i) => savedSet.has(String(i.id)))
                    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
            }

            const followingSet = new Set(
                (Array.isArray(user?.following) ? user.following : []).map(v => String(v))
            );

            // Fallback 1: User follows no one -> Show Top Ideas as "Suggested"
            if (followingSet.size === 0) {
                return filtered
                    .sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0))
                    .slice(0, 10);
            }

            const followingFiltered = filtered.filter(i => {
                const authorId = i?.author_id ? String(i.author_id) : null;
                const authorProfile = allUsers.find(u => u.username === i.author);
                const authorProfileId = authorProfile?.id ? String(authorProfile.id) : null;
                return (authorId && followingSet.has(authorId)) || (authorProfileId && followingSet.has(authorProfileId));
            });

            // Fallback 2: Followed users have no content -> Show Top Ideas
            if (followingFiltered.length === 0) {
                return filtered
                    .sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0))
                    .slice(0, 10);
            }

            return followingFiltered.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
        }

        // 'Discover' Logic: Show everything else, sorted by newest
        if (activeTab === 'discover') {
            return filtered.sort((a, b) => b.timestamp - a.timestamp);
        }

        if (activeTab === 'groups') return []; // Handled separately

        // Filter by Category
        filtered = filtered.filter(i => i.type === activeTab);
        return filtered.sort((a, b) => b.votes - a.votes);
    };

    const sortedIdeas = getSortedIdeas();

    useEffect(() => {
        debugInfo('feed.state', 'Feed state changed', {
            activeTab,
            viewMode,
            ideas: Array.isArray(ideas) ? ideas.length : 0,
            discussions: Array.isArray(discussions) ? discussions.length : 0,
            selectedIdea: selectedIdea?.id || null,
            searchQueryLength: searchQuery.length,
        });
    }, [activeTab, viewMode, ideas.length, discussions.length, selectedIdea?.id, searchQuery.length]);

    // Force newly created idea to the top if it exists
    const displayIdeas = [...sortedIdeas];
    if (newlyCreatedIdeaId) {
        const newIdeaIndex = displayIdeas.findIndex(i => i.id === newlyCreatedIdeaId);
        if (newIdeaIndex > -1) {
            const [newIdea] = displayIdeas.splice(newIdeaIndex, 1);
            displayIdeas.unshift(newIdea);
        } else {
            // If sticking to filters (e.g. wrong category), we might not find it in 'filtered'.
            // For now, let's assume we want to see it regardless of filter:
            const newIdea = ideas.find(i => i.id === newlyCreatedIdeaId);
            if (newIdea) displayIdeas.unshift(newIdea);
        }
    }

    useEffect(() => {
        if (Array.isArray(displayIdeas) && displayIdeas.length > 0) {
            lastNonEmptyDisplayIdeasRef.current = displayIdeas;
        }
    }, [displayIdeas]);

    const ideasToRender = (Array.isArray(displayIdeas) && displayIdeas.length > 0)
        ? displayIdeas
        : (isLoading ? [] : (lastNonEmptyDisplayIdeasRef.current || []));

    // Effect to clear the "new idea" state after animation
    useEffect(() => {
        if (newlyCreatedIdeaId) {
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Clear after animation (1s)
            const timer = setTimeout(() => {
                clearNewIdeaId();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [newlyCreatedIdeaId]);

    // Show Categories/Tags on "For You" (hot) AND "Discover" AND Category Views
    // Logic: Always show unless on 'groups' tab
    const showCategories = activeTab !== 'groups';

    // Filter categories based on activeGroup
    const filteredCategories = activeGroup === 'All'
        ? CATEGORIES
        : CATEGORIES.filter(c => c.group === activeGroup);

    if (selectedIdea) {
        return (
            <div className="feed-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <IdeaDetails
                    idea={ideas.find(i => i.id === selectedIdea.id) || selectedIdea}
                    onClose={() => setSelectedIdea(null)}
                    initialView={initialDetailView}
                />
            </div>
        );
    }

    return (
        <div className="feed-container">
            <FeaturedIdea onOpen={handleIdeaOpen} />

            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', margin: '1rem 0 1rem 0', fontWeight: '800', color: 'var(--color-text-main)' }}>Idea Feed</h2>

            {/* Slightly Transparent Search Bubble - Moved Here */}
            {activeTab !== 'groups' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'var(--bg-pill)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '30px',
                        padding: '0.5rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: 'var(--shadow-soft)'
                    }}>
                        <span style={{ marginRight: '0.8rem', opacity: 0.6, fontSize: '1rem' }}>🔍</span>
                        <input
                            type="text"
                            name="feed_search"
                            placeholder="Search ideas, tags, or people..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.95rem',
                                color: 'var(--color-text-main)',
                                fontFamily: 'var(--font-main)',
                                caretColor: 'var(--color-text-main)'
                            }}
                            onFocus={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.boxShadow = 'none';
                            }}
                            onBlur={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>
            )}

            {/* HIGH LEVEL TABS */}
            <div className="feed-tabs feed-primary-tabs" style={{ paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem' }}>
                <button
                    className={`tab-btn feed-primary-tab hot ${activeTab === 'hot' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hot')}
                    style={activeTab === 'hot' ? {
                        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    <span className="feed-primary-tab-content">
                        <span className="feed-primary-tab-icon" aria-hidden="true"><FeedTabIcon type="hot" /></span>
                        <span>For You</span>
                    </span>
                </button>
                {user && (
                    <button
                        className={`tab-btn feed-primary-tab ${activeTab === 'following' ? 'active' : ''}`}
                        onClick={() => setActiveTab('following')}
                        style={activeTab === 'following' ? {
                            boxShadow: '0 4px 12px rgba(9, 132, 227, 0.3)',
                            transform: 'translateY(-2px)'
                        } : {}}
                    >
                        <span className="feed-primary-tab-content">
                            <span className="feed-primary-tab-icon" aria-hidden="true"><FeedTabIcon type="following" /></span>
                            <span>Following</span>
                        </span>
                    </button>
                )}
                <button
                    className={`tab-btn feed-primary-tab ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                    style={activeTab === 'discover' ? {
                        boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    <span className="feed-primary-tab-content">
                        <span className="feed-primary-tab-icon" aria-hidden="true"><FeedTabIcon type="discover" /></span>
                        <span>Discover</span>
                    </span>
                </button>
                <button
                    className={`tab-btn feed-primary-tab ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => {
                        setCurrentPage('groups');
                        setActiveTab('hot');
                    }}
                    style={activeTab === 'groups' ? {
                        boxShadow: '0 4px 12px rgba(0, 184, 148, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    <span className="feed-primary-tab-content">
                        <span className="feed-primary-tab-icon" aria-hidden="true"><FeedTabIcon type="clubs" /></span>
                        <span>Clubs</span>
                    </span>
                </button>
            </div>

            {/* EXPLORE NAVIGATION (Themes + Tags) - Visible on For You & Discover */}
            {showCategories && (
                <div style={{ marginBottom: '2rem' }}>

                    {/* Top Row: Themes */}
                    {activeTab === 'discover' && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {GROUPS.map(group => (
                                <button
                                    key={group}
                                    onClick={() => setActiveGroup(group)}
                                    style={{
                                        background: activeGroup === group ? 'var(--color-text-main)' : 'transparent',
                                        color: activeGroup === group ? 'white' : 'var(--color-text-muted)',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Bottom Row: Category Cloud (Wrapped) */}
                    {activeTab === 'discover' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', padding: '0 1rem' }}>
                            {filteredCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        background: activeTab === cat.id ? cat.color : 'white',
                                        color: activeTab === cat.id ? 'white' : 'var(--color-text-main)',
                                        border: activeTab === cat.id ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: '30px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.2s, background 0.2s',
                                        flexGrow: 1, // Make them fill space nicely
                                        maxWidth: '48%', // Roughly 2 per row on mobile
                                        justifyContent: 'center'
                                    }}
                                >
                                    <span>{cat.icon}</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{cat.label}</span>
                                </button>
                            ))}
                            {/* NEW: Category Request Button */}
                            <button
                                onClick={async () => {
                                    const name = prompt("Which category would you like to request?");
                                    if (!name || !name.trim()) return;
                                    const result = await requestCategory(name.trim());
                                    if (result?.success) alert("Category request submitted.");
                                    else alert(`Could not submit request: ${result?.reason || 'Unknown error'}`);
                                }}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    background: 'transparent',
                                    color: 'var(--color-text-muted)',
                                    border: '1px dashed var(--color-border)',
                                    borderRadius: '30px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexGrow: 1,
                                    maxWidth: '48%',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <span>+</span> Request
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'following' && (user?.following?.length ?? 0) === 0 && (savedIdeaIds?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '1rem', background: 'rgba(9, 132, 227, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                    <b>You have no saved or followed ideas yet.</b> Save ideas or follow creators to personalize this tab.
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>

                {/* 1. IDEA / DISCUSSION LIST */}
                <div className="feed-list">
                    {activeTab === 'groups' ? (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                            <h3 style={{ marginTop: 0 }}>Clubs moved to the dedicated Clubs page.</h3>
                            <button
                                onClick={() => setCurrentPage('groups')}
                                style={{ border: 'none', borderRadius: '999px', padding: '0.8rem 1.2rem', fontWeight: 'bold', cursor: 'pointer', background: 'var(--color-primary)', color: 'white' }}
                            >
                                Open Clubs
                            </button>
                        </div>
                    ) : isLoading ? (
                        // Skeleton
                        [1, 2, 3].map(i => (
                            <div key={i} className="card" style={{ height: '200px' }}>
                                <div className="skeleton" style={{ width: '20%', height: '20px', marginBottom: '1rem' }}></div>
                                <div className="skeleton" style={{ width: '60%', height: '30px', marginBottom: '1rem' }}></div>
                                <div className="skeleton" style={{ width: '100%', height: '15px', marginBottom: '0.5rem' }}></div>
                            </div>
                        ))
                    ) : viewMode === 'discussions' ? (
                        // DISCUSSION BOARD VIEW
                        <div style={{ gridColumn: '1 / -1', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>{activeTab === 'hot' ? 'Trending' : activeTab} Threads</h3>
                                <button
                                    onClick={async () => {
                                        if (!user) return alert('Please log in to start a thread.');
                                        const title = prompt('Thread title:');
                                        if (!title || !title.trim()) return;
                                        const body = prompt('Thread details:') || '';
                                        const category = activeTab === 'hot' || activeTab === 'discover' ? 'general' : activeTab;
                                        const created = await addDiscussion({ title: title.trim(), body, category });
                                        if (created?.id) {
                                            setDiscussions((prev) => [created, ...(Array.isArray(prev) ? prev.filter((d) => d.id !== created.id) : [])]);
                                        }
                                        setTimeout(async () => {
                                            const rows = await getDiscussions(category === 'general' ? 'all' : category);
                                            setDiscussions(Array.isArray(rows) ? rows : []);
                                        }, 900);
                                    }}
                                    style={{ background: 'var(--color-secondary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    + New Thread
                                </button>
                            </div>

                            {discussions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <p>No discussions yet in {activeTab}. Start one!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {discussions.map(thread => (
                                        <DiscussionCard
                                            key={thread.id}
                                            thread={thread}
                                            voteDiscussion={voteDiscussion}
                                            votedDiscussionIds={votedDiscussionIds}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // IDEAS VIEW
                        <>
                            {/* Ensure unique ideas only */}
                            {Array.from(new Map(ideasToRender.map(item => [item.id, item])).values())
                                .slice(0, visibleCount) // Pagination slice
                                .map((idea, index) => (
                                    <div key={idea.id} className={idea.id === newlyCreatedIdeaId ? 'slide-in-new' : ''}>
                                        <IdeaCard
                                            idea={{ ...idea, isOracle: idea.conviction > 1000 }}
                                            rank={index + 1}
                                            onOpen={handleIdeaOpen}
                                        />
                                    </div>
                                ))}

                            {ideasToRender.length === 0 && (
                                isLoading ? (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
                                        <div className="spinner" style={{
                                            width: '40px', height: '40px',
                                            border: '4px solid var(--color-border)',
                                            borderTop: '4px solid var(--color-primary)',
                                            borderRadius: '50%',
                                            margin: '0 auto 1rem auto',
                                            animation: 'spin 1s linear infinite'
                                        }}></div>
                                        <p style={{ color: 'var(--color-text-muted)' }}>Fetching latest ideas...</p>
                                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                    </div>
                                ) : (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                                        <h3>No ideas found here yet.</h3>
                                        <p>Be the first to submit one or check your connection!</p>
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                                            <button
                                                onClick={handleRetry}
                                                disabled={isRetrying}
                                                style={{
                                                    padding: '0.6rem 1.2rem',
                                                    cursor: isRetrying ? 'wait' : 'pointer',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    opacity: isRetrying ? 0.7 : 1
                                                }}
                                            >
                                                {isRetrying ? 'Retrying...' : '🔄 Retry Fetch'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}

                            {ideasToRender.length > visibleCount && (
                                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 15)}
                                        style={{
                                            padding: '1rem 3rem',
                                            background: 'var(--bg-panel)',
                                            color: 'var(--color-text-main)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '30px',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                            transition: 'all 0.2s'
                                        }}
                                        className="card-hover"
                                    >
                                        Load More Ideas
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>



            {/* 2. PEOPLE FEED SECTION - REMOVED */}

            {
                selectedIdea && (
                    <IdeaDetails
                        idea={selectedIdea}
                        onClose={() => setSelectedIdea(null)}
                    />
                )
            }
        </div >
    );
};

const DiscussionCard = ({ thread, voteDiscussion, votedDiscussionIds }) => {
    const { getUser, setSelectedDiscussion } = useAppContext();
    const [authorProfile, setAuthorProfile] = useState(null);

    const isVoted = votedDiscussionIds.includes(thread.id);
    const typeColor = CATEGORIES.find(c => c.id === thread.category)?.color || '#636e72';

    // [CACHE] Fetch Author Profile
    useEffect(() => {
        let active = true;
        if (getUser && thread.author_id) {
            getUser(thread.author_id).then(p => {
                if (active && p) setAuthorProfile(p);
            });
        }
        return () => { active = false; };
    }, [thread, getUser]);

    const displayAuthor = authorProfile ? authorProfile.username : thread.author;
    const displayAvatar = authorProfile ? authorProfile.avatar : (thread.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor)}&background=random`);

    return (
        <div
            onClick={() => {
                setSelectedDiscussion(thread);
            }}
            className="card-hover"
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: typeColor }}></div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f2f6', overflow: 'hidden' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{displayAuthor}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>2h ago</span>
                    </div>
                </div>
                <span style={{
                    fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase',
                    background: `color-mix(in srgb, ${typeColor}, transparent 90%)`,
                    color: typeColor,
                    padding: '4px 8px', borderRadius: '4px'
                }}>
                    {thread.category || 'General'}
                </span>
            </div>

            {/* Title */}
            <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', color: 'var(--color-text-main)', lineHeight: '1.4' }}>{thread.title}</h4>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #f5f5f5', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {/* Vote */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#f8f9fa', padding: '4px 8px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); voteDiscussion(thread.id, 'up'); }}
                            style={{
                                background: isVoted ? 'var(--color-primary)' : 'transparent',
                                color: isVoted ? 'white' : 'var(--color-text-muted)',
                                border: '1px solid transparent',
                                borderRadius: '50%',
                                width: '24px', height: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.9rem', padding: 0,
                                transition: 'all 0.2s'
                            }}
                        >▲</button>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isVoted ? 'var(--color-primary)' : 'var(--color-text-main)', minWidth: '16px', textAlign: 'center' }}>
                            {thread.votes}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); voteDiscussion(thread.id, 'down'); }}
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

                    {/* Comments */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        {thread.comments}
                    </div>
                </div>

                <button
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/discussion/${thread.id}`;
                        navigator.clipboard.writeText(url).then(() => {
                            alert('🔗 Link copied to clipboard!');
                        }).catch(() => {
                            alert(`Share this discussion: ${thread.title}`);
                        });
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share
                </button>
            </div>
        </div>
    );
};

export default Feed;
