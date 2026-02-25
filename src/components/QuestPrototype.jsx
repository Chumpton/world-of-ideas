import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import WorldMap from './WorldMap';

const DEFAULT_QUESTS = [
    {
        id: 'quest_beach_cleanup',
        title: 'Beach Cleanup',
        city: 'San Diego, CA',
        lat: 32.7157,
        lng: -117.1611,
        date: '2026-03-14',
        description: 'Community cleanup and waste sorting drive.'
    },
    {
        id: 'quest_park_treecare',
        title: 'Tree Care Day',
        city: 'Austin, TX',
        lat: 30.2672,
        lng: -97.7431,
        date: '2026-03-21',
        description: 'Mulch, water, and support local urban canopy.'
    },
    {
        id: 'quest_shelter_supply',
        title: 'Shelter Supply Run',
        city: 'Seattle, WA',
        lat: 47.6062,
        lng: -122.3321,
        date: '2026-03-29',
        description: 'Collect and deliver essentials to partner shelters.'
    }
];

const RSVP_VALUES = ['yes', 'maybe', 'no'];

const QuestPrototype = () => {
    const { questPrototypeStore, setQuestPrototypeStore } = useAppContext();
    const [selectedQuestId, setSelectedQuestId] = useState(DEFAULT_QUESTS[0].id);

    const quests = useMemo(() => {
        const local = Array.isArray(questPrototypeStore) && questPrototypeStore.length > 0
            ? questPrototypeStore
            : DEFAULT_QUESTS;
        return local;
    }, [questPrototypeStore]);

    const selectedQuest = quests.find((q) => q.id === selectedQuestId) || quests[0];

    const handleRSVP = (questId, status) => {
        setQuestPrototypeStore((prev) => {
            const base = Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_QUESTS;
            return base.map((q) => q.id === questId ? { ...q, myRsvp: status } : q);
        });
    };

    const addMockDate = (questId) => {
        setQuestPrototypeStore((prev) => {
            const base = Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_QUESTS;
            return base.map((q) => q.id === questId
                ? {
                    ...q,
                    altDates: [...(Array.isArray(q.altDates) ? q.altDates : []), new Date().toISOString().slice(0, 10)]
                }
                : q);
        });
    };

    return (
        <div style={{ padding: '7rem 2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ marginTop: 0 }}>Quest Prototype</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                UI prototype for world quests, RSVP states, and date proposals. Persistence is intentionally local for this phase.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '14px', background: 'var(--bg-panel)', overflow: 'hidden' }}>
                    {quests.map((q) => (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => setSelectedQuestId(q.id)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.9rem 1rem',
                                border: 'none',
                                borderBottom: '1px solid var(--color-border)',
                                background: selectedQuestId === q.id ? 'var(--bg-surface)' : 'transparent',
                                color: 'var(--color-text-main)',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>{q.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{q.city}</div>
                        </button>
                    ))}
                </div>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: '14px', background: 'var(--bg-panel)', padding: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>{selectedQuest?.title}</h3>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>{selectedQuest?.city} - {selectedQuest?.date}</div>
                    <p style={{ marginTop: 0 }}>{selectedQuest?.description}</p>

                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.9rem' }}>
                        {RSVP_VALUES.map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => handleRSVP(selectedQuest.id, status)}
                                style={{
                                    padding: '0.45rem 0.8rem',
                                    borderRadius: '999px',
                                    border: '1px solid var(--color-border)',
                                    background: selectedQuest?.myRsvp === status ? 'var(--color-secondary)' : 'transparent',
                                    color: selectedQuest?.myRsvp === status ? '#fff' : 'var(--color-text-main)',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => addMockDate(selectedQuest.id)}
                        style={{
                            padding: '0.5rem 0.9rem',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--color-text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        + Propose Additional Date
                    </button>

                    {Array.isArray(selectedQuest?.altDates) && selectedQuest.altDates.length > 0 && (
                        <ul style={{ marginTop: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {selectedQuest.altDates.map((d, idx) => <li key={`${d}-${idx}`}>{d}</li>)}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
                <WorldMap
                    projects={quests.map((q) => ({
                        id: q.id,
                        title: q.title,
                        solution: q.description,
                        location: { city: q.city, lat: q.lat, lng: q.lng }
                    }))}
                    onViewProject={(q) => setSelectedQuestId(q.id)}
                />
            </div>
        </div>
    );
};

export default QuestPrototype;
