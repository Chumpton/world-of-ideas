import React, { useRef, useState } from 'react';

const ShareCard = ({ idea, onClose }) => {
    const cardRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeFormat, setActiveFormat] = useState('square'); // 'square', 'story', 'banner'

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

    const authorName = idea.author || "Jane Doe";
    const authorRole = idea.authorRole || categoryStyles[idea.type]?.label?.toLowerCase().replace(/^\w/, c => c.toUpperCase()) + " Advocate";

    // Get description text
    const getDescription = () => {
        if (idea.proposedChange) return `Proposed Change: ${idea.proposedChange}`;
        if (idea.solution) return idea.solution;
        if (idea.utility) return idea.utility;
        if (idea.body) return idea.body;
        return "A groundbreaking idea for community change.";
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
            ctx.fillText(`💬 ${idea.comments?.length || 0}   ⑂ ${idea.forks || 0}`, w - p, pillY + (pillH / 2));


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
                alignItems: 'center',
                padding: '1rem' // Reduced padding for mobile
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '2rem',
                    maxWidth: '700px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📤 Share Card</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Format Selection */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                        { id: 'square', label: 'Square (1:1)', desc: 'Instagram' },
                        { id: 'story', label: 'Story (9:16)', desc: 'TikTok/Reels' },
                        { id: 'banner', label: 'Banner', desc: 'Twitter/X' }
                    ].map(fmt => (
                        <button
                            key={fmt.id}
                            onClick={() => setActiveFormat(fmt.id)}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                border: activeFormat === fmt.id ? '2px solid var(--color-secondary)' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '12px',
                                background: activeFormat === fmt.id ? 'rgba(0, 184, 148, 0.1)' : 'white',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{fmt.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{fmt.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Preview - MATCHING NEW IDEA CARD DESIGN */}
                <div
                    ref={cardRef}
                    style={{
                        background: 'white', // Opaque base
                        backgroundImage: `linear-gradient(135deg, #ffffff 50%, ${catStyle.bg}22 100%)`, // Gradient Overlay
                        borderTop: `4px solid ${catStyle.bg}`,
                        borderRadius: '20px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        marginBottom: '1.5rem',
                        aspectRatio: activeFormat === 'square' ? '1/1' : activeFormat === 'story' ? '9/16' : '1.9/1',
                        maxHeight: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {/* Content Wrapper */}
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

                        {/* Header: Tag | Avatars | Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                {/* Category Tag */}
                                <span style={{
                                    background: catStyle.bg,
                                    color: '#fff',
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {catStyle.label}
                                </span>

                                {/* Mock Avatars (Author + Extras) */}
                                <div style={{ display: 'flex', paddingLeft: '8px' }}>
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`} alt="Author" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid white', zIndex: 3 }} />
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${idea.id}1`} alt="Collab" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid white', marginLeft: '-10px', zIndex: 2 }} />
                                </div>
                            </div>

                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b2bec3' }}>
                                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>

                        {/* Title */}
                        <h2 style={{
                            fontSize: activeFormat === 'banner' ? '1.4rem' : 'clamp(1.4rem, 5vw, 1.8rem)', // Responsive font size
                            fontWeight: '900',
                            margin: '0 0 0.5rem 0',
                            lineHeight: '1.25',
                            color: '#2d3436'
                        }}>
                            {idea.title}
                        </h2>

                        {/* Description */}
                        <p style={{
                            fontSize: '1rem',
                            color: '#636e72',
                            margin: 0,
                            lineHeight: '1.6',
                            display: '-webkit-box',
                            WebkitLineClamp: activeFormat === 'banner' ? 2 : 5,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {getDescription()}
                        </p>
                    </div>

                    {/* Footer - White & Padded */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.5rem',
                        background: 'white',
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        marginTop: 'auto'
                    }}>
                        {/* Vote Pill */}
                        <div style={{
                            background: '#f1f2f6',
                            padding: '6px 16px',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '800',
                            color: '#e58e26',
                            fontSize: '1.1rem'
                        }}>
                            <span>⚡</span> {idea.votes || 0}
                        </div>

                        {/* Metrics */}
                        <div style={{ display: 'flex', gap: '1rem', color: '#b2bec3', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💬 {idea.comments?.length || 0}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⑂ {idea.forks || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <button
                        onClick={() => {
                            if (onShare) onShare();
                            downloadCard();
                        }}
                        disabled={isGenerating}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            background: 'var(--color-secondary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: isGenerating ? 'wait' : 'pointer',
                            opacity: isGenerating ? 0.7 : 1
                        }}
                    >
                        {isGenerating ? '⏳ Generating...' : '📥 Download Image'}
                    </button>
                    <button
                        onClick={() => {
                            if (onShare) onShare();
                            navigator.clipboard.writeText(`Check out this idea: "${idea.title}" on World of Ideas! worldofideas.net/idea/${idea.id || 'new'}`);
                            alert('Link copied to clipboard!');
                        }}
                        style={{
                            padding: '1rem 1.5rem',
                            background: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🔗 Copy Link
                    </button>
                </div>

                {/* Social Share Buttons */}
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${idea.title}" on World of Ideas!`)}&url=${encodeURIComponent('https://worldofideas.net')}`)} style={{ flex: '1 1 auto', padding: '0.5rem 1rem', border: '1px solid #1DA1F2', background: 'white', borderRadius: '20px', cursor: 'pointer', color: '#1DA1F2', fontWeight: 'bold' }}>𝕏 Twitter</button>
                    <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://worldofideas.net')}`)} style={{ flex: '1 1 auto', padding: '0.5rem 1rem', border: '1px solid #4267B2', background: 'white', borderRadius: '20px', cursor: 'pointer', color: '#4267B2', fontWeight: 'bold' }}>📘 Facebook</button>
                    <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://worldofideas.net')}`)} style={{ flex: '1 1 auto', padding: '0.5rem 1rem', border: '1px solid #0077B5', background: 'white', borderRadius: '20px', cursor: 'pointer', color: '#0077B5', fontWeight: 'bold' }}>💼 LinkedIn</button>
                </div>
            </div>
        </div>
    );
};

export default ShareCard;
