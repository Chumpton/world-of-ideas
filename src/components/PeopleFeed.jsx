import React from 'react';
import { useAppContext } from '../context/AppContext';
import PeopleCard from './PeopleCard';

const PeopleFeed = () => {
    const { allUsers, setCurrentPage } = useAppContext();

    // In a real app, we might filter this (e.g., sort by influence, or "people you might know")
    // For now, just show top sorted by influence
    const sortedUsers = [...allUsers].sort((a, b) => b.influence - a.influence);

    return (
        <div style={{ padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-text-main)' }}>People & Talent</h2>
                <button
                    onClick={() => { setCurrentPage('people'); window.scrollTo(0, 0); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--color-text-muted)' }}
                    title="View All"
                >
                    →
                </button>
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
                        <PeopleCard person={user} />
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
