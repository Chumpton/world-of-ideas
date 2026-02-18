import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { getLastSupabaseError } from '../context/supabaseHelpers';
import IdeaCard from './IdeaCard';
import { CATEGORIES as categories } from '../data/categories';
import RichTextEditor from './RichTextEditor';
import { buildIdeaLink } from '../utils/deepLinks';

const FORM_DRAFT_KEY = 'woi_submission_form_draft_v1';
const SUCCESS_STEP_INDEX = 6;

const SubmissionForm = ({ initialTitle = '', initialData = null, onClose }) => {
    const { submitIdea, user, requestCategory, uploadIdeaImage, setDraftData } = useAppContext();
    const isDraftEnvelope = Boolean(
        initialData
        && typeof initialData === 'object'
        && initialData.formData
        && typeof initialData.formData === 'object'
    );
    const seedData = isDraftEnvelope ? initialData.formData : initialData;
    const seedActivePaths = isDraftEnvelope && Array.isArray(initialData.activePaths) ? initialData.activePaths : null;
    const seedStep = isDraftEnvelope && Number.isInteger(initialData.currentStep) ? initialData.currentStep : null;
    const isForkSeed = Boolean(
        !isDraftEnvelope
        && seedData
        && typeof seedData === 'object'
        && (seedData.isForked === true || seedData.parentIdeaId || seedData.id)
    );
    const forkParentIdea = isForkSeed ? seedData : null;

    const [activePaths, setActivePaths] = useState(
        () => (Array.isArray(seedActivePaths) && seedActivePaths.length > 0 ? seedActivePaths : ['invention'])
    ); // Array for multiple categories
    const [currentStep, setCurrentStep] = useState(
        () => (Number.isInteger(seedStep) ? Math.max(0, Math.min(seedStep, SUCCESS_STEP_INDEX)) : 0)
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedIdea, setSubmittedIdea] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const submitInFlightRef = useRef(false);
    const closeOnceRef = useRef(false);
    const hydratedDraftRef = useRef(false);

    // Form State
    const [formData, setFormData] = useState({
        title: seedData?.title || initialTitle,
        subtitle: seedData?.subtitle || seedData?.description || '',
        body: seedData?.body || '',
        tags: seedData?.tags || [],
        resourcesNeeded: seedData?.resourcesNeeded || [],
        peopleNeeded: seedData?.peopleNeeded || [],
        notes: seedData?.notes || '',
        isLocal: seedData?.isLocal || false,
        locationCity: seedData?.locationCity || seedData?.location?.city || '',
        locationLat: seedData?.locationLat || seedData?.location?.lat || '',
        locationLng: seedData?.locationLng || seedData?.location?.lng || '',
        teamDescription: seedData?.teamDescription || '',
        customResource: '',
        customRole: '',
        titleImage: seedData?.titleImage || '',
        thumbnail: seedData?.thumbnail || '',
        // Fork specific linkage
        parentIdeaId: seedData?.parentIdeaId || seedData?.id || null, // If forking, the current idea is the parent
        isForked: isForkSeed,
        // Evolution Strategy
        evolutionType: seedData?.evolutionType || 'refinement', // refinement, localization, expansion, pivot
        inheritanceMap: seedData?.inheritanceMap || {
            content: true,
            team: true,
            resources: true
        },
        mutationNote: seedData?.mutationNote || ''
    });

    // Slides Configuration
    const steps = [
        { id: 'intro', title: 'Start Here' },
        { id: 'category', title: 'Choose Category' },
        { id: 'details', title: 'Idea Structure' },
        { id: 'team', title: 'Team Assembly' },
        { id: 'resources', title: 'Resource Allocation' },
        { id: 'review', title: 'Manifest Review' },
        { id: 'success', title: 'Launch Successful' }
    ];
    const totalSteps = steps.length - 1; // Exclude success step from count for UI logic

    // Resource options
    const resourceOptions = [
        { id: 'solar', label: 'Solar Panels', icon: '☀️' },
        { id: 'tools', label: 'Tools & Equipment', icon: '🔧' },
        { id: 'materials', label: 'Raw Materials', icon: '🧱' },
        { id: 'electronics', label: 'Electronics', icon: '💻' },
        { id: 'vehicles', label: 'Vehicles/Transport', icon: '🚗' },
        { id: 'land', label: 'Land/Space', icon: '🏞️' },
        { id: 'funding', label: 'Funding/Capital', icon: '💰' },
        { id: 'software', label: 'Software Licenses', icon: '📀' },
        { id: '3dprint', label: '3D Printers', icon: '🖨️' },
        { id: 'cloud', label: 'Cloud Computing', icon: '☁️' },
        { id: 'lab', label: 'Laboratory Access', icon: '🧪' },
        { id: 'office', label: 'Office Space', icon: '🏢' },
        { id: 'permits', label: 'Legal Permits', icon: '📜' },
        { id: 'factory', label: 'Manuf. Partner', icon: '🏭' },
        { id: 'drones', label: 'Drones', icon: '🚁' },
        { id: 'vr', label: 'VR/AR Headsets', icon: '🥽' },
        { id: 'textile', label: 'Textiles/Fabrics', icon: '🧵' },
        { id: 'bio', label: 'Bioreactors', icon: '🦠' },
        { id: 'sensors', label: 'IoT Sensors', icon: '📡' },
        { id: 'wifi', label: 'High-Speed Net', icon: '📶' },
        { id: 'server', label: 'Server Hosting', icon: '🖥️' }
    ];

    // Role options
    const roleOptions = [
        { id: 'developer', label: 'Developer', icon: '👨‍💻' },
        { id: 'designer', label: 'Designer', icon: '🎨' },
        { id: 'legal', label: 'Legal Expert', icon: '⚖️' },
        { id: 'marketing', label: 'Marketing', icon: '📣' },
        { id: 'engineer', label: 'Engineer', icon: '🔬' },
        { id: 'community', label: 'Community Mgr', icon: '🤝' },
        { id: 'finance', label: 'Finance/Acct', icon: '📊' },
        { id: 'researcher', label: 'Researcher', icon: '🔍' },
        { id: 'writer', label: 'Writer/Content', icon: '✍️' },
        { id: 'logistics', label: 'Logistics', icon: '🚚' },
        { id: 'data', label: 'Data Scientist', icon: '📈' },
        { id: 'ai', label: 'AI Specialist', icon: '🤖' },
        { id: 'hardware', label: 'Hardware Hacker', icon: '🛠️' },
        { id: '3dmodel', label: '3D Modeler', icon: '🧊' },
        { id: 'video', label: 'Videographer', icon: '🎥' },
        { id: 'sound', label: 'Sound Engineer', icon: '🎧' },
        { id: 'urban', label: 'Urban Planner', icon: '🏙️' },
        { id: 'teacher', label: 'Educator', icon: '🎓' },
        { id: 'policy', label: 'Policy Maker', icon: '🏛️' },
        { id: 'psych', label: 'Psychologist', icon: '🧠' },
        { id: 'artist', label: 'Artist', icon: '🎭' },
        { id: 'music', label: 'Musician', icon: '🎵' },
        { id: 'translate', label: 'Translator', icon: '🗣️' },
        { id: 'event', label: 'Event Planner', icon: '📅' },
        { id: 'sales', label: 'Sales/BizDev', icon: '💼' }
    ];

    // Use the first selected category for theming defaults
    const currentCategory = categories.find(c => c.id === activePaths[0]) || categories[0];

    const safeClose = (payload = null) => {
        if (closeOnceRef.current) return;
        closeOnceRef.current = true;
        onClose(payload || undefined);
    };

    const hasUnsavedInput = () => {
        return Boolean(
            (formData.title && formData.title.trim())
            || (formData.body && formData.body.trim())
            || (Array.isArray(formData.peopleNeeded) && formData.peopleNeeded.length > 0)
            || (Array.isArray(formData.resourcesNeeded) && formData.resourcesNeeded.length > 0)
            || imageFile
        );
    };

    // Recover from unexpected close/re-render by hydrating last draft.
    useEffect(() => {
        if (hydratedDraftRef.current) return;
        if (isForkSeed) return;
        hydratedDraftRef.current = true;
        try {
            const raw = localStorage.getItem(FORM_DRAFT_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            if (parsed.formData && typeof parsed.formData === 'object') {
                setFormData(prev => ({ ...prev, ...parsed.formData }));
            }
            if (Array.isArray(parsed.activePaths) && parsed.activePaths.length > 0) {
                setActivePaths(parsed.activePaths);
            }
            if (Number.isInteger(parsed.currentStep) && parsed.currentStep >= 0 && parsed.currentStep <= totalSteps) {
                setCurrentStep(parsed.currentStep);
            }
        } catch (_) { }
    }, [isForkSeed, totalSteps]);

    // Persist draft continuously so accidental closes do not lose work.
    useEffect(() => {
        if (closeOnceRef.current) return;
        if (isForkSeed) return;
        const payload = {
            formData,
            activePaths,
            currentStep,
            updatedAt: Date.now(),
        };
        try {
            setDraftData(payload);
            localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(payload));
        } catch (_) { }
    }, [formData, activePaths, currentStep, setDraftData, isForkSeed]);

    const [categorySearch, setCategorySearch] = useState('');

    useEffect(() => {
        if (initialTitle) {
            setFormData(prev => ({ ...prev, title: initialTitle }));
            setCurrentStep(2); // Jump to details if title provided (Quick Submit)
        }
    }, [initialTitle]);

    const insertMarkdown = (syntax) => {
        const textarea = document.querySelector('textarea[name="body"]');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.body || '';
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = '';
        let newCursorPos = 0;

        switch (syntax) {
            case 'bold':
                newText = `${before}**${selection || 'bold text'}**${after}`;
                newCursorPos = selection ? end + 4 : start + 2 + 9;
                break;
            case 'italic':
                newText = `${before}_${selection || 'italic text'}_${after}`;
                newCursorPos = selection ? end + 2 : start + 1 + 11;
                break;
            case 'h1':
                newText = `${before}\n# ${selection || 'Heading 1'}\n${after}`;
                newCursorPos = selection ? end + 4 : start + 3 + 9;
                break;
            case 'h2':
                newText = `${before}\n## ${selection || 'Heading 2'}\n${after}`;
                newCursorPos = selection ? end + 5 : start + 4 + 9;
                break;
            case 'list':
                newText = `${before}\n- ${selection || 'List item'}\n${after}`;
                newCursorPos = selection ? end + 4 : start + 3 + 9;
                break;
            case 'link':
                newText = `${before}[${selection || 'Link Text'}](url)${after}`;
                newCursorPos = selection ? end + 12 : start + 18;
                break;
            default:
                return;
        }

        setFormData(prev => ({ ...prev, body: newText }));

        // Defer cursor setting to next tick after render
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 800);
    };

    const toggleResource = (resourceId) => {
        setFormData(prev => ({
            ...prev,
            resourcesNeeded: prev.resourcesNeeded.includes(resourceId)
                ? prev.resourcesNeeded.filter(r => r !== resourceId)
                : [...prev.resourcesNeeded, resourceId]
        }));
    };

    const toggleRole = (roleIdOrName) => {
        setFormData(prev => ({
            ...prev,
            peopleNeeded: prev.peopleNeeded.includes(roleIdOrName)
                ? prev.peopleNeeded.filter(r => r !== roleIdOrName)
                : [...prev.peopleNeeded, roleIdOrName]
        }));
    };

    const addCustomRole = () => {
        if (formData.customRole.trim()) {
            // Avoid duplicates
            if (!formData.peopleNeeded.includes(formData.customRole.trim())) {
                setFormData(prev => ({
                    ...prev,
                    peopleNeeded: [...prev.peopleNeeded, prev.customRole.trim()],
                    customRole: ''
                }));
            } else {
                setFormData(prev => ({ ...prev, customRole: '' }));
            }
        }
    };


    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (e?.stopPropagation) e.stopPropagation();

        // Only allow submission from the review step to avoid accidental Enter submits.
        if (currentStep !== totalSteps - 1) return;
        if (submitInFlightRef.current || closeOnceRef.current) return;
        submitInFlightRef.current = true;
        setIsSubmitting(true);

        // VALIDATION: Ensure title and body are present
        if (!formData.title || !formData.title.trim()) {
            alert("Please enter a title for your idea.");
            submitInFlightRef.current = false;
            setIsSubmitting(false);
            return;
        }
        if (!formData.body || !formData.body.trim()) {
            alert("Please describe your idea.");
            submitInFlightRef.current = false;
            setIsSubmitting(false);
            return;
        }

        try {
            // Upload idea image if a file was selected
            let titleImageUrl = formData.titleImage || '';
            let thumbnailUrl = formData.thumbnail || '';
            const tempId = 'idea_' + Date.now();
            if (imageFile) {
                const uploaded = await uploadIdeaImage(imageFile, tempId);
                if (uploaded) {
                    titleImageUrl = uploaded;
                    thumbnailUrl = thumbnailUrl || uploaded;
                }
            }

            // Construct the final idea object
            const newIdea = {
                id: tempId,
                type: activePaths[0] || 'invention',
                categories: activePaths,
                timestamp: Date.now(),
                votes: 1,
                forks: 0,
                commentCount: 0,
                title: formData.title || 'Untitled Idea',
                subtitle: formData.subtitle || '',
                body: formData.body || '',
                solution: formData.body || '',
                description: (formData.subtitle || '').trim() || (formData.body || '').substring(0, 200),
                resourcesNeeded: formData.resourcesNeeded,
                peopleNeeded: formData.peopleNeeded,
                author: user ? (user.username || user.name || 'Anonymous') : 'You',
                userRole: 'Creator',
                isLocal: formData.isLocal,
                location: formData.isLocal ? {
                    city: formData.locationCity,
                    lat: parseFloat(formData.locationLat) || 0,
                    lng: parseFloat(formData.locationLng) || 0
                } : null,
                titleImage: titleImageUrl || '',
                thumbnail: thumbnailUrl || '',
                // Forking Metadata
                parentIdeaId: formData.isForked ? formData.parentIdeaId : null,
                forkedFrom: formData.isForked && forkParentIdea ? (forkParentIdea.title || 'Unknown Idea') : null,
                evolutionType: formData.isForked ? formData.evolutionType : null,
                mutationNote: formData.isForked ? formData.mutationNote : null,
                inheritanceMap: formData.isForked ? formData.inheritanceMap : null
            };

            const submitResult = await submitIdea(newIdea);
            const createdIdea = submitResult?.idea || submitResult || null;
            if (!createdIdea?.id) {
                const lastErr = getLastSupabaseError();
                console.error('[Idea Submit] Save failed', {
                    lastSupabaseError: lastErr,
                    payload: newIdea,
                    user: user
                });
                const details = lastErr
                    ? `Error: ${lastErr.message}\nCode: ${lastErr.code}\nHint: ${lastErr.hint || 'No hint'}\nStage: ${lastErr.stage}`
                    : 'Unknown failure (no error payload captured)';
                alert(`SUBMISSION FAILED\n\n${details}\n\nCheck console for full debug info.`);
                return;
            }

            setSubmittedIdea(createdIdea);
            try {
                setDraftData(null);
                localStorage.removeItem(FORM_DRAFT_KEY);
            } catch (_) { }
            safeClose(createdIdea); // Trigger navigation immediately with persisted row
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Submission failed. Your draft is still saved.");
        } finally {
            submitInFlightRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleCategorySelect = (catId) => {
        // Toggle selection
        setActivePaths(prev =>
            prev.includes(catId)
                ? prev.filter(p => p !== catId)
                : [...prev, catId]
        );
    };

    const handleImageDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Render helpers
    const currentStepObj = steps[currentStep];
    const progressPerc = (currentStep / totalSteps) * 100;

    return (
        <div className="dimmer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div
                className="submission-modal glass-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '900px',
                    width: '95%',
                    height: '85vh',
                    margin: '0',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-panel)',
                    borderRadius: '24px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    fontFamily: "'Quicksand', sans-serif",
                    position: 'relative',
                    overflow: 'hidden',
                    color: 'var(--color-text-main)'
                }}
            >
                {currentStep > 0 && currentStep < SUCCESS_STEP_INDEX && (
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-header)', zIndex: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.2rem' }}>
                                    Step {currentStep + 1} / {totalSteps}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-main)', letterSpacing: '-0.5px' }}>
                                    {currentStepObj.title}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasUnsavedInput() && !confirm('Close form? Your draft will stay saved for later.')) return;
                                    safeClose();
                                }}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: '#f1f2f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--color-text-muted)', transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#e1e2e6'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f2f6'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Styled Progress Bar (Blue) */}
                        <div style={{ height: '8px', width: '100%', background: '#edf2f7', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progressPerc}%`, background: '#0984e3', borderRadius: '4px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                    </div>
                )}

                {/* Main Content Area - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>

                    {/* SUCCESS STEP (Idea Card View) */}
                    {currentStep === SUCCESS_STEP_INDEX && submittedIdea ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel)', padding: '2rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                                <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--color-text-main)' }}>Congratulations!</h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Your idea has been successfully submitted to the World.</p>
                            </div>

                            <div style={{ transform: 'scale(1.0)', marginBottom: '2rem', pointerEvents: 'none' }}>
                                <IdeaCard idea={submittedIdea} />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {/* View Idea Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        safeClose(submittedIdea); // Pass the idea back so parent can navigate
                                    }}
                                    style={{
                                        padding: '1rem 2rem',
                                        borderRadius: '50px',
                                        border: 'none',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(9, 132, 227, 0.3)',
                                        transition: 'transform 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    👁️ View My Idea
                                </button>

                                {/* Share Idea Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const url = buildIdeaLink(submittedIdea.id);
                                        navigator.clipboard.writeText(url).then(() => {
                                            alert('🔗 Link copied! Share your idea with the world.');
                                        }).catch(() => {
                                            alert(`Share this idea: ${submittedIdea.title}`);
                                        });
                                    }}
                                    style={{
                                        padding: '1rem 2rem',
                                        borderRadius: '50px',
                                        border: '2px solid var(--color-primary)',
                                        background: 'transparent',
                                        color: 'var(--color-primary)',
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                >
                                    🔗 Share Idea
                                </button>

                                {/* Back to Feed */}
                                <button
                                    type="button"
                                    onClick={() => safeClose()}
                                    style={{
                                        padding: '1rem 2rem',
                                        borderRadius: '50px',
                                        border: 'none',
                                        background: '#f1f2f6',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#e1e2e6'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f1f2f6'}
                                >
                                    ← Back to Feed
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form id="submission-form" onSubmit={handleSubmit} style={{ height: '100%', padding: '2rem 3rem' }}>

                            {/* STEP 0: Intro / Rules / Feature Explainer OR Cloud & Fork Studio */}
                            {currentStep === 0 && (
                                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingBottom: '4rem', position: 'relative' }}>

                                    {/* Close Button for Step 0 */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasUnsavedInput() && !confirm('Close form? Your draft will stay saved for later.')) return;
                                            safeClose();
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-1rem',
                                            right: '-1rem',
                                            width: '40px', height: '40px',
                                            borderRadius: '50%',
                                            background: '#f1f2f6',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            color: 'var(--color-text-muted)',
                                            transition: 'all 0.2s',
                                            zIndex: 10
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e1e2e6'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f2f6'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                    >
                                        &times;
                                    </button>

                                    {/* FORK STUDIO MODE */}
                                    {formData.isForked && forkParentIdea ? (
                                        <div className="fork-studio-container" style={{ animation: 'fadeIn 0.5s ease' }}>
                                            <div style={{ marginBottom: '2rem' }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧬</div>
                                                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>Evolution Studio</h1>
                                                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>You are evolving <strong>{forkParentIdea.title}</strong>. How will you improve it?</p>
                                            </div>

                                            {/* Evolution Type Selector */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem', textAlign: 'left' }}>
                                                {[
                                                    { id: 'refinement', icon: '🔧', title: 'Refinement', desc: 'Optimizing the existing concept.' },
                                                    { id: 'localization', icon: '🌍', title: 'Localization', desc: 'Adapting for a specific region.' },
                                                    { id: 'expansion', icon: '🚀', title: 'Expansion', desc: 'Growing the scope or scale.' },
                                                    { id: 'pivot', icon: '🔄', title: 'Pivot', desc: 'Same problem, different solution.' }
                                                ].map(type => (
                                                    <div
                                                        key={type.id}
                                                        onClick={() => setFormData(prev => ({ ...prev, evolutionType: type.id }))}
                                                        style={{
                                                            padding: '1.5rem',
                                                            borderRadius: '16px',
                                                            border: formData.evolutionType === type.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                            background: formData.evolutionType === type.id ? 'var(--color-bg-light)' : 'var(--bg-card)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: formData.evolutionType === type.id ? '0 5px 15px rgba(9, 132, 227, 0.15)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{type.icon}</div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', color: formData.evolutionType === type.id ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{type.title}</div>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{type.desc}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Smart Inheritance */}
                                            <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '2rem', border: '1px solid var(--color-border)', marginBottom: '2rem', textAlign: 'left' }}>
                                                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🧬 DNA Inheritance</h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="evolution_keep_content"
                                                            checked={formData.inheritanceMap.content}
                                                            onChange={e => setFormData(prev => ({ ...prev, inheritanceMap: { ...prev.inheritanceMap, content: e.target.checked } }))}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                        Keep Content
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="evolution_keep_team"
                                                            checked={formData.inheritanceMap.team}
                                                            onChange={e => setFormData(prev => ({ ...prev, inheritanceMap: { ...prev.inheritanceMap, team: e.target.checked } }))}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                        Keep Roles
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="evolution_keep_resources"
                                                            checked={formData.inheritanceMap.resources}
                                                            onChange={e => setFormData(prev => ({ ...prev, inheritanceMap: { ...prev.inheritanceMap, resources: e.target.checked } }))}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                        Keep Resources
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Mutation Note */}
                                            <div style={{ textAlign: 'left' }}>
                                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Evolution Strategy (Mutation Note)</label>
                                                <textarea
                                                    name="mutation_note"
                                                    value={formData.mutationNote}
                                                    onChange={e => setFormData(prev => ({ ...prev, mutationNote: e.target.value }))}
                                                    placeholder="Why does this fork exist? (e.g. 'Bringing this concept to a new market', 'Fixing the governance model')"
                                                    style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontFamily: 'inherit', fontSize: '1rem', resize: 'vertical' }}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setCurrentStep(1)}
                                                style={{ marginTop: '2rem', padding: '1rem 3rem', borderRadius: '50px', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(9, 132, 227, 0.3)' }}
                                            >
                                                Start Evolution &rarr;
                                            </button>

                                        </div>
                                    ) : (
                                        /* STANDARD SUBMISSION INTRO */
                                        <>
                                            <div style={{ marginBottom: '2rem' }}>
                                                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '3rem', color: 'var(--color-title)', marginBottom: '1rem', fontWeight: 'bold' }}>What is an Idea?</h1>
                                                <div style={{ fontSize: '1.05rem', color: 'var(--color-text-main)', lineHeight: '1.7', textAlign: 'left', maxWidth: '760px', margin: '0 auto', background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                                                    <p style={{ margin: '0' }}>
                                                        An idea is a starting point for solving a real problem. You post it, people discuss it, improve it, and help build it with skills and resources.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Baseline Feature Bubbles */}
                                            <div className="feature-explainer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', textAlign: 'left', marginBottom: '3rem' }}>
                                                {[
                                                    { title: 'Influence', icon: '⚡', desc: 'Votes and support that raise visibility.' },
                                                    { title: 'Discussion', icon: '💬', desc: 'Threaded conversation around the idea.' },
                                                    { title: 'Feedback', icon: '✉️', desc: 'Questions and critique to improve clarity.' },
                                                    { title: 'Contribute', icon: '🤝', desc: 'Join with skills, roles, and resources.' },
                                                    { title: 'Wiki', icon: '📁', desc: 'A shared knowledge base for docs and links.' },
                                                    {
                                                        title: 'Forks',
                                                        icon: (
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                                                <circle cx="18" cy="6" r="3"></circle>
                                                                <circle cx="6" cy="18" r="3"></circle>
                                                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                                                            </svg>
                                                        ),
                                                        desc: 'Create a new branch inspired by this idea.'
                                                    },
                                                    { title: 'Clubs', icon: '🏛️', desc: 'Collaborate inside focused communities.' },
                                                    { title: 'Bounties', icon: '🎯', desc: 'Offer rewards for specific tasks and outcomes.' }
                                                ].map((item) => (
                                                    <div key={item.title} style={{ padding: '1rem 1.1rem', background: 'var(--bg-panel)', borderRadius: '14px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
                                                            <span style={{ width: '1.9rem', height: '1.9rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-pill)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', fontSize: '1rem' }}>
                                                                {item.icon}
                                                            </span>
                                                            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--color-text-main)' }}>
                                                                {item.title}
                                                            </span>
                                                        </div>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.45', margin: 0 }}>
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ padding: '1.2rem', background: 'var(--bg-panel)', borderRadius: '12px', color: 'var(--color-text-main)', fontWeight: 'bold', border: '1px solid var(--color-border)' }}>
                                                <button type="button" onClick={() => {
                                                    if (user) setCurrentStep(1);
                                                    else safeClose();
                                                }} style={{ background: 'none', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: 'inherit' }}>
                                                    {user ? "Ready to change the world? Let's go ->" : "Sign in to submit an idea."}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* STEP 1: Category Selection (Multiple) */}
                            {currentStep === 1 && (
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Select Categories</h3>
                                        <p style={{ color: 'var(--color-text-muted)' }}>Choose one or more areas that this idea impacts.</p>
                                        <input
                                            type="text"
                                            name="category_search"
                                            placeholder="Search categories..."
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                            style={{
                                                marginTop: '1rem',
                                                padding: '0.8rem 1.5rem',
                                                borderRadius: '50px',
                                                border: '1px solid var(--color-border)',
                                                width: '100%',
                                                maxWidth: '400px',
                                                fontSize: '1rem',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div className="category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.8rem', marginTop: '1rem' }}>
                                        {categories.filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => {
                                            const isSelected = activePaths.includes(cat.id);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => handleCategorySelect(cat.id)}
                                                    style={{
                                                        padding: '0.8rem', // Reduced padding
                                                        border: isSelected ? `2px solid ${cat.color}` : '1px solid rgba(0,0,0,0.1)',
                                                        borderRadius: '12px',
                                                        cursor: 'pointer',
                                                        background: isSelected ? 'var(--color-bg-light)' : 'white',
                                                        color: 'var(--color-text-main)',
                                                        boxShadow: isSelected ? `0 4px 10px ${cat.color}33` : 'none',
                                                        display: 'flex',
                                                        alignItems: 'center', // Horizontal alignment
                                                        gap: '0.8rem',
                                                        transition: 'all 0.2s ease',
                                                        textAlign: 'left',
                                                        transform: isSelected ? 'translateY(-2px)' : 'none',
                                                        opacity: (activePaths.length > 0 && !isSelected) ? 0.6 : 1
                                                    }}
                                                >
                                                    <div style={{
                                                        fontSize: '1.5rem', // Smaller icon
                                                        background: isSelected ? cat.color : '#f8f9fa',
                                                        width: '40px', height: '40px', // Smaller circle
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: '50%',
                                                        transition: 'background 0.2s',
                                                        color: isSelected ? 'white' : 'inherit',
                                                        flexShrink: 0
                                                    }}>
                                                        {cat.icon}
                                                    </div>
                                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? cat.color : 'inherit', lineHeight: 1.2 }}>{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Request Category Button */}
                                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Don't see your category?</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const cat = prompt("Which category would you like to request?");
                                                if (cat && cat.trim()) {
                                                    const result = await requestCategory(cat.trim());
                                                    if (result.success) {
                                                        alert("Request submitted successfully! Admins will review it.");
                                                    } else {
                                                        alert("Error: " + result.reason);
                                                    }
                                                }
                                            }}
                                            style={{
                                                background: 'transparent', border: '1px solid var(--color-border)',
                                                padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer',
                                                color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 'bold'
                                            }}
                                            onMouseEnter={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.color = 'var(--color-primary)' }}
                                            onMouseLeave={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.color = 'var(--color-text-muted)' }}
                                        >
                                            + Request New Category
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Details (Title, Body Only) */}
                            {currentStep === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>

                                    {/* Category Indicator */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
                                        {activePaths.map(pathId => {
                                            const cat = categories.find(c => c.id === pathId);
                                            return (
                                                <div key={pathId} style={{
                                                    background: cat.color,
                                                    color: 'white',
                                                    padding: '0.4rem 1rem',
                                                    borderRadius: '50px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.8rem',
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                }}>
                                                    {cat.icon} {cat.label}
                                                </div>
                                            );
                                        })}
                                        <button type="button" onClick={() => setCurrentStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Change</button>
                                    </div>

                                    {/* Title */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Idea Title</label>
                                        <input
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="E.g., Decentralized Voting dApp"
                                            style={{
                                                fontSize: '2.5rem',
                                                fontWeight: '800',
                                                fontFamily: 'var(--font-title)',
                                                border: 'none',
                                                borderBottom: '2px solid #e1e1e1',
                                                background: 'transparent',
                                                width: '100%',
                                                padding: '0.5rem 0',
                                                outline: 'none',
                                                color: 'var(--color-text-main)',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'var(--color-secondary)'}
                                            onBlur={e => e.target.style.borderColor = '#e1e1e1'}
                                        />
                                    </div>

                                    {/* Optional subtitle */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 'bold', fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                            Optional Subtitle / Quick Explainer
                                        </label>
                                        <input
                                            name="subtitle"
                                            value={formData.subtitle}
                                            onChange={handleChange}
                                            placeholder="One sentence summary shown on the idea card"
                                            maxLength={180}
                                            style={{
                                                width: '100%',
                                                padding: '0.9rem 1rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border)',
                                                background: 'var(--bg-panel)',
                                                color: 'var(--color-text-main)',
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <RichTextEditor
                                            value={formData.body}
                                            onChange={(val) => setFormData(prev => ({ ...prev, body: val }))}
                                            placeholder="Explain your idea, the problem it solves, and how it works..."
                                            submitLabel="Save Draft"
                                        />
                                    </div>

                                    {/* Optional 1080x1080 thumbnail upload for feed card */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 'bold', fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                            Idea Card Thumbnail (Optional, 1080x1080 square)
                                        </label>
                                        <div
                                            style={{
                                                border: '2px dashed var(--color-border)',
                                                borderRadius: '16px',
                                                padding: (imagePreview || formData.titleImage) ? '0.9rem' : '1.6rem 1rem',
                                                background: 'var(--bg-surface)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                textAlign: 'center'
                                            }}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-secondary)'; }}
                                            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                            onDrop={(e) => { handleImageDrop(e); e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                            onClick={() => document.getElementById('hidden-file-input-inline')?.click()}
                                        >
                                            <input
                                                type="file"
                                                id="hidden-file-input-inline"
                                                name="idea_thumbnail_upload"
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        setImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            {(imagePreview || formData.titleImage) ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <img
                                                        src={imagePreview || formData.titleImage}
                                                        alt="Thumbnail preview"
                                                        style={{ width: '100%', maxWidth: '320px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--color-border)' }}
                                                    />
                                                    <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Click or drag to replace</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>🖼️</div>
                                                    <div style={{ color: 'var(--color-text-main)', fontWeight: '700' }}>Upload square image</div>
                                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                                        If left empty, the category default image is used in the feed.
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Toggle */}
                                    <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginBottom: formData.isLocal ? '1.5rem' : '0' }}>
                                            <input
                                                type="checkbox"
                                                name="isLocal"
                                                checked={formData.isLocal}
                                                onChange={e => setFormData(prev => ({ ...prev, isLocal: e.target.checked }))}
                                                style={{ width: '20px', height: '20px' }}
                                            />
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>Is this a Local / Physical Project?</span>
                                        </label>

                                        {formData.isLocal && (
                                            <div className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', animation: 'fadeIn 0.3s ease' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }}>City / Region</label>
                                                    <input
                                                        name="locationCity" value={formData.locationCity} onChange={handleChange} placeholder="e.g. Austin, TX"
                                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }}>Latitude</label>
                                                    <input
                                                        name="locationLat" value={formData.locationLat} onChange={handleChange} placeholder="e.g. 30.26"
                                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }}>Longitude</label>
                                                    <input
                                                        name="locationLng" value={formData.locationLng} onChange={handleChange} placeholder="e.g. -97.74"
                                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Team */}
                            {currentStep === 3 && (
                                <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Who do you need?</h3>
                                        <p style={{ color: 'var(--color-text-muted)' }}>Define the roles required. Select from suggestions or add your own.</p>
                                    </div>

                                    {/* 1. Custom Role Input */}
                                    <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="customRole"
                                            value={formData.customRole}
                                            onChange={handleChange}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); } }}
                                            placeholder="e.g. Senior Rust Developer, Legal Advisor..."
                                            style={{
                                                flex: 1,
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border)',
                                                fontSize: '1rem'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomRole}
                                            style={{
                                                padding: '1rem 1.5rem',
                                                background: 'var(--color-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* 2. Selected Roles (Active Pills) */}
                                    {formData.peopleNeeded.length > 0 && (
                                        <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {formData.peopleNeeded.map(roleId => {
                                                const predefined = roleOptions.find(r => r.id === roleId);
                                                const label = predefined ? predefined.label : roleId;
                                                const icon = predefined ? predefined.icon : '👤';

                                                return (
                                                    <div key={roleId} style={{
                                                        background: 'var(--color-primary)',
                                                        color: 'white',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '30px',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        boxShadow: '0 4px 10px rgba(9, 132, 227, 0.2)'
                                                    }}>
                                                        <span>{icon} {label}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleRole(roleId)}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.2)',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '20px', height: '20px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'white'
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 3. Suggestions Grid (Compact) */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Suggestions</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                            {roleOptions.filter(r => !formData.peopleNeeded.includes(r.id)).map(role => (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => toggleRole(role.id)}
                                                    style={{
                                                        padding: '0.6rem 1rem',
                                                        borderRadius: '20px', // Pill shape
                                                        border: '1px solid var(--color-border)',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--color-text-main)',
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.1s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                                >
                                                    <span>{role.icon}</span>
                                                    <span>{role.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Team Description */}
                                    <div>
                                        <FloatingTextarea
                                            label="Team Mission & Needed Skills (Optional)"
                                            name="teamDescription"
                                            value={formData.teamDescription}
                                            onChange={handleChange}
                                            placeholder="Describe what this team is for, specific skill levels needed, etc..."
                                            style={{ minHeight: '100px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Resources */}
                            {currentStep === 4 && (
                                <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Resource Requirements</h3>
                                        <p style={{ color: 'var(--color-text-muted)' }}>Identify the physical and capital assets needed.</p>
                                    </div>

                                    {/* 1. Custom Resource Input */}
                                    <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            name="customResourceInput" // Using a temp name handled by specific handler if needed, or just leverage current state
                                            id="customResourceInput"
                                            placeholder="e.g. 500sqft Warehouse, $50k Seed Funding..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.target.value;
                                                    if (val.trim()) {
                                                        toggleResource(val.trim());
                                                        e.target.value = '';
                                                    }
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border)',
                                                fontSize: '1rem'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = document.getElementById('customResourceInput');
                                                if (el && el.value.trim()) {
                                                    toggleResource(el.value.trim());
                                                    el.value = '';
                                                }
                                            }}
                                            style={{
                                                padding: '1rem 1.5rem',
                                                background: 'var(--color-secondary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* 2. Selected Resources (Active Pills) */}
                                    {formData.resourcesNeeded.length > 0 && (
                                        <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {formData.resourcesNeeded.map(resId => {
                                                const predefined = resourceOptions.find(r => r.id === resId);
                                                const label = predefined ? predefined.label : resId;
                                                const icon = predefined ? predefined.icon : '🧱';

                                                return (
                                                    <div key={resId} style={{
                                                        background: 'var(--color-secondary)',
                                                        color: 'white',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '30px',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        boxShadow: '0 4px 10px rgba(0, 184, 148, 0.2)'
                                                    }}>
                                                        <span>{icon} {label}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleResource(resId)}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.2)',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '20px', height: '20px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'white'
                                                            }}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 3. Suggestions Grid (Compact) */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Suggestions</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                            {resourceOptions.filter(r => !formData.resourcesNeeded.includes(r.id)).map(res => (
                                                <button
                                                    key={res.id}
                                                    type="button"
                                                    onClick={() => toggleResource(res.id)}
                                                    style={{
                                                        padding: '0.6rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '1px solid var(--color-border)',
                                                        background: 'var(--bg-card)',
                                                        color: 'var(--color-text-main)',
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '500',
                                                        transition: 'all 0.1s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-secondary)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                                >
                                                    <span>{res.icon}</span>
                                                    <span>{res.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Resource Details */}
                                    <div>
                                        <FloatingTextarea
                                            label="Additional Notes"
                                            name="customResource"
                                            value={formData.customResource}
                                            onChange={handleChange}
                                            placeholder="Any other specific info about resources?"
                                            style={{ minHeight: '80px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: Review */}
                            {currentStep === 5 && (
                                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                    <div style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--color-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                            <div style={{ textTransform: 'uppercase', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Review Project Manifest</div>
                                            <h2 style={{ fontSize: '2.2rem', margin: '0.5rem 0 1rem 0', color: 'var(--color-text-main)' }}>{formData.title || '(Untitled Idea)'}</h2>
                                            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: currentCategory.color, color: 'white', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                {currentCategory.label}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Idea Description</h4>
                                            <p style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>{formData.body || 'No description provided.'}</p>
                                        </div>

                                        <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '2rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{formData.peopleNeeded.length}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Roles Needed</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-secondary)' }}>{formData.resourcesNeeded.length}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Resources Req.</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Removed Personal Contribution as requested */}
                                </div>
                            )}

                        </form>
                    )}
                </div>

                {/* Footer Navigation Buttons - HIDE on Success Step */}
                {currentStep < SUCCESS_STEP_INDEX && (
                    <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-header)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
                        <button
                            type="button"
                            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                            disabled={currentStep === 0}
                            style={{
                                padding: '1rem 2rem',
                                borderRadius: '50px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--bg-pill)',
                                color: 'var(--color-text-main)',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                opacity: currentStep === 0 ? 0 : 1, // Completely hide on step 0
                                pointerEvents: currentStep === 0 ? 'none' : 'auto',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-pill)'}
                        >
                            Back
                        </button>

                        {/* Show Launch on Step 6 (Review) */}
                        {currentStep === totalSteps - 1 ? (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '1rem 3rem',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: 'var(--color-secondary)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1,
                                    boxShadow: '0 8px 20px rgba(0,184,148,0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {isSubmitting ? 'Launching...' : '🚀 Launch Idea'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep === 0 && !user) {
                                        // Need to Sign Up
                                        alert("Please sign up to continue.");
                                        // Ideally trigger auth modal here
                                    } else {
                                        setCurrentStep(prev => Math.min(totalSteps, prev + 1));
                                    }
                                }}
                                disabled={currentStep === 1 && activePaths.length === 0} // Step 1 is now category
                                style={{
                                    padding: '1rem 3rem',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: 'var(--color-text-main)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: (currentStep === 1 && activePaths.length === 0) ? 'not-allowed' : 'pointer',
                                    opacity: (currentStep === 1 && activePaths.length === 0) ? 0.5 : 1,
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={e => !(currentStep === 0) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Continue
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// UI Components
const ToolBtn = ({ icon }) => (
    <button type="button" style={{
        width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>{icon}</button>
);

const FloatingTextarea = ({ label, name, value, onChange, style, placeholder }) => {
    const [focused, setFocused] = useState(false);
    return (
        <div className="floating-group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', ...style }}>
            <label style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--color-text-muted)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {label}
            </label>
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    flex: 1,
                    padding: '1.2rem',
                    borderRadius: '16px',
                    border: '2px solid transparent',
                    background: 'var(--bg-surface)',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    resize: 'none',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: focused ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    borderColor: focused ? 'var(--color-secondary)' : 'transparent',
                    lineHeight: '1.6'
                }}
            />
        </div>
    );
};

export default SubmissionForm;
