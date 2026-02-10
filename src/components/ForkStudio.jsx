import React, { useState } from 'react';

const ForkStudio = ({ parentIdea, onNext, onCancel }) => {
    const [evolutionType, setEvolutionType] = useState('refinement'); // refinement, localization, expansion, pivot
    const [inheritance, setInheritance] = useState({
        content: true,
        team: true,
        resources: true
    });
    const [mutationNote, setMutationNote] = useState('');

    const EVOLUTION_TYPES = [
        { id: 'refinement', icon: '✨', label: 'Refinement', desc: 'Polish and improve the existing concept.' },
        { id: 'localization', icon: '📍', label: 'Localization', desc: 'Adapt the idea for a specific region or culture.' },
        { id: 'expansion', icon: '🚀', label: 'Expansion', desc: 'Scale the idea to new markets or scopes.' },
        { id: 'pivot', icon: '🔄', label: 'Pivot', desc: 'Keep the core vision but change the execution.' }
    ];

    const handleContinue = () => {
        onNext({
            evolutionType,
            inheritanceMap: inheritance,
            mutationNote
        });
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: "'Quicksand', sans-serif" }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Evolution Studio</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                    You are forking <strong style={{ color: 'var(--color-primary)' }}>{parentIdea.title}</strong>. How will you evolve this idea?
                </p>
            </div>

            {/* 1. Evolution Type Selector */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: 'var(--color-secondary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</span>
                    Choose Evolution Strategy
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {EVOLUTION_TYPES.map(type => (
                        <div
                            key={type.id}
                            onClick={() => setEvolutionType(type.id)}
                            style={{
                                padding: '1.5rem',
                                borderRadius: '16px',
                                border: `2px solid ${evolutionType === type.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                background: evolutionType === type.id ? 'var(--bg-surface)' : 'var(--bg-card)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{type.icon}</div>
                            <div style={{ fontWeight: '700', marginBottom: '0.2rem', color: 'var(--color-text-main)' }}>{type.label}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{type.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Smart Inheritance */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: 'var(--color-secondary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>2</span>
                    Smart Inheritance
                </h3>
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                        Select what you want to keep from the original idea. Uncheck to start fresh.
                    </p>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {[
                            { id: 'content', label: 'Content & Media', desc: 'Keep title, description, and images' },
                            { id: 'team', label: 'Team Structure', desc: 'Keep defined roles and vacancies' },
                            { id: 'resources', label: 'Resource List', desc: 'Keep required resources' }
                        ].map(item => (
                            <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={inheritance[item.id]}
                                    onChange={(e) => setInheritance(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                    style={{ marginTop: '4px', transform: 'scale(1.2)' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Mutation Note */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: 'var(--color-secondary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>3</span>
                    Mutation Note
                </h3>
                <textarea
                    value={mutationNote}
                    onChange={(e) => setMutationNote(e.target.value)}
                    placeholder="Briefly explain your vision for this fork..."
                    style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--bg-main)',
                        color: 'var(--color-text-main)',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        resize: 'vertical'
                    }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '0.8rem 2rem',
                        borderRadius: '50px',
                        border: 'none',
                        background: 'var(--bg-surface)',
                        color: 'var(--color-text-muted)',
                        fontWeight: '700',
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleContinue}
                    disabled={!mutationNote.trim()}
                    style={{
                        padding: '0.8rem 3rem',
                        borderRadius: '50px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        color: 'white',
                        fontWeight: '700',
                        cursor: 'pointer',
                        opacity: mutationNote.trim() ? 1 : 0.5,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                >
                    Begin Evolution
                </button>
            </div>
        </div>
    );
};

export default ForkStudio;
