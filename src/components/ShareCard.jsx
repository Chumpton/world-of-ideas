import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { buildIdeaLink } from '../utils/deepLinks';
import ForkIcon from './icons/ForkIcon';

const ShareCard = ({ idea, onClose, onShare }) => {
    const { getUser } = useAppContext(); // [CACHE]
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeFormat, setActiveFormat] = useState('square'); // 'square', 'story', 'banner'

    // [CACHE] Author Profile
    const [authorProfile, setAuthorProfile] = useState(null);

    useEffect(() => {
        let active = true;
        if (idea && idea.author_id && getUser) {
            getUser(idea.author_id).then(p => {
                if (active && p) setAuthorProfile(p);
            });
        }
        return () => { active = false; };
    }, [idea, getUser]);

    const authorName = authorProfile ? authorProfile.username : (idea.author || "Jane Doe");
    const authorAvatar = authorProfile?.avatar || idea.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&color=fff`;
    // ... rest of component

    // Category styling
    const categoryStyles = {
        invention: { bg: '#C9644A', label: 'INVENTION' },
        policy: { bg: '#d63031', label: 'POLICY' },
        business: { bg: '#2d3436', label: 'BUSINESS' },
        infrastructure: { bg: '#C9644A', label: 'INFRASTRUCTURE' },
        entertainment: { bg: '#9b59b6', label: 'ENTERTAINMENT' },
        philosophy: { bg: '#34495e', label: 'PHILOSOPHY' },
        apps: { bg: '#0984e3', label: 'APPS' },
        philanthropy: { bg: '#00b894', label: 'PHILANTHROPY' },
        education: { bg: '#6c5ce7', label: 'EDUCATION' },
        ecology: { bg: '#00b894', label: 'ECOLOGY' },
        health: { bg: '#e74c3c', label: 'HEALTH' },
        offgrid: { bg: '#f39c12', label: 'OFF-GRID' },
        gaming: { bg: '#9b59b6', label: 'GAMING' },
        arts: { bg: '#e84393', label: 'ARTS' },
        spiritual: { bg: '#636e72', label: 'SPIRITUAL' }
    };

    const catStyle = categoryStyles[idea.type] || { bg: '#636e72', label: idea.type?.toUpperCase() || 'IDEA' };

    // const authorName is now defined above using cache
    const authorRole = idea.authorRole || categoryStyles[idea.type]?.label?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) + " Advocate";

    // Get description text
    const getDescription = () => {
        if (idea.proposedChange) return `Proposed Change: ${idea.proposedChange}`;
        if (idea.solution) return idea.solution;
        if (idea.utility) return idea.utility;
        if (idea.body) return idea.body;
        return "A groundbreaking idea for community change.";
    };

    const getPreviewImage = () => {
        if (idea.titleImage) return idea.titleImage;
        if (idea.thumbnail) return idea.thumbnail;
        const fallbackByType = {
            invention: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
            education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
            ecology: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5b43?auto=format&fit=crop&w=800&q=80',
            health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
            policy: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80',
            default: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80'
        };
        const typeKey = String(idea.type || '').toLowerCase();
        return fallbackByType[typeKey] || fallbackByType.default;
    };

    const downloadCard = async () => {
        setIsGenerating(true);

        // Use html2canvas if available, otherwise use a simple canvas approach
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Card dimensions based on format
            const dimensions = {
                square: { w: 1080, h: 1080 },
                story: { w: 1080, h: 1920 },
                banner: { w: 1200, h: 630 }
            };

            const { w, h } = dimensions[activeFormat];
            canvas.width = w;
            canvas.height = h;

            const scale = w / 1080; // Scale factor based on square width

            // 1. Background - White Base + Gradient
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);

            // Gradient Overlay
            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
            gradient.addColorStop(1, `${catStyle.bg}22`); // 22 hex = ~13% opacity
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // 2. Border Top
            ctx.fillStyle = catStyle.bg;
            ctx.fillRect(0, 0, w, 20 * scale); // 20px border approx

            // Padding variables
            const p = 80 * scale; // padding

            // 3. Header
            const headerY = 100 * scale;

            // Category Badge
            const badgeH = 50 * scale;
            ctx.fillStyle = catStyle.bg;
            ctx.beginPath();
            ctx.roundRect(p, headerY, 200 * scale, badgeH, 25 * scale);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.font = `800 ${24 * scale}px Quicksand, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(catStyle.label, p + (100 * scale), headerY + (badgeH / 2));

            // Date (Right aligned)
            ctx.textAlign = 'right';
            ctx.fillStyle = '#b2bec3';
            ctx.font = `700 ${24 * scale}px Quicksand, sans-serif`;
            ctx.fillText(new Date().toLocaleDateString(), w - p, headerY + (badgeH / 2));

            // 4. Content
            // Title
            ctx.textAlign = 'left';
            ctx.fillStyle = '#2d3436';
            ctx.font = `900 ${72 * scale}px Quicksand, sans-serif`;
            const titleY = headerY + (120 * scale);
            wrapText(ctx, idea.title || "Untitled Idea", p, titleY, w - (p * 2), 85 * scale);

            // Description
            ctx.fillStyle = '#636e72';
            ctx.font = `500 ${36 * scale}px Quicksand, sans-serif`;
            const descY = titleY + (200 * scale); // Approximate
            const desc = getDescription();
            wrapText(ctx, desc.substring(0, 200) + '...', p, descY, w - (p * 2), 55 * scale);

            // 5. Footer (Action Bar)
            const footerH = 160 * scale;
            const footerY = h - footerH;

            // Footer BG (White)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, footerY, w, footerH);

            // Footer Border Top
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(0, footerY, w, 2 * scale);

            // Vote Pill logic
            const pillX = p;
            const pillY = footerY + (footerH - 80 * scale) / 2;
            const pillW = 220 * scale;
            const pillH = 80 * scale;

            ctx.fillStyle = '#f1f2f6';
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, 40 * scale);
            ctx.fill();

            // Vote Content
            ctx.textAlign = 'left';
            ctx.fillStyle = '#e58e26'; // Orange text
            ctx.font = `800 ${36 * scale}px Quicksand, sans-serif`;
            ctx.fillText(`⚡ ${idea.votes || 0}`, pillX + (40 * scale), pillY + (pillH / 2));

            // Comments/Forks (Right side of footer)
            ctx.textAlign = 'right';
            ctx.fillStyle = '#b2bec3';
            ctx.font = `600 ${32 * scale}px Quicksand, sans-serif`;
            ctx.fillText(`💬 ${idea.comments?.length || 0}   Forks ${idea.forks || 0}`, w - p, pillY + (pillH / 2));


            // Download
            const link = document.createElement('a');
            link.download = `idea-${idea.id || 'share'}-${activeFormat}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (err) {
            console.error('Error generating image:', err);
            alert('Error generating image. Please try again.');
        }

        setIsGenerating(false);
    };

    // Helper function for text wrapping
    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        let lineCount = 0;
        const maxLines = 4;

        for (let n = 0; n < words.length && lineCount < maxLines; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, y);
                line = words[n] + ' ';
                y += lineHeight;
                lineCount++;
            } else {
                line = testLine;
            }
        }
        if (lineCount < maxLines) {
            ctx.fillText(line.trim(), x, y);
        }
    };

    return (
        <div
            className="share-modal"
            onClick={onClose}
            style={{
                position: 'fixed',
                zIndex: 1000,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'end', // Mobile bottom sheet style
                padding: '0',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-panel)',
                    borderRadius: '24px 24px 0 0', // Bottom sheet
                    padding: '1.5rem',
                    width: '100%',
                    maxWidth: '500px', // Prevent too wide on desktop
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative',
                    borderTop: '1px solid var(--color-border)',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
                    margin: '0 auto' // Center on desktop
                }}
            >
                {/* Drag Handle */}
                <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', margin: '0 auto 1.5rem auto', opacity: 0.5 }}></div>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>📤 Share Spark</h2>
                    <button onClick={onClose} style={{ background: 'var(--bg-pill)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                </div>

                {/* Format Selection - Compact Pills */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {[
                        { id: 'square', label: 'Square', icon: '1:1' },
                        { id: 'story', label: 'Story', icon: '9:16' },
                        { id: 'banner', label: 'Banner', icon: '16:9' }
                    ].map(fmt => (
                        <button
                            key={fmt.id}
                            onClick={() => setActiveFormat(fmt.id)}
                            style={{
                                padding: '0.6rem 1rem',
                                border: '1px solid var(--color-border)',
                                borderRadius: '100px',
                                background: activeFormat === fmt.id ? 'var(--color-text-main)' : 'transparent',
                                color: activeFormat === fmt.id ? 'var(--bg-panel)' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{fmt.icon}</span>
                            {fmt.label}
                        </button>
                    ))}
                </div>

                {/* Preview Container - Centered & Scaled */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: '16px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <div
                        ref={cardRef}
                        style={{
                            background: 'white',
                            backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${catStyle.bg}16 100%)`,
                            borderTop: `4px solid ${catStyle.bg}`,
                            borderRadius: '16px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                            aspectRatio: activeFormat === 'square' ? '1/1' : activeFormat === 'story' ? '9/16' : '1.9/1',
                            width: '100%',
                            maxWidth: activeFormat === 'story' ? '200px' : '100%', // Limit height for story
                            maxHeight: '400px', // Cap height
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative',
                            color: '#2d3436' // Force dark text for image
                        }}
                    >
                        <div style={{ padding: '1rem 1rem 0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ background: catStyle.bg, color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                {catStyle.label}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9aa3a8' }}>worldofideas.net</span>
                        </div>

                        <div style={{ padding: '0 1rem 0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                                <img
                                    src={authorAvatar}
                                    alt={authorName}
                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&color=fff`;
                                    }}
                                />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2d3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {authorName}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9aa3a8' }}>{new Date().toLocaleDateString()}</span>
                        </div>

                        <div style={{ padding: '0 1rem 0.8rem 1rem', flex: 1, minHeight: 0 }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '900', margin: '0 0 0.45rem 0', lineHeight: '1.2' }}>{idea.title}</h2>
                            <p style={{ fontSize: '0.82rem', color: '#636e72', margin: 0, lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: activeFormat === 'story' ? 8 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {getDescription()}
                            </p>
                        </div>

                        {activeFormat !== 'story' && (
                            <div style={{ padding: '0 1rem 0.8rem 1rem' }}>
                                <img
                                    src={getPreviewImage()}
                                    alt={idea.title || 'Idea preview'}
                                    style={{ width: '100%', height: activeFormat === 'banner' ? '120px' : '150px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}
                                />
                            </div>
                        )}

                        <div style={{ padding: '0.65rem 1rem', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginTop: 'auto' }}>
                            <div style={{ background: '#f1f2f6', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: '#e58e26', fontSize: '0.8rem' }}>
                                <span>⚡</span> {idea.votes || 0}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#697176', fontSize: '0.75rem', fontWeight: 700 }}>
                                <span>💬 {idea.commentCount || idea.comment_count || 0}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ForkIcon size={13} color="currentColor" /> {idea.forks || 0}</span>
                                <span>↗ {idea.shares || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => {
                            if (onShare) onShare(); // Trigger counter
                            downloadCard();
                        }}
                        disabled={isGenerating}
                        style={{
                            padding: '0.8rem',
                            background: 'var(--color-text-main)',
                            color: 'var(--bg-panel)',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        {isGenerating ? <span>Generating...</span> : <><span>⬇️</span> Save Image</>}
                    </button>
                    <button
                        onClick={() => {
                            if (onShare) onShare(); // Trigger counter
                            navigator.clipboard.writeText(buildIdeaLink(idea.id));
                            alert('Link copied!'); // Ideally toast
                        }}
                        style={{
                            padding: '0.8rem',
                            background: 'var(--bg-pill)',
                            color: 'var(--color-text-main)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <span>🔗</span> Copy Link
                    </button>
                </div>

                {/* Social Row */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                    <SocialIcon label="X" color="#000000" onClick={() => { if (onShare) onShare(); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(idea.title)}&url=${encodeURIComponent('https://worldofideas.net')}`); }} />
                    <SocialIcon label="FB" color="#1877F2" onClick={() => { if (onShare) onShare(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://worldofideas.net')}`); }} />
                    <SocialIcon label="in" color="#0a66c2" onClick={() => { if (onShare) onShare(); window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://worldofideas.net')}`); }} />
                </div>
            </div>
        </div>
    );
};

// Simple Social Icon Helper
const SocialIcon = ({ label, color, onClick }) => (
    <button onClick={onClick} style={{
        width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: color, color: 'white',
        fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    }}>
        {label}
    </button>
);

export default ShareCard;
