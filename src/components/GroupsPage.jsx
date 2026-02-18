import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const DETAIL_TABS = ['discussion', 'chat', 'wiki', 'members'];

const GroupsPage = () => {
    const {
        getGroups, createGroup, joinGroup, leaveGroup,
        user, viewProfile, allUsers,
        getGroupPosts, addGroupPost,
        getGroupChat, sendGroupChat,
        getGroupWiki, saveGroupWiki
    } = useAppContext();

    const [groups, setGroups] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [activeGroup, setActiveGroup] = useState(null);
    const [activeTab, setActiveTab] = useState('discussion');
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);

    const [posts, setPosts] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [wikiContent, setWikiContent] = useState('');
    const [wikiSaving, setWikiSaving] = useState(false);

    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [listFilter, setListFilter] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#7d5fff');
    const [newGroupBanner, setNewGroupBanner] = useState('');

    const loadGroups = async () => {
        setIsLoadingGroups(true);
        const data = await getGroups();
        setGroups(Array.isArray(data) ? data : []);
        setIsLoadingGroups(false);
    };

    useEffect(() => {
        void loadGroups();
    }, []);

    const refreshActiveGroup = async (groupId) => {
        const updated = await getGroups();
        setGroups(Array.isArray(updated) ? updated : []);
        const found = (updated || []).find(g => g.id === groupId);
        if (found) setActiveGroup(found);
    };

    const loadGroupData = async (groupId) => {
        const [postsData, chatData, wikiData] = await Promise.all([
            getGroupPosts(groupId),
            getGroupChat(groupId),
            getGroupWiki(groupId)
        ]);
        setPosts(Array.isArray(postsData) ? postsData : []);
        setChatMessages(Array.isArray(chatData) ? chatData : []);
        setWikiContent(wikiData?.content || '');
    };

    const openGroupDetail = async (group, preferredTab = 'discussion') => {
        setActiveGroup(group);
        setViewMode('detail');
        setActiveTab(preferredTab);
        await loadGroupData(group.id);
    };

    useEffect(() => {
        let interval;
        if (viewMode === 'detail' && activeGroup && activeTab === 'chat') {
            interval = setInterval(async () => {
                const chatData = await getGroupChat(activeGroup.id);
                setChatMessages(Array.isArray(chatData) ? chatData : []);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [viewMode, activeGroup, activeTab, getGroupChat]);

    const isMember = (group) => (group?.members || []).includes(user?.id);

    const handleJoin = async (groupId, e) => {
        if (e) e.stopPropagation();
        if (!user) return alert('Please login to join a group.');
        const result = await joinGroup(groupId, user.id);
        if (!result.success) return alert(`Failed to join: ${result.reason}`);
        await refreshActiveGroup(groupId);
    };

    const handleLeave = async (groupId, e) => {
        if (e) e.stopPropagation();
        if (!user) return;
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        const result = await leaveGroup(groupId, user.id);
        if (!result.success) return alert(`Failed to leave: ${result.reason}`);
        await loadGroups();
        if (viewMode === 'detail') setViewMode('list');
    };

    const resetCreateForm = () => {
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupColor('#7d5fff');
        setNewGroupBanner('');
    };

    const handleCreateGroup = async () => {
        if (!user) return alert('Please login to create a group.');
        if (!newGroupName.trim()) return alert('Group name is required.');
        const result = await createGroup({
            name: newGroupName.trim(),
            description: newGroupDescription.trim(),
            color: newGroupColor.trim() || '#7d5fff',
            banner_url: newGroupBanner.trim() || null
        });
        if (!result.success) return alert(`Could not create group: ${result.reason}`);
        resetCreateForm();
        setShowCreateForm(false);
        await refreshActiveGroup(result.group.id);
        const created = (await getGroups()).find(g => g.id === result.group.id);
        if (created) {
            await openGroupDetail(created);
        } else {
            await loadGroups();
        }
    };

    const handlePostSubmit = async () => {
        if (!activeGroup || !newPostTitle.trim() || !newPostContent.trim()) return;
        const result = await addGroupPost(activeGroup.id, newPostTitle.trim(), newPostContent.trim());
        if (!result.success) return alert(result.reason || 'Failed to post discussion.');
        setNewPostTitle('');
        setNewPostContent('');
        const updatedPosts = await getGroupPosts(activeGroup.id);
        setPosts(Array.isArray(updatedPosts) ? updatedPosts : []);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!activeGroup || !chatInput.trim()) return;
        const result = await sendGroupChat(activeGroup.id, chatInput.trim());
        if (!result.success) return alert(result.reason || 'Message failed.');
        setChatInput('');
        const updatedChat = await getGroupChat(activeGroup.id);
        setChatMessages(Array.isArray(updatedChat) ? updatedChat : []);
    };

    const handleSaveWiki = async () => {
        if (!activeGroup) return;
        setWikiSaving(true);
        const result = await saveGroupWiki(activeGroup.id, wikiContent);
        setWikiSaving(false);
        if (!result.success) alert(`Wiki save failed: ${result.reason}`);
    };

    const getGroupMembers = (group) => {
        return (group.members || []).map(memberId => allUsers.find(u => u.id === memberId)).filter(Boolean);
    };

    const myGroupIds = useMemo(() => {
        if (!user) return new Set();
        return new Set(groups.filter(g => isMember(g)).map(g => g.id));
    }, [groups, user]);

    const visibleGroups = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return groups
            .filter(g => {
                if (listFilter === 'mine' && !myGroupIds.has(g.id)) return false;
                if (!q) return true;
                return (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
            })
            .sort((a, b) => {
                const aMine = myGroupIds.has(a.id) ? 1 : 0;
                const bMine = myGroupIds.has(b.id) ? 1 : 0;
                if (aMine !== bMine) return bMine - aMine;
                return (b.memberCount || 0) - (a.memberCount || 0);
            });
    }, [groups, listFilter, myGroupIds, searchTerm]);

    if (viewMode === 'detail' && activeGroup) {
        const userIsMember = isMember(activeGroup);

        return (
            <div className="feed-container">
                <button onClick={() => setViewMode('list')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>
                    Back to Groups
                </button>

                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderLeft: `5px solid ${activeGroup.color}` }}>
                    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', background: `linear-gradient(to right, ${activeGroup.color}18, transparent)` }}>
                        <div>
                            <h1 style={{ margin: 0, color: activeGroup.color }}>{activeGroup.name}</h1>
                            <p style={{ margin: '0.5rem 0', color: 'var(--color-text-muted)', maxWidth: '700px' }}>
                                {activeGroup.description || 'No description yet.'}
                            </p>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {(activeGroup.members || []).length} members
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {userIsMember ? (
                                <button className="action-btn" onClick={(e) => handleLeave(activeGroup.id, e)} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                                    Leave Group
                                </button>
                            ) : (
                                <button className="action-btn primary" onClick={(e) => handleJoin(activeGroup.id, e)} style={{ background: activeGroup.color, color: '#000', border: 'none' }}>
                                    Join Group
                                </button>
                            )}
                        </div>
                    </div>

                    {!userIsMember && (
                        <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            You can read this group. Join to post discussions, send chat messages, and edit the wiki.
                        </div>
                    )}

                    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 1rem', overflowX: 'auto' }}>
                        {DETAIL_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '1rem',
                                    borderBottom: activeTab === tab ? `3px solid ${activeGroup.color}` : '3px solid transparent',
                                    color: activeTab === tab ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {activeTab === 'discussion' && (
                            <div>
                                {userIsMember && (
                                    <div style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <h3 style={{ marginTop: 0 }}>Start a Discussion</h3>
                                        <input
                                            value={newPostTitle}
                                            onChange={e => setNewPostTitle(e.target.value)}
                                            placeholder="Topic title"
                                            style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-panel)' }}
                                        />
                                        <textarea
                                            value={newPostContent}
                                            onChange={e => setNewPostContent(e.target.value)}
                                            placeholder="Share your thoughts..."
                                            style={{ width: '100%', padding: '0.8rem', minHeight: '90px', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-panel)' }}
                                        />
                                        <button onClick={handlePostSubmit} className="action-btn primary" style={{ background: activeGroup.color, color: 'white', border: 'none' }}>
                                            Post
                                        </button>
                                    </div>
                                )}

                                {posts.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No discussions yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {posts.map(post => (
                                            <div key={post.id} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                                <h3 style={{ margin: '0 0 0.4rem 0' }}>{post.title}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    <img
                                                        src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'User')}&background=random&color=fff`}
                                                        style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                                                        alt=""
                                                    />
                                                    <span>{post.author?.username || 'Unknown'}</span>
                                                </div>
                                                <p style={{ lineHeight: '1.6', color: 'var(--color-text-main)', margin: 0 }}>{post.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {chatMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>No messages yet. Say hello.</div>}
                                    {chatMessages.map(msg => {
                                        const isMe = msg.user_id === user?.id;
                                        return (
                                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px', textAlign: isMe ? 'right' : 'left' }}>
                                                    {msg.author?.username || 'Member'}
                                                </div>
                                                <div style={{ background: isMe ? activeGroup.color : 'var(--bg-panel)', color: isMe ? 'white' : 'var(--color-text-main)', padding: '0.6rem 1rem', borderRadius: '16px', border: isMe ? 'none' : '1px solid var(--color-border)' }}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {userIsMember ? (
                                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder={`Message #${activeGroup.name}...`}
                                            style={{ flex: 1, padding: '0.9rem 1rem', borderRadius: '30px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                        />
                                        <button type="submit" style={{ minWidth: '70px', borderRadius: '30px', border: 'none', background: activeGroup.color, color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Send
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '0.8rem', background: 'var(--bg-card)', borderRadius: '10px', color: 'var(--color-text-muted)' }}>
                                        Join group to chat
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'wiki' && (
                            <div>
                                <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>Shared notes and documentation for this group.</p>
                                <textarea
                                    value={wikiContent}
                                    onChange={e => setWikiContent(e.target.value)}
                                    readOnly={!userIsMember}
                                    placeholder={userIsMember ? 'Write your group wiki here...' : 'Join this group to edit the wiki.'}
                                    style={{ width: '100%', minHeight: '260px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                />
                                <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        disabled={!userIsMember || wikiSaving}
                                        onClick={handleSaveWiki}
                                        className="action-btn primary"
                                        style={{ background: activeGroup.color, color: 'white', border: 'none', opacity: (!userIsMember || wikiSaving) ? 0.6 : 1 }}
                                    >
                                        {wikiSaving ? 'Saving...' : 'Save Wiki'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div>
                                <h3 style={{ marginTop: 0 }}>Members ({(activeGroup.members || []).length})</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.8rem' }}>
                                    {getGroupMembers(activeGroup).map(m => (
                                        <div key={m.id} onClick={() => viewProfile(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-card)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                                            <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username || 'User')}&background=random&color=fff`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                                            <div>
                                                <div>{m.username}</div>
                                                {activeGroup.leader_id === m.id && <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: activeGroup.color }}>Leader</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-container">
            <h2 className="section-title">Groups</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Discover communities, join them, then collaborate through discussions, chat, and a shared wiki.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search groups by name or description"
                    style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                />
                <select
                    value={listFilter}
                    onChange={e => setListFilter(e.target.value)}
                    style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                >
                    <option value="all">All Groups</option>
                    <option value="mine">My Groups</option>
                </select>
                <button
                    onClick={() => setShowCreateForm(prev => !prev)}
                    className="action-btn"
                    style={{ background: showCreateForm ? 'var(--bg-card)' : 'transparent' }}
                >
                    {showCreateForm ? 'Close' : 'Create Group'}
                </button>
            </div>

            {showCreateForm && (
                <div className="glass-panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>Create a Group</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.7rem', marginBottom: '0.7rem' }}>
                        <input
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Group name"
                            style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                        />
                        <input
                            value={newGroupColor}
                            onChange={e => setNewGroupColor(e.target.value)}
                            placeholder="#7d5fff"
                            style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                        />
                    </div>
                    <input
                        value={newGroupBanner}
                        onChange={e => setNewGroupBanner(e.target.value)}
                        placeholder="Banner URL (optional)"
                        style={{ width: '100%', marginBottom: '0.7rem', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                    />
                    <textarea
                        value={newGroupDescription}
                        onChange={e => setNewGroupDescription(e.target.value)}
                        placeholder="Group description"
                        style={{ width: '100%', minHeight: '84px', marginBottom: '0.8rem', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="action-btn" onClick={resetCreateForm}>Reset</button>
                        <button
                            onClick={handleCreateGroup}
                            className="action-btn primary"
                            disabled={!newGroupName.trim()}
                            style={{ background: newGroupColor || '#7d5fff', color: 'white', border: 'none', opacity: newGroupName.trim() ? 1 : 0.6 }}
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}

            {isLoadingGroups ? (
                <div className="glass-panel" style={{ padding: '1.4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading groups...
                </div>
            ) : visibleGroups.length === 0 ? (
                <div className="glass-panel" style={{ padding: '1.4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No groups match your filter.
                </div>
            ) : (
                <div className="clans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {visibleGroups.map(group => {
                        const groupIsMember = isMember(group);
                        return (
                            <div key={group.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: groupIsMember ? `2px solid ${group.color}` : '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                                <button
                                    onClick={() => openGroupDetail(group)}
                                    style={{ textAlign: 'left', border: 'none', background: group.banner ? `url(${group.banner}) center/cover` : `linear-gradient(135deg, ${group.color}, #2c3e50)`, height: '120px', position: 'relative', cursor: 'pointer' }}
                                >
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
                                    <h3 style={{ position: 'absolute', bottom: '10px', left: '14px', margin: 0, color: 'white' }}>{group.name}</h3>
                                </button>

                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                                        <span className="pill" style={{ fontSize: '0.8rem' }}>{group.memberCount || 0} members</span>
                                        {groupIsMember && <span style={{ fontSize: '0.75rem', color: group.color, fontWeight: 'bold' }}>Joined</span>}
                                    </div>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 0.9rem 0', flex: 1 }}>
                                        {group.description || 'No description yet.'}
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => openGroupDetail(group)} className="action-btn" style={{ flex: 1, background: 'var(--bg-card)' }}>
                                            Open
                                        </button>
                                        {groupIsMember ? (
                                            <button onClick={(e) => handleLeave(group.id, e)} className="action-btn" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                                                Leave
                                            </button>
                                        ) : (
                                            <button onClick={(e) => handleJoin(group.id, e)} className="action-btn primary" style={{ background: group.color, border: 'none', color: '#000' }}>
                                                Join
                                            </button>
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
