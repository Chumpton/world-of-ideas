import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

const AdminPage = () => {
    const {
        user,
        canModerate,
        isAdmin,
        allUsers,
        ideas,
        getSystemStats,
        getModerationReports,
        getCategoryRequests,
        approveCategoryRequest,
        rejectCategoryRequest,
        reviewReport,
        deleteIdeaModeration,
        banUser,
        unbanUser,
        assignUserRole
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({ totalUsers: 0, totalIdeas: 0, pendingReports: 0 });
    const [reports, setReports] = useState([]);
    const [categoryRequests, setCategoryRequests] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [ideaSearch, setIdeaSearch] = useState('');

    const loadData = async () => {
        const [statsData, reportData, categoryData] = await Promise.all([
            getSystemStats(),
            getModerationReports(),
            getCategoryRequests ? getCategoryRequests() : Promise.resolve([])
        ]);
        setStats(statsData || { totalUsers: 0, totalIdeas: 0, pendingReports: 0 });
        setReports(Array.isArray(reportData) ? reportData : []);
        setCategoryRequests(Array.isArray(categoryData) ? categoryData : []);
    };

    useEffect(() => {
        if (canModerate) {
            void loadData();
        }
    }, [canModerate, activeTab]);

    if (!user) {
        return (
            <div style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                Login required.
            </div>
        );
    }

    if (!canModerate) {
        return (
            <div style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                Admin/Moderator access required.
            </div>
        );
    }

    const filteredUsers = useMemo(() => {
        const q = userSearch.trim().toLowerCase();
        if (!q) return [];
        return allUsers.filter(u =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        );
    }, [allUsers, userSearch]);

    const filteredIdeas = useMemo(() => {
        const q = ideaSearch.trim().toLowerCase();
        if (!q) return [];
        return ideas.filter(i =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.author || '').toLowerCase().includes(q)
        );
    }, [ideas, ideaSearch]);

    return (
        <div style={{ padding: '7rem 2rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginTop: 0 }}>Moderation Console</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
                Signed in as {user.username} ({user.role || 'user'})
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Dashboard" />
                <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="Reports" />
                <TabButton active={activeTab === 'category'} onClick={() => setActiveTab('category')} label="Category Submissions" />
                <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} label="Feedback Inbox" />
                <TabButton active={activeTab === 'ban_reviews'} onClick={() => setActiveTab('ban_reviews')} label="Ban Reviews" />
                <TabButton active={activeTab === 'role_requests'} onClick={() => setActiveTab('role_requests')} label="Role Requests" />
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Users" />
                <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} label="Content" />
            </div>

            {activeTab === 'dashboard' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <StatCard title="Users" value={stats.totalUsers || 0} />
                    <StatCard title="Ideas" value={stats.totalIdeas || 0} />
                    <StatCard title="Open Reports" value={stats.pendingReports || 0} />
                </div>
            )}

            {activeTab === 'reports' && (
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {reports.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>No reports.</div>}
                    {reports.map(r => (
                        <div key={r.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                <strong>{r.target_type}: {String(r.target_id).slice(0, 8)}...</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{r.status}</span>
                            </div>
                            <div style={{ marginTop: '0.4rem' }}>{r.reason}</div>
                            {r.details && <div style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)' }}>{r.details}</div>}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                                <button onClick={async () => { await reviewReport(r.id, 'Resolved by moderator', 'resolved'); await loadData(); }}>Resolve</button>
                                <button onClick={async () => { await reviewReport(r.id, 'Dismissed', 'dismissed'); await loadData(); }}>Dismiss</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'category' && (
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {categoryRequests.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>No pending category submissions.</div>}
                    {categoryRequests.map((r) => (
                        <div key={r.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
                            <strong>{r.name || r.category_name || 'Unnamed request'}</strong>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>status: {r.status || 'pending'}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                                <button onClick={async () => { await approveCategoryRequest?.(r.id); await loadData(); }}>Approve</button>
                                <button onClick={async () => { await rejectCategoryRequest?.(r.id); await loadData(); }}>Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'feedback' && (
                <ReportBucket reports={reports} targetTypes={['feedback', 'website_feedback']} emptyLabel="No feedback reports." />
            )}

            {activeTab === 'ban_reviews' && (
                <ReportBucket reports={reports} targetTypes={['ban_review', 'ban_reviews']} emptyLabel="No ban review requests." />
            )}

            {activeTab === 'role_requests' && (
                <ReportBucket reports={reports} targetTypes={['role_request', 'applications', 'application']} emptyLabel="No role requests in queue." />
            )}

            {activeTab === 'users' && (
                <div>
                    <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users by username/email"
                        style={{ width: '100%', maxWidth: '520px', padding: '0.7rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {filteredUsers.map(u => (
                            <div key={u.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <strong>{u.username}</strong>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{u.email || 'No email'} | role: {u.role || 'user'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {isAdmin && (
                                            <select
                                                defaultValue={u.role || 'user'}
                                                onChange={async (e) => {
                                                    const next = e.target.value;
                                                    const res = await assignUserRole(u.id, next);
                                                    if (!res.success) alert(res.reason || 'Role update failed');
                                                }}
                                            >
                                                <option value="user">user</option>
                                                <option value="moderator">moderator</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        )}
                                        <button onClick={async () => {
                                            const isBanned = !!u.is_banned;
                                            const res = isBanned ? await unbanUser(u.id) : await banUser(u.id, 'Manual moderation action');
                                            if (!res.success) alert(res.reason || 'Action failed');
                                        }}>
                                            {u.is_banned ? 'Unban' : 'Ban'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'content' && (
                <div>
                    <input
                        value={ideaSearch}
                        onChange={(e) => setIdeaSearch(e.target.value)}
                        placeholder="Search ideas by title/author"
                        style={{ width: '100%', maxWidth: '520px', padding: '0.7rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                    />
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {filteredIdeas.map(i => (
                            <div key={i.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                                <div>
                                    <strong>{i.title}</strong>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>by {i.author || 'Unknown'}</div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Delete this idea?')) return;
                                        const res = await deleteIdeaModeration(i.id);
                                        if (!res.success) alert(res.reason || 'Delete failed');
                                    }}
                                    style={{ background: '#d63031', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem' }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        style={{
            padding: '0.6rem 1rem',
            borderRadius: '9px',
            border: active ? 'none' : '1px solid var(--color-border)',
            background: active ? 'var(--color-primary)' : 'var(--bg-card)',
            color: active ? 'white' : 'var(--color-text-main)',
            fontWeight: 'bold',
            cursor: 'pointer'
        }}
    >
        {label}
    </button>
);

const StatCard = ({ title, value }) => (
    <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{title}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</div>
    </div>
);

const ReportBucket = ({ reports = [], targetTypes = [], emptyLabel = 'No items.' }) => {
    const normalized = new Set(targetTypes.map((t) => String(t).toLowerCase()));
    const rows = (Array.isArray(reports) ? reports : []).filter((r) => normalized.has(String(r?.target_type || '').toLowerCase()));
    return (
        <div style={{ display: 'grid', gap: '0.8rem' }}>
            {rows.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>{emptyLabel}</div>}
            {rows.map((r) => (
                <div key={r.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
                    <strong>{r.target_type}</strong>
                    <div style={{ marginTop: '0.3rem' }}>{r.reason || 'No reason provided'}</div>
                    {r.details && <div style={{ color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{r.details}</div>}
                </div>
            ))}
        </div>
    );
};

export default AdminPage;
