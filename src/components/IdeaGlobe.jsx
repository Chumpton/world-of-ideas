import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { useAppContext } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';

const IdeaGlobe = ({ onSelectIdea }) => {
    const { ideas } = useAppContext();
    const globeEl = useRef();
    const [points, setPoints] = useState([]);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: 600 });

    const MOCK_BOUNTIES = [
        { id: 'b1', title: 'Beach Cleanup', type: 'bounty', lat: 21.3069, lng: -157.8583, color: '#e67e22', reward: '500 Coins', description: 'Help clear plastic from the coast.' },
        { id: 'b2', title: 'Rooftop Garden Setup', type: 'bounty', lat: 40.7128, lng: -74.0060, color: '#2ecc71', reward: '300 Coins', description: 'Setting up hydroponics in Brooklyn.' },
        { id: 'b3', title: 'Community Solar', type: 'bounty', lat: 35.6762, lng: 139.6503, color: '#f1c40f', reward: '1000 Coins', description: 'Solar panel installation weekend.' },
        { id: 'b4', title: 'Historical Archive', type: 'bounty', lat: 51.5074, lng: -0.1278, color: '#9b59b6', reward: '400 Coins', description: 'Digitizing local library records.' }
    ];

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('globe-container');
            if (container) {
                setDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        // Delay initial resize to ensure layout is done
        setTimeout(handleResize, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-rotate
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.6;
        }
    }, []);

    // Map Ideas to Points with Clustering
    useEffect(() => {
        // 1. Generate base points with 0 altitude
        // 1. Generate base points from ideas with real location data
        const ideaPoints = ideas
            .filter(idea => idea.lat && idea.lng) // Only show ideas with real location data
            .map(idea => {
                const categoryObj = CATEGORIES.find(c => c.id === idea.type);
                const color = categoryObj ? categoryObj.color : '#bdc3c7';

                return {
                    ...idea,
                    lat: Number(idea.lat),
                    lng: Number(idea.lng),
                    color,
                    altitude: 0,
                    radius: 0.5,
                    isBounty: false
                };
            });

        const bountyPoints = MOCK_BOUNTIES.map(b => ({
            ...b,
            altitude: 0,
            radius: 0.6, // Slightly larger
            isBounty: true
        }));

        const rawPoints = [...ideaPoints, ...bountyPoints];

        // 2. Simple Distance Clustering
        const clusters = [];
        const THRESHOLD = 12; // Degrees threshold for clustering

        rawPoints.forEach(p => {
            let found = false;
            for (let c of clusters) {
                // Simple Euclidean distance approx (fine for visualization)
                const dist = Math.sqrt(Math.pow(c.lat - p.lat, 2) + Math.pow(c.lng - p.lng, 2));
                if (dist < THRESHOLD) {
                    c.items.push(p);
                    found = true;
                    break;
                }
            }
            if (!found) {
                clusters.push({
                    ...p, // Base props from the seed idea
                    items: [p],
                    isCluster: false // Will update below
                });
            }
        });

        // Mark clusters
        const finalPoints = clusters.map(c => ({
            ...c,
            isCluster: c.items.length > 1,
            label: c.items.length > 1 ? c.items.length : ''
        }));

        setPoints(finalPoints);
    }, [ideas]);

    return (
        <div id="globe-container" style={{
            width: '100%',
            height: '100%', // Fill parent
            minHeight: '600px', // Fallback
            borderRadius: '20px',
            overflow: 'hidden',
            background: '#020409', // Deep space fallback
            position: 'relative'
        }}>
            {/* Overlay Info */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 10,
                color: 'white',
                pointerEvents: 'none'
            }}>
                <h2 style={{ margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Idea Biosphere</h2>
                <p style={{ margin: 0, opacity: 0.8 }}>Interactive Map of Global Thought</p>
            </div>

            <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="https://unpkg.com/three-globe/example/img/earth-day.jpg"
                bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

                htmlElementsData={points}
                htmlLat="lat"
                htmlLng="lng"
                htmlAltitude="altitude"
                htmlElement={(d) => {
                    const el = document.createElement('div');
                    el.style.transform = 'translate(-50%, -100%)';
                    el.style.cursor = 'pointer';
                    el.style.pointerEvents = 'auto';
                    el.style.position = 'relative'; // For tooltip positioning

                    // 1. CLUSTER RENDERING
                    if (d.isCluster) {
                        el.innerHTML = `
                            <div style="
                                display: flex; align-items: center; justify-content: center;
                                width: 30px; height: 30px;
                                background: ${d.color};
                                border: 2px solid white;
                                border-radius: 50%;
                                color: white;
                                font-weight: bold;
                                font-family: sans-serif;
                                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                            ">
                                ${d.items.length}
                            </div>
                        `;

                        // Stop rotation on hover for clusters too
                        el.onmouseenter = () => {
                            if (globeEl.current) globeEl.current.controls().autoRotate = false;
                        };
                        el.onmouseleave = () => {
                            if (globeEl.current) globeEl.current.controls().autoRotate = true;
                        };
                    }
                    // 2. BOUNTY RENDERING
                    else if (d.isBounty) {
                        el.innerHTML = `
                             <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                                <div style="
                                    width: 36px; height: 36px;
                                    background: rgba(230, 126, 34, 0.2);
                                    border: 2px solid ${d.color};
                                    border-radius: 50%;
                                    display: flex; align-items: center; justify-content: center;
                                    box-shadow: 0 0 15px ${d.color};
                                    animation: pulse 2s infinite;
                                ">
                                    <div style="width: 12px; height: 12px; background: ${d.color}; border-radius: 50%;"></div>
                                </div>
                                <style>@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(230, 126, 34, 0); } 100% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0); } }</style>
                            </div>
                        `;

                        // Tooltip for Bounty
                        const tooltip = document.createElement('div');
                        tooltip.style.cssText = `
                            position: absolute;
                            bottom: 50px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 250px;
                            background: white;
                            border-top: 4px solid ${d.color};
                            border-radius: 12px;
                            padding: 12px;
                            box-shadow: 0 16px 40px rgba(0,0,0,0.3);
                            color: #2d3436;
                            font-family: 'Quicksand', sans-serif;
                            opacity: 0;
                            pointer-events: none;
                            transition: opacity 0.2s, transform 0.2s;
                            z-index: 1000;
                            text-align: center;
                        `;
                        tooltip.innerHTML = `
                            <div style="text-transform: uppercase; font-size: 0.7rem; font-weight: 800; color: ${d.color}; margin-bottom: 4px;">Active Bounty</div>
                            <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 4px;">${d.title}</div>
                            <div style="font-size: 0.9rem; color: #636e72; margin-bottom: 8px;">${d.description}</div>
                            <div style="font-weight: bold; color: #e67e22; background: #fff3cd; padding: 4px 8px; border-radius: 4px; display: inline-block;">💰 ${d.reward}</div>
                            <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white;"></div>
                        `;
                        el.appendChild(tooltip);

                        el.onmouseenter = () => {
                            tooltip.style.opacity = '1';
                            tooltip.style.transform = 'translateX(-50%) translateY(-10px)';
                            el.style.zIndex = 1000;
                            if (globeEl.current) globeEl.current.controls().autoRotate = false;
                        };
                        el.onmouseleave = () => {
                            tooltip.style.opacity = '0';
                            tooltip.style.transform = 'translateX(-50%)';
                            el.style.zIndex = 'auto';
                            if (globeEl.current) globeEl.current.controls().autoRotate = true;
                        };
                    }
                    // 3. PIN RENDERING (Single Idea)
                    else {
                        el.innerHTML = `
                            <svg width="30" height="42" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); display: block;">
                                <path d="M12 0C5.372 0 0 5.372 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.372 18.628 0 12 0Z" fill="${d.color}"/>
                                <circle cx="12" cy="12" r="5" fill="white"/>
                            </svg>
                        `;

                        // 3. HOVER WINDOW (ToolTip) - IdeaCard Styled OPAQUE
                        const tooltip = document.createElement('div');

                        tooltip.style.cssText = `
                            position: absolute;
                            bottom: 50px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 300px; /* Wider for action rack */
                            background: white; /* OPAQUE WHITE */
                            border-top: 4px solid ${d.color};
                            border-radius: 12px;
                            padding: 0; /* Removing padding to handle internally */
                            box-shadow: 0 16px 40px rgba(0,0,0,0.3);
                            color: #2d3436;
                            font-family: 'Quicksand', sans-serif;
                            opacity: 0;
                            pointer-events: none;
                            transition: opacity 0.2s, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                            z-index: 1000;
                            text-align: left;
                            overflow: hidden;
                        `;

                        // Avatar logic 
                        const authorName = d.author || "Member";
                        const avatarUrl = `https://ui-avatars.com/api/?name=${authorName}&background=random&color=fff&size=32`;

                        // Action Rack SVGs
                        const upvoteSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" /></svg>`;
                        const commentSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>`;
                        const forkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 0 0 1-9 9"></path></svg>`;
                        const shareSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg>`;

                        tooltip.innerHTML = `
                            <div style="padding: 16px 16px 12px 16px;">
                                <!-- Header: Avatar + Title -->
                                <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                                    <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%;" />
                                    <div>
                                        <div style="font-weight: 800; font-size: 1rem; line-height: 1.2; color: #2d3436;">${d.title}</div>
                                        <div style="font-size: 0.7rem; color: ${d.color}; text-transform: uppercase; font-weight: 700; margin-top: 2px;">${d.type}</div>
                                    </div>
                                </div>

                                <!-- Body text -->
                                <div style="font-size: 0.85rem; color: #636e72; margin-bottom: 8px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                    ${d.description || d.problem || d.solution || 'No description available.'}
                                </div>
                            </div>

                            <!-- Footer: Action Rack -->
                            <div style="background: #f8f9fa; padding: 10px 16px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between;">
                                
                                <!-- Left: Vote Capsule -->
                                <div style="display: flex; align-items: center; gap: 4px; background: ${d.color}20; padding: 4px 10px; border-radius: 20px;">
                                    <span style="display: flex; color: ${d.color};">${upvoteSvg}</span>
                                    <span style="font-size: 0.9rem; font-weight: 800; color: ${d.color};">${d.votes}</span>
                                </div>

                                <!-- Right: Action Icons -->
                                <div style="display: flex; align-items: center; gap: 12px; color: #b2bec3;">
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        ${commentSvg} <span style="font-size: 0.8rem; font-weight: 700; color: #636e72;">${d.comments?.length || 0}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        ${forkSvg} <span style="font-size: 0.8rem; font-weight: 700; color: #636e72;">${d.forks || 0}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        ${shareSvg}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Pointer Arrow -->
                            <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #f8f9fa;"></div>
                        `;
                        el.appendChild(tooltip);

                        // Hover Events for Tooltip - Same logic
                        el.onmouseenter = () => {
                            tooltip.style.opacity = '1';
                            tooltip.style.transform = 'translateX(-50%) translateY(-10px)'; // Little jump up
                            el.style.zIndex = 1000;
                            // Stop rotation
                            if (globeEl.current) globeEl.current.controls().autoRotate = false;
                        };
                        el.onmouseleave = () => {
                            tooltip.style.opacity = '0';
                            tooltip.style.transform = 'translateX(-50%)';
                            el.style.zIndex = 'auto';
                            // Resume rotation
                            if (globeEl.current) globeEl.current.controls().autoRotate = true;
                        };
                    }

                    // Click to Open full details (works for both clusters and pins for now)
                    // Future: Click cluster -> Zoom in? For now, open first idea or do nothing for cluster.
                    if (!d.isCluster) {
                        el.onclick = () => onSelectIdea && onSelectIdea(d);
                    } else {
                        // Zoom to cluster on click (simple implementation)
                        el.onclick = () => {
                            if (globeEl.current) {
                                globeEl.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.5 }, 1000);
                            }
                        };
                    }

                    return el;
                }}
                atmosphereColor="#87CEEB" // Lighter Blue for Day
                atmosphereAltitude={0.15}
            />
        </div>
    );
};

export default IdeaGlobe;
