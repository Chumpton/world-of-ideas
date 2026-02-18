import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileView from './ProfileView';
import AuthModal from './AuthModal';
import AboutModal from './AboutModal';
import { LegalModal } from './LegalModal';
import AnalyticsDashboard from './AnalyticsDashboard';
import ProModal from './ProModal';

import BuyCoinsModal from './BuyCoinsModal';
import MessagingModal from './MessagingModal';
import logo from '../assets/logo.png';
import { debugInfo } from '../debug/runtimeDebug';

const Layout = ({ children }) => {
    const {
        user, logout, setIsFormOpen, setDraftTitle, getNotifications,
        markAllNotificationsRead, markNotificationRead, setCurrentPage,
        showMessaging, setShowMessaging, messagingUserId, setMessagingUserId,
        selectedProfileUserId, setSelectedProfileUserId, viewProfile,
        selectedIdea,
        developerMode, toggleDeveloperMode, // Added
        isDarkMode, toggleTheme // Theme Control
    } = useAppContext();
    const [showAbout, setShowAbout] = useState(false);
    const [showPro, setShowPro] = useState(false);
    const [showBuyCoins, setShowBuyCoins] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const [authModal, setAuthModal] = useState(null); // 'login', 'signup', or null
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // New Page States
    const [showRules, setShowRules] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Content Creation Modals
    const [showBountyModal, setShowBountyModal] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(null); // For Apply Now form

    const fallbackAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || user?.email || 'User')}&background=random&color=fff`;

    useEffect(() => {
        debugInfo('layout', 'Layout mounted');
        return () => debugInfo('layout', 'Layout unmounted');
    }, []);


    // Load notifications when user changes
    useEffect(() => {
        let active = true;
        const loadNotifications = async () => {
            if (!user || !getNotifications) {
                if (active) setNotifications([]);
                return;
            }
            const rows = await getNotifications();
            if (active) setNotifications(Array.isArray(rows) ? rows : []);
        };
        loadNotifications();
        return () => { active = false; };
    }, [user]);

    useEffect(() => {
        debugInfo('layout.state', 'Layout state changed', {
            hasUser: !!user?.id,
            showMessaging,
            isMenuOpen,
            showNotifications,
            hasSelectedIdea: !!selectedIdea,
            unreadCount: (Array.isArray(notifications) ? notifications : []).filter(n => !n.read).length,
        });
    }, [user?.id, showMessaging, isMenuOpen, showNotifications, notifications.length, selectedIdea]);

    useEffect(() => {
        if (selectedIdea) {
            setIsMenuOpen(false);
            setShowCreateMenu(false);
            setShowNotifications(false);
            setShowHeader(false);
        } else {
            setShowHeader(true);
        }
    }, [selectedIdea]);

    // Sticky Header Logic (Reveal on scroll up)
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 50) {
                setShowHeader(true); // Always show at top
            } else if (currentScrollY < lastScrollY) {
                setShowHeader(true); // Show when scrolling up
            } else {
                setShowHeader(false); // Hide when scrolling down
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Close Create Menu on Scroll
    useEffect(() => {
        const handleScroll = () => {
            if (showCreateMenu) setShowCreateMenu(false);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showCreateMenu]);




    const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => !n.read).length;
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    const MenuItem = ({ icon, label, onClick, badge }) => (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'background 0.2s',
                position: 'relative'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ fontSize: '1.3rem', width: '28px', textAlign: 'center' }}>{icon}</span>
            <span style={{ fontWeight: '600', flex: 1 }}>{label}</span>
            {badge && <span style={{ background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>{badge}</span>}
        </div>
    );

    const MenuDivider = ({ label }) => (
        <div style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
        </div>
    );

    return (
        <div className="layout">
            {/* Header: Rounded bottom corners, tighter padding, Sticky/Reveal */}
            <header className="app-header" style={{
                padding: '0.5rem 1rem', // Tighter padding
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '60px', // Fixed height
                background: 'var(--bg-header)',
                // borderBottom: '1px solid rgba(0,0,0,0.05)', // Removed border for seamless look
                borderBottomLeftRadius: '20px', // Round the banner
                borderBottomRightRadius: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                zIndex: 100,
                position: 'fixed',
                top: 0,
                left: '50%',
                width: '100%',
                maxWidth: '1600px',
                boxSizing: 'border-box',
                transition: 'transform 0.3s ease',
                transform: showHeader ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-100%)',
                pointerEvents: selectedIdea ? 'none' : 'auto'
            }}>
                {/* LEFT: Logo */}
                <div
                    onClick={() => { setCurrentPage('home'); window.scrollTo(0, 0); }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <img src={logo} alt="World of Ideas" style={{ height: '40px', objectFit: 'contain' }} />
                </div>

                {/* CENTER: Dark Mode Toggle (Pill) */}
                <div
                    className="header-center-controls"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        background: 'var(--bg-pill)',
                        border: '1px solid var(--color-border)',
                        padding: '4px 12px',
                        borderRadius: '30px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}
                    onClick={toggleTheme}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
                >
                    <span style={{ fontSize: '1rem', opacity: isDarkMode ? 0.3 : 1 }}>☀️</span>
                    <span style={{ width: '1px', height: '12px', background: 'var(--color-border)' }}></span>
                    <span style={{ fontSize: '1rem', opacity: isDarkMode ? 1 : 0.3 }}>🌙</span>
                </div>

                {/* RIGHT: Actions - Tighter spacing */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {/* Influence/Coins - HIDDEN FOR SIMPLIFICATION */}
                            {/* <div
                                onClick={() => {
                                    setShowBuyCoins(true);
                                    setIsMenuOpen(false);
                                }}
                                className="influence-container"
                                title="Buy Coins"
                            >
                                <span style={{ fontSize: '0.75rem', color: '#e58e26' }}>🪙</span>
                                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1 }}>{user.cash ?? user.coins ?? user.influence ?? 0}</span>
                            </div> */}

                            {/* Create Menu Button (+) */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                                    style={{
                                        background: 'transparent', // No fill
                                        border: '2.5px solid var(--color-text-main)', // Thicker stroke
                                        borderRadius: '8px',
                                        width: '30px', // Slightly smaller box for visually tighter feel
                                        height: '30px',
                                        color: 'var(--color-text-main)',
                                        fontSize: '1.4rem',
                                        fontWeight: '500', // Slightly bolder plus
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginRight: '0.3rem'
                                    }}
                                    title="Create New..."
                                >
                                    +
                                </button>
                                {showCreateMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '120%',
                                        right: 0,
                                        background: 'var(--bg-panel)', // Safer, cleaner background
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        width: '180px',
                                        zIndex: 1001,
                                        overflow: 'hidden'
                                    }}>
                                        {[
                                            { label: '💡 New Idea', action: () => { setIsFormOpen(true); setShowCreateMenu(false); } },
                                            { label: '📘 New Guide', action: () => { setCurrentPage('guides'); setShowCreateMenu(false); } },
                                            { label: '🎯 New Bounty', action: () => { setShowBountyModal(true); setShowCreateMenu(false); } },
                                            { label: '📖 New Story', action: () => { setShowMessaging(true); setShowCreateMenu(false); } }
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={item.action}
                                                style={{
                                                    padding: '0.8rem 1rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    color: 'var(--color-text-main)',
                                                    borderBottom: idx < 3 ? '1px solid var(--color-border-subtle)' : 'none',
                                                    transition: 'background 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chat Bubble Icon */}
                            <button
                                onClick={() => setShowMessaging(true)}
                                style={{
                                    background: 'transparent',
                                    border: 'none', // Remove circle
                                    borderRadius: '0',
                                    width: '38px',
                                    height: '38px',
                                    color: 'var(--color-text-main)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginRight: '0.1rem'
                                }}
                                title="Messages"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                            </button>

                            {/* Notification Bell - Minimalist Outline */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0.4rem',
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--color-text-main)'
                                    }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '0px',
                                            right: '0px',
                                            background: '#d63031',
                                            color: 'white',
                                            fontSize: '0.6rem',
                                            fontWeight: 'bold',
                                            padding: '0',
                                            borderRadius: '50%',
                                            width: '14px',
                                            height: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid white'
                                        }}>{unreadCount}</span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="notification-dropdown" style={{
                                        position: 'absolute',
                                        top: '140%',
                                        right: -10,
                                        width: '320px',
                                        maxWidth: 'calc(100vw - 1rem)',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        background: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        zIndex: 1000,
                                        marginTop: '0.5rem'
                                    }}>
                                        <div style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid #f1f2f6',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ fontWeight: 'bold' }}>Notifications</span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={() => {
                                                        markAllNotificationsRead();
                                                        setNotifications(prev => prev.map(item => ({ ...item, read: true })));
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--color-secondary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >Mark all read</button>
                                            )}
                                        </div>
                                        {safeNotifications.length === 0 ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No notifications yet
                                            </div>
                                        ) : (
                                            safeNotifications.slice(0, 10).map(n => (
                                                <div key={n.id} onClick={() => {
                                                    markNotificationRead(n.id);
                                                    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                                                    // Optional: Navigate if it has a link logic
                                                }} style={{
                                                    padding: '0.8rem 1rem',
                                                    borderBottom: '1px solid #f8f9fa',
                                                    background: n.read ? 'white' : '#f8f9fa',
                                                    cursor: 'pointer'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>{n.message}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        {new Date(n.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Profile Circle - OPENS MENU */}
                            <div
                                onClick={() => setIsMenuOpen(true)}
                                style={{
                                    width: '35px',
                                    height: '35px',
                                    borderRadius: '50%',
                                    background: '#a29bfe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '3px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    zIndex: 105, // Ensure above other header elements
                                    position: 'relative'
                                }}
                            >
                                <img
                                    src={user.avatar || user.avatar_url || fallbackAvatar}
                                    alt={user.username || 'Profile'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="auth-buttons" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* PRO Button Removed */}
                            <button onClick={() => setAuthModal('login')} className="tab-btn header-btn" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'transparent' }}>Log In</button>
                            <button onClick={() => setAuthModal('signup')} className="tab-btn header-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>Sign Up</button>
                        </div>
                    )}
                </div>
            </header>
            <main className="main-content" style={{ paddingTop: '80px' }}>
                {children}
            </main>

            {selectedProfileUserId && (
                <ProfileView targetUserId={selectedProfileUserId} onClose={() => setSelectedProfileUserId(null)} />
            )}

            {showAbout && (
                <AboutModal onClose={() => setShowAbout(false)} />
            )}

            {showPro && (
                <ProModal onClose={() => setShowPro(false)} />
            )}

            {showRules && <LegalModal type="rules" onClose={() => setShowRules(false)} />}
            {showPolicy && <LegalModal type="policy" onClose={() => setShowPolicy(false)} />}
            {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}

            {authModal && (
                <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />
            )}

            {/* Slide-Out Menu Drawer */}
            {isMenuOpen && (
                <>
                    <div
                        onClick={() => setIsMenuOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.4)',
                            zIndex: 999,
                            animation: 'fadeIn 0.2s ease'
                        }}
                    />

                    <div style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: '320px',
                        maxWidth: '85vw',
                        height: '100vh',
                        background: 'var(--bg-panel)',
                        zIndex: 1000,
                        boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideInRight 0.25s ease'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-menu-header)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #a29bfe 0%, #74b9ff 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.3rem',
                                    boxShadow: '0 4px 12px rgba(162, 155, 254, 0.4)',
                                    overflow: 'hidden'
                                }}>
                                    {user ? <img src={fallbackAvatar} alt={user.username || 'Profile'} style={{ width: '100%', height: '100%' }} /> : '👤'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user ? user.username : 'Guest'}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                        {user ? `⚡ ${user.influence} Influence` : 'Not logged in'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                            <MenuDivider label="Navigation" />
                            <MenuItem icon="👤" label="Profile" onClick={() => { setIsMenuOpen(false); viewProfile(user?.id); }} />
                            <MenuItem icon="📜" label="My Ideas" badge={user?.ideas?.length || null} onClick={() => { setIsMenuOpen(false); alert('My Ideas Filter'); }} />
                            <MenuItem icon="🌍" label="Global Map" onClick={() => { setIsMenuOpen(false); setCurrentPage('world'); window.scrollTo(0, 0); }} />
                            <MenuItem icon="👥" label="Find Talent" onClick={() => { setIsMenuOpen(false); setCurrentPage('people'); window.scrollTo(0, 0); }} />
                            <MenuItem icon="🔮" label="Groups" onClick={() => { setIsMenuOpen(false); setCurrentPage('groups'); }} />
                            <MenuItem icon="📊" label="Leaderboard" onClick={() => alert('Viewing leaderboard...')} />
                            <MenuItem icon="⑂" label="My Forks" onClick={() => alert('Viewing your forks...')} />
                            <MenuItem icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a6 6 0 0 1 6 6c0 7-3 9-3 9h-6s-3-2-3-9a6 6 0 0 1 6-6z" />
                                    <line x1="9" y1="22" x2="15" y2="22" />
                                </svg>
                            } label="Submit Idea" onClick={() => { setIsMenuOpen(false); setDraftTitle(''); setIsFormOpen(true); }} />

                            <MenuDivider label="Platform" />
                            <MenuItem icon="📜" label="Rules" onClick={() => { setShowRules(true); setIsMenuOpen(false); }} />
                            <MenuItem icon="⚖️" label="Privacy Policy" onClick={() => { setShowPolicy(true); setIsMenuOpen(false); }} />
                            <MenuItem icon="🛠️" label={developerMode ? "Disable Dev Mode" : "Enable Dev Mode"} onClick={() => { toggleDeveloperMode(); setIsMenuOpen(false); }} />
                            {developerMode && (
                                <MenuItem
                                    icon="🐞"
                                    label="Snapshot Debug Data"
                                    onClick={() => {
                                        const dump = {
                                            user,
                                            lastError: window.__WOI_LAST_SUPABASE_ERROR__,
                                            timestamp: new Date().toISOString()
                                        };
                                        console.log('--- DEBUG DUMP ---', dump);
                                        alert(`Debug Snapshot:\n\nUser: ${user ? user.email : 'None'}\nLast Error: ${JSON.stringify(window.__WOI_LAST_SUPABASE_ERROR__?.message || 'None')}\n\nFull dump logged to console.`);
                                        setIsMenuOpen(false);
                                    }}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {user && (
                                <button
                                    onClick={() => { logout(); setIsMenuOpen(false); }}
                                    style={{ width: '100%', padding: '0.6rem', background: 'transparent', color: '#d63031', border: '1px solid #d63031', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    🚪 Log Out
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            {showPro && <ProModal onClose={() => setShowPro(false)} />}
            {showBuyCoins && <BuyCoinsModal onClose={() => setShowBuyCoins(false)} />}
            {showMessaging && (
                <MessagingModal
                    onClose={() => { setShowMessaging(false); setMessagingUserId(null); }}
                    initialUserId={messagingUserId}
                />
            )}

            {/* Bounty Creation Modal */}
            {showBountyModal && (
                <div className="dimmer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBountyModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: '20px', padding: '2rem', width: '90%', maxWidth: '500px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🎯 Create New Bounty</h2>
                            <button onClick={() => setShowBountyModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input type="text" name="bounty_title" placeholder="Bounty Title (e.g., Design a Logo)" style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem' }} />
                            <textarea name="bounty_description" placeholder="Describe what you need done..." style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input type="number" name="bounty_reward" placeholder="Reward (coins)" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem' }} />
                                <select name="bounty_category" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem' }}>
                                    <option>Design</option>
                                    <option>Development</option>
                                    <option>Writing</option>
                                    <option>Research</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <button
                                onClick={() => { alert('🎯 Bounty posted! Hunters will see it in the feed.'); setShowBountyModal(false); }}
                                style={{ padding: '1rem', borderRadius: '50px', border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Post Bounty
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
