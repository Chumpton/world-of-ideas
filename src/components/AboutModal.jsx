import React from 'react';

const AboutModal = ({ onClose }) => {
    return (
        <div className="dimmer-overlay" onClick={onClose} style={{ backdropFilter: 'blur(5px)' }}>
            <div className="submission-expanded" onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '850px',
                    margin: '2rem auto',
                    height: '92vh',
                    overflowY: 'auto',
                    padding: '0',
                    background: 'var(--bg-panel)',
                    fontFamily: "'Quicksand', sans-serif",
                    borderRadius: '24px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header Image / Gradient */}
                <div style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #C9644A 100%)',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1.5rem',
                            right: '1.5rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            fontSize: '1.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        &times;
                    </button>

                    <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{
                            width: '80px', height: '80px', margin: '0 auto 1.5rem auto',
                            background: 'rgba(255,255,255,0.15)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)'
                        }}>
                            <span style={{ fontSize: '3rem' }}>🌎</span>
                        </div>
                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '3.5rem',
                            marginBottom: '0.5rem',
                            fontWeight: '700',
                            textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            World of Ideas
                        </h1>
                        <p style={{
                            fontSize: '1.3rem',
                            fontWeight: '500',
                            opacity: 0.9,
                            maxWidth: '600px',
                            margin: '0 auto',
                            fontFamily: "'Quintessential', cursive"
                        }}>
                            The Platform for Applied Human Ingenuity
                        </p>
                    </div>

                    {/* Decorative Background Elements */}
                    <div style={{ position: 'absolute', top: -50, left: -50, width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', bottom: -30, right: -20, width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
                </div>

                <div style={{ padding: '3rem 2rem' }}>

                    {/* Intro Card */}
                    <section style={{
                        margin: '-5rem auto 3rem auto',
                        background: 'var(--bg-surface)',
                        padding: '2.5rem',
                        borderRadius: '20px',
                        maxWidth: '700px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        position: 'relative',
                        zIndex: 2,
                        textAlign: 'center',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontFamily: "'Playfair Display', serif", fontSize: '2.2rem' }}>What is World of Ideas?</h2>
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', fontWeight: '500', marginBottom: '1.5rem', fontStyle: 'italic', lineHeight: '1.6' }}>
                            "The Social Media of Ideas."
                        </h3>

                        <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>
                            <b>World of Ideas</b> is a place to make an idea for yourself, your community, and the world come true. Ranging from Policy, Inventions, Ecology, and Business—people up-spark ideas in the For You feed and the community can <b>Red Team</b>, <b>Fork</b>, <b>Chat</b>, <b>Fund</b>, and <b>Sign on as an Employee</b> of the Idea. It's every best feature from Kickstarter, GoFundMe, Craigslist and more jammed into an intuitive online framework.
                        </p>
                        <div style={{ height: '4px', width: '60px', background: 'var(--color-secondary)', margin: '0 auto', borderRadius: '2px' }}></div>
                    </section>

                    {/* Features Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>

                        {/* Sparks */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #e58e26', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Sparks</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                The currency of validation. Upvote ideas you believe in and push them towards community recognition and funding eligibility.
                            </p>
                        </div>

                        {/* Forks */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #00b894', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⑂</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Forks</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                Evolution through variation. Don't just critique—<b>Fork it</b>. Create a better version and let the community decide the best path forward.
                            </p>
                        </div>

                        {/* Red Team */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #d63031', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Red Team</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                Adversarial stress-testing. Help refine ideas by finding weaknesses. Only the resilient survive the gauntlet.
                            </p>
                        </div>

                        {/* Chat & Funding */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #0984e3', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Chat & Fund</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                Collaborate in real-time with idea creators. Pledge financial support or resources to help bring concepts to life.
                            </p>
                        </div>

                        {/* Sign On / Jobs */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #6c5ce7', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👷</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Sign On as Employee</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                Ideas need people. Apply your skills by signing on to help execute—from design to engineering to marketing.
                            </p>
                        </div>

                        {/* Categories */}
                        <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: '16px', borderTop: '4px solid #fdcb6e', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌎</div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Categories</h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                Policy, Inventions, Ecology, Business, Art, Infrastructure—every type of idea has a home here.
                            </p>
                        </div>

                    </div>

                    {/* Final CTA */}
                    <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderRadius: '20px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2d3436' }}>Ready to upgrade reality?</h2>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                padding: '1rem 3rem',
                                fontSize: '1.2rem',
                                borderRadius: '50px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '0 8px 20px rgba(255, 107, 107, 0.3)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Enter the World of Ideas
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', opacity: 0.7 }}>
                        World of Ideas Platform • Version 0.1 Alpha
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default AboutModal;
