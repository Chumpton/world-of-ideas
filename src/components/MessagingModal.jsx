import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

const MessagingModal = ({ onClose, initialUserId }) => {
    const { user, allUsers, sendDirectMessage, getDirectMessages } = useAppContext();
    const [chats, setChats] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [isNewChatView, setIsNewChatView] = useState(false);
    const [selectedUsersForGroup, setSelectedUsersForGroup] = useState([]);
    const [groupNameInput, setGroupNameInput] = useState('');
    const [loadingChats, setLoadingChats] = useState(false);
    const scrollRef = useRef(null);

    const loadChats = useCallback(async () => {
        if (!user) return [];
        setLoadingChats(true);
        try {
            const userChats = await getDirectMessages();
            setChats(Array.isArray(userChats) ? userChats : []);
            return Array.isArray(userChats) ? userChats : [];
        } finally {
            setLoadingChats(false);
        }
    }, [user, getDirectMessages]);

    // Load chats and resolve initial profile-targeted channel
    useEffect(() => {
        let active = true;
        const init = async () => {
            if (!user) return;
            const userChats = await loadChats();
            if (!active) return;

            if (initialUserId) {
                const existing = userChats.find(c =>
                    !c.isGroup && c.participants.some(p => p.id === initialUserId)
                );
                if (existing) {
                    setSelectedChannel(existing);
                } else {
                    const other = allUsers.find(u => u.id === initialUserId);
                    if (other) {
                        setSelectedChannel({
                            channelId: [user.id, other.id].sort().join('_'),
                            participants: [user, other],
                            messages: [],
                            lastMessage: null,
                            isGroup: false
                        });
                    }
                }
            }
        };
        init();
        return () => { active = false; };
    }, [initialUserId, user, allUsers, loadChats]);

    // Keep threads fresh while modal is open.
    useEffect(() => {
        if (!user) return;
        const timer = setInterval(() => {
            loadChats();
        }, 8000);
        return () => clearInterval(timer);
    }, [user, loadChats]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedChannel?.messages]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedChannel) return;

        // Determine recipient(s)
        // For 1-on-1, it's the other person. For group, it's the group ID.
        // The MockBackend.sendMessage currently takes (fromId, toId, text).
        // We need to update MockBackend or overload 'toId' to handle group IDs.
        // For now, let's assume 'toId' can be a group ID starting with 'group_'.

        let targetId;
        if (selectedChannel.isGroup) {
            targetId = selectedChannel.channelId;
        } else {
            // Find the other user
            const other = selectedChannel.participants.find(p => p.id !== user.id);
            targetId = other ? other.id : null;
        }

        if (!targetId) return;

        const outgoingText = newMessage.trim();
        const result = await sendDirectMessage(targetId, outgoingText);
        if (result?.success) {
            const updatedMsg = {
                ...(result.message || {}),
                text: result.message?.text || outgoingText,
                from: result.message?.from_id || user.id,
                to: result.message?.to_id || targetId,
                timestamp: result.message?.created_at
                    ? new Date(result.message.created_at).getTime()
                    : Date.now()
            };
            setSelectedChannel(prev => ({
                ...prev,
                messages: [...(prev.messages || []), updatedMsg]
            }));
            setNewMessage('');
            const refreshed = await loadChats();
            const refreshedCurrent = refreshed.find(c => c.channelId === selectedChannel.channelId);
            if (refreshedCurrent) {
                setSelectedChannel(refreshedCurrent);
            }
        } else {
            alert(`Failed to send message: ${result?.reason || 'Unknown error'}`);
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsersForGroup(prev => {
            if (prev.includes(userId)) return prev.filter(id => id !== userId);
            // Limit to 1 user for now (1-on-1 only)
            return [userId];
        });
    };

    const handleStartNewChat = () => {
        if (selectedUsersForGroup.length === 0) return;

        if (selectedUsersForGroup.length === 1) {
            // 1-on-1
            const otherId = selectedUsersForGroup[0];
            const existing = chats.find(c => !c.isGroup && c.participants.some(p => p.id === otherId));
            if (existing) {
                setSelectedChannel(existing);
            } else {
                const other = allUsers.find(u => u.id === otherId);
                setSelectedChannel({
                    channelId: [user.id, other.id].sort().join('_'),
                    participants: [user, other],
                    messages: [],
                    lastMessage: null,
                    isGroup: false
                });
            }
        } else {
            // Group Chat
            const participants = allUsers.filter(u => selectedUsersForGroup.includes(u.id));
            const newGroup = {
                channelId: `group_${Date.now()}`,
                participants: [user, ...participants],
                messages: [],
                lastMessage: { text: 'Group created', timestamp: Date.now() },
                isGroup: true,
                name: groupNameInput.trim() || participants.map(u => u.username).join(', ')
            };
            // In a real app, we'd save this to backend immediately.
            // For now, we'll set it as active. The first message will "persist" it via sendMessage logic
            // if we update MockBackend to handle groups.
            setSelectedChannel(newGroup);
        }
        setIsNewChatView(false);
        setSelectedUsersForGroup([]);
        setGroupNameInput('');
    };

    const getChannelName = (channel) => {
        if (channel.isGroup) {
            return channel.name || channel.participants.filter(p => p.id !== user.id).map(p => p.username).join(', ');
        }
        const other = channel.participants.find(p => p.id !== user.id);
        return other ? other.username : 'Unknown';
    };

    const getChannelAvatar = (channel) => {
        if (channel.isGroup) {
            // Generate a group avatar or show first 2 letters
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(getChannelName(channel))}&background=random&color=fff`;
        }
        const other = channel.participants.find(p => p.id !== user.id);
        return other?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || 'User')}&background=random&color=fff`;
    };

    const openOrCreateDirectChannel = (targetUser) => {
        if (!targetUser?.id || !user?.id) return;
        const existing = chats.find(c => !c.isGroup && c.participants.some(p => p.id === targetUser.id));
        if (existing) {
            setSelectedChannel(existing);
            setIsNewChatView(false);
            return;
        }
        setSelectedChannel({
            channelId: [user.id, targetUser.id].sort().join('_'),
            participants: [user, targetUser],
            messages: [],
            lastMessage: null,
            isGroup: false
        });
        setIsNewChatView(false);
    };

    const followedIds = Array.isArray(user?.following) ? user.following : [];
    const followedStories = allUsers
        .filter(u => u && u.id !== user?.id && followedIds.includes(u.id))
        .sort((a, b) => Number(b.influence || 0) - Number(a.influence || 0))
        .map(u => ({
            id: u.id,
            name: u.username || u.display_name || 'User',
            img: u.avatar || u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'User')}&background=random`,
            isUser: false,
            profile: u
        }));

    const activeStories = [
        { id: 'self', name: 'Your note', img: user?.avatar, isUser: true },
        ...followedStories
    ];

    if (!user) return null;

    const showChat = (selectedChannel || isNewChatView);

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div
                className={`submission-expanded messaging-container ${showChat ? 'show-chat' : 'show-list'}`}
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '900px',
                    width: '95%',
                    height: '80vh',
                    padding: 0,
                    overflow: 'hidden',
                    background: 'var(--bg-panel)'
                }}
            >

                {/* Sidebar (Full width on mobile if no chat selected) */}
                <div className="messaging-modal-sidebar">

                    {/* Header: Title & New Chat */}
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.4rem' }}>{user ? user.username : 'Messaging'}</span>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}>✕</button>
                            <button
                                onClick={() => { setIsNewChatView(true); setSelectedChannel(null); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--color-text-main)', // Use text color so it works in light/dark
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '4px'
                                }}
                                title="New Chat"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div style={{ padding: '0 1rem 1rem 1rem' }}>
                        <div style={{ background: 'var(--bg-pill)', padding: '0.6rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ opacity: 0.5 }}>🔍</span>
                            <input
                                name="messaging_search"
                                placeholder="Search"
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
                            />
                        </div>
                    </div>

                    {/* Stories / Active Users */}
                    <div className="story-bubbles">
                        {activeStories.map((story) => (
                            <div key={story.id} className="story-item">
                                <div
                                    className="story-ring"
                                    style={story.isUser ? { background: 'transparent', border: '2px dashed var(--color-text-muted)' } : {}}
                                    onClick={() => {
                                        if (story.isUser) return;
                                        openOrCreateDirectChannel(story.profile);
                                    }}
                                >
                                    <img src={story.img} className="story-avatar" alt="" />
                                    {story.isUser && <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--bg-panel)', padding: '2px', borderRadius: '50%' }}>➕</div>}
                                </div>
                                <span className="story-name">{story.name}</span>
                            </div>
                        ))}
                        {followedStories.length === 0 && (
                            <div style={{ padding: '0.35rem 0.6rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                Follow people to populate this row.
                            </div>
                        )}
                    </div>

                    {/* Filter Tabs Removed */}

                    {/* Chat List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingChats ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                Loading conversations...
                            </div>
                        ) : chats.length === 0 && !initialUserId && !isNewChatView ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                No conversations yet. Start a new chat!
                            </div>
                        ) : (
                            chats.map(chat => (
                                <div
                                    key={chat.channelId}
                                    onClick={() => { setSelectedChannel(chat); setIsNewChatView(false); }}
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        gap: '0.8rem',
                                        cursor: 'pointer',
                                        background: selectedChannel?.channelId === chat.channelId ? 'var(--bg-pill)' : 'transparent',
                                        transition: 'all 0.2s',
                                        alignItems: 'center'
                                    }}
                                >
                                    <img src={getChannelAvatar(chat)} style={{ width: '50px', height: '50px', borderRadius: '50%' }} alt="" />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: '600', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {getChannelName(chat)}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: chat.unreadCount > 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {chat.lastMessage?.text || 'No messages yet'}
                                            <span style={{ margin: '0 4px' }}>•</span>
                                            <span style={{ fontSize: '0.8rem' }}>2h</span>
                                        </div>
                                    </div>
                                    {chat.unreadCount > 0 ? (
                                        <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '10px', height: '10px' }}></span>
                                    ) : (
                                        <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>📷</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Area (Full width on mobile if chat selected) */}
                <div className="messaging-modal-main">
                    {isNewChatView ? (
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Mobile Header for New Chat */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <button className="mobile-back-btn" onClick={() => setIsNewChatView(false)}>←</button>
                                <h3 style={{ margin: 0 }}>Start a New Conversation</h3>
                            </div>

                            {selectedUsersForGroup.length > 1 && (
                                <input
                                    type="text"
                                    name="group_name"
                                    placeholder="Group Name (Optional)"
                                    value={groupNameInput}
                                    onChange={e => setGroupNameInput(e.target.value)}
                                    style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '1rem', width: '100%' }}
                                />
                            )}

                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem' }}>
                                {allUsers.filter(u => u.id !== user.id).map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUserSelection(u.id)}
                                        style={{
                                            padding: '0.8rem 1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            cursor: 'pointer',
                                            background: selectedUsersForGroup.includes(u.id) ? '#e3f2fd' : 'transparent',
                                            borderBottom: '1px solid var(--color-border)'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #b2bec3',
                                            background: selectedUsersForGroup.includes(u.id) ? 'var(--color-primary)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {selectedUsersForGroup.includes(u.id) && <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>}
                                        </div>
                                        <img src={u.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                                        <span>{u.username}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setIsNewChatView(false)} style={{ padding: '0.8rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                                <button
                                    onClick={handleStartNewChat}
                                    disabled={selectedUsersForGroup.length === 0}
                                    style={{
                                        padding: '0.8rem 2rem',
                                        border: 'none',
                                        background: selectedUsersForGroup.length > 0 ? 'var(--color-primary)' : '#b2bec3',
                                        color: 'white',
                                        borderRadius: '30px',
                                        fontWeight: 'bold',
                                        cursor: selectedUsersForGroup.length > 0 ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Start Chat {selectedUsersForGroup.length > 1 ? `(${selectedUsersForGroup.length})` : ''}
                                </button>
                            </div>
                        </div>
                    ) : selectedChannel ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <button className="mobile-back-btn" onClick={() => setSelectedChannel(null)}>←</button>
                                    <img src={getChannelAvatar(selectedChannel)} style={{ width: '36px', height: '36px', borderRadius: '50%' }} alt="" />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '700' }}>{getChannelName(selectedChannel)}</span>
                                        {selectedChannel.isGroup && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {selectedChannel.participants.length} members
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '1.2rem' }}>
                                    <span>📞</span>
                                    <span>📹</span>
                                    <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {selectedChannel.messages.length === 0 ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <img src={getChannelAvatar(selectedChannel)} style={{ width: '80px', height: '80px', borderRadius: '50%' }} alt="" />
                                            <h3>{getChannelName(selectedChannel)}</h3>
                                            <button style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--color-border)', background: 'transparent' }}>View Profile</button>
                                        </div>
                                    </div>
                                ) : (
                                    selectedChannel.messages.map((msg, i) => {
                                        const isMe = msg.from === user.id;
                                        const sender = selectedChannel.isGroup && !isMe
                                            ? selectedChannel.participants.find(p => p.id === msg.from)
                                            : null;

                                        return (
                                            <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                                {sender && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2px', marginLeft: '4px' }}>
                                                        {sender.username}
                                                    </div>
                                                )}
                                                <div style={{
                                                    padding: '0.8rem 1rem',
                                                    borderRadius: '20px',
                                                    background: isMe ? 'var(--color-primary)' : 'var(--bg-pill)',
                                                    color: isMe ? 'white' : 'var(--color-text-main)',
                                                    fontSize: '0.95rem',
                                                    lineHeight: '1.4',
                                                }}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendMessage} style={{ padding: '1rem', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                <div style={{ background: 'var(--bg-pill)', borderRadius: '25px', display: 'flex', alignItems: 'center', flex: 1, padding: '0.2rem 0.5rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--color-primary)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>📷</span>
                                    </div>
                                    <input
                                        type="text"
                                        name="new_message"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Message..."
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                    <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', padding: '0 0.5rem' }}>🎤</button>
                                    <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', padding: '0 0.5rem' }}>🖼️</button>
                                </div>
                                {newMessage.trim() && (
                                    <button
                                        type="submit"
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        Send
                                    </button>
                                )}
                            </form>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default MessagingModal;
