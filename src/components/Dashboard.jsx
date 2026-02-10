import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import IdeaCard from './IdeaCard';

const Dashboard = () => {
    const { user, getUserActivity, isAdmin, allUsers, ideas, getClans } = useAppContext();
    const [activity, setActivity] = useState({ myIdeas: [], sparksGiven: [], myForks: [] });
    const [activeTab, setActiveTab] = useState('my_ideas');
    const [adminStats, setAdminStats] = useState({ totalUsers: 0, activeIdeas: 0, totalFunds: 0 });

    useEffect(() => {
        if (user) {
            setActivity(getUserActivity(user.id));
        }
    }, [user, getUserActivity]);

    // Calculate admin stats from real data
    useEffect(() => {
        if (isAdmin) {
            const clans = typeof getClans === 'function' ? getClans() : [];
            const totalFunds = ideas.reduce((sum, idea) => sum + (idea.stakedAmount || 0), 0);
            setAdminStats({
                totalUsers: allUsers?.length || 0,
                activeIdeas: ideas?.length || 0,
                totalFunds: totalFunds,
                totalClans: clans.length || 0
            });
        }
    }, [isAdmin, allUsers, ideas, getClans]);

    if (!user) return <div className="feed-container"><h2>Please login to view your dashboard.</h2></div>;

    const TabButton = ({ id, label, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.8rem 1.5rem',
                border: 'none',
                background: activeTab === id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === id ? 'white' : 'var(--color-text-muted)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
            }}
        >
            {label}
            {count !== undefined && <span style={{ opacity: 0.7, fontSize: '0.8em', background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '10px' }}>{count}</span>}
        </button>
    );

    const renderList = (list) => {
        if (!list || list.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No items found.</div>;
        return <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{list.map(idea => <IdeaCard key={idea.id} idea={idea} />)}</div>;
    };

    return (
        <div className="feed-container" style={{ padding: '2rem 0' }}>
            <div className="dashboard-header" style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>My Activity</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', flex: 1, minWidth: '200px', border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Influence</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>{user.influence}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', flex: 1, minWidth: '200px', border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cash Balance</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#2ecc71' }}>${user.cash?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', padding: '0 1rem' }}>
                <TabButton id="my_ideas" label="My Ideas" count={activity.myIdeas.length} />
                <TabButton id="sparks" label="Sparks Given" count={activity.sparksGiven.length} />
                <TabButton id="forks" label="My Forks" count={activity.myForks.length} />
                {isAdmin && <TabButton id="admin_analytics" label="Admin Analytics" count="🔒" />}
            </div>

            <div className="dashboard-content" style={{ padding: '0 1rem' }}>
                {activeTab === 'my_ideas' && renderList(activity.myIdeas)}
                {activeTab === 'sparks' && renderList(activity.sparksGiven)}
                {activeTab === 'forks' && renderList(activity.myForks)}

                {activeTab === 'admin_analytics' && (
                    isAdmin ? (
                        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#e74c3c' }}>Restricted Access: Site Analytics</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ padding: '1.5rem', background: 'var(--bg-pill)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Users</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{adminStats.totalUsers.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: '1.5rem', background: 'var(--bg-pill)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Active Ideas</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{adminStats.activeIdeas.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: '1.5rem', background: 'var(--bg-pill)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Coins Staked</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f39c12' }}>🪙 {adminStats.totalFunds.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: '1.5rem', background: 'var(--bg-pill)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Active Clans</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#6c5ce7' }}>{adminStats.totalClans || 0}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Access Denied</div>
                    )
                )}
            </div>
        </div>
    );
};

export default Dashboard;
