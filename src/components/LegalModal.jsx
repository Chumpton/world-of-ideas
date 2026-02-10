import React from 'react';

export const LegalModal = ({ type, onClose }) => {
    const isRules = type === 'rules';
    const title = isRules ? "Community Rules" : "Privacy Policy & Terms";

    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-panel)',
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.3s ease'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-title)', color: 'var(--color-text-main)' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem', overflowY: 'auto', lineHeight: '1.6', color: 'var(--color-text-main)' }}>
                    {isRules ? (
                        <>
                            <h3 style={{ marginTop: 0 }}>1. Be Respectful</h3>
                            <p>Constructive criticism determines the value of an idea. Personal attacks decrease the value of the network. We have zero tolerance for hate speech or harassment.</p>

                            <h3>2. Originality & Attribution</h3>
                            <p>When you fork an idea, you acknowledge the original spark. Do not claim others' work as solely your own without proper credit (forking handles this automatically).</p>

                            <h3>3. Constructive "Red Teaming"</h3>
                            <p>The Red Team exists to test ideas, not destroy them. Critique the feasibility, the utility, or the ethics, not the person.</p>

                            <h3>4. No Spam or Bots</h3>
                            <p>Our bot protection systems are active. Automated solicitation or low-effort spam will result in an immediate shadow ban.</p>
                        </>
                    ) : (
                        <>
                            <h3 style={{ marginTop: 0 }}>Data Collection</h3>
                            <p>We collect only what is necessary to maintain the integrity of the World of Ideas. Your intellectual property remains yours, though by posting, you grant the platform a license to display and for others to fork your concepts.</p>

                            <h3>Shadow Banning</h3>
                            <p>We reserve the right to "shadow ban" users who violate community guidelines. This means your content may be visible only to you, without notification.</p>

                            <h3>Cookies</h3>
                            <p>We use local storage to save your preferences (like dark mode). No third-party tracking cookies are used.</p>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--color-border)', textAlign: 'right', background: 'var(--bg-surface)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.6rem 1.5rem',
                            background: 'var(--color-text-main)',
                            color: 'var(--bg-panel)',
                            border: 'none',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
};
