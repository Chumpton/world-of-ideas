import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import PeopleCard from './PeopleCard';

const PeopleFeed = () => {
    const { allUsers, setCurrentPage, viewProfile, refreshUsers } = useAppContext();

    useEffect(() => {
        void refreshUsers({ force: false, minIntervalMs: 30_000 });
    }, [refreshUsers]);

    const sortedUsers = [...(allUsers || [])]
        .filter((u) => u && u.id && (u.username || u.display_name))
        .sort((a, b) => {
            const bTs = new Date(b?.updated_at || b?.created_at || 0).getTime();
            const aTs = new Date(a?.updated_at || a?.created_at || 0).getTime();
            if (bTs !== aTs) return bTs - aTs;
            return Number(b?.influence || 0) - Number(a?.influence || 0);
        });

    return (
        <div style={{ padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-text-main)' }}>People & Talent</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                        onClick={() => { void refreshUsers({ force: true, minIntervalMs: 0 }); }}
                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '999px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.35rem 0.7rem', fontWeight: '700' }}
                        title="Refresh Talent"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={() => { setCurrentPage('people'); window.scrollTo(0, 0); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--color-text-muted)' }}
                        title="View All"
                    >
                        →
                    </button>
                </div>
            </div>

            <div
                id="people-scroll"
                style={{
                    display: 'flex',
                    gap: '1.5rem',
                    overflowX: 'auto',
                    padding: '0.5rem 1rem 1.5rem 1rem',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', // Firefox
                    // Hide scrollbar for clean look
                    msOverflowStyle: 'none',
                }}
            >
                {sortedUsers.map(user => (
                    <div key={user.id} style={{ scrollSnapAlign: 'start' }}>
                        <PeopleCard
                            person={user}
                            onClick={() => viewProfile(user.id)}
                        />
                    </div>
                ))}

                {sortedUsers.length === 0 && (
                    <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>
                        No users found to display.
                    </div>
                )}
            </div>

            <style>{`
                #people-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default PeopleFeed;
