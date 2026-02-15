import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import GuideCard from './GuideCard';
import GuideDetails from './GuideDetails';

const GuidesFeed = () => {
    const { guides, addGuide, user } = useAppContext();
    const [isCreating, setIsCreating] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [newGuide, setNewGuide] = useState({
        title: '',
        category: 'Invention',
        snippet: '',
        content: ''
    });

    const handleCreateWrapper = () => {
        if (!user) return alert("Please log in to write a guide.");
        setIsCreating(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newGuide.title || !newGuide.snippet) return alert("Please fill in title and snippet.");

        const result = await addGuide(newGuide);
        if (result && result.success) {
            alert("Guide published successfully!");
            setIsCreating(false);
            setNewGuide({ title: '', category: 'Invention', snippet: '', content: '' });
        } else {
            alert(`Failed to publish: ${result?.reason || 'Unknown error'}`);
        }
    };

    return (
        <div style={{ padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-text-main)' }}>Guides & Resources</h2>
                {!isCreating && (
                    <button
                        onClick={handleCreateWrapper}
                        className="write-guide-btn"
                    >
                        + Write Guide
                    </button>
                )}
            </div>

            {isCreating && (
                <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    marginBottom: '2rem',
                    border: '1px solid var(--color-border)',
                    margin: '0 1rem 2rem 1rem'
                }}>
                    <h3 style={{ marginTop: 0 }}>Create a New Guide</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            name="guide_title"
                            placeholder="Guide Title"
                            value={newGuide.title}
                            onChange={e => setNewGuide({ ...newGuide, title: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                            required
                        />
                        <select
                            name="guide_category"
                            value={newGuide.category}
                            onChange={e => setNewGuide({ ...newGuide, category: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                        >
                            <option value="Invention">Invention</option>
                            <option value="Policy">Policy</option>
                            <option value="Ecology">Ecology</option>
                            <option value="Health">Health</option>
                            <option value="Education">Education</option>
                            <option value="Other">Other</option>
                        </select>
                        <textarea
                            name="guide_snippet"
                            placeholder="Short Snippet / Description (appears on card)"
                            value={newGuide.snippet}
                            onChange={e => setNewGuide({ ...newGuide, snippet: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', minHeight: '80px' }}
                            required
                        />
                        <textarea
                            name="guide_content"
                            placeholder="Full Content (Markdown supported typically)"
                            value={newGuide.content}
                            onChange={e => setNewGuide({ ...newGuide, content: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', minHeight: '200px' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ padding: '0.6rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Publish Guide
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
                padding: '0 1rem'
            }}>
                {guides.map(guide => (
                    <GuideCard
                        key={guide.id}
                        guide={guide}
                        onClick={() => setSelectedGuide(guide)}
                    />
                ))}
            </div>

            {selectedGuide && (
                <GuideDetails
                    guide={selectedGuide}
                    onClose={() => setSelectedGuide(null)}
                />
            )}
        </div>
    );
};

export default GuidesFeed;
