import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const GroupsPage = () => {
    const {
        getGroups, joinGroup, leaveGroup,
        user, viewProfile, allUsers,
        getGroupPosts, addGroupPost,
        getGroupChat, sendGroupChat
    } = useAppContext();

    const [groups, setGroups] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
    const [activeGroup, setActiveGroup] = useState(null);
    const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null); // For member list modal (quick view)

    // Detail View Tabs
    const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'chat' | 'members'

    // Data for Detail View
    const [posts, setPosts] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);

    // Inputs
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [chatInput, setChatInput] = useState('');

    // Load groups on mount
    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        const data = await getGroups();
        setGroups(data);
    };

    // Enter Group Detail View
    const openGroupDetail = async (group) => {
        setActiveGroup(group);
        setViewMode('detail');
        setActiveTab('discussion'); // Default tab
        loadGroupData(group.id);
    };

    const loadGroupData = async (groupId) => {
        // Load Posts
        const postsData = await getGroupPosts(groupId);
        setPosts(postsData);

        // Load Chat
        const chatData = await getGroupChat(groupId);
        setChatMessages(chatData);
    };

    // Auto-refresh chat if active
    useEffect(() => {
        let interval;
        if (viewMode === 'detail' && activeGroup && activeTab === 'chat') {
            interval = setInterval(async () => {
                const chatData = await getGroupChat(activeGroup.id);
                setChatMessages(chatData);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [viewMode, activeGroup, activeTab]);

    const handleJoin = async (groupId, e) => {
        e.stopPropagation();
        if (!user) return alert("Please login to join a group.");
        if (confirm(`Join this group?`)) {
            const result = await joinGroup(groupId, user.id);
            if (result.success) {
                loadGroups();
                if (activeGroup?.id === groupId) {
                    // Refresh active group data if looking at it
                    const updated = await getGroups();
                    const group = updated.find(g => g.id === groupId);
                    if (group) setActiveGroup(group);
                }
            } else {
                alert("Failed to join: " + result.reason);
            }
        }
    };

    const handleLeave = async (e) => {
        if (e) e.stopPropagation();
        if (confirm("Are you sure you want to leave your group?")) {
            const result = await leaveGroup(user.id);
            if (result.success) {
                loadGroups();
                if (viewMode === 'detail') setViewMode('list'); // Kick out to list
            }
        }
    };

    const handlePostSubmit = async () => {
        if (!newPostTitle.trim() || !newPostContent.trim()) return;
        const result = await addGroupPost(activeGroup.id, newPostTitle, newPostContent);
        if (result.success) {
            setNewPostTitle('');
            setNewPostContent('');
            const updatedPosts = await getGroupPosts(activeGroup.id);
            setPosts(updatedPosts);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const result = await sendGroupChat(activeGroup.id, chatInput);
        if (result.success) {
            setChatInput('');
            const updatedChat = await getGroupChat(activeGroup.id);
            setChatMessages(updatedChat);
        }
    };

    // Get member user data for modal
    const getGroupMembers = (group) => {
        return (group.members || []).map(memberId => allUsers.find(u => u.id === memberId)).filter(Boolean);
    };

    const isMember = (group) => (group?.members || []).includes(user?.id);

    // --- RENDER ---

    if (viewMode === 'detail' && activeGroup) {
        const userIsMember = isMember(activeGroup);

        return (
            <div className="feed-container">
                {/* Back Button */}
                <button onClick={() => setViewMode('list')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ← Back to Groups
                </button>

                {/* Group Header */}
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderLeft: `5px solid ${activeGroup.color}` }}>
                    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: `linear-gradient(to right, ${activeGroup.color}11, transparent)` }}>
                        <div>
                            <h1 style={{ margin: 0, color: activeGroup.color }}>{activeGroup.name}</h1>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>{activeGroup.description}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {userIsMember ? (
                                <button className="action-btn" onClick={handleLeave} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>Leave Group</button>
                            ) : (
                                <button className="action-btn primary" onClick={(e) => handleJoin(activeGroup.id, e)} style={{ background: activeGroup.color, color: '#000', border: 'none' }}>Join Group</button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 2rem' }}>
                        {['discussion', 'chat', 'members'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: 'none', border: 'none',
                                    padding: '1rem',
                                    borderBottom: activeTab === tab ? `3px solid ${activeGroup.color}` : '3px solid transparent',
                                    color: activeTab === tab ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {tab === 'chat' ? 'Live Chat' : tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '2rem' }}>
                        {activeTab === 'discussion' && (
                            <div className="fade-in">
                                {userIsMember && (
                                    <div style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                        <h3 style={{ marginTop: 0 }}>Start a Discussion</h3>
                                        <input
                                            placeholder="Topic Title"
                                            value={newPostTitle}
                                            onChange={e => setNewPostTitle(e.target.value)}
                                            style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                        />
                                        <textarea
                                            placeholder="Share your thoughts..."
                                            value={newPostContent}
                                            onChange={e => setNewPostContent(e.target.value)}
                                            style={{ width: '100%', padding: '0.8rem', minHeight: '80px', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                        />
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
                                                    <span>•</span>
                                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>{post.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <div className="fade-in" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {chatMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No messages yet. Say hello!</div>}
                                    {chatMessages.map(msg => {
                                        const isMe = msg.user_id === user?.id;
                                        return (
                                            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                                {!isMe && <img src={msg.author?.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%' }} title={msg.author?.username} />}
                                                <div>
                                                    {!isMe && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{msg.author?.username}</div>}
                                                    <div style={{
                                                        background: isMe ? activeGroup.color : 'var(--bg-card)',
                                                        color: isMe ? 'white' : 'var(--color-text-main)',
                                                        padding: '0.6rem 1rem', borderRadius: '18px',
                                                        borderTopLeftRadius: isMe ? '18px' : '4px',
                                                        borderTopRightRadius: isMe ? '4px' : '18px'
                                                    }}>
                                                        {msg.text}
                                                    </div>
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
                                            style={{ flex: 1, padding: '1rem', borderRadius: '30px', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}
                                        />
                                        <button type="submit" style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', background: activeGroup.color, color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>➤</button>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>Join group to chat</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div className="fade-in">
                                <h3>Members ({activeGroup.members.length})</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {getGroupMembers(activeGroup).map(m => (
                                        <div key={m.id} onClick={() => viewProfile(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-card)', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                                            <img src={m.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.username}</div>
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

    // --- LIST VIEW ---

    return (
        <div className="feed-container">
            <h2 className="section-title">Groups & Collectives</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Join a specialized group to amplify your impact. Groups provide verification, resources, and community.
            </p>

            <div className="clans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {groups.map(group => {
                    const groupIsMember = isMember(group);

                    return (
                        <div key={group.id} className="glass-panel" style={{
                            padding: '0',
                            overflow: 'hidden',
                            border: groupIsMember ? `2px solid ${group.color}` : '1px solid rgba(255,255,255,0.1)',
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            {/* BANNER AREA */}
                            <div
                                onClick={() => openGroupDetail(group)}
                                style={{
                                    height: '120px',
                                    background: `url(${group.banner}) center/cover`,
                                    position: 'relative'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '60%',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'
                                }} />
                                <h3 style={{ position: 'absolute', bottom: '10px', left: '15px', margin: 0, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{group.name}</h3>
                            </div>

                            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ color: group.color, fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase' }}>COLLECTIVE</span>
                                    <span
                                        className="pill"
                                        style={{ fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.1)' }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedGroupForMembers(group); }}
                                    >{(group.members || []).length} Members</span>
                                </div>

                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem', flex: 1 }}>
                                    {group.description}
                                </p>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => openGroupDetail(group)}
                                        className="action-btn"
                                        style={{ flex: 1, background: 'var(--bg-card)' }}
                                    >
                                        View
                                    </button>

                                    {groupIsMember ? (
                                        <button
                                            onClick={(e) => handleLeave(e)}
                                            className="action-btn"
                                            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                        >
                                            Leave
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => handleJoin(group.id, e)}
                                            className="action-btn primary"
                                            style={{ flex: 1.5, background: group.color, border: 'none', color: '#000' }}
                                        >
                                            Join
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MEMBER LIST MODAL (Quick View) */}
            {selectedGroupForMembers && (
                <div
                    onClick={() => setSelectedGroupForMembers(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.75)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-panel)', borderRadius: '20px',
                            width: '90%', maxWidth: '500px', maxHeight: '80vh',
                            overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem', borderBottom: '1px solid var(--color-border)',
                            background: `linear-gradient(135deg, ${selectedGroupForMembers.color}22, transparent)`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: selectedGroupForMembers.color }}>{selectedGroupForMembers.name}</h3>
                                    <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        {selectedGroupForMembers.members.length} member{selectedGroupForMembers.members.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedGroupForMembers(null)}
                                    style={{
                                        background: 'var(--bg-surface)', border: 'none', borderRadius: '50%',
                                        width: '36px', height: '36px', cursor: 'pointer',
                                        fontSize: '1.2rem', color: 'var(--color-text-muted)'
                                    }}
                                >×</button>
                            </div>
                        </div>

                        {/* Member List */}
                        <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {getGroupMembers(selectedGroupForMembers).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                    No members yet. Be the first to join!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {getGroupMembers(selectedGroupForMembers).map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => { setSelectedGroupForMembers(null); viewProfile(member.id); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.75rem', borderRadius: '12px',
                                                background: 'var(--bg-surface)', cursor: 'pointer',
                                                transition: 'all 0.2s', border: '1px solid var(--color-border)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = selectedGroupForMembers.color + '22'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                                        >
                                            <img
                                                src={member.avatar}
                                                alt={member.username}
                                                style={{
                                                    width: '44px', height: '44px', borderRadius: '50%',
                                                    border: `2px solid ${member.borderColor || selectedGroupForMembers.color}`
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                                                    {member.username}
                                                    {member.isVerified && <span style={{ marginLeft: '4px' }}>✓</span>}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {member.influence || 0} influence
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.2rem' }}>→</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupsPage;
