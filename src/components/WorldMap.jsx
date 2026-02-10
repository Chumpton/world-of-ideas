import React, { useState } from 'react';
import mapBg from '../assets/map_bg.png';

const WorldMap = ({ projects = [], onViewProject }) => {
    const [selectedProject, setSelectedProject] = useState(null);

    // Simple Equirectangular projection
    // Longitude: -180 to 180 -> 0% to 100% width
    // Latitude: 90 to -90 -> 0% to 100% height (Top is 90)
    const getPosition = (lat, lng) => {
        const x = ((lng + 180) / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        return { left: `${x}%`, top: `${y}%` };
    };

    return (
        <div style={{ padding: '2rem 0', color: 'white' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#2d3436' }}>
                🌍 Global Impact Map
                <span style={{ fontSize: '0.9rem', color: 'white', background: '#00b894', padding: '2px 8px', borderRadius: '12px' }}>Live</span>
            </h2>

            <div style={{ position: 'relative', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', backgroundColor: '#1e272e' }}>
                {/* Map Background */}
                <img src={mapBg} alt="World Map" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />

                {/* Pins */}
                {projects.map(p => {
                    const pos = getPosition(p.location.lat, p.location.lng);
                    const isSelected = selectedProject && selectedProject.id === p.id;

                    return (
                        <div
                            key={p.id}
                            style={{
                                position: 'absolute',
                                left: pos.left,
                                top: pos.top,
                                transform: 'translate(-50%, -50%)',
                                cursor: 'pointer',
                                zIndex: isSelected ? 10 : 1
                            }}
                            onClick={() => setSelectedProject(isSelected ? null : p)}
                        >
                            {/* Pulse Effect */}
                            <div style={{
                                width: '14px', height: '14px',
                                background: '#0984e3',
                                borderRadius: '50%',
                                border: '2px solid white',
                                boxShadow: '0 0 10px #0984e3',
                                animation: 'pulse 2s infinite'
                            }} />

                            {/* Tooltip Overlay (Visible on Select) */}
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'white',
                                    color: '#2d3436',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    width: '240px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                    zIndex: 20
                                }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{p.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#636e72', marginBottom: '0.5rem' }}>📍 {p.location.city}</div>
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem' }}>{p.solution.substring(0, 50)}...</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onViewProject) {
                                                onViewProject(p);
                                            } else {
                                                alert(`Opening: ${p.title}`);
                                            }
                                            setSelectedProject(null);
                                        }}
                                        style={{
                                            width: '100%', padding: '0.5rem', background: '#0984e3', color: 'white',
                                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        View Project
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Overlay Gradient for vibes */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%', background: 'linear-gradient(to top, rgba(30,39,46,0.8), transparent)', pointerEvents: 'none' }}></div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(9, 132, 227, 0.7); }
                    70% { transform: scale(1.5); box-shadow: 0 0 0 10px rgba(9, 132, 227, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(9, 132, 227, 0); }
                }
            `}</style>
        </div>
    );
};

export default WorldMap;
