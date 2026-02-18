import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
const VerifiedBadge = ({ size = 16, style = {} }) => (
    <span className="verified-badge" title="Verified" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, marginLeft: '4px', verticalAlign: 'middle', ...style }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <circle cx="12" cy="12" r="12" fill={document.body.classList.contains('dark-mode') ? 'white' : 'black'} />
            <path d="M10 16.5L6 12.5L7.4 11.1L10 13.7L16.6 7.1L18 8.5L10 16.5Z" fill={document.body.classList.contains('dark-mode') ? 'black' : 'white'} />
        </svg>
    </span>
);

const ProfileView = ({ onClose, targetUserId }) => {
    const { user, allUsers, updateProfile, uploadAvatar, getGroups, joinGroup, getUserGroup, toggleMentorshipStatus, voteMentor, followUser, openMessenger, getUserActivity, getCoinsGiven, getSavedIdeas, setCurrentPage } = useAppContext();


    // Determine which user to display
    const isSelf = !targetUserId || targetUserId === user?.id;
    const profileUser = isSelf ? user : allUsers.find(u => u.id === targetUserId);

    const [userGroup, setUserGroup] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [activeTab, setActiveTab] = useState('contributions'); // contributions, saved, completed, badges
    const [isEditing, setIsEditing] = useState(false);
    const [activityData, setActivityData] = useState({ myIdeas: [], sparksGiven: [] }); // Real Data
    const [savedIdeas, setSavedIdeas] = useState([]);
    const [showUserList, setShowUserList] = useState(null); // 'followers' or 'following'

    const [editData, setEditData] = useState({
        username: profileUser?.username || '',
        display_name: profileUser?.display_name || profileUser?.username || '',
        bio: profileUser?.bio || '',
        location: profileUser?.location || '',
        expertise: profileUser?.expertiseText || profileUser?.expertise?.join(', ') || profileUser?.skills?.join(', ') || '',
        avatar: profileUser?.avatar || '',
        borderColor: profileUser?.borderColor || '#7d5fff'
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [coinsGiven, setCoinsGiven] = useState(0);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const BORDER_COLORS = ['#7d5fff', '#26de81', '#4b7bec', '#fa8231', '#fed330', '#eb3b5a', '#2bcbba'];

    // Badge Config
    const BADGES = {
        'Genesis': { icon: '🌌', label: 'Genesis', color: '#6c5ce7', bg: '#e0dbfb' },
        'Founder': { icon: '🏗️', label: 'Founder', color: '#d63031', bg: '#fad390' },
        'Oracle': { icon: '🔮', label: 'Oracle', color: '#0984e3', bg: '#dfe6e9' },
        'Verified Coach': { icon: '🎓', label: 'Coach', color: '#00b894', bg: '#55efc4' },
        'Project Leader': { icon: '🚀', label: 'Leader', color: '#e84393', bg: '#fab1a0' },
        'Local Hero': { icon: '🏘️', label: 'Hero', color: '#00cec9', bg: '#81ecec' },
        'Eco-Warrior': { icon: '🌿', label: 'Eco-Warrior', color: '#00b894', bg: '#55efc4' },
        'Architect': { icon: '🏛️', label: 'Architect', color: '#0984e3', bg: '#dfe6e9' },
        'Energy Guru': { icon: '⚡', label: 'Energy Guru', color: '#f39c12', bg: '#fce6c9' }
    };

    // Reputation Logic
    const influenceValue = Number(profileUser?.influence || 0);
    const level = profileUser ? Math.floor(influenceValue / 100) + 1 : 1;
    const nextLevel = level * 100;
    const progress = profileUser ? ((influenceValue % 100) / 100) * 100 : 0;

    const profileAvatar = profileUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.username || profileUser?.email || 'User')}&background=random&color=fff`;
    const activityIdeas = Array.isArray(activityData?.myIdeas) ? activityData.myIdeas : [];
    const ideaCount = Number(activityIdeas.length || profileUser?.submissions || 0);
    const expertiseItems = Array.isArray(profileUser?.expertise) && profileUser.expertise.length > 0
        ? profileUser.expertise
        : (Array.isArray(profileUser?.skills) ? profileUser.skills : []);

    // Load data
    useEffect(() => {
        let active = true;
        const loadProfileData = async () => {
            if (!profileUser) return;
            try {
                if (getUserGroup) {
                    const group = await getUserGroup(profileUser.id);
                    if (active) setUserGroup(group || null);
                }
                if (getUserActivity) {
                    const activity = await getUserActivity(profileUser.id);
                    if (active) {
                        setActivityData({
                            myIdeas: Array.isArray(activity?.myIdeas) ? activity.myIdeas : [],
                            sparksGiven: Array.isArray(activity?.sparksGiven) ? activity.sparksGiven : []
                        });
                    }
                }
                if (getGroups) {
                    const groups = await getGroups();
                    if (active) setAvailableGroups(Array.isArray(groups) ? groups : []);
                }
                if (getCoinsGiven) {
                    const given = await getCoinsGiven(profileUser.id);
                    if (active) setCoinsGiven(given);
                }
                if (getSavedIdeas) {
                    const saved = await getSavedIdeas(profileUser.id);
                    if (active) setSavedIdeas(Array.isArray(saved) ? saved : []);
                }
            } catch (err) {
                if (active) {
                    setUserGroup(null);
                    setActivityData({ myIdeas: [], sparksGiven: [] });
                    setAvailableGroups([]);
                    setCoinsGiven(0);
                    setSavedIdeas([]);
                }
            }
        };
        loadProfileData();
        return () => { active = false; };
    }, [profileUser, getUserGroup, getUserActivity, getGroups, getSavedIdeas, getCoinsGiven]);

    useEffect(() => {
        setEditData({
            username: profileUser?.username || '',
            display_name: profileUser?.display_name || profileUser?.username || '',
            bio: profileUser?.bio || '',
            location: profileUser?.location || '',
            expertise: profileUser?.expertiseText || (Array.isArray(profileUser?.expertise) ? profileUser.expertise.join(', ') : (Array.isArray(profileUser?.skills) ? profileUser.skills.join(', ') : '')),
            avatar: profileUser?.avatar || '',
            borderColor: profileUser?.borderColor || '#7d5fff'
        });
    }, [profileUser]);

    if (!profileUser) {
        return (
            <div className="dimmer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '20px' }}>
                    User profile not found.
                </div>
            </div>
        );
    }

    const parseExpertiseInput = (raw) => String(raw || '')
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((skill, index, arr) => arr.indexOf(skill) === index);
    const arrayShallowEqual = (a = [], b = []) => {
        if (a.length !== b.length) return false;
        return a.every((item, idx) => item === b[idx]);
    };

    const saveProfileChanges = async (changes, options = {}) => {
        const { closeEditor = false, clearAvatarDraft = false } = options;
        setIsSavingProfile(true);
        try {
            const result = await updateProfile(changes);
            if (!result?.success) {
                console.error('[ProfileView] Save failed:', result?.reason);
                alert(`Profile save failed: ${result?.reason || 'Unknown error'}`);
                return false;
            }
            if (clearAvatarDraft) {
                setAvatarFile(null);
                setAvatarPreview(null);
            }
            if (closeEditor) {
                setIsEditing(false);
            }
            return true;
        } catch (err) {
            console.error('[ProfileView] Save threw:', err);
            alert(`Profile save failed: ${err?.message || 'Unknown error'}`);
            return false;
        } finally {
            setIsSavingProfile(false);
        }
    };

    const saveAvatarOnly = async () => {
        let avatarUrl = (typeof editData.avatar === 'string')
            ? editData.avatar
            : (profileUser?.avatar || '');
        if (avatarFile && user) {
            const uploadResult = await uploadAvatar(avatarFile, user.id);
            if (uploadResult?.success && uploadResult?.url) {
                avatarUrl = uploadResult.url;
            } else {
                const reason = uploadResult?.reason || uploadResult?.error?.message || 'Unknown storage error';
                alert(`Avatar upload failed: ${reason}`);
                return;
            }
        }
        const saved = await saveProfileChanges({ avatar: avatarUrl }, { clearAvatarDraft: true });
        if (saved) {
            setEditData((prev) => ({ ...prev, avatar: avatarUrl }));
        }
    };

    const saveBioOnly = async () => {
        await saveProfileChanges({ bio: String(editData.bio || '').trim() });
    };

    const saveExpertiseOnly = async () => {
        const parsedExpertise = parseExpertiseInput(editData.expertise);
        await saveProfileChanges({ expertise: parsedExpertise, skills: parsedExpertise });
    };

    const handleSave = async () => {
        let avatarUrl = (typeof editData.avatar === 'string')
            ? editData.avatar
            : (profileUser?.avatar || '');
        if (avatarFile && user) {
            const uploadResult = await uploadAvatar(avatarFile, user.id);
            if (uploadResult?.success && uploadResult?.url) {
                avatarUrl = uploadResult.url;
            } else {
                const reason = uploadResult?.reason || uploadResult?.error?.message || 'Unknown storage error';
                alert(`Avatar upload failed: ${reason}`);
                return;
            }
        }
        const safeDisplayName = (editData.display_name || '').trim() || (profileUser?.display_name || profileUser?.username || '');
        const safeUsername = (editData.username || '').trim()
            || profileUser?.username
            || safeDisplayName
            || `user_${String(profileUser?.id || '').slice(0, 8)}`;
        const parsedExpertise = parseExpertiseInput(editData.expertise);
        const currentExpertise = Array.isArray(profileUser?.expertise) && profileUser.expertise.length > 0
            ? profileUser.expertise
            : (Array.isArray(profileUser?.skills) ? profileUser.skills : []);
        const hasChanges = Boolean(
            avatarFile
            || String(avatarUrl || '') !== String(profileUser?.avatar || '')
            || String(safeUsername || '') !== String(profileUser?.username || '')
            || String(safeDisplayName || '') !== String(profileUser?.display_name || profileUser?.username || '')
            || String(editData.bio || '').trim() !== String(profileUser?.bio || '')
            || String(editData.location || '').trim() !== String(profileUser?.location || '')
            || String(editData.borderColor || '#7d5fff') !== String(profileUser?.borderColor || '#7d5fff')
            || !arrayShallowEqual(parsedExpertise, currentExpertise)
        );
        if (!hasChanges) {
            setAvatarFile(null);
            setAvatarPreview(null);
            setIsEditing(false);
            return;
        }
        const saved = await saveProfileChanges({
            username: safeUsername,
            display_name: safeDisplayName || safeUsername,
            bio: String(editData.bio || '').trim(),
            location: String(editData.location || '').trim(),
            avatar: avatarUrl,
            borderColor: editData.borderColor || '#7d5fff',
            expertise: parsedExpertise,
            skills: parsedExpertise
        }, { closeEditor: true, clearAvatarDraft: true });
        if (saved) {
            setEditData((prev) => ({ ...prev, avatar: avatarUrl }));
        }
    };

    const isFollowing = profileUser && user?.following?.includes(profileUser.id);

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="submission-expanded" onClick={e => e.stopPropagation()} style={{
                maxWidth: '900px',
                width: '95%',
                maxHeight: '90vh', // Changed from fixed height to max-height
                height: 'auto',    // Allow auto height
                overflowY: 'auto',
                background: '#FDFCF8',
                borderRadius: '30px',
                padding: '0',
                margin: '0',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                fontFamily: "'Quicksand', sans-serif",
                display: 'flex',       // Layout fix
                flexDirection: 'column'
            }}>

                <button
                    onClick={onClose}
                    className="close-button"
                    style={{
                        position: 'sticky', // Makes it scroll-aware but visible
                        top: '15px',
                        left: '0',
                        marginLeft: 'auto', // Pushes to right in block flow if sticky
                        marginRight: '15px',
                        float: 'right', // Fallback
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        color: '#555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 200,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <span style={{ fontSize: '24px', fontWeight: '300' }}>&times;</span>
                </button>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                        {/* LEFT SIDEBAR: Avatar, Edit, Links */}
                        <div style={{ width: '100%', maxWidth: '240px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Avatar */}
                            <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', background: '#eee' }}>
                                <img
                                    src={profileAvatar}
                                    alt="Avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                        console.error('[ProfileView] Avatar load error', { src: profileAvatar, error: e });
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.username || 'User')}&background=random&color=fff`;
                                    }}
                                />
                            </div>

                            {/* Level / Reputation Bar (HIDDEN) */}
                            {/* <div style={{ padding: '0 0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>
                                    <span>LVL {level}</span>
                                    <span>{profileUser.influence} / {nextLevel} XP</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #fdcb6e, #e17055)', borderRadius: '4px' }}></div>
                                </div>
                            </div> */}

                            {/* Edit Button */}
                            {isSelf && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isSavingProfile) return;
                                        if (isEditing) {
                                            handleSave();
                                        } else {
                                            setIsEditing(true);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border)',
                                        background: isEditing ? 'var(--color-secondary)' : 'white',
                                        color: isEditing ? 'white' : 'var(--color-text-main)',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                        opacity: isSavingProfile ? 0.7 : 1
                                    }}
                                >
                                    {isEditing ? (isSavingProfile ? 'Saving...' : 'Save Details') : 'Edit Profile'}
                                </button>
                            )}

                            {isEditing && (
                                <>
                                    <div
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-secondary)'; }}
                                        onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = 'var(--color-border)';
                                            const file = e.dataTransfer.files[0];
                                            if (file && file.type.startsWith('image/')) {
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (ev) => {
                                                const file = ev.target.files[0];
                                                if (file) {
                                                    setAvatarFile(file);
                                                    setAvatarPreview(URL.createObjectURL(file));
                                                }
                                            };
                                            input.click();
                                        }}
                                        style={{
                                            border: '2px dashed var(--color-border)',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: 'var(--bg-app)',
                                            transition: 'border-color 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '1.5rem' }}>📷</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Drop or click to change avatar</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={saveAvatarOnly}
                                        style={{
                                            width: '100%',
                                            padding: '0.55rem 0.9rem',
                                            borderRadius: '10px',
                                            border: '1px solid var(--color-secondary)',
                                            background: 'white',
                                            color: 'var(--color-secondary)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Save Avatar
                                    </button>
                                    <div style={{ padding: '0.5rem 0' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Profile Color</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {BORDER_COLORS.map(color => (
                                                <div
                                                    key={color}
                                                    onClick={() => setEditData({ ...editData, borderColor: color })}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: color,
                                                        cursor: 'pointer',
                                                        border: editData.borderColor === color ? '2px solid black' : '2px solid white',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Location & Links */}
                            <div style={{ padding: '0 0.5rem' }}>
                                {/* Location */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                                    {isEditing ? (
                                        <input name="profile_location" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} style={{ width: '100%', padding: '4px', border: '1px solid var(--color-border)', borderRadius: '4px' }} placeholder="City, Country" />
                                    ) : (
                                        <span>{profileUser.location || 'Location not set'}</span>
                                    )}
                                </div>

                                {/* Links Placeholder */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                    {profileUser.links?.map((link, i) => (
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                                            🔗
                                        </a>
                                    ))}
                                    {isSelf && !profileUser.links?.length && (
                                        <button onClick={() => {
                                            const url = prompt('Enter a link URL (e.g., https://twitter.com/yourhandle):');
                                            if (url && url.trim()) {
                                                alert('🔗 Link added! It will appear on your profile.');
                                            }
                                        }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            + Add Links
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT CONTENT: Header, Stats, Bio */}
                        <div style={{ flex: 1, minWidth: '300px' }}>

                            {/* HEADER SECTION */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '280px' }}>
                                                <input name="profile_display_name" value={editData.display_name} onChange={e => setEditData({ ...editData, display_name: e.target.value })} style={{ fontSize: '2.5rem', fontWeight: '800', width: '100%', border: 'none', borderBottom: '2px solid var(--color-secondary)', background: 'transparent' }} placeholder="Display name" />
                                                <input name="profile_username" value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} style={{ fontSize: '1rem', fontWeight: '700', width: '100%', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '0.55rem 0.7rem', background: 'white' }} placeholder="Username (optional)" />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', fontFamily: "'Quicksand', sans-serif", color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {profileUser.display_name || profileUser.username}
                                                    {profileUser.isVerified && <VerifiedBadge size={28} />}
                                                </h1>                    {profileUser.mentorship?.verifiedCoach && <span title="Verified Coach" style={{ fontSize: '1.2rem', background: '#e0ffe0', padding: '4px', borderRadius: '50%' }}>✅</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {!isSelf && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => followUser(profileUser.id)} style={{ padding: '0.6rem 1.5rem', borderRadius: '50px', background: isFollowing ? 'var(--color-text-muted)' : 'var(--color-primary)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{isFollowing ? 'Following' : 'Follow'}</button>
                                            <button onClick={() => { onClose(); openMessenger(profileUser.id); }} style={{ padding: '0.6rem 1.2rem', borderRadius: '50px', border: '1px solid var(--color-border)', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Message</button>
                                        </div>
                                    )}
                                    {isSelf && (user?.role === 'admin' || user?.role === 'moderator') && (
                                        <button
                                            onClick={() => { setCurrentPage('admin'); onClose(); }}
                                            style={{
                                                padding: '0.6rem 1.2rem', borderRadius: '50px',
                                                background: 'var(--color-danger)', color: 'white',
                                                fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                                boxShadow: '0 4px 10px rgba(255, 107, 107, 0.3)'
                                            }}
                                        >
                                            ⚠️ Moderation Panel
                                        </button>
                                    )}
                                </div>

                                {/* Badges Row */}
                                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                                    {profileUser.mentorship?.isMentor && <span style={{ background: '#f1f2f6', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#2d3436' }}>🧠 MENTOR</span>}
                                    {profileUser.badges?.map(b => {
                                        const badge = BADGES[b] || BADGES['default'];
                                        return (
                                            <span key={b} title={b} style={{ background: badge?.bg || '#eee', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: badge?.color }}>
                                                {badge ? badge.icon : '🏅'} {b.toUpperCase()}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* TWO COLUMN GRID FOR DATA */}
                            <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '1.5rem' }}>

                                {/* LEFT SUB-COLUMN: Stats & Groups */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                    {/* STATS - Re-styled Left Aligned with Minimal Outline Icons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem 1rem', width: '100%' }}>
                                        {/* Influence */}
                                        <div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent)' }}>
                                                    <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                                </svg>
                                                {influenceValue}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '6px', letterSpacing: '0.5px' }}>INFLUENCE</div>
                                        </div>

                                        {/* Ideas */}
                                        <div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.25rem', color: '#f4b400', lineHeight: 1 }}>💡</span>
                                                {ideaCount}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '6px', letterSpacing: '0.5px' }}>IDEAS</div>
                                        </div>

                                        {/* Followers (Multi Group Icon) */}
                                        <div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowUserList('followers')}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="9" cy="7" r="4"></circle>
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                </svg>
                                                {profileUser.followers?.length || 0}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '6px', letterSpacing: '0.5px' }}>FOLLOWERS</div>
                                        </div>

                                        {/* Following (Single Person Icon) */}
                                        <div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowUserList('following')}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                                {profileUser.following?.length || 0}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '6px', letterSpacing: '0.5px' }}>FOLLOWING</div>
                                        </div>

                                        {/* Coins Given (HIDDEN) */}
                                        {/* <div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, color: '#f1c40f' }}>
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                                                    <path d="M12 18V6"></path>
                                                </svg>
                                                {coinsGiven}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginTop: '6px', letterSpacing: '0.5px' }}>COINS GIVEN</div>
                                        </div> */}
                                    </div>

                                    {/* GROUPS - Re-styled (Light Ghost) */}
                                    <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginBottom: '1rem', letterSpacing: '0.5px' }}>AFFILIATIONS</div>

                                        {userGroup ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '2rem' }}>{userGroup.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{userGroup.name}</div>
                                                    <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{userGroup.domain}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ marginBottom: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>Join a group to collaborate.</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {availableGroups.slice(0, 3).map(group => (
                                                        <button
                                                            key={group.id}
                                                            onClick={() => { joinGroup(group.id); setUserGroup(group); }}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                background: 'white',
                                                                border: '1px solid rgba(0,0,0,0.1)',
                                                                borderRadius: '12px',
                                                                color: 'var(--color-text-main)',
                                                                cursor: 'pointer',
                                                                fontWeight: '700',
                                                                fontSize: '0.8rem',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                        >{group.icon} {group.name}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* MENTORSHIP SECTION REMOVED */}
                                </div>

                                {/* RIGHT SUB-COLUMN: Bio & Skills */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* BIO */}
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginBottom: '0.8rem', letterSpacing: '0.5px' }}>ABOUT</div>
                                        {isEditing ? (
                                            <>
                                                <textarea name="profile_bio" value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} placeholder="Tell your story..." style={{ width: '100%', height: '120px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-primary)', outline: 'none', fontFamily: 'inherit', fontSize: '0.95rem', background: 'rgba(255,255,255,0.5)' }} />
                                                <div style={{ marginTop: '0.6rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={saveBioOnly}
                                                        style={{
                                                            padding: '0.5rem 0.9rem',
                                                            borderRadius: '10px',
                                                            border: '1px solid var(--color-secondary)',
                                                            background: 'white',
                                                            color: 'var(--color-secondary)',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            fontSize: '0.82rem'
                                                        }}
                                                    >
                                                        Save Bio
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--color-text-main)' }}>
                                                {profileUser.bio ? profileUser.bio : (
                                                    isSelf ?
                                                        <button onClick={() => setIsEditing(true)} style={{ color: 'var(--color-primary)', background: 'none', border: '1px dashed var(--color-primary)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>+ Add your bio</button>
                                                        : <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No bio available.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* SKILLS */}
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', opacity: 0.6, marginBottom: '0.8rem', letterSpacing: '0.5px' }}>EXPERTISE</div>
                                        {isEditing ? (
                                            <>
                                                <input
                                                    name="profile_expertise"
                                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-primary)', fontSize: '1rem', outline: 'none' }}
                                                    value={editData.expertise}
                                                    onChange={e => setEditData({ ...editData, expertise: e.target.value })}
                                                    placeholder="e.g. Design, Engineering, Gardening (comma separated)"
                                                />
                                                <div style={{ marginTop: '0.6rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={saveExpertiseOnly}
                                                        style={{
                                                            padding: '0.5rem 0.9rem',
                                                            borderRadius: '10px',
                                                            border: '1px solid var(--color-secondary)',
                                                            background: 'white',
                                                            color: 'var(--color-secondary)',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            fontSize: '0.82rem'
                                                        }}
                                                    >
                                                        Save Expertise
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                                {expertiseItems.length > 0 ? expertiseItems.map((skill, i) => (
                                                    <div key={i} style={{
                                                        padding: '0.6rem 1rem',
                                                        background: 'white',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(0,0,0,0.08)',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                        fontWeight: '700',
                                                        fontSize: '0.9rem',
                                                        color: 'var(--color-text-main)'
                                                    }}>
                                                        {skill}
                                                    </div>
                                                )) : (
                                                    isSelf ?
                                                        <button onClick={() => setIsEditing(true)} style={{ color: 'var(--color-primary)', background: 'none', border: '1px dashed var(--color-primary)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>+ Add skills</button> :
                                                        <span style={{ color: 'var(--color-text-muted)', opacity: 0.6, fontSize: '0.9rem' }}>No skills listed</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    {/* Bottom Section - Social Feed / History */}
                    <div style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                            {['contributions', 'saved', 'completed', 'badges'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`tab-underline ${activeTab === tab ? 'active' : ''}`}
                                >
                                    {tab.replace('completed', 'Completed Projects')}
                                </button>
                            ))}
                        </div>

                        {/* CONTENT AREA */}
                        <div style={{ minHeight: '200px' }}>
                            {activeTab === 'contributions' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {activityIdeas.length > 0 ? activityIdeas.map(idea => (
                                        <div key={idea.id} className="card-hover" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{idea.type}</div>
                                            <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem', fontWeight: '700' }}>{idea.title}</h4>
                                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⚡ {idea.votes}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💬 {idea.commentCount || 0}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ opacity: 0.6 }}>No contributions yet.</div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'saved' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {savedIdeas.length > 0 ? savedIdeas.map((idea) => (
                                        <div key={idea.id} className="card-hover" style={{ background: 'white', padding: '1rem 1.2rem', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                {idea.type || 'idea'}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.6rem', color: 'var(--color-text-main)' }}>
                                                {idea.title}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.8rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                                <span>⚡ {idea.votes || 0}</span>
                                                <span>💬 {idea.commentCount || 0}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                            No saved ideas yet.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'completed' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    <div className="card-hover" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', borderLeft: '5px solid #00b894', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#00b894', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COMPLETED • 2024</div>
                                        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem', fontWeight: '700' }}>Vertical Garden Initiative</h4>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Successfully implemented 50 vertical gardens in downtown metro area.</p>
                                    </div>
                                    <div className="card-hover" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', borderLeft: '5px solid #00b894', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#00b894', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COMPLETED • 2023</div>
                                        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem', fontWeight: '700' }}>Clean Water Drone Fleet</h4>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Deployed 20 autonomous drones for reservoir monitoring.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'badges' && (
                                <div>
                                    <h4 style={{ margin: '0 0 1.5rem 0', opacity: 0.7 }}>Earned Badges</h4>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                                        {profileUser.badges?.map(b => {
                                            const badge = BADGES[b] || BADGES['default'];
                                            return (
                                                <div key={b} style={{
                                                    background: 'white',
                                                    padding: '1rem',
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                                                    minWidth: '200px'
                                                }}>
                                                    <div style={{ fontSize: '2rem', background: badge?.bg, width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {badge ? badge.icon : '🏅'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '800', color: badge?.color }}>{b}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Earned 2024</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!profileUser.badges || profileUser.badges.length === 0) && <div style={{ opacity: 0.6 }}>No badges earned yet.</div>}
                                    </div>

                                    <h4 style={{ margin: '0 0 1.5rem 0', opacity: 0.7 }}>Available Badges</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {Object.entries(BADGES).map(([key, val]) => (
                                            <div key={key} style={{
                                                padding: '1rem',
                                                borderRadius: '16px',
                                                border: '1px dashed rgba(0,0,0,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                opacity: 0.6,
                                                filter: 'grayscale(1)'
                                            }}>
                                                <div style={{ fontSize: '1.5rem' }}>{val.icon}</div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{key}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* USER LIST MODAL OVERLAY */}
                    {showUserList && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(255,255,255,0.95)', zIndex: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ width: '400px', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px', padding: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{showUserList}</h3>
                                    <button onClick={() => setShowUserList(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                    {profileUser[showUserList]?.map(uid => {
                                        const u = allUsers.find(user => user.id === uid);
                                        if (!u) return null;
                                        return (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'User')}&background=random&color=fff`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                                                    <div style={{ fontSize: '0.8rem', color: u.borderColor }}>{u.vibe}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!profileUser[showUserList] || profileUser[showUserList].length === 0) && (
                                        <div style={{ opacity: 0.5 }}>List is empty.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ProfileView;
