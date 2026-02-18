import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const CLUB_QUICK_OPEN_KEY = 'woi_open_club_id';
const DETAIL_TABS = [
    { id: 'forum', label: 'Forum' },
    { id: 'chatroom', label: 'Chatroom' },
    { id: 'wiki', label: 'Wiki Area' },
    { id: 'members', label: 'Members' }
];

const GroupsPage = () => {
    const {
        getGroups, createGroup, joinGroup, leaveGroup,
        user, viewProfile, allUsers,
        getGroupPosts, addGroupPost,
        getGroupChat, sendGroupChat,
        getGroupWiki, saveGroupWiki
    } = useAppContext();

    const [clubs, setClubs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeClub, setActiveClub] = useState(null);
    const [activeTab, setActiveTab] = useState('forum');

    const [posts, setPosts] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [wikiContent, setWikiContent] = useState('');
    const [wikiSaving, setWikiSaving] = useState(false);

    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostBody, setNewPostBody] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newClubName, setNewClubName] = useState('');
    const [newClubDescription, setNewClubDescription] = useState('');
    const [newClubColor, setNewClubColor] = useState('#7d5fff');
    const [newClubBanner, setNewClubBanner] = useState('');

    const isMember = (club) => (club?.members || []).includes(user?.id);

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
        if (club) {
            void openClub(club);
        }
    }, [clubs, activeClub]);

    const loadClubData = async (clubId) => {
        const [postRows, chatRows, wikiRow] = await Promise.all([
            getGroupPosts(clubId),
            getGroupChat(clubId),
            getGroupWiki(clubId)
        ]);
        setPosts(Array.isArray(postRows) ? postRows : []);
        setChatMessages(Array.isArray(chatRows) ? chatRows : []);
        setWikiContent(wikiRow?.content || '');
    };

    const openClub = async (club, tab = 'forum') => {
        setActiveClub(club);
        setActiveTab(tab);
        await loadClubData(club.id);
    };

    useEffect(() => {
        let interval;
        if (activeClub && activeTab === 'chatroom') {
            interval = setInterval(async () => {
                const rows = await getGroupChat(activeClub.id);
                setChatMessages(Array.isArray(rows) ? rows : []);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [activeClub, activeTab, getGroupChat]);

    const joinedClubs = useMemo(() => clubs.filter(c => isMember(c)), [clubs, user]);

    const filteredClubs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return clubs
            .filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
            .sort((a, b) => {
                const aMine = isMember(a) ? 1 : 0;
                const bMine = isMember(b) ? 1 : 0;
                if (aMine !== bMine) return bMine - aMine;
                return (b.memberCount || 0) - (a.memberCount || 0);
            });
    }, [clubs, searchTerm, user]);

    const handleJoin = async (clubId) => {
        if (!user) return alert('Sign up or log in to join clubs.');
        const result = await joinGroup(clubId, user.id);
        if (!result.success) return alert(result.reason || 'Could not join club');
        await loadClubs();
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
        const result = await createGroup({
            name: newClubName.trim(),
            description: newClubDescription.trim(),
            banner_url: newClubBanner.trim() || null,
            color: newClubColor.trim() || '#7d5fff'
        });
        if (!result.success) return alert(result.reason || 'Could not create club');
        setNewClubName('');
        setNewClubDescription('');
        setNewClubBanner('');
        setNewClubColor('#7d5fff');
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

    const getClubMembers = (club) => (club.members || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);

    if (activeClub) {
        const member = isMember(activeClub);
        return (
            <div className="feed-container">
                <button onClick={() => setActiveClub(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>
                    Back to Clubs
                </button>
                <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${activeClub.color}66`, padding: 0 }}>
                    <div style={{ padding: '1.4rem', background: `linear-gradient(135deg, ${activeClub.color}22, transparent)` }}>
                        <h2 style={{ margin: 0 }}>{activeClub.name}</h2>
                        <p style={{ margin: '0.4rem 0 0 0', color: 'var(--color-text-muted)' }}>{activeClub.description || 'No description yet.'}</p>
                        <div style={{ marginTop: '0.7rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{activeClub.memberCount || 0} members</div>
                    </div>

                    <div style={{ padding: '0.7rem 1rem', display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
                        {DETAIL_TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="action-btn" style={{ whiteSpace: 'nowrap', borderColor: activeTab === tab.id ? activeClub.color : 'var(--color-border)' }}>
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
                        {activeTab === 'forum' && (
                            <div>
                                {member && (
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
                                        <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder="Forum thread title" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                                        <textarea value={newPostBody} onChange={e => setNewPostBody(e.target.value)} placeholder="Start the discussion..." style={{ width: '100%', minHeight: '90px', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.6rem' }} />
                                        <button className="action-btn primary" onClick={handlePostForum} style={{ background: activeClub.color, border: 'none', color: 'white' }}>Post to Forum</button>
                                    </div>
                                )}
                                {posts.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No forum posts yet.</p> : posts.map(post => (
                                    <div key={post.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', marginBottom: '0.7rem' }}>
                                        <div style={{ fontWeight: 700 }}>{post.title}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>{post.author?.username || 'Member'}</div>
                                        <div>{post.body}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'chatroom' && (
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
                                ) : <p style={{ color: 'var(--color-text-muted)' }}>Join this club to use chatroom.</p>}
                            </div>
                        )}

                        {activeTab === 'wiki' && (
                            <div>
                                <textarea
                                    value={wikiContent}
                                    onChange={e => setWikiContent(e.target.value)}
                                    readOnly={!member}
                                    placeholder={member ? 'Write shared club notes, docs, and resources...' : 'Join this club to edit wiki area.'}
                                    style={{ width: '100%', minHeight: '250px', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.9rem', background: 'var(--bg-card)' }}
                                />
                                <div style={{ marginTop: '0.6rem', textAlign: 'right' }}>
                                    <button disabled={!member || wikiSaving} onClick={handleSaveWiki} className="action-btn primary" style={{ background: activeClub.color, color: 'white', border: 'none', opacity: member && !wikiSaving ? 1 : 0.6 }}>
                                        {wikiSaving ? 'Saving...' : 'Save Wiki'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.7rem' }}>
                                {getClubMembers(activeClub).map(m => (
                                    <button key={m.id} onClick={() => viewProfile(m.id)} style={{ textAlign: 'left', display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.7rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                                        <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'User')}&background=random&color=fff`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                        <div>
                                            <div>{m.username}</div>
                                            {activeClub.leader_id === m.id && <div style={{ fontSize: '0.75rem', color: activeClub.color, fontWeight: 700 }}>Leader</div>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-container">
            <h2 className="section-title">Clubs</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Forum, Chatroom, and Wiki Area for each club.
            </p>

            {!user && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
                    Sign up to create, join, and leave clubs.
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search clubs" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                <button className="action-btn" onClick={() => setShowCreateForm(v => !v)}>{showCreateForm ? 'Close' : '+ Create Club'}</button>
            </div>

            {joinedClubs.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>Your Clubs</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {joinedClubs.map(club => (
                            <button key={club.id} className="action-btn" onClick={() => openClub(club)} style={{ borderColor: club.color }}>
                                {club.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showCreateForm && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <input value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Club name" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }} />
                    <textarea value={newClubDescription} onChange={e => setNewClubDescription(e.target.value)} placeholder="Description" style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input value={newClubColor} onChange={e => setNewClubColor(e.target.value)} placeholder="#7d5fff" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)' }} />
                        <input value={newClubBanner} onChange={e => setNewClubBanner(e.target.value)} placeholder="Banner URL (optional)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)' }} />
                    </div>
                    <button className="action-btn primary" style={{ background: newClubColor || '#7d5fff', color: 'white', border: 'none' }} onClick={handleCreateClub}>Create Club</button>
                </div>
            )}

            {isLoading ? (
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading clubs...</div>
            ) : filteredClubs.length === 0 ? (
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No clubs found.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                    {filteredClubs.map(club => {
                        const member = isMember(club);
                        return (
                            <div key={club.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: member ? `2px solid ${club.color}` : '1px solid var(--color-border)' }}>
                                <button onClick={() => openClub(club)} style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', background: club.banner ? `url(${club.banner}) center/cover` : `linear-gradient(135deg, ${club.color}, #2c3e50)`, height: '115px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
                                    <div style={{ position: 'absolute', left: '12px', bottom: '10px', color: 'white', fontWeight: 700 }}>{club.name}</div>
                                </button>
                                <div style={{ padding: '0.9rem' }}>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.45rem' }}>{club.memberCount || 0} members</div>
                                    <div style={{ marginBottom: '0.7rem' }}>{club.description || 'No description yet.'}</div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="action-btn" onClick={() => openClub(club)} style={{ flex: 1 }}>Open</button>
                                        {member ? (
                                            <button className="action-btn" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => handleLeave(club.id)}>Leave</button>
                                        ) : (
                                            <button className="action-btn primary" style={{ background: club.color, border: 'none', color: '#000' }} onClick={() => handleJoin(club.id)} disabled={!user}>Join</button>
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
