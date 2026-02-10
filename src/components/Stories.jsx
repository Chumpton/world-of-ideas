import React, { useState, useEffect } from 'react';

const Stories = () => {
    const [viewingStory, setViewingStory] = useState(null);
    const [progress, setProgress] = useState(0);

    // Mock Stories Data
    const stories = [
        { id: 1, user: "EcoWarrior", avatar: "https://ui-avatars.com/api/?name=Eco&background=2ecc71&color=fff", image: "https://images.unsplash.com/photo-1542601906990-24d4c16c3bf6?auto=format&fit=crop&q=80&w=400", time: "2h" },
        { id: 2, user: "CityPlan", avatar: "https://ui-avatars.com/api/?name=City&background=3498db&color=fff", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=400", time: "5h" },
        { id: 3, user: "ArtBot", avatar: "https://ui-avatars.com/api/?name=Art&background=9b59b6&color=fff", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400", time: "12h" },
        { id: 5, user: "SpaceX", avatar: "https://ui-avatars.com/api/?name=Mars&background=e74c3c&color=fff", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400", time: "1d" },
    ];

    const openStory = (story) => {
        setViewingStory(story);
        setProgress(0);
    };

    const closeStory = () => {
        setViewingStory(null);
        setProgress(0);
    };

    const nextStory = () => {
        const idx = stories.findIndex(s => s.id === viewingStory.id);
        if (idx < stories.length - 1) {
            openStory(stories[idx + 1]);
        } else {
            closeStory();
        }
    };

    const prevStory = () => {
        const idx = stories.findIndex(s => s.id === viewingStory.id);
        if (idx > 0) {
            openStory(stories[idx - 1]);
        } else {
            closeStory();
        }
    };

    // Timer Logic
    useEffect(() => {
        if (!viewingStory) return;

        const interval = setInterval(() => {
            setProgress(old => {
                if (old >= 100) {
                    nextStory();
                    return 0;
                }
                return old + 2; // Move 2% every 100ms = 5 seconds total
            });
        }, 100);

        return () => clearInterval(interval);
    }, [viewingStory]);

    return (
        <div style={{ marginBottom: '2rem' }}>
            {/* Header */}
            <h3 style={{ margin: '0 0 1rem 1rem', fontSize: '1.2rem', color: 'var(--color-text-main)' }}>Stories</h3>

            {/* Horizontal Scroll List */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
                padding: '0 1rem 1rem 1rem',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }} className="no-scrollbar">

                {/* Add Story Button */}
                <div
                    onClick={() => {
                        const content = prompt('Share a quick update or moment with your followers:');
                        if (content && content.trim()) {
                            alert('✨ Story shared! Your followers can now see your update.');
                        }
                    }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: '70px' }}
                >
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: '#fff',
                        border: '2px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', color: 'var(--color-primary)',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    >+</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Add Story</span>
                </div>

                {stories.map(story => (
                    <div key={story.id} onClick={() => openStory(story)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: '70px' }}>
                        <div style={{
                            padding: '3px', borderRadius: '50%',
                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            transition: 'transform 0.2s'
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <img src={story.avatar} alt={story.user} style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white', display: 'block' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{story.user}</span>
                    </div>
                ))}
            </div>

            {/* Full Screen Viewer */}
            {viewingStory && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'black', zIndex: 9999, display: 'flex', flexDirection: 'column'
                }}>
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', gap: '4px', padding: '10px', paddingTop: '1rem' }}>
                        {stories.map(s => (
                            <div key={s.id} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    width: s.id === viewingStory.id ? `${progress}%` : (stories.findIndex(st => st.id === s.id) < stories.findIndex(st => st.id === viewingStory.id) ? '100%' : '0%'),
                                    height: '100%', background: 'white', transition: 'width 0.1s linear'
                                }}></div>
                            </div>
                        ))}
                    </div>

                    {/* Header Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <img src={viewingStory.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                            <span style={{ fontWeight: 'bold' }}>{viewingStory.user}</span>
                            <span style={{ opacity: 0.7 }}>{viewingStory.time} ago</span>
                        </div>
                        <button onClick={closeStory} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                        {/* Tap Areas */}
                        <div onClick={prevStory} style={{ position: 'absolute', top: 0, left: 0, width: '30%', height: '100%', zIndex: 10 }}></div>
                        <div onClick={nextStory} style={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', zIndex: 10 }}></div>

                        <img src={viewingStory.image} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }} />

                        {/* Caption/Overlay */}
                        <div style={{
                            position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '20px',
                            color: 'white', backdropFilter: 'blur(5px)'
                        }}>
                            New update on the project! 🚀
                        </div>
                    </div>

                    {/* Reply Input */}
                    <div style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                        <input type="text" placeholder="Send message..." style={{
                            flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.5)',
                            borderRadius: '25px', padding: '0.8rem 1.2rem', color: 'white', outline: 'none'
                        }} />
                        <button style={{ background: 'transparent', border: 'none', fontSize: '1.5rem' }}>❤️</button>
                        <button style={{ background: 'transparent', border: 'none', fontSize: '1.5rem' }}>✈️</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stories;
