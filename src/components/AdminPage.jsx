import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const AdminPage = () => {
    const {
        user,
        getCategoryRequests, approveCategoryRequest, rejectCategoryRequest,
        banUser, unbanUser, getSystemStats, backupDatabase, resetDatabase, seedDatabase,
        allUsers, updateProfile
    } = useAppContext();

    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);

    // User Management State
    const [userSearch, setUserSearch] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated, activeTab]);

    const loadData = () => {
        setRequests(getCategoryRequests());
        setStats(getSystemStats());
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123' || (user && user.role === 'admin')) {
            setIsAuthenticated(true);
        } else {
            alert('Invalid Password');
        }
    };

    // --- Tab Components ---

    const DashboardTab = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon="👥" color="#6c5ce7" />
            <StatCard title="Active (24h)" value={stats?.activeUsers || 0} icon="🟢" color="#00b894" />
            <StatCard title="Total Ideas" value={stats?.totalIdeas || 0} icon="💡" color="#fdcb6e" />
            <StatCard title="DB Size" value={`${((stats?.dbSize || 0) / 1024).toFixed(2)} KB`} icon="💾" color="#a29bfe" />
            <StatCard title="Pending Reports" value={stats?.pendingReports || 0} icon="🚩" color="#ff7675" />
        </div>
    );

    const UserManagementTab = () => {
        const handleSearch = (e) => {
            const term = e.target.value.toLowerCase();
            setUserSearch(term);
            if (term.length > 1) {
                const results = allUsers.filter(u => u.username.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
                setFoundUsers(results);
            } else {
                setFoundUsers([]);
            }
        };

        const executeBan = (userId, isBanned) => {
            if (confirm(isBanned ? "Unban this user?" : "Ban this user? They will be unable to login.")) {
                const result = isBanned ? unbanUser(userId) : banUser(userId);
                if (result.success) {
                    alert(isBanned ? "User Unbanned" : "User Banned");
                    // Refresh search results locally
                    setFoundUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !isBanned } : u));
                }
            }
        };

        return (
            <div>
                <div style={{ marginBottom: '2rem' }}>
                    <input
                        type="text"
                        name="admin_user_search"
                        placeholder="Search users by name or email..."
                        value={userSearch}
                        onChange={handleSearch}
                        style={{
                            width: '100%', padding: '1rem', borderRadius: '12px',
                            border: '1px solid var(--color-border)', background: 'var(--bg-surface)',
                            color: 'var(--color-text-main)', fontSize: '1rem'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {foundUsers.map(u => (
                        <div key={u.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px',
                            borderLeft: `4px solid ${u.isBanned ? 'var(--color-danger)' : 'var(--color-success)'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img src={u.avatar} alt={u.username} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{u.username} {u.role === 'admin' && '👑'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.email} • ID: {u.id}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => executeBan(u.id, u.isBanned)}
                                    style={{
                                        padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                        background: u.isBanned ? 'var(--color-success)' : 'var(--color-danger)',
                                        color: 'white', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    {u.isBanned ? "Unban" : "Ban"}
                                </button>
                            </div>
                        </div>
                    ))}
                    {userSearch && foundUsers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found.</p>}
                </div>
            </div>
        );
    };

    const ContentTab = () => (
        <div>
            <h3 style={{ marginBottom: '1rem' }}>Category Requests</h3>
            {requests.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No pending requests.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requests.map(req => (
                        <div key={req.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div>
                                <strong>{req.name}</strong> <span style={{ color: 'var(--color-text-muted)' }}>by {req.user}</span>
                                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Status: {req.status}</div>
                            </div>
                            {req.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => { approveCategoryRequest(req.id); loadData(); }}
                                        style={{ padding: '0.5rem 1rem', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    >Approve</button>
                                    <button
                                        onClick={() => { rejectCategoryRequest(req.id); loadData(); }}
                                        style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: '6px', cursor: 'pointer' }}
                                    >Reject</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const ToolkitTab = () => {
        const handleBackup = () => {
            const data = backupDatabase();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `woi_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        const handleReset = () => {
            if (confirm("DANGER: This will wipe all data and reload the page. Are you sure?")) {
                resetDatabase();
            }
        };

        const handleSeed = () => {
            if (confirm("Re-seed database with default data? This might overwrite existing keys.")) {
                seedDatabase();
                alert("Database seeded.");
                loadData();
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                    <h3>📦 Data Backup</h3>
                    <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--color-text-muted)' }}>Export the entire LocalStorage database as a JSON file.</p>
                    <button onClick={handleBackup} style={{ padding: '0.8rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Download Backup</button>
                </div>

                <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                    <h3>🌱 Seed Data</h3>
                    <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--color-text-muted)' }}>Populate the database with initial mock users and ideas.</p>
                    <button onClick={handleSeed} style={{ padding: '0.8rem 1.5rem', background: 'var(--color-secondary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Seed Database</button>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255, 118, 117, 0.1)', borderRadius: '12px', border: '1px solid var(--color-danger)' }}>
                    <h3 style={{ color: 'var(--color-danger)' }}>⚠️ Danger Zone</h3>
                    <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--color-text-muted)' }}>Wipe all data and reset the application state.</p>
                    <button onClick={handleReset} style={{ padding: '0.8rem 1.5rem', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Reset Everything</button>
                </div>
            </div>
        );
    };

    if (!isAuthenticated) return <LoginScreen password={password} setPassword={setPassword} handleLogin={handleLogin} />;

    return (
        <div style={{ padding: '8rem 2rem 4rem 2rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', fontFamily: "'Quicksand', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--color-text-main)' }}>Admin Operations</h1>
                <span style={{ padding: '0.5rem 1rem', background: 'var(--bg-panel)', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid var(--color-border)' }}>
                    Logged in as {user ? user.username : 'Admin'}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Sidebar Navigation */}
                <div style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" label="Dashboard" />
                    <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👥" label="User Management" />
                    <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon="🛡️" label="Content Moderation" />
                    <NavButton active={activeTab === 'toolkit'} onClick={() => setActiveTab('toolkit')} icon="🛠️" label="Solo Dev Toolkit" />
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', boxShadow: 'var(--shadow-main)', minHeight: '500px' }}>
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'users' && <UserManagementTab />}
                    {activeTab === 'content' && <ContentTab />}
                    {activeTab === 'toolkit' && <ToolkitTab />}
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const StatCard = ({ title, value, icon, color }) => (
    <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem' }}>
            <span>{icon}</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{title}</div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text-main)' }}>{value}</div>
    </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem 1.5rem', borderRadius: '12px',
            background: active ? 'var(--color-primary)' : 'var(--bg-card)',
            color: active ? 'white' : 'var(--color-text-main)',
            border: active ? 'none' : '1px solid transparent',
            cursor: 'pointer', textAlign: 'left', fontWeight: 'bold',
            transition: 'all 0.2s ease',
            boxShadow: active ? '0 4px 15px rgba(108, 92, 231, 0.4)' : 'none'
        }}
    >
        <span>{icon}</span> {label}
    </button>
);

const LoginScreen = ({ password, setPassword, handleLogin }) => (
    <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)'
    }}>
        <div style={{
            padding: '3rem', background: 'var(--bg-card)', borderRadius: '24px',
            boxShadow: 'var(--shadow-main)', textAlign: 'center', maxWidth: '400px', width: '100%'
        }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-text-main)', fontSize: '2rem' }}>Admin Access</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>Secure Restricted Area</p>
            <form onSubmit={handleLogin}>
                <input
                    type="password"
                    name="admin_access_key"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter Access Key"
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '12px',
                        border: '1px solid var(--color-border)', marginBottom: '1rem',
                        outline: 'none', background: 'var(--bg-surface)', color: 'var(--color-text-main)'
                    }}
                />
                <button type="submit" style={{
                    width: '100%', padding: '1rem', borderRadius: '50px',
                    background: 'var(--color-primary)', color: 'white', border: 'none',
                    fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem',
                    boxShadow: '0 4px 15px rgba(108, 92, 231, 0.4)'
                }}>
                    Authenticate
                </button>
            </form>
        </div>
    </div>
);

export default AdminPage;
