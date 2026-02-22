import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import IdeaCard from './IdeaCard';

const CLUB_QUICK_OPEN_KEY = 'woi_open_club_id';
const DETAIL_TABS = [
    { id: 'discussion_boards', label: 'Discussion Boards' },
    { id: 'idea_lists', label: 'Idea Lists' },
    { id: 'wiki', label: 'Wiki' },
    { id: 'live_chat', label: 'Live Chat' },
    { id: 'members_list', label: 'Members List' },
    { id: 'roles', label: 'Roles' }
];

const ROLE_OPTIONS = ['leader', 'moderator', 'member'];
const CLUB_CATEGORY_FILTERS = [
    'All',
    'Technology',
    'Health',
    'Education',
    'Environment',
    'Business',
    'Creative',
    'Community'
];
const CLUB_CATEGORY_COLORS = {
    All: '#636e72',
    Technology: '#0984e3',
    Health: '#e74c3c',
    Education: '#6c5ce7',
    Environment: '#00b894',
    Business: '#f39c12',
    Creative: '#e84393',
    Community: '#2d3436'
};
const CLUB_CATEGORY_KEYWORDS = {
    Technology: ['tech', 'ai', 'software', 'app', 'engineering', 'robot', 'data', 'code'],
    Health: ['health', 'medical', 'wellness', 'fitness', 'care', 'hospital', 'therapy'],
    Education: ['education', 'learning', 'school', 'mentor', 'teaching', 'academy'],
    Environment: ['climate', 'ecology', 'sustain', 'green', 'nature', 'environment', 'conservation'],
    Business: ['business', 'startup', 'finance', 'market', 'founder', 'venture', 'growth'],
    Creative: ['art', 'music', 'design', 'film', 'creative', 'media', 'story'],
    Community: ['community', 'social', 'civic', 'local', 'volunteer', 'public']
};
const CLUB_EMOJI_OPTIONS = ['🏠', '🚀', '💡', '🌍', '🧠', '⚙️', '🎨', '🏥', '📚', '🌱', '🏛️', '🤝', '🎯'];

const inferClubCategories = (club) => {
    const text = `${club?.name || ''} ${club?.description || ''}`.toLowerCase();
    const tags = [];
    for (const [category, keywords] of Object.entries(CLUB_CATEGORY_KEYWORDS)) {
        if (keywords.some((keyword) => text.includes(keyword))) tags.push(category);
    }
    const explicitTagMatch = String(club?.description || '').match(/\[category:([^\]]+)\]/i);
    if (explicitTagMatch?.[1]) {
        const explicit = explicitTagMatch[1].trim();
        if (explicit) tags.unshift(explicit);
    }
    return Array.from(new Set(tags)).slice(0, 3).length > 0
        ? Array.from(new Set(tags)).slice(0, 3)
        : ['Community'];
};

const cleanClubDescription = (club) => String(club?.description || '')
    .replace(/\[category:[^\]]+\]/ig, '')
    .replace(/\[emoji:[^\]]+\]/ig, '')
    .trim();
const getClubEmoji = (club) => {
    const fromBadge = String(club?.badge || '').trim();
    if (fromBadge) return fromBadge;
    const match = String(club?.description || '').match(/\[emoji:([^\]]+)\]/i);
    return match?.[1]?.trim() || '🏠';
};
const roleLabel = (role) => {
    const normalized = String(role || 'member').toLowerCase();
    if (normalized === 'leader') return 'Admin';
    if (normalized === 'moderator') return 'Moderator';
    return 'Member';
};

const GroupsPage = () => {
    const {
        getGroups, createGroup, joinGroup, leaveGroup,
        getGroupPosts, addGroupPost,
        getGroupChat, sendGroupChat,
        getGroupWiki, saveGroupWiki,
        getGroupMembersDetailed, setGroupMemberRole,
        user, viewProfile, ideas, allUsers, setSelectedIdea, setCurrentPage, setIsFormOpen, setDraftData, setDraftTitle
    } = useAppContext();

    const [clubs, setClubs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeClub, setActiveClub] = useState(null);
    const [activeTab, setActiveTab] = useState('discussion_boards');

    const [posts, setPosts] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [wikiContent, setWikiContent] = useState('');
    const [wikiSaving, setWikiSaving] = useState(false);
    const [membersDetailed, setMembersDetailed] = useState([]);

    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostBody, setNewPostBody] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newClubName, setNewClubName] = useState('');
    const [newClubDescription, setNewClubDescription] = useState('');
    const [newClubCategory, setNewClubCategory] = useState('Community');
    const [newClubEmoji, setNewClubEmoji] = useState('🏠');
    const [inviteInput, setInviteInput] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const selectedCategoryColor = CLUB_CATEGORY_COLORS[newClubCategory] || '#7d5fff';

    const isMember = (club) => (club?.members || []).includes(user?.id);
    const isLeader = activeClub?.leader_id && activeClub.leader_id === user?.id;
    const myActiveClubRole = useMemo(() => {
        if (!user?.id || !Array.isArray(membersDetailed)) return 'member';
        return membersDetailed.find((m) => m.id === user.id)?.role || 'member';
    }, [membersDetailed, user?.id]);
    const canModerateClub = isLeader || myActiveClubRole === 'moderator';

    const loadClubs = async () => {
        setIsLoading(true);
        const data = await getGroups();
        setClubs(Array.isArray(data) ? data : []);
        setIsLoading(false);
    };

    useEffect(() => {
        void loadClubs();
    }, []);

    useEffect(() => {
        if (!clubs.length || activeClub) return;
        if (localStorage.getItem('woi_open_club_create') === '1') {
            localStorage.removeItem('woi_open_club_create');
            setShowCreateForm(true);
            return;
        }
        const quickOpen = localStorage.getItem(CLUB_QUICK_OPEN_KEY);
        if (!quickOpen) return;
        const club = clubs.find(c => c.id === quickOpen);
        localStorage.removeItem(CLUB_QUICK_OPEN_KEY);
        if (club) void openClub(club);
    }, [clubs, activeClub]);

    const loadClubData = async (clubId) => {
        const [postRows, chatRows, wikiRow, detailedMembers] = await Promise.all([
            getGroupPosts(clubId),
            getGroupChat(clubId),
            getGroupWiki(clubId),
            getGroupMembersDetailed ? getGroupMembersDetailed(clubId) : Promise.resolve([])
        ]);
        setPosts(Array.isArray(postRows) ? postRows : []);
        setChatMessages(Array.isArray(chatRows) ? chatRows : []);
        setWikiContent(wikiRow?.content || '');
        setMembersDetailed(Array.isArray(detailedMembers) ? detailedMembers : []);
    };

    const openClub = async (club, tab = 'discussion_boards') => {
        setActiveClub(club);
        setActiveTab(tab);
        await loadClubData(club.id);
    };

    useEffect(() => {
        let interval;
        if (activeClub && activeTab === 'live_chat') {
            interval = setInterval(async () => {
                const rows = await getGroupChat(activeClub.id);
                setChatMessages(Array.isArray(rows) ? rows : []);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [activeClub, activeTab, getGroupChat]);

    const joinedClubs = useMemo(() => clubs.filter(c => isMember(c)), [clubs, user]);
    const matchedInviteUsers = useMemo(() => {
        const inviteTokens = inviteInput
            .split(',')
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean);
        if (inviteTokens.length === 0) return [];
        return (allUsers || []).filter((person) => {
            if (!person?.id || person.id === user?.id) return false;
            const username = String(person.username || '').trim().toLowerCase();
            const displayName = String(person.display_name || person.displayName || '').trim().toLowerCase();
            const email = String(person.email || '').trim().toLowerCase();
            return inviteTokens.some((token) => token === username || token === displayName || token === email);
        });
    }, [inviteInput, allUsers, user?.id]);

    const filteredClubs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return clubs
            .filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
            .filter((c) => {
                if (activeCategory === 'All') return true;
                const categories = inferClubCategories(c);
                return categories.includes(activeCategory);
            })
            .sort((a, b) => {
                const aMine = isMember(a) ? 1 : 0;
                const bMine = isMember(b) ? 1 : 0;
                if (aMine !== bMine) return bMine - aMine;
                return (b.memberCount || 0) - (a.memberCount || 0);
            });
    }, [clubs, searchTerm, user, activeCategory]);

    const clubIdeas = useMemo(() => {
        if (!activeClub) return [];
        const clubName = String(activeClub.name || '').trim().toLowerCase();
        const clubTag = `club:${String(activeClub.id)}`;
        return (ideas || []).filter((idea) => {
            const tags = Array.isArray(idea?.tags) ? idea.tags.map((t) => String(t || '').toLowerCase()) : [];
            const group = String(idea?.group || '').trim().toLowerCase();
            const clan = String(idea?.clan || '').trim().toLowerCase();
            return tags.includes(clubTag.toLowerCase()) || (!!clubName && (group === clubName || clan === clubName));
        });
    }, [ideas, activeClub]);

    const handleJoin = async (clubId) => {
        if (!user) return alert('Sign up or log in to join clubs.');
        const result = await joinGroup(clubId, user.id);
        if (!result.success) return alert(result.reason || 'Could not join club');
        await loadClubs();
        if (activeClub?.id === clubId) {
            const refreshed = (await getGroups()).find(g => g.id === clubId);
            if (refreshed) setActiveClub(refreshed);
            await loadClubData(clubId);
        }
    };

    const handleLeave = async (clubId) => {
        if (!user) return;
        const result = await leaveGroup(clubId, user.id);
        if (!result.success) return alert(result.reason || 'Could not leave club');
        await loadClubs();
        if (activeClub?.id === clubId) setActiveClub(null);
    };

    const handleCreateClub = async () => {
        if (!user) return alert('Sign up or log in to create clubs.');
        if (!newClubName.trim()) return alert('Club name is required.');
        const matchedInviteIds = Array.from(new Set((matchedInviteUsers || []).map((person) => person.id)));
        const result = await createGroup({
            name: newClubName.trim(),
            description: `${newClubDescription.trim()} [category:${newClubCategory}] [emoji:${newClubEmoji}]`.trim(),
            banner_url: null,
            color: selectedCategoryColor,
            badge: newClubEmoji || '🏠',
            category: newClubCategory,
            initialMemberIds: matchedInviteIds
        });
        if (!result.success) return alert(result.reason || 'Could not create club');
        setNewClubName('');
        setNewClubDescription('');
        setNewClubCategory('Community');
        setNewClubEmoji('🏠');
        setInviteInput('');
        setShowCreateForm(false);
        await loadClubs();
        const created = (await getGroups()).find(c => c.id === result.group.id);
        if (created) await openClub(created);
    };

    const handlePostForum = async () => {
        if (!activeClub || !isMember(activeClub)) return;
        if (!newPostTitle.trim() || !newPostBody.trim()) return;
        const result = await addGroupPost(activeClub.id, newPostTitle.trim(), newPostBody.trim());
        if (!result.success) return alert(result.reason || 'Could not post');
        setNewPostTitle('');
        setNewPostBody('');
        const rows = await getGroupPosts(activeClub.id);
        setPosts(Array.isArray(rows) ? rows : []);
    };

    const handleSendChat = async (e) => {
        e.preventDefault();
        if (!activeClub || !isMember(activeClub) || !chatInput.trim()) return;
        const result = await sendGroupChat(activeClub.id, chatInput.trim());
        if (!result.success) return alert(result.reason || 'Could not send message');
        setChatInput('');
        const rows = await getGroupChat(activeClub.id);
        setChatMessages(Array.isArray(rows) ? rows : []);
    };

    const handleSaveWiki = async () => {
        if (!activeClub || !isMember(activeClub)) return;
        setWikiSaving(true);
        const result = await saveGroupWiki(activeClub.id, wikiContent);
        setWikiSaving(false);
        if (!result.success) alert(result.reason || 'Could not save wiki');
    };

    const handlePromoteRole = async (memberId, nextRole) => {
        if (!activeClub || !isLeader || !setGroupMemberRole) return;
        setIsUpdatingRole(true);
        const result = await setGroupMemberRole(activeClub.id, memberId, nextRole);
        setIsUpdatingRole(false);
        if (!result.success) return alert(result.reason || 'Could not update role');
        const detailed = await getGroupMembersDetailed(activeClub.id);
        setMembersDetailed(Array.isArray(detailed) ? detailed : []);
    };

    const handleCreateClubIdea = () => {
        if (!activeClub) return;
        const clubTag = `club:${String(activeClub.id)}`;
        setDraftTitle('');
        setDraftData({
            tags: [clubTag],
            body: '',
            subtitle: '',
            title: '',
            categories: ['invention']
        });
        setCurrentPage('home');
        setIsFormOpen(true);
    };

    if (activeClub) {
        const member = isMember(activeClub);
        return (
            <div className="feed-container clubs-layout">
                <button onClick={() => setActiveClub(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>
                    Back to Clubs
                </button>

                <div className="clubs-detail-shell" style={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${activeClub.color}66`, background: 'var(--bg-panel)' }}>
                    <div style={{ padding: '1.2rem 1.3rem', borderBottom: '1px solid var(--color-border)', background: `linear-gradient(135deg, ${activeClub.color}22, transparent)` }}>
                        <h2 style={{ margin: 0 }}>{getClubEmoji(activeClub)} {activeClub.name}</h2>
                        <p style={{ margin: '0.4rem 0 0 0', color: 'var(--color-text-muted)' }}>{cleanClubDescription(activeClub) || 'No description yet.'}</p>
                        <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {inferClubCategories(activeClub).map((cat) => (
                                <span key={`${activeClub.id}-${cat}`} style={{ padding: '0.2rem 0.55rem', borderRadius: '999px', border: '1px solid var(--color-border)', background: `${CLUB_CATEGORY_COLORS[cat] || '#636e72'}22`, fontSize: '0.72rem', fontWeight: 700, color: CLUB_CATEGORY_COLORS[cat] || 'var(--color-text-muted)' }}>
                                    {cat}
                                </span>
                            ))}
                        </div>
                        <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{activeClub.memberCount || 0} members</div>
                    </div>

                    <div style={{ padding: '0.65rem 0.9rem', display: 'flex', gap: '0.45rem', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
                        {DETAIL_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="action-btn"
                                style={{
                                    whiteSpace: 'nowrap',
                                    borderColor: activeTab === tab.id ? activeClub.color : 'var(--color-border)',
                                    background: activeTab === tab.id ? `${activeClub.color}22` : 'transparent'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <div style={{ marginLeft: 'auto' }}>
                            {member ? (
                                <button className="action-btn" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => handleLeave(activeClub.id)}>Leave</button>
                            ) : (
                                <button className="action-btn primary" style={{ background: activeClub.color, border: 'none', color: '#000' }} onClick={() => handleJoin(activeClub.id)}>Join</button>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '1rem' }}>
                        {activeTab === 'discussion_boards' && (
                            <div>
                                {member && canModerateClub && (
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
                                        <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder="Discussion title" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                                        <textarea value={newPostBody} onChange={e => setNewPostBody(e.target.value)} placeholder="Start the discussion..." style={{ width: '100%', minHeight: '90px', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                                        <button className="action-btn primary" onClick={handlePostForum} style={{ background: activeClub.color, border: 'none', color: 'white' }}>Post to Board</button>
                                    </div>
                                )}
                                {posts.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No board posts yet.</p> : posts.map(post => (
                                    <div key={post.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', marginBottom: '0.7rem' }}>
                                        <div style={{ fontWeight: 700 }}>{post.title}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>{post.author?.username || 'Member'}</div>
                                        <div>{post.body}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'idea_lists' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Club Ideas</h3>
                                    {member && (
                                        <button className="action-btn primary" style={{ background: activeClub.color, border: 'none', color: '#fff' }} onClick={handleCreateClubIdea}>
                                            + Create Club Idea
                                        </button>
                                    )}
                                </div>
                                {clubIdeas.length === 0 ? (
                                    <div className="glass-panel" style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                                        No ideas linked to this club yet.
                                    </div>
                                ) : (
                                    <div className="clubs-ideas-grid">
                                        {clubIdeas.map((idea) => (
                                            <IdeaCard key={idea.id} idea={idea} onOpen={(selected) => setSelectedIdea(selected)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'wiki' && (
                            <div>
                                <textarea
                                    value={wikiContent}
                                    onChange={e => setWikiContent(e.target.value)}
                                    readOnly={!member || !canModerateClub}
                                    placeholder={member && canModerateClub ? 'Write shared club docs and notes...' : 'Only admins and moderators can edit wiki.'}
                                    style={{ width: '100%', minHeight: '250px', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.9rem', background: 'var(--bg-card)' }}
                                />
                                <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
                                    <button disabled={!member || !canModerateClub || wikiSaving} onClick={handleSaveWiki} className="action-btn primary" style={{ background: activeClub.color, color: 'white', border: 'none', opacity: member && canModerateClub && !wikiSaving ? 1 : 0.6 }}>
                                        {wikiSaving ? 'Saving...' : 'Save Wiki'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'live_chat' && (
                            <div>
                                <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', background: 'var(--bg-card)', marginBottom: '0.8rem' }}>
                                    {chatMessages.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No chat messages yet.</p> : chatMessages.map(msg => (
                                        <div key={msg.id} style={{ marginBottom: '0.6rem', display: 'flex', justifyContent: msg.user_id === user?.id ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ maxWidth: '74%', background: msg.user_id === user?.id ? activeClub.color : 'var(--bg-panel)', color: msg.user_id === user?.id ? 'white' : 'var(--color-text-main)', borderRadius: '12px', border: msg.user_id === user?.id ? 'none' : '1px solid var(--color-border)', padding: '0.5rem 0.7rem' }}>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{msg.author?.username || 'Member'}</div>
                                                <div>{msg.text}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {member ? (
                                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Message #${activeClub.name}`} style={{ flex: 1, padding: '0.8rem', borderRadius: '30px', border: '1px solid var(--color-border)' }} />
                                        <button className="action-btn primary" style={{ background: activeClub.color, border: 'none', color: 'white' }} type="submit">Send</button>
                                    </form>
                                ) : <p style={{ color: 'var(--color-text-muted)' }}>Join this club to use live chat.</p>}
                            </div>
                        )}

                        {activeTab === 'members_list' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.7rem' }}>
                                {(membersDetailed || []).map((m) => (
                                    <button key={m.id} onClick={() => viewProfile(m.id)} style={{ textAlign: 'left', display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.7rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                                        <img src={m.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.profile?.username || 'User')}&background=random&color=fff`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                        <div>
                                            <div>{m.profile?.username || 'Member'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{roleLabel(m.role)}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div style={{ display: 'grid', gap: '0.7rem' }}>
                                {(membersDetailed || []).map((m) => (
                                    <div key={`role-${m.id}`} style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                            <img src={m.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.profile?.username || 'User')}&background=random&color=fff`} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{m.profile?.username || 'Member'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current role: {roleLabel(m.role)}</div>
                                            </div>
                                        </div>
                                        {isLeader ? (
                                            <select
                                                value={m.role || 'member'}
                                                onChange={(e) => void handlePromoteRole(m.id, e.target.value)}
                                                disabled={isUpdatingRole || m.id === activeClub.leader_id}
                                                style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-panel)' }}
                                            >
                                                {ROLE_OPTIONS.map((role) => (
                                                    <option key={role} value={role}>{roleLabel(role)}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Admin-only editing</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-container clubs-layout clubs-surface">
            <h2 className="clubhouse-hero-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>The Clubhouse</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                Open a club to access discussion boards, idea lists, wiki, live chat, members, and roles.
            </p>

            {!user && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
                    Sign up to create, join, and manage clubs.
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.9rem', alignItems: 'center' }}>
                <div className="clubhouse-search-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-border)', background: '#fff', borderRadius: '999px', padding: '0.2rem 0.8rem', boxShadow: '0 3px 10px rgba(0,0,0,0.05)' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.95rem' }}>🔍</span>
                    <input
                        className="clubhouse-field clubhouse-search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search clubs"
                        style={{ flex: 1, padding: '0.65rem 0.2rem', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.95rem' }}
                    />
                </div>
                <button
                    className="action-btn clubhouse-create-btn"
                    onClick={() => setShowCreateForm(true)}
                    style={{
                        border: 'none'
                    }}
                >
                    + Create Club
                </button>
            </div>

            <div className="feed-tabs" style={{ marginBottom: '1rem', justifyContent: 'center' }}>
                {CLUB_CATEGORY_FILTERS.map((category) => (
                    <button
                        key={category}
                        className="tab-btn"
                        onClick={() => setActiveCategory(category)}
                        style={{
                            borderRadius: '999px',
                            border: `1px solid ${CLUB_CATEGORY_COLORS[category] || '#636e72'}`,
                            background: activeCategory === category ? (CLUB_CATEGORY_COLORS[category] || '#636e72') : '#fff',
                            color: activeCategory === category ? '#fff' : (CLUB_CATEGORY_COLORS[category] || '#636e72'),
                            fontWeight: 800,
                            boxShadow: activeCategory === category ? `0 6px 14px ${String(CLUB_CATEGORY_COLORS[category] || '#636e72')}33` : '0 2px 8px rgba(0,0,0,0.04)'
                        }}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {joinedClubs.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>Your Clubs</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {joinedClubs.map(club => (
                            <button key={club.id} className="action-btn" onClick={() => void openClub(club)} style={{ borderColor: club.color }}>
                                {club.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showCreateForm && (
                <div className="clubhouse-modal-backdrop" onClick={() => setShowCreateForm(false)}>
                    <div className="clubhouse-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="clubhouse-modal-head">
                            <h3 className="clubhouse-modal-title" style={{ margin: 0 }}>Create Your Club</h3>
                            <button type="button" className="clubhouse-close-btn" aria-label="Close create club modal" onClick={() => setShowCreateForm(false)}>×</button>
                        </div>
                        <input className="clubhouse-field" value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Club name" style={{ width: '100%', padding: '0.82rem', borderRadius: '14px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                        <textarea className="clubhouse-field" value={newClubDescription} onChange={e => setNewClubDescription(e.target.value)} placeholder="Description" style={{ width: '100%', minHeight: '90px', padding: '0.82rem', borderRadius: '14px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                        <div className="clubhouse-modal-row">
                            <select className="clubhouse-field" value={newClubCategory} onChange={(e) => setNewClubCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                                {CLUB_CATEGORY_FILTERS.filter((c) => c !== 'All').map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            <div className="clubhouse-category-color-chip" style={{ borderColor: `${selectedCategoryColor}66`, color: selectedCategoryColor }}>
                                {newClubCategory} color
                            </div>
                        </div>
                        <div style={{ marginTop: '0.65rem', marginBottom: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.83rem', fontWeight: 700 }}>Emoji Symbol</div>
                        <div className="clubhouse-emoji-grid">
                            {CLUB_EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setNewClubEmoji(emoji)}
                                    className="action-btn"
                                    style={{
                                        minWidth: '42px',
                                        justifyContent: 'center',
                                        borderRadius: '12px',
                                        borderColor: newClubEmoji === emoji ? selectedCategoryColor : 'var(--color-border)',
                                        background: newClubEmoji === emoji ? `${selectedCategoryColor}22` : '#fff'
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <input className="clubhouse-field" value={inviteInput} onChange={e => setInviteInput(e.target.value)} placeholder="Invite users (optional): comma-separated username/display/email" style={{ width: '100%', padding: '0.82rem', borderRadius: '14px', border: '1px solid var(--color-border)', marginTop: '0.65rem' }} />
                        {matchedInviteUsers.length > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                Matched invitees: {matchedInviteUsers.map((u) => u.username || u.display_name || 'user').join(', ')}
                            </div>
                        )}
                        <button className="action-btn primary clubhouse-create-submit" style={{ marginTop: '0.9rem', background: selectedCategoryColor, color: 'white', border: 'none' }} onClick={handleCreateClub}>
                            {newClubEmoji} Create Club
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading clubs...</div>
            ) : filteredClubs.length === 0 ? (
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No clubs found.</div>
            ) : (
                <div className="clubs-grid">
                    {filteredClubs.map(club => {
                        const member = isMember(club);
                        return (
                            <div key={club.id} className="idea-card clubs-feed-card" style={{ borderTopColor: club.color, padding: 0, minHeight: 'auto' }}>
                                <button onClick={() => void openClub(club)} style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', background: club.banner ? `url(${club.banner}) center/cover` : `linear-gradient(135deg, ${club.color}, #2c3e50)`, height: '130px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }} />
                                    <div style={{ position: 'absolute', left: '12px', bottom: '10px', color: 'white', fontWeight: 800 }}>{getClubEmoji(club)} {club.name}</div>
                                </button>
                                <div style={{ padding: '0.9rem' }}>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>{club.memberCount || 0} members</div>
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        {inferClubCategories(club).map((category) => (
                                            <span key={`${club.id}-${category}`} style={{ padding: '0.2rem 0.52rem', borderRadius: '999px', border: `1px solid ${CLUB_CATEGORY_COLORS[category] || '#636e72'}`, background: `${CLUB_CATEGORY_COLORS[category] || '#636e72'}20`, fontSize: '0.69rem', fontWeight: 700, color: CLUB_CATEGORY_COLORS[category] || 'var(--color-text-muted)' }}>
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ marginBottom: '0.7rem', minHeight: '2.8rem' }}>{cleanClubDescription(club) || 'No description yet.'}</div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="action-btn" onClick={() => void openClub(club)} style={{ flex: 1 }}>{getClubEmoji(club)} Open</button>
                                        {member ? (
                                            <button className="action-btn" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => void handleLeave(club.id)}>Leave</button>
                                        ) : (
                                            <button className="action-btn primary" style={{ background: club.color, border: 'none', color: '#000' }} onClick={() => void handleJoin(club.id)} disabled={!user}>Join</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GroupsPage;
