import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

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
    const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null);
    const [activeTab, setActiveTab] = useState('discussion');

    const [posts, setPosts] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [wikiContent, setWikiContent] = useState('');
    const [wikiSaving, setWikiSaving] = useState(false);

    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#7d5fff');
    const [newGroupBanner, setNewGroupBanner] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        const data = await getGroups();
        setGroups(Array.isArray(data) ? data : []);
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

    const openGroupDetail = async (group) => {
        setActiveGroup(group);
        setViewMode('detail');
        setActiveTab('discussion');
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
        e.stopPropagation();
        if (!user) return alert('Please login to join a group.');
        const result = await joinGroup(groupId, user.id);
        if (!result.success) return alert(`Failed to join: ${result.reason}`);
        await loadGroups();
        if (activeGroup?.id === groupId) {
            const updated = await getGroups();
            const found = (updated || []).find(g => g.id === groupId);
            if (found) setActiveGroup(found);
        }
    };

    const handleLeave = async (groupId, e) => {
        if (e) e.stopPropagation();
        if (!user) return;
        const ok = confirm('Are you sure you want to leave this group?');
        if (!ok) return;
        const result = await leaveGroup(groupId, user.id);
        if (!result.success) return alert(`Failed to leave: ${result.reason}`);
        await loadGroups();
        if (viewMode === 'detail') setViewMode('list');
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
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupColor('#7d5fff');
        setNewGroupBanner('');
        await loadGroups();
    };

    const handlePostSubmit = async () => {
        if (!activeGroup || !newPostTitle.trim() || !newPostContent.trim()) return;
        const result = await addGroupPost(activeGroup.id, newPostTitle, newPostContent);
        if (!result.success) return;
        setNewPostTitle('');
        setNewPostContent('');
        const updatedPosts = await getGroupPosts(activeGroup.id);
        setPosts(Array.isArray(updatedPosts) ? updatedPosts : []);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!activeGroup || !chatInput.trim()) return;
        const result = await sendGroupChat(activeGroup.id, chatInput.trim());
        if (!result.success) return;
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

    const getRoleBadge = (memberId, group) => {
        if (group.leader_id === memberId) return { label: 'Leader', color: group.color };
        return null;
    };

    const filteredGroups = groups.filter(g => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
    });

    if (viewMode === 'detail' && activeGroup) {
        const userIsMember = isMember(activeGroup);

        return (
            <div className="feed-container">
                <button onClick={() => setViewMode('list')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem' }}>
                    Back to Groups
                </button>

                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderLeft: `5px solid ${activeGroup.color}` }}>
                    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: `linear-gradient(to right, ${activeGroup.color}11, transparent)` }}>
                        <div>
                            <h1 style={{ margin: 0, color: activeGroup.color }}>{activeGroup.name}</h1>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>{activeGroup.description}</p>
                        </div>
                        <div>
                            {userIsMember ? (
                                <button className="action-btn" onClick={(e) => handleLeave(activeGroup.id, e)} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>Leave Group</button>
                            ) : (
                                <button className="action-btn primary" onClick={(e) => handleJoin(activeGroup.id, e)} style={{ background: activeGroup.color, color: '#000', border: 'none' }}>Join Group</button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 2rem' }}>
                        {['discussion', 'chat', 'wiki', 'members'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: 'none', border: 'none', padding: '1rem',
                                    borderBottom: activeTab === tab ? `3px solid ${activeGroup.color}` : '3px solid transparent',
                                    color: activeTab === tab ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === tab ? 'bold' : 'normal', cursor: 'pointer', textTransform: 'capitalize'
                                }}
                            >
                                {tab === 'chat' ? 'Live Chat' : tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '2rem' }}>
                        {activeTab === 'discussion' && (
                            <div>
                                {userIsMember && (
                                    <div style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                        <h3 style={{ marginTop: 0 }}>Start a Discussion</h3>
                                        <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder="Topic Title" style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                                        <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} placeholder="Share your thoughts..." style={{ width: '100%', padding: '0.8rem', minHeight: '80px', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                                        <button onClick={handlePostSubmit} className="action-btn primary" style={{ background: activeGroup.color, color: 'white', border: 'none' }}>Post</button>
                                    </div>
                                )}

                                {posts.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No discussions yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {posts.map(post => (
                                            <div key={post.id} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                                <h3 style={{ margin: '0 0 0.5rem 0' }}>{post.title}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    <img src={post.author?.avatar_url || 'default_avatar.png'} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                                                    <span>{post.author?.username || 'Unknown'}</span>
                                                </div>
                                                <p style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>{post.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {chatMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No messages yet. Say hello!</div>}
                                    {chatMessages.map(msg => {
                                        const isMe = msg.user_id === user?.id;
                                        return (
                                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', gap: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{msg.author?.username}</div>
                                                    <div style={{ background: isMe ? activeGroup.color : 'var(--bg-card)', color: isMe ? 'white' : 'var(--color-text-main)', padding: '0.6rem 1rem', borderRadius: '18px' }}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {userIsMember ? (
                                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Message #${activeGroup.name}...`} style={{ flex: 1, padding: '1rem', borderRadius: '30px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                                        <button type="submit" style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: activeGroup.color, color: 'white', cursor: 'pointer' }}>Send</button>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>Join group to chat</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'wiki' && (
                            <div>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Shared notes and documentation for this group.</p>
                                <textarea
                                    value={wikiContent}
                                    onChange={e => setWikiContent(e.target.value)}
                                    readOnly={!userIsMember}
                                    placeholder={userIsMember ? 'Write your group wiki here...' : 'Join this group to edit the wiki.'}
                                    style={{ width: '100%', minHeight: '260px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                />
                                <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button disabled={!userIsMember || wikiSaving} onClick={handleSaveWiki} className="action-btn primary" style={{ background: activeGroup.color, color: 'white', border: 'none', opacity: (!userIsMember || wikiSaving) ? 0.6 : 1 }}>
                                        {wikiSaving ? 'Saving...' : 'Save Wiki'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div>
                                <h3>Members ({(activeGroup.members || []).length})</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {getGroupMembers(activeGroup).map(m => {
                                        const role = getRoleBadge(m.id, activeGroup);
                                        return (
                                            <div key={m.id} onClick={() => viewProfile(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-card)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                                                <img src={m.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                                                <div>
                                                    <div>{m.username}</div>
                                                    {role && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: role.color }}>{role.label}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
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
            <h2 className="section-title">Groups & Collectives</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Create a group, discover others, and collaborate in private chat + shared wiki spaces.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Find groups..."
                    style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                />
                <button onClick={handleCreateGroup} className="action-btn primary" style={{ background: newGroupColor, color: 'white', border: 'none' }}>
                    Create Group
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name" style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                <input value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)} placeholder="#7d5fff" style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
                <input value={newGroupBanner} onChange={e => setNewGroupBanner(e.target.value)} placeholder="Banner URL (optional)" style={{ padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }} />
            </div>
            <textarea
                value={newGroupDescription}
                onChange={e => setNewGroupDescription(e.target.value)}
                placeholder="Group description"
                style={{ width: '100%', minHeight: '84px', marginBottom: '2rem', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
            />

            <div className="clans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {filteredGroups.map(group => {
                    const groupIsMember = isMember(group);
                    return (
                        <div key={group.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: groupIsMember ? `2px solid ${group.color}` : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                            <div onClick={() => openGroupDetail(group)} style={{ height: '120px', background: group.banner ? `url(${group.banner}) center/cover` : `linear-gradient(135deg, ${group.color}, #2c3e50)`, position: 'relative' }}>
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
                                <h3 style={{ position: 'absolute', bottom: '10px', left: '15px', margin: 0, color: 'white' }}>{group.name}</h3>
                            </div>

                            <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span className="pill" style={{ fontSize: '0.8rem', marginBottom: '0.8rem', width: 'fit-content', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedGroupForMembers(group); }}>
                                    {(group.members || []).length} Members
                                </span>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem', flex: 1 }}>
                                    {group.description || 'No description yet.'}
                                </p>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => openGroupDetail(group)} className="action-btn" style={{ flex: 1, background: 'var(--bg-card)' }}>View</button>
                                    {groupIsMember ? (
                                        <button onClick={(e) => handleLeave(group.id, e)} className="action-btn" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>Leave</button>
                                    ) : (
                                        <button onClick={(e) => handleJoin(group.id, e)} className="action-btn primary" style={{ flex: 1.4, background: group.color, border: 'none', color: '#000' }}>Join</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedGroupForMembers && (
                <div onClick={() => setSelectedGroupForMembers(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
                        <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: 0 }}>{selectedGroupForMembers.name}</h3>
                            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{(selectedGroupForMembers.members || []).length} members</p>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            {getGroupMembers(selectedGroupForMembers).length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>No member profiles loaded yet.</p>
                            ) : getGroupMembers(selectedGroupForMembers).map(member => (
                                <div key={member.id} onClick={() => viewProfile(member.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '10px', cursor: 'pointer' }}>
                                    <img src={member.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                                    <span>{member.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupsPage;
