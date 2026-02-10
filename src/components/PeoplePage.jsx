import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileView from './ProfileView';
import PeopleCard from './PeopleCard';

const PeoplePage = () => {
    const { allUsers, user, followUser, openMessenger } = useAppContext();
    const [search, setSearch] = useState('');
    const [filterVibe, setFilterVibe] = useState('all');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Filter logic
    const filteredUsers = (allUsers || []).filter(u => {
        if (!u) return false;
        const name = u.username || '';
        const job = u.jobTitle || '';
        const skills = u.skills || [];

        const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
            job.toLowerCase().includes(search.toLowerCase()) ||
            skills.some(s => s && s.toLowerCase().includes(search.toLowerCase()));

        const matchesVibe = filterVibe === 'all' || u.vibe === filterVibe;
        return matchesSearch && matchesVibe;
    });

    const isFollowing = (targetId) => {
        if (!user || !user.following) return false;
        return user.following.includes(targetId);
    };

    const handleFollow = (id) => {
        if (!user) return alert("Please login to follow creators.");
        followUser(id);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem 6rem 1rem' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #FF6B6B 0%, #FEC163 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Find Collaborators
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    Discover the visionaries, builders, and creative minds shaping the World of Ideas.
                </p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                    type="text"
                    placeholder="Search by name, role, or skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        padding: '1rem 1.5rem',
                        borderRadius: '30px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--bg-main)',
                        color: 'var(--color-text-main)',
                        minWidth: '300px',
                        fontSize: '1rem',
                        outline: 'none',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}
                />
                <select
                    value={filterVibe}
                    onChange={(e) => setFilterVibe(e.target.value)}
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '30px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--bg-main)',
                        color: 'var(--color-text-main)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    <option value="all">All Vibes</option>
                    <option value="Visionary">Visionary</option>
                    <option value="Builder">Builder</option>
                    <option value="Naturalist">Naturalist</option>
                    <option value="Analyst">Analyst</option>
                </select>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem', justifyItems: 'center' }}>
                {filteredUsers.map(u => (
                    <PeopleCard
                        key={u.id}
                        person={u}
                        onClick={() => setSelectedUserId(u.id)}
                    />
                ))}
            </div>

            {/* Profile Modal */}
            {selectedUserId && (
                <ProfileView
                    targetUserId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </div>
    );
};

export default PeoplePage;
