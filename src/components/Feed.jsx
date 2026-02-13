import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import IdeaCard from './IdeaCard';
import IdeaDetails from './IdeaDetails';
import FeaturedIdea from './FeaturedIdea';
import GroupDetails from './GroupDetails';
import WorldMap from './WorldMap';
import IdeaGlobe from './IdeaGlobe';
import { CATEGORIES } from '../data/categories';
import RecommendedFollowers from './RecommendedFollowers';
import { debugInfo } from '../debug/runtimeDebug';
// Stories moved to messaging only


const GROUPS = ['All', 'Society', 'Creative', 'Business', 'Tech', 'Lifestyle'];

const Feed = () => {
    const { user, ideas, getDiscussions, addDiscussion, requestCategory, newlyCreatedIdeaId, clearNewIdeaId, selectedIdea, setSelectedIdea, getAllBounties, saveBounty, savedBountyIds, voteDiscussion, votedDiscussionIds, incrementIdeaViews } = useAppContext();
    const [activeTab, setActiveTab] = useState('hot'); // 'hot', 'following', 'discover', 'groups', or categoryID
    const [activeGroup, setActiveGroup] = useState('All'); // For Category filtering
    const [selectedGroup, setSelectedGroup] = useState(null); // New state for Group Command Center
    const [initialDetailView, setInitialDetailView] = useState('details'); // New State
    const [searchQuery, setSearchQuery] = useState(''); // Search functionality
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('ideas'); // 'ideas' | 'discussions' | 'bounties'
    const [bounties, setBounties] = useState([]);
    const [discussions, setDiscussions] = useState([]);
    const [visibleCount, setVisibleCount] = useState(15);

    useEffect(() => {
        debugInfo('feed', 'Feed mounted');
        return () => debugInfo('feed', 'Feed unmounted');
    }, []);

    useEffect(() => {
        let active = true;
        const loadBounties = async () => {
            if (viewMode !== 'bounties') return;
            const rows = await getAllBounties();
            if (active) setBounties(Array.isArray(rows) ? rows : []);
        };
        loadBounties();
        return () => { active = false; };
    }, [viewMode, getAllBounties, savedBountyIds]); // Reload if saved changes (or handled manually)

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

    const handleSaveBounty = (e, bountyId) => {
        e.stopPropagation();
        saveBounty(bountyId);
    };

    const scrollContainerRef = useRef(null);

    const handleIdeaOpen = (idea, view = 'details') => {
        setSelectedIdea(idea);
        setInitialDetailView(view);
        incrementIdeaViews(idea?.id);
    };

    // Fake Loading effect for Skeleton Demo
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, [activeTab, viewMode]);

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
            const followingSet = new Set(
                (Array.isArray(user?.following) ? user.following : []).map(v => String(v))
            );
            if (followingSet.size === 0) return [];
            filtered = filtered.filter(i => {
                const authorId = i?.author_id ? String(i.author_id) : null;
                const authorProfile = allUsers.find(u => u.username === i.author);
                const authorProfileId = authorProfile?.id ? String(authorProfile.id) : null;
                return (authorId && followingSet.has(authorId)) || (authorProfileId && followingSet.has(authorProfileId));
            });
            return filtered.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
        }

        // 'Discover' Logic: Show everything else, sorted by newest
        if (activeTab === 'discover') {
            return filtered.sort((a, b) => b.timestamp - a.timestamp);
        }

        if (activeTab === 'groups') return []; // Handled separately

        if (activeTab === 'map') {
            return filtered.filter(i => i.isLocal).sort((a, b) => b.votes - a.votes);
        }

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
            bounties: Array.isArray(bounties) ? bounties.length : 0,
            selectedIdea: selectedIdea?.id || null,
            searchQueryLength: searchQuery.length,
        });
    }, [activeTab, viewMode, ideas.length, discussions.length, bounties.length, selectedIdea?.id, searchQuery.length]);

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

    // Mock Data for New Sections
    const groups = [
        { name: "Purple Orb Collective", icon: "🔮", color: "#8e44ad", members: 120 },
        { name: "Free Gardens of America", icon: "☀️", color: "#f39c12", members: 840 },
        { name: "Green Logic", icon: "🏠", color: "#2ecc71", members: 450 },
        { name: "Pixel Guild", icon: "👾", color: "#3498db", members: 600 },
    ];

    const talent = [
        { name: "SarahJ", role: "Mycology", icon: "🍄", influence: 850 },
        { name: "DevMike", role: "Game Dev", icon: "👾", influence: 1200 },
        { name: "PolicyWonk", role: "Legal", icon: "⚖️", influence: 940 },
    ];

    const sparkStream = [
        { user: "EcoWarrior", text: "Is aquaponics viable for high-rise condos without balcony reinforcements?", replies: 12 },
        { user: "PixelArtist", text: "Need a pixel shader expert for the zoning sim lighting engine.", replies: 5 },
        { user: "CivicMind", text: "Drafting a proposal for noise pollution taxes in downtown zones.", replies: 8 },
    ];

    // Show Categories/Tags on "For You" (hot) AND "Discover" AND Category Views
    // Logic: Always show unless on 'groups' tab
    const showCategories = activeTab !== 'groups' && activeTab !== 'map';

    // Filter categories based on activeGroup
    const filteredCategories = activeGroup === 'All'
        ? CATEGORIES
        : CATEGORIES.filter(c => c.group === activeGroup);

    // FULL PAGE GROUP VIEW
    if (selectedGroup) {
        return (
            <div className="feed-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <GroupDetails
                    group={selectedGroup}
                    onBack={() => setSelectedGroup(null)}
                />
            </div>
        );
    }

    if (selectedIdea) {
        return (
            <div className="feed-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <IdeaDetails
                    idea={ideas.find(i => i.id === selectedIdea.id) || selectedIdea}
                    onBack={() => setSelectedIdea(null)}
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
            <div className="feed-tabs" style={{ paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem' }}>
                <button
                    className={`tab-btn hot ${activeTab === 'hot' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hot')}
                    style={activeTab === 'hot' ? {
                        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    🔥 For You
                </button>
                <button
                    className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
                    onClick={() => setActiveTab('following')}
                    style={activeTab === 'following' ? {
                        boxShadow: '0 4px 12px rgba(9, 132, 227, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    👤 Following
                </button>
                <button
                    className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                    style={activeTab === 'discover' ? {
                        boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    🔭 Discover
                </button>
                <button
                    className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groups')}
                    style={activeTab === 'groups' ? {
                        boxShadow: '0 4px 12px rgba(0, 184, 148, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    🏛️ Groups
                </button>
                <button
                    className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                    onClick={() => setActiveTab('map')}
                    style={activeTab === 'map' ? {
                        boxShadow: '0 4px 12px rgba(253, 203, 110, 0.3)',
                        transform: 'translateY(-2px)'
                    } : {}}
                >
                    🌍 Map
                </button>
            </div>



            {/* WORLD MAP - Replaced by IdeaGlobe below */}
            {activeTab === 'map' && (
                <div style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {/* Placeholder or Tip if needed, otherwise empty as Globe is main view */}
                </div>
            )}

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



            {/* View Mode Toggle (Ideas vs Discussions) - Hidden on Groups tab */}
            {activeTab !== 'groups' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'var(--bg-pill)',
                        padding: '0.3rem',
                        borderRadius: '30px',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        boxShadow: 'var(--shadow-soft)'
                    }}>
                        <button
                            onClick={() => setViewMode('ideas')}
                            onMouseEnter={(e) => {
                                if (viewMode !== 'ideas') {
                                    e.currentTarget.style.background = 'var(--bg-pill-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (viewMode !== 'ideas') {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                            style={{
                                padding: '0.5rem 1.5rem',
                                border: 'none',
                                borderRadius: '25px',
                                background: viewMode === 'ideas' ? 'var(--bg-surface)' : 'transparent',
                                color: viewMode === 'ideas' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: viewMode === 'ideas' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>💡</span>
                            Ideas
                        </button>
                        <button
                            onClick={() => setViewMode('discussions')}
                            onMouseEnter={(e) => {
                                if (viewMode !== 'discussions') {
                                    e.currentTarget.style.background = 'var(--bg-pill-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (viewMode !== 'discussions') {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                            style={{
                                padding: '0.5rem 1.5rem',
                                border: 'none',
                                borderRadius: '25px',
                                background: viewMode === 'discussions' ? 'var(--bg-surface)' : 'transparent',
                                color: viewMode === 'discussions' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: viewMode === 'discussions' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>💬</span>
                            Discussions
                        </button>
                        <button
                            onClick={() => setViewMode('bounties')}
                            onMouseEnter={(e) => { if (viewMode !== 'bounties') e.currentTarget.style.background = 'var(--bg-pill-hover)'; }}
                            onMouseLeave={(e) => { if (viewMode !== 'bounties') e.currentTarget.style.background = 'transparent'; }}
                            style={{
                                padding: '0.5rem 1.5rem',
                                border: 'none',
                                borderRadius: '25px',
                                background: viewMode === 'bounties' ? 'var(--bg-surface)' : 'transparent',
                                color: viewMode === 'bounties' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: viewMode === 'bounties' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>💰</span>
                            Bounties
                        </button>
                    </div>
                </div>
            )}



            {/* FRESH ACCOUNT ONBOARDING: Recommended Followers */}
            {activeTab === 'hot' && (user?.following?.length ?? 0) <= 1 && (
                <RecommendedFollowers />
            )}

            {activeTab === 'following' && (user?.following?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Follow creators to personalize this tab.
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>

                {/* 1. IDEA / DISCUSSION LIST */}
                <div className="feed-list">
                    {activeTab === 'groups' ? (
                        <div className="groups-container" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                            {groups.map((group, i) => (
                                <div key={i} className="card" style={{
                                    padding: '0',
                                    border: 'none',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{
                                        height: '80px',
                                        background: `linear-gradient(135deg, ${group.color}, #2c3e50)`,
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-30px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '60px',
                                            height: '60px',
                                            background: 'white',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.8rem',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                        }}>
                                            {group.icon}
                                        </div>
                                    </div>
                                    <div style={{ padding: '2.5rem 1.5rem 1.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>{group.name}</h3>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                                            {group.members} Members • Verified
                                        </div>
                                        <div style={{ marginTop: 'auto', width: '100%' }}>
                                            <button
                                                onClick={() => setSelectedGroup(group)}
                                                style={{
                                                    background: group.color,
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '25px',
                                                    padding: '0.8rem 2rem',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    width: '100%',
                                                    fontSize: '1rem',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                Join as Guest
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div
                                className="card"
                                onClick={() => {
                                    const name = prompt('Enter group name:');
                                    if (name && name.trim()) {
                                        alert(`🎉 Group "${name}" created! Invite others to join.`);
                                    }
                                }}
                                style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(108, 92, 231, 0.05)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>+ Create Group</h3>
                                    <p className="text-dim">Gather like minds.</p>
                                </div>
                            </div>
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
                                        await addDiscussion({ title: title.trim(), body, category });
                                        const rows = await getDiscussions(category === 'general' ? 'all' : category);
                                        setDiscussions(Array.isArray(rows) ? rows : []);
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
                                    {discussions.map(thread => {
                                        const isVoted = (votedDiscussionIds || []).includes(thread.id);
                                        const colors = {
                                            policy: '#efaa8d', invention: '#95afc0', infrastructure: '#f7b731',
                                            entertainment: '#a55eea', ecology: '#2bcbba', education: '#4b7bec', default: '#3498db'
                                        };
                                        const typeColor = colors[(thread.category || 'default').toLowerCase()] || colors.default;

                                        return (
                                            <div key={thread.id} className="card-hover" style={{
                                                padding: '1.5rem',
                                                background: 'white',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(0,0,0,0.05)',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                            }}>
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: typeColor }}></div>

                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                        <div style={{ width: '32px', height: '32px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{thread.author}</span>
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
                                    })}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'map' ? (
                        // 3D GLOBE VIEW
                        <div style={{ gridColumn: '1 / -1', minHeight: '600px' }}>
                            <IdeaGlobe onSelectIdea={setSelectedIdea} />
                        </div>

                    ) : viewMode === 'bounties' ? (
                        // BOUNTIES VIEW
                        <div style={{ gridColumn: '1 / -1', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                            <div style={{ background: 'linear-gradient(135deg, #FF9F43, #ff6b6b)', padding: '2rem', borderRadius: '20px', color: 'white', marginBottom: '2rem', boxShadow: '0 10px 20px rgba(255, 107, 107, 0.2)' }}>
                                <h2 style={{ margin: '0 0 0.5rem 0' }}>Active Bounties</h2>
                                <p style={{ margin: 0, opacity: 0.9 }}>Solve requests, earn cash & coins.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {bounties.map(bounty => {
                                    const isSaved = savedBountyIds.includes(bounty.id);
                                    return (
                                        <div key={bounty.id} className="card-hover" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ fontSize: '2rem', background: '#fff0d4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                🎯
                                            </div>
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', alignItems: 'center' }}>
                                                    <span style={{
                                                        background: bounty.status === 'open' ? '#e0ffe0' : '#fee',
                                                        color: bounty.status === 'open' ? '#00b894' : '#d63031',
                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                                    }}>{bounty.status}</span>
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>• Posted by {bounty.creator}</span>
                                                </div>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{bounty.title}</h4>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{bounty.description}</p>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#e58e26' }}>${bounty.rewardCash ? bounty.rewardCash.toFixed(2) : '0.00'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>+ {bounty.rewardCoins} Coins</div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={(e) => handleSaveBounty(e, bounty.id)}
                                                        style={{
                                                            padding: '0.5rem',
                                                            background: isSaved ? '#ffeaa7' : 'rgba(0,0,0,0.05)',
                                                            color: isSaved ? '#d35400' : 'var(--color-text-muted)',
                                                            border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title={isSaved ? "Unsave Bounty" : "Save Bounty"}
                                                    >
                                                        {isSaved ? '★' : '☆'} <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{bounty.savedCount || 0}</span>
                                                    </button>
                                                    <button style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        {bounty.status === 'open' ? 'Claim' : 'View'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {bounties.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic' }}>No active bounties available at the moment.</div>}
                            </div>
                        </div>
                    ) : (
                        // IDEAS VIEW
                        <>
                            {/* Fresh Pulse Banner ONLY in Discover Tab */}
                            {activeTab === 'discover' && (
                                <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, #00b894, #00cec9)', borderRadius: '16px', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 10px 20px rgba(0, 184, 148, 0.2)' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.8rem', background: 'rgba(0,0,0,0.2)', width: 'fit-content', padding: '4px 10px', borderRadius: '20px' }}>Fresh Pulse Strategy</div>
                                        <h3 style={{ fontSize: '1.8rem', margin: 0, marginBottom: '0.5rem' }}>Decentralized Water Purification</h3>
                                        <p style={{ margin: 0, opacity: 0.95, lineHeight: '1.4' }}>A new method for localized greywater treatment using bio-filters. Needs <b>Civil Engineers</b>.</p>
                                    </div>
                                    <button onClick={() => alert("Boosting visibility!")} style={{ background: 'white', color: '#00b894', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>Boost Visibility 🚀</button>
                                </div>
                            )}

                            {/* Ensure unique ideas only */}
                            {Array.from(new Map(displayIdeas.map(item => [item.id, item])).values())
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

                            {displayIdeas.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
                                    Nothing here yet.
                                </div>
                            )}

                            {displayIdeas.length > visibleCount && (
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

export default Feed;
