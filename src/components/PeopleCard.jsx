import React from 'react';
import { useAppContext } from '../context/AppContext';

const VerifiedBadge = ({ size = 16, style = {} }) => (
    <span className="verified-badge" title="Verified" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, marginLeft: '4px', verticalAlign: 'middle', ...style }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <circle cx="12" cy="12" r="12" fill={document.body.classList.contains('dark-mode') ? 'white' : 'black'} />
            <path d="M10 16.5L6 12.5L7.4 11.1L10 13.7L16.6 7.1L18 8.5L10 16.5Z" fill={document.body.classList.contains('dark-mode') ? 'black' : 'white'} />
        </svg>
    </span>
);

const PeopleCard = ({ person, onClick }) => {
    const { followUser, user } = useAppContext();
    const isFollowing = user?.following?.includes(person.id);
    const isMe = user?.id === person.id;
    const level = Math.floor((person.influence || 0) / 100) + 1;

    const handleFollow = (e) => {
        e.stopPropagation();
        if (isMe) return;
        followUser(person.id);
    };

    return (
        <div style={{
            background: 'var(--bg-panel)',
            borderRadius: '24px',
            padding: '1.5rem',
            border: `1px solid var(--color-border)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            minWidth: '260px',
            maxWidth: '300px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: onClick ? 'pointer' : 'default',
            overflow: 'hidden'
        }}
            className="people-card-hover"
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
            }}
            onClick={onClick}
        >
            {/* Top Border Color Accent */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: person.borderColor || 'var(--color-primary)'
            }} />

            {/* Avatar */}
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                padding: '3px',
                background: person.borderColor || 'var(--color-primary)', // Ring color
                marginBottom: '1rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <img
                    className="woi-avatar-circle"
                    src={person.avatar || `https://ui-avatars.com/api/?name=${person.display_name || person.username}`}
                    alt={person.display_name || person.username}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid white' }}
                />
            </div>

            {/* Level Badge (Bottom Right of Avatar) */}
            <div style={{
                position: 'absolute',
                top: '75px',
                right: 'calc(50% - 40px)', // Align with avatar
                background: 'var(--color-text-main)',
                color: 'var(--bg-main)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                border: '2px solid var(--bg-panel)'
            }}>
                {level}
            </div>

            {/* Name & Role */}
            <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {person.display_name || person.username}
                {person.isVerified && <VerifiedBadge size={18} />}
            </h3>
            <div style={{ fontSize: '0.9rem', color: person.borderColor || 'var(--color-primary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                {person.jobTitle || 'Community Member'}
            </div>

            {/* Bio Snippet */}
            <p style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.4',
                margin: '0 0 1rem 0',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                height: '3.8rem',
                fontStyle: person.bio ? 'normal' : 'italic'
            }}>
                {person.bio || "This user hasn't written a bio yet."}
            </p>

            {/* Skills Bubbles */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.2rem', minHeight: '3rem' }}>
                {person.skills && person.skills.length > 0 ? (
                    person.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            background: 'var(--bg-surface)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                            whiteSpace: 'nowrap'
                        }}>
                            {skill}
                        </span>
                    ))
                ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', opacity: 0.5 }}>No skills listed</span>
                )}
                {person.skills && person.skills.length > 3 && (
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-text-muted)' }}>+{person.skills.length - 3}</span>
                )}
            </div>



            {/* Follow Button */}
            <button
                onClick={handleFollow}
                style={{
                    padding: '0.6rem 2rem',
                    borderRadius: '50px',
                    border: 'none',
                    background: isFollowing ? 'var(--bg-surface)' : (person.borderColor || 'var(--color-primary)'),
                    color: isFollowing ? 'var(--color-text-muted)' : 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s',
                    boxShadow: isFollowing ? 'none' : '0 4px 10px rgba(0,0,0,0.1)'
                }}
            >
                {isFollowing ? 'Following' : 'Follow'}
            </button>
        </div>
    );
};

export default PeopleCard;
