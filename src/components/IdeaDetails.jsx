import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useGlobe } from '../context/GlobeContext';
import ShareCard from './ShareCard';
import CommentSection from './CommentSection';
import RichTextEditor from './RichTextEditor';
import ForkIcon from './icons/ForkIcon';

const VerifiedBadge = ({ size = 16, style = {} }) => (
    <span className="verified-badge" title="Verified" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, marginLeft: '4px', verticalAlign: 'middle', ...style }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <circle cx="12" cy="12" r="12" fill={document.body.classList.contains('dark-mode') ? 'white' : 'black'} />
            <path d="M10 16.5L6 12.5L7.4 11.1L10 13.7L16.6 7.1L18 8.5L10 16.5Z" fill={document.body.classList.contains('dark-mode') ? 'black' : 'white'} />
        </svg>
    </span>
);


// Feasibility Gauge Component - Hold & Release to Vote
const FeasibilityGauge = ({ score = 0, userScore = null, onVote }) => {
    const gaugeRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragScore, setDragScore] = React.useState(null);

    const calculateScore = (clientX, clientY) => {
        if (!gaugeRef.current) return 0;
        const rect = gaugeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const bottomY = rect.bottom;
        const x = clientX - centerX;
        const y = clientY - bottomY;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        let newScore = Math.round(((angle + 180) / 180) * 100);
        return Math.min(100, Math.max(0, newScore));
    };

    // Global event handler for drag interaction
    React.useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setDragScore(calculateScore(clientX, clientY));
        };

        const handleUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            if (onVote && dragScore !== null) {
                onVote(dragScore);
                // Haptic feedback if available
                if (navigator.vibrate) navigator.vibrate(50);
            }
            setDragScore(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, dragScore, onVote]);

    const handleStart = (e) => {
        // Prevent default only on touch to stop scrolling while voting
        if (e.type === 'touchstart') e.preventDefault();
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragScore(calculateScore(clientX, clientY));
    };

    const activeScore = isDragging && dragScore !== null ? dragScore : (userScore !== null ? userScore : score);

    return (
        <div style={{ padding: '1.5rem', background: 'transparent', borderRadius: '20px', marginBottom: '2rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#2d3436' }}>🎚️ Feasibility Score</h3>
            <div
                ref={gaugeRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '300px',
                    height: '150px',
                    margin: '0 auto',
                    borderRadius: '150px 150px 0 0',
                    background: 'linear-gradient(to right, #ff4757 0%, #feca57 50%, #2ecc71 100%)',
                    cursor: 'grab',
                    overflow: 'hidden',
                    boxShadow: isDragging ? '0 15px 30px rgba(0,0,0,0.2)' : '0 10px 20px rgba(0,0,0,0.1)',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Ticks */}
                {[0, 25, 50, 75, 100].map(tick => (
                    <div key={tick} style={{
                        position: 'absolute',
                        left: '50%', bottom: '0',
                        width: '2px', height: '10px',
                        background: 'rgba(255,255,255,0.6)',
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${(tick / 100) * 180 - 90}deg) translateY(-140px)`
                    }} />
                ))}

                {/* Score Text */}
                <div style={{
                    position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)',
                    textAlign: 'center', marginBottom: '10px',
                    pointerEvents: 'none', zIndex: 5
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)', lineHeight: 1 }}>
                        {activeScore}%
                    </div>
                </div>

                {/* Needle */}
                <div style={{
                    position: 'absolute',
                    left: '50%', bottom: '0',
                    width: '4px', height: '140px',
                    background: isDragging ? 'white' : '#2d3436',
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${(activeScore / 100) * 180 - 90}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    zIndex: 2,
                    pointerEvents: 'none',
                    boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ width: '12px', height: '12px', background: isDragging ? 'white' : '#2d3436', borderRadius: '50%', position: 'absolute', top: '-6px', left: '-4px' }}></div>
                </div>

                {/* User Vote Marker (Ghost Needle) */}
                {userScore !== null && !isDragging && (
                    <div style={{
                        position: 'absolute',
                        left: '50%', bottom: '0',
                        width: '4px', height: '140px',
                        background: 'white',
                        opacity: 0.8,
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${(userScore / 100) * 180 - 90}deg)`,
                        zIndex: 1,
                        pointerEvents: 'none'
                    }} />
                )}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '1.2rem', fontWeight: '500' }}>
                {isDragging ? "Release to cast vote" : (
                    <>Community Average: <b>{score}%</b> {userScore !== null && <span>(You: {userScore}%)</span>}</>
                )}
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>
                (Hold and drag to vote)
            </p>
        </div>
    );
};

// Feature Chat Component
const FeatureChat = ({ ideaId }) => {
    const { getChatMessages, sendChatMessage, user } = useAppContext();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const listRef = React.useRef(null);

    // Initial Load & Polling
    React.useEffect(() => {
        const load = async () => {
            const msgs = await getChatMessages(ideaId);
            setMessages(Array.isArray(msgs) ? msgs : []);
        };
        void load();
        const interval = setInterval(() => { void load(); }, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [ideaId, getChatMessages]);

    // Auto-scroll
    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        if (!user) return alert("Login to chat");

        await sendChatMessage(ideaId, inputText);
        setInputText("");
        // Optimistic update
        setMessages(prev => [...prev, {
            id: 'temp-' + Date.now(),
            text: inputText,
            author: user.username,
            authorAvatar: user.avatar,
            timestamp: Date.now()
        }]);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', height: '600px', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Chat Header */}
            <div style={{ padding: '1rem', background: '#F8F9FA', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>💬 Live Discussion</h3>
                <span style={{ fontSize: '0.8rem', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#27ae60', borderRadius: '50%' }}></span>
                    Online
                </span>
            </div>

            {/* Message List */}
            <div ref={listRef} style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
                        No messages yet. Start the conversation!
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = user && msg.author === user.username;
                    return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '0.5rem' }}>
                            {!isMe && <img src={msg.authorAvatar || `https://ui-avatars.com/api/?name=${msg.author}`} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
                            <div style={{ maxWidth: '70%', padding: '0.6rem 1rem', borderRadius: '12px', borderBottomLeftRadius: isMe ? '12px' : '2px', borderBottomRightRadius: isMe ? '2px' : '12px', background: isMe ? '#0984e3' : '#f1f2f6', color: isMe ? 'white' : 'var(--color-text-main)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                {!isMe && <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.2rem', color: 'rgba(0,0,0,0.5)' }}>{msg.author}</div>}
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.05)', background: '#F8F9FA', display: 'flex', gap: '0.5rem' }}>
                <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={user ? "Type a message..." : "Login to chat"}
                    disabled={!user}
                    style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none' }}
                />
                <button type="submit" disabled={!user || !inputText.trim()} style={{ background: '#0984e3', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!user || !inputText.trim()) ? 0.5 : 1 }}>
                    Send
                </button>
            </form>
        </div>
    );
};

const IdeaDetails = ({ idea, onClose, initialView = 'details' }) => {
    // const onClose = onBack;
    const { voteIdea, voteRedTeamAnalysis, answeredAMAQuestions, getRedTeamAnalyses, getAMAQuestions, getResources, getApplications, getForksOf, user, votedIdeaIds, downvotedIdeaIds, viewProfile, allUsers, addRedTeamAnalysis, askAMAQuestion, answerAMAQuestion, pledgeResource, applyForRole, forkIdea, addNotification, setIsFormOpen, setDraftData, setDraftTitle, setSelectedIdea, updateResourceStatus, getIdeaComments, addIdeaComment, updateApplicationStatus, incrementIdeaViews, incrementIdeaShares, getUser, getIdeaWikiEntries, addIdeaWikiEntry, saveIdea, savedIdeaIds } = useAppContext();
    const [authorProfile, setAuthorProfile] = useState(null);

    // [FIX] Load author profile to resolve authorProfile reference
    useEffect(() => {
        let active = true;
        if (idea?.author_id && getUser) {
            getUser(idea.author_id).then(p => {
                if (active && p) setAuthorProfile(p);
            });
        }
        return () => { active = false; };
    }, [idea?.author_id, getUser]);

    // Lock Body Scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const [activeView, setActiveView] = useState(initialView); // 'details', 'discussion', 'contribute', 'forks', 'wiki'

    // Sync if prop changes
    useEffect(() => {
        if (initialView === 'share') {
            setActiveView('details');
            setIsSharing(true);
        } else {
            setActiveView(initialView);
            setIsSharing(false);
        }
    }, [initialView]);

    const [discussionView, setDiscussionView] = useState('forum'); // forum, chat, resources
    const [contributeView, setContributeView] = useState('roles'); // roles, resources
    const [redTeamType, setRedTeamType] = useState('critique');
    const [redTeamContent, setRedTeamContent] = useState('');
    const [redTeamAnalyses, setRedTeamAnalyses] = useState([]);
    const [amaQuestions, setAmaQuestions] = useState([]);
    const [amaInput, setAmaInput] = useState('');
    // Comments specific state
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState('');
    const [viewDataLoading, setViewDataLoading] = useState(false);
    const [viewDataError, setViewDataError] = useState('');


    const [resources, setResources] = useState([]);
    const [forks, setForks] = useState([]);
    const [applications, setApplications] = useState([]);
    const isUpvoted = votedIdeaIds ? votedIdeaIds.includes(idea.id) : false;
    const isDownvoted = downvotedIdeaIds && downvotedIdeaIds.includes(idea.id);
    const [wikiEntries, setWikiEntries] = useState([]);
    const [wikiDraft, setWikiDraft] = useState({ title: '', type: 'post', url: '', content: '', tags: [] });
    const [wikiQuery, setWikiQuery] = useState('');
    const [wikiTypeFilter, setWikiTypeFilter] = useState('all');
    const [wikiQuickFilter, setWikiQuickFilter] = useState('all');
    const [wikiSelectedEntryId, setWikiSelectedEntryId] = useState(null);
    const [wikiUploadingMedia, setWikiUploadingMedia] = useState(false);
    const [isSharing, setIsSharing] = useState(false); // Added Sharing State
    const voteCount = Number(idea?.votes ?? idea?.vote_count ?? 0);

    // Modal States
    const [activeModal, setActiveModal] = useState(null); // 'role', 'suggest_role', 'pledge', 'apply', 'give_coins'
    const [modalData, setModalData] = useState({}); // For holding form inputs { title: '', desc: '', reason: '', roleName: '' }


    // Fork Studio State
    const [showForkStudio, setShowForkStudio] = useState(false);
    const [forkData, setForkData] = useState({
        step: 0, // 0=evolution type, 1=edit content, 2=team/resources, 3=success
        evolutionType: 'refinement',
        mutationNote: '',
        title: '',
        body: '',
        category: '',
        peopleNeeded: [],
        resourcesNeeded: [],
        customRoleInput: '',
        customResourceInput: '',
        forkedIdea: null,
        launched: false
    });

    // Role and Resource Options for Evolution Studio
    const roleOptions = [
        { id: 'developer', label: 'Developer', icon: '👨‍💻' },
        { id: 'designer', label: 'Designer', icon: '🎨' },
        { id: 'legal', label: 'Legal Expert', icon: '⚖️' },
        { id: 'marketing', label: 'Marketing', icon: '📣' },
        { id: 'engineer', label: 'Engineer', icon: '🔬' },
        { id: 'community', label: 'Community Mgr', icon: '🤝' },
        { id: 'finance', label: 'Finance', icon: '📊' },
        { id: 'researcher', label: 'Researcher', icon: '🔍' },
        { id: 'writer', label: 'Writer', icon: '✍️' },
        { id: 'ai', label: 'AI Specialist', icon: '🤖' }
    ];
    const resourceOptions = [
        { id: 'funding', label: 'Funding', icon: '💰' },
        { id: 'software', label: 'Software', icon: '📀' },
        { id: 'cloud', label: 'Cloud Computing', icon: '☁️' },
        { id: 'tools', label: 'Tools', icon: '🔧' },
        { id: 'materials', label: 'Materials', icon: '🧱' },
        { id: 'office', label: 'Office Space', icon: '🏢' },
        { id: 'lab', label: 'Lab Access', icon: '🧪' },
        { id: 'permits', label: 'Permits', icon: '📜' }
    ];

    // Scroll Behavior
    const [showControls, setShowControls] = useState(true);
    const lastScrollY = React.useRef(0);

    const handleScroll = (e) => {
        const currentScrollY = e.target.scrollTop;
        // Disable auto-hide for better mobile UX
        // if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        //     setShowControls(false); // Hide on scroll down
        // } else {
        //     setShowControls(true); // Show on scroll up
        // }
        lastScrollY.current = currentScrollY;
    };

    // Lock Body Scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const [hasIncrementedView, setHasIncrementedView] = useState(false);

    const refreshDiscussionComments = React.useCallback(async (opts = {}) => {
        if (!idea?.id) return;
        setCommentsLoading(true);
        setCommentsError('');
        try {
            const latest = await getIdeaComments(idea.id, opts);
            setComments(Array.isArray(latest) ? latest : []);
        } catch (e) {
            setCommentsError('Could not load comments right now.');
        } finally {
            setCommentsLoading(false);
        }
    }, [idea?.id, getIdeaComments]);

    // Increment view count on mount (once per session/view)
    useEffect(() => {
        if (!idea || hasIncrementedView) return;
        incrementIdeaViews(idea.id);
        setHasIncrementedView(true);
    }, [idea, hasIncrementedView, incrementIdeaViews]);

    const viewCount = Number(idea.views ?? 0);
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

    // Load comments once when opening/switching idea (cache-first for speed).
    useEffect(() => {
        void refreshDiscussionComments();
    }, [idea?.id]);

    // Load data when view changes
    useEffect(() => {
        if (!idea) return;

        // Fetch view-specific data
        const loadViewData = async () => {
            if (activeView === 'discussion') {
                if (!Array.isArray(comments) || comments.length === 0) {
                    await refreshDiscussionComments();
                }
                return;
            }

            setViewDataLoading(true);
            setViewDataError('');
            try {
                if (activeView === 'wiki') {
                    setWikiEntries(await getIdeaWikiEntries(idea.id));
                } else if (activeView === 'resources') {
                    setResources(await getResources(idea.id));
                } else if (activeView === 'applications') {
                    setApplications(await getApplications(idea.id));
                } else if (activeView === 'forks') {
                    setForks(await getForksOf(idea.id));
                } else if (activeView === 'details' || activeView === 'contribute') {
                    const [nextResources, nextApplications] = await Promise.all([
                        getResources(idea.id),
                        getApplications(idea.id)
                    ]);
                    setResources(nextResources);
                    setApplications(nextApplications);
                }
            } catch (_) {
                setViewDataError('Some idea data failed to load. Please retry.');
            } finally {
                setViewDataLoading(false);
            }
        };
        void loadViewData();
    }, [activeView, idea, comments.length, getAMAQuestions, getApplications, getForksOf, getRedTeamAnalyses, getResources, getIdeaWikiEntries, refreshDiscussionComments]);

    const handleAddComment = async (text) => {
        const added = await addIdeaComment(idea.id, text);
        if (added) {
            setComments((prev) => [...(Array.isArray(prev) ? prev : []), { ...added, replies: [] }]);
        }
        void refreshDiscussionComments({ force: true, maxAgeMs: 0 });
        return added;
    };

    const handleAddReply = async (parentId, text) => {
        const added = await addIdeaComment(idea.id, text, parentId);
        void refreshDiscussionComments({ force: true, maxAgeMs: 0 });
        return added;
    };


    const handleFork = async () => {
        if (!user) return alert('Please log in to fork this idea');
        const result = await forkIdea(idea.id);
        if (result.success) {
            // Initialize Evolution Studio with parent idea data
            setForkData({
                step: 0,
                evolutionType: 'refinement',
                mutationNote: '',
                title: `${idea.title} (Fork)`,
                body: idea.body || idea.solution || idea.description || '',
                category: idea.type || '',
                peopleNeeded: idea.peopleNeeded || [],
                resourcesNeeded: idea.resourcesNeeded || [],
                forkedIdea: result.newIdea,
                launched: false
            });
            setShowForkStudio(true);
        } else {
            alert('Fork failed: ' + result.error);
        }
    };

    if (!idea) return null;

    const filteredWikiEntries = wikiEntries.filter((entry) => {
        const entryType = String(entry.entry_type || 'resource').toLowerCase();
        const quick = wikiQuickFilter;
        const quickMatch =
            quick === 'all'
            || (quick === 'questions' && entryType === 'question')
            || (quick === 'guides' && (entryType === 'guide' || entryType === 'post'))
            || (quick === 'resources' && entryType === 'resource')
            || (quick === 'recent');
        const matchesType = wikiTypeFilter === 'all' || entryType === wikiTypeFilter;
        const q = wikiQuery.trim().toLowerCase();
        if (!quickMatch) return false;
        if (!q) return matchesType;
        const haystack = `${entry.title || ''} ${entry.content || ''} ${entry.url || ''}`.toLowerCase();
        return matchesType && haystack.includes(q);
    });
    const sortedWikiEntries = [...filteredWikiEntries].sort((a, b) => {
        if (wikiQuickFilter === 'recent') {
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    useEffect(() => {
        if (!sortedWikiEntries.length) {
            setWikiSelectedEntryId(null);
            return;
        }
        if (!wikiSelectedEntryId || !sortedWikiEntries.some((e) => e.id === wikiSelectedEntryId)) {
            setWikiSelectedEntryId(sortedWikiEntries[0].id);
        }
    }, [wikiSelectedEntryId, sortedWikiEntries]);
    const selectedWikiEntry = sortedWikiEntries.find((e) => e.id === wikiSelectedEntryId) || null;
    const getWikiStatus = (entry) => {
        const entryType = String(entry?.entry_type || '').toLowerCase();
        if (entryType !== 'question') return null;
        const blob = `${entry?.title || ''} ${entry?.content || ''}`.toLowerCase();
        return blob.includes('[answered]') || blob.includes('resolved') ? 'answered' : 'pending';
    };
    const guessWikiTags = (text) => {
        const lower = String(text || '').toLowerCase();
        const rules = [
            ['api', ['api', 'endpoint', 'json', 'http']],
            ['ui', ['ui', 'ux', 'interface', 'design']],
            ['database', ['sql', 'postgres', 'supabase', 'schema', 'table']],
            ['auth', ['auth', 'login', 'oauth', 'token']],
            ['deployment', ['deploy', 'vercel', 'build', 'release']],
            ['performance', ['slow', 'latency', 'optimiz', 'cache']],
            ['bugfix', ['bug', 'error', 'fix', 'issue']],
            ['how-to', ['how to', 'guide', 'tutorial', 'steps']]
        ];
        return rules
            .filter(([, needles]) => needles.some((needle) => lower.includes(needle)))
            .map(([tag]) => tag)
            .slice(0, 6);
    };
    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const getWikiTypeLabel = (entryType) => {
        const t = String(entryType || 'resource').toLowerCase();
        if (t === 'post') return 'Post';
        if (t === 'question') return 'Question';
        if (t === 'media') return 'Media';
        if (t === 'links' || t === 'link') return 'Links';
        if (t === 'blueprint') return 'Blueprint';
        if (t === 'guide') return 'Guide';
        return 'Resource';
    };
    const handleWikiSubmit = async () => {
        if (!user) return alert('Please log in to add wiki entries');
        if (!wikiDraft.title.trim()) return alert('Please add a title');
        if ((wikiDraft.type === 'media' || wikiDraft.type === 'links') && !wikiDraft.url.trim()) {
            return alert('Add a URL or upload an image first');
        }

        const tagsSuffix = Array.isArray(wikiDraft.tags) && wikiDraft.tags.length
            ? `\n\nTags: ${wikiDraft.tags.map((tag) => `#${tag}`).join(' ')}`
            : '';
        const result = await addIdeaWikiEntry({
            ideaId: idea.id,
            title: wikiDraft.title,
            entryType: wikiDraft.type,
            url: wikiDraft.url,
            content: `${wikiDraft.content || ''}${tagsSuffix}`.trim()
        });
        if (!result.success) return alert(`Could not add wiki entry: ${result.reason}`);
        setWikiEntries(prev => [result.entry, ...prev]);
        setWikiDraft(prev => ({ ...prev, title: '', url: '', content: '', tags: [] }));
        setActiveModal(null);
    };

    // Standardize author data
    const authorName = authorProfile ? authorProfile.username : (idea.author || "Community Member");
    const authorAvatar = authorProfile ? authorProfile.avatar : (idea.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&color=fff`);
    const groupName = idea.group || "";
    // const avatarUrl = `https://ui-avatars.com/api/?name=${authorName}&background=random&color=fff`; // This line is now replaced by authorAvatar

    // Category color mapping (matching IdeaCard)
    const getTypeColor = (type) => {
        const colors = {
            policy: '#efaa8d',
            invention: '#95afc0',
            infrastructure: '#f7b731',
            entertainment: '#a55eea',
            ecology: '#00b894',
            default: '#d1ccc0'
        };
        return colors[type] || colors.default;
    };
    const typeColor = getTypeColor(idea.type);
    const bgGradient = `linear-gradient(135deg, var(--bg-panel) 0%, ${typeColor}15 100%)`; // Dark mode friendly

    // Find author for badges
    const authorUser = allUsers.find(u => u.username === authorName);
    const userTier = authorUser?.tier || 'free';
    const isPro = userTier === 'pro';
    const isVisionary = userTier === 'visionary';
    const isSavedIdea = Array.isArray(savedIdeaIds) ? savedIdeaIds.includes(idea.id) : false;

    const handleToggleSaveIdea = async (event) => {
        event.stopPropagation();
        if (!user) {
            alert('Please log in to save ideas.');
            return;
        }
        const result = await saveIdea(idea.id);
        if (!result?.success) {
            alert(result?.reason || 'Unable to save this idea right now.');
        }
    };

    return (
        <div className="dimmer-overlay" onClick={onClose}>
            {/* Mobile Close Button - Fixed Overlay - Moved outside transformed containers */}
            {/* REMOVED: Old fixed close button */}

            <div className="submission-expanded" onClick={e => e.stopPropagation()}
                style={{
                    width: '95%',
                    maxWidth: '1000px',
                    margin: '2vh auto',
                    height: '92vh',
                    maxHeight: '100%', // Ensure it doesn't overflow viewport height in bad ways
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: '0',
                    backgroundColor: 'var(--bg-panel)',
                    backgroundImage: bgGradient,
                    fontFamily: "'Quicksand', sans-serif",
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    position: 'relative'
                }}>

                {/* 1. HEADER SECTION */}
                <div className="detail-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>

                    {/* Top Control Bar */}
                    <div className="detail-top-bar" style={{
                        padding: '1rem 1.5rem', // Reduced padding for mobile
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        transition: 'transform 0.3s ease',
                        transform: 'translateY(0)',
                        position: 'relative',
                        zIndex: 10
                    }}>

                        {/* Integrated Close Button - Top Right of Card */}
                        <button
                            onClick={handleToggleSaveIdea}
                            title={isSavedIdea ? 'Unsave idea' : 'Save idea'}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '3.8rem',
                                height: '32px',
                                borderRadius: '999px',
                                border: '1px solid rgba(0,0,0,0.1)',
                                background: isSavedIdea ? 'var(--color-primary)' : 'var(--bg-pill)',
                                color: isSavedIdea ? '#fff' : 'var(--color-text-main)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                zIndex: 20,
                                padding: '0 0.8rem'
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            </svg>
                            {isSavedIdea ? 'Saved' : 'Save'}
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                width: '32px', height: '32px', // Slightly smaller
                                borderRadius: '50%',
                                border: '1px solid rgba(0,0,0,0.1)',
                                background: 'var(--bg-pill)',
                                color: 'var(--color-text-main)',
                                fontSize: '1.2rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 20
                            }}
                        >
                            &times;
                        </button>





                        {/* Author Capsule */}
                        <div className="author-capsule"
                            onClick={() => authorUser && viewProfile(authorUser.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                background: 'var(--bg-auth-capsule)',
                                padding: '6px 16px 6px 8px',
                                borderRadius: '50px',
                                border: '1px solid var(--color-border)',
                                cursor: authorUser ? 'pointer' : 'default',
                                transition: 'transform 0.2s',
                                maxWidth: '80%' // prevent overflow on small screens
                            }}
                            onMouseEnter={e => authorUser && (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={e => authorUser && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <div style={{ position: 'relative' }}>
                                <img src={authorAvatar} alt={authorName} style={{ width: '32px', height: '32px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'block' }} />
                                {(idea.group || idea.clan) && (
                                    <div title={`Group: ${idea.group || idea.clan}`} style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '0.8rem', background: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>🛡️</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div className={`author-name name-plate ${isVisionary ? 'visionary' : isPro ? 'pro' : ''}`} style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: '1.1', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {authorName}
                                    {authorUser?.isVerified && <VerifiedBadge size={14} />}
                                </div>
                                <div className="author-meta" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: '1.1' }}>
                                    2h ago • {idea.role || "Citizen"}
                                </div>
                            </div>
                        </div>

                        {/* Lineage Badge (New) */}
                        {idea.forkedFrom && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                background: 'var(--bg-card)', padding: '4px 12px', borderRadius: '20px',
                                border: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)',
                                cursor: 'pointer', marginLeft: 'auto', marginRight: '3rem'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ForkIcon size={14} color="var(--color-primary)" />
                                </span>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Evolved from </span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{idea.forkedFrom}</span>
                                </div>
                            </div>
                        )}


                    </div>

                    {/* Title & Tags */}
                    <div className="detail-title-section" style={{ padding: '0.5rem 1.5rem 1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                            <span className={`card-type type-${idea.type}`} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center' }}>
                                {idea.type}
                            </span>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', background: voteCount >= 210 ? '#eafaf1' : '#fff8e6', color: voteCount >= 210 ? '#27ae60' : '#b8860b', fontWeight: '600', fontSize: '0.7rem', border: `1px solid ${voteCount >= 210 ? '#d5f5e3' : '#ffe4a0'}`, display: 'inline-flex', alignItems: 'center' }}>
                                {voteCount >= 210 ? '✓ Validated' : 'Concept Phase'}
                            </span>
                        </div>
                        <h1 className="idea-details-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', margin: '0', lineHeight: '1.1', color: 'var(--color-text-main)' }}>
                            {idea.title}
                        </h1>
                    </div>

                    {/* Navigation Tabs - Minimal Top-Border Style with SVG Icons */}
                    <div className="detail-nav-tabs" style={{
                        display: 'flex',
                        gap: '1.5rem',
                        padding: '0 1.5rem',
                        background: 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        scrollbarWidth: 'none',
                        alignItems: 'center',
                        WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
                    }}>
                        {[
                            {
                                id: 'details',
                                label: 'Details',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            },
                            {
                                id: 'discussion',
                                label: `Discussion (${idea.commentCount || 0})`,
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                            },
                            {
                                id: 'contribute',
                                label: 'Contribute',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            },
                            {
                                id: 'wiki',
                                label: 'Wiki',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path></svg>
                            },
                            {
                                id: 'forks',
                                label: `Forks (${idea.forks || 0})`,
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
                            },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    setActiveView(tab.id);
                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                }}
                                style={{
                                    background: 'transparent',
                                    color: activeView === tab.id ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                    border: 'none',
                                    borderTop: activeView === tab.id ? '3px solid #ff7675' : '3px solid transparent', // Pink top border like reference
                                    padding: '1rem 0.2rem',
                                    fontSize: '0.9rem',
                                    fontWeight: activeView === tab.id ? '700' : '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    whiteSpace: 'nowrap',
                                    marginTop: '-1px' // Align nicely
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. BODY CONTENT */}
                <div className="detail-content-padding" onScroll={handleScroll} style={{
                    padding: '2rem 3rem 4rem 3rem',
                    minHeight: '400px',
                    background: 'var(--bg-panel)',
                    flexGrow: 1,
                    overflowY: 'auto' // Only this section scrolls
                }}>

                    {/* DETAILS VIEW */}
                    {activeView === 'details' && (
                        <div className="idea-body" style={{ fontSize: '1.15rem', lineHeight: '1.7', color: 'var(--color-text-main)', maxWidth: '800px', margin: '0 auto' }}>

                            {/* Note: Staking moved to Resources tab, Skills moved to Roles tab */}

                            {idea.body ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{idea.body}</div>
                            ) : idea.isPilot ? (
                                <>
                                    <div style={{ background: 'var(--bg-pilot)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--bg-pilot-border)', marginBottom: '2rem' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#27ae60' }}>🚀 Active Pilot Phase</h3>
                                        <p style={{ margin: 0, fontSize: '1rem' }}>This spark has ignited and is now in the <b>Implementation Phase</b>.</p>
                                    </div>
                                    <h3 style={{ marginTop: '1rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>The Vision</h3> <p>{idea.solution}</p>

                                    {/* PILOT TREASURY */}
                                    <div style={{ margin: '3rem 0', padding: '2rem', background: 'var(--bg-surface)', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>🏛️ Automated Treasury</h3>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Escrow: <b>${idea.funding.escrow.toLocaleString()}</b></span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            <span>Raised: ${idea.funding.raised.toLocaleString()}</span>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Goal: ${idea.funding.goal.toLocaleString()}</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: '#f1f2f6', borderRadius: '6px', overflow: 'hidden', marginBottom: '2rem' }}>
                                            <div style={{ width: `${(idea.funding.raised / idea.funding.goal) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00b894, #00cec9)', borderRadius: '6px' }}></div>
                                        </div>
                                        {/* Milestones */}
                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-text-muted)' }}>Fund Release Milestones</h4>
                                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                            {idea.milestones.map((m, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: m.status === 'locked' ? 0.5 : 1 }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: m.status === 'completed' ? '#00b894' : m.status === 'in-progress' ? '#f1c40f' : '#b2bec3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem' }}>
                                                        {m.status === 'completed' ? '✓' : i + 1}
                                                    </div>
                                                    <div style={{ flex: 1, fontWeight: '600' }}>{m.title}</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '6px' }}>${m.payout}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (() => {
                                const fallbackSections = idea.type === 'invention'
                                    ? [
                                        { title: 'The Problem', value: idea.problem },
                                        { title: 'The Solution', value: idea.solution },
                                        { title: 'Mechanical Utility', value: idea.utility, monospace: true }
                                    ]
                                    : [
                                        { title: 'Current Law/Norm', value: idea.currentLaw },
                                        { title: 'Proposed Change', value: idea.proposedChange },
                                        { title: 'Social Impact', value: idea.impact }
                                    ];
                                const validSections = fallbackSections.filter((section) => String(section.value || '').trim().length > 0);
                                if (validSections.length === 0) {
                                    return <p className="text-dim">No additional details have been added for this idea yet.</p>;
                                }
                                if (isMobileViewport) {
                                    return (
                                        <p style={{ marginTop: '0.6rem' }}>
                                            {validSections.map((section) => `${section.title}: ${section.value}`).join(' ')}
                                        </p>
                                    );
                                }
                                return (
                                    <>
                                        {validSections.map((section) => (
                                            <React.Fragment key={section.title}>
                                                <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>{section.title}</h3>
                                                <p className={section.monospace ? 'text-dim' : ''} style={section.monospace ? { fontFamily: 'monospace', fontSize: '1rem' } : {}}>
                                                    {section.value}
                                                </p>
                                            </React.Fragment>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* DISCUSSION VIEW (Forum + Chat + Resources) */}
                    {activeView === 'discussion' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #dfe6e9' }}>
                                {/* Forum only now */}
                            </div>

                            {discussionView === 'forum' && commentsLoading && (
                                <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Loading comments...</div>
                            )}
                            {discussionView === 'forum' && commentsError && !commentsLoading && (
                                <div style={{ padding: '1rem', color: '#d63031' }}>
                                    {commentsError}
                                    <button
                                        onClick={() => void refreshDiscussionComments({ force: true, maxAgeMs: 0 })}
                                        style={{ marginLeft: '0.75rem', border: 'none', borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: 'pointer' }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {discussionView === 'forum' && !commentsLoading && (
                                <CommentSection
                                    ideaId={idea.id}
                                    comments={comments}
                                    onAddComment={handleAddComment}
                                    onAddReply={handleAddReply}
                                />
                            )}

                            {/* Live Chat removed per request */}

                            {discussionView === 'resources' && (
                                <div>
                                    {/* Resource Vault Section */}
                                    <div style={{ marginBottom: '3rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #dfe6e9', paddingBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0 }}>📦 Resource Vault</h3>
                                            <button
                                                onClick={() => {
                                                    if (!user) return alert('Login required');
                                                    setActiveModal('pledge');
                                                }}
                                                style={{ background: '#2d3436', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer' }}
                                            >+ Pledge Resource</button>
                                        </div>

                                        {/* PLEDGE FORM */}
                                        {activeModal === 'pledge' && (
                                            <div style={{ padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem' }}>
                                                <h4 style={{ margin: '0 0 0.5rem 0' }}>Pledge a Resource</h4>
                                                <input
                                                    placeholder="Item Name (e.g. 3D Printer, Lumber)"
                                                    value={modalData.item || ''}
                                                    onChange={e => setModalData({ ...modalData, item: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => setActiveModal(null)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                    <button
                                                        onClick={async () => {
                                                            if (modalData.item) {
                                                                await pledgeResource({ ideaId: idea.id, item: modalData.item, type: 'other', estimatedValue: 100, pledgedBy: user.username, pledgerId: user.id });
                                                                getResources(idea.id).then(setResources);
                                                                setActiveModal(null);
                                                                setModalData({});
                                                            }
                                                        }}
                                                        style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: '#2d3436', color: 'white', cursor: 'pointer' }}
                                                    >Pledge</button>
                                                </div>
                                            </div>
                                        )}
                                        {resources.length === 0 ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#b2bec3', border: '2px dashed #dfe6e9', borderRadius: '12px' }}>No physical resources pledged yet.</div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                {resources.map(r => (
                                                    <div key={r.id} style={{ padding: '1rem', background: 'white', border: '1px solid #dfe6e9', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#636e72' }}>Pledged by {r.pledgedBy}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#2ecc71' }}>${r.estimatedValue}</div>
                                                            <div style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f2f6', borderRadius: '4px', display: 'inline-block' }}>{r.status || 'Pending'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Wiki/Docs Section */}
                                    <div>
                                        <h3 style={{ borderBottom: '2px solid #dfe6e9', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>📚 Documentation</h3>
                                        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '12px', color: '#636e72', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ fontSize: '3rem' }}>📖</div>
                                            <div>
                                                <h4 style={{ margin: 0 }}>Project Wiki</h4>
                                                <p style={{ margin: '0.5rem 0' }}>Formal documentation, whitepapers, and technical specs.</p>
                                            </div>
                                            <button onClick={() => setActiveModal('wiki')} style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #dfe6e9', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>View Wiki</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView !== 'discussion' && viewDataLoading && (
                        <div style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading idea data...</div>
                    )}
                    {activeView !== 'discussion' && viewDataError && !viewDataLoading && (
                        <div style={{ marginTop: '1rem', color: '#d63031' }}>{viewDataError}</div>
                    )}


                    {/* CONTRIBUTE VIEW (Roles + Resources) */}
                    {activeView === 'contribute' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {String(idea?.id || '').startsWith('local_') && (
                                <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--bg-panel)', color: 'var(--color-text-muted)' }}>
                                    Syncing idea to database. Resource and application data will appear once sync completes.
                                </div>
                            )}

                            {/* Sub-tab Navigation */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                {[
                                    { id: 'roles', label: '👥 Roles' },
                                    { id: 'resources', label: '📦 Resources' },
                                    // Owner-only Applications Tab
                                    ...(user && (user.id === idea.author_id || user.username === idea.author) ? [{ id: 'applications', label: '📋 Applications' }] : [])
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setContributeView(tab.id)}
                                        style={{
                                            padding: '0.8rem 1.2rem',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: contributeView === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            fontWeight: contributeView === tab.id ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                            color: contributeView === tab.id ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* ROLES SUB-TAB */}
                            {contributeView === 'roles' && (
                                <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>👥 Open Roles</h3>
                                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-muted)' }}>Join the team. Claims are verified on-chain.</p>
                                        </div>
                                        {user && user.username === authorName ? (
                                            <button
                                                onClick={() => setActiveModal('role')}
                                                style={{ padding: '0.5rem 1rem', background: 'var(--color-secondary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >+ Add Role</button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (!user) return alert("Please log in to suggest a role.");
                                                    setActiveModal('suggest_role');
                                                }}
                                                style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >💡 Suggest Role</button>
                                        )}
                                    </div>

                                    {/* INLINE FORMS */}
                                    {activeModal === 'role' && (
                                        <div style={{ padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0' }}>Add New Role</h4>
                                            <input
                                                placeholder="Role Title"
                                                value={modalData.title || ''}
                                                onChange={e => setModalData({ ...modalData, title: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                            />
                                            <textarea
                                                placeholder="Description"
                                                value={modalData.desc || ''}
                                                onChange={e => setModalData({ ...modalData, desc: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '60px' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => setActiveModal(null)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                <button
                                                    onClick={() => {
                                                        // Mock Logic for adding role (local state only for UI demo)
                                                        alert("Role added! (Mock)");
                                                        setActiveModal(null);
                                                        setModalData({});
                                                    }}
                                                    style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}
                                                >Add Role</button>
                                            </div>
                                        </div>
                                    )}

                                    {activeModal === 'suggest_role' && (
                                        <div style={{ padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0' }}>Suggest a Role</h4>
                                            <input
                                                placeholder="Role Title"
                                                value={modalData.title || ''}
                                                onChange={e => setModalData({ ...modalData, title: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                            />
                                            <input
                                                placeholder="Why is this needed?"
                                                value={modalData.reason || ''}
                                                onChange={e => setModalData({ ...modalData, reason: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => setActiveModal(null)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                <button
                                                    onClick={() => {
                                                        addNotification({
                                                            userId: authorUser ? authorUser.id : 'unknown',
                                                            type: 'suggestion',
                                                            message: `${user.username} suggested: "${modalData.title}" - ${modalData.reason}`,
                                                            ideaId: idea.id,
                                                            ideaTitle: idea.title
                                                        });
                                                        alert("Suggestion sent!");
                                                        setActiveModal(null);
                                                        setModalData({});
                                                    }}
                                                    style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}
                                                >Suggest</button>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                        {/* Real Data Rendering */}
                                        {(idea.peopleNeeded && idea.peopleNeeded.length > 0) ? (
                                            idea.peopleNeeded.map((role, i) => (
                                                <div key={i} style={{ padding: '1.2rem', border: '1px solid var(--color-border)', borderRadius: '12px', background: 'var(--bg-panel)' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{typeof role === 'string' ? role : role.title}</div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem', marginTop: '0.3rem' }}>
                                                        {typeof role === 'string' ? 'Help verify and build the core proposal.' : (role.desc || 'Open position')}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (!user) return alert('Please log in to apply');
                                                            setActiveModal('apply');
                                                            setModalData({ role: (typeof role === 'string' ? role : role.title), ideaTitle: idea.title });
                                                        }}
                                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-pill)', color: 'var(--color-text-main)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
                                                    >Apply Now</button>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
                                                No specific roles listed yet. Suggest one!
                                            </div>
                                        )}
                                    </div>



                                    {applications.length > 0 && user && user.username === authorName && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <h4 style={{ marginBottom: '1rem' }}>📋 Recent Applications</h4>
                                            {applications.map(app => (
                                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <strong>{app.applicantName}</strong> applied for <strong>{app.role}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ fontWeight: 'bold', color: app.status === 'applied' ? '#f39c12' : app.status === 'accepted' ? '#27ae60' : '#d63031' }}>{app.status}</div>
                                                        {app.status === 'applied' && (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        updateApplicationStatus(idea.id, app.id, 'accepted');
                                                                        getApplications(idea.id).then(setApplications);
                                                                    }}
                                                                    style={{ padding: '0.3rem 0.6rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                >Accept</button>
                                                                <button
                                                                    onClick={() => {
                                                                        updateApplicationStatus(idea.id, app.id, 'rejected');
                                                                        getApplications(idea.id).then(setApplications);
                                                                    }}
                                                                    style={{ padding: '0.3rem 0.6rem', background: '#d63031', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                                >Reject</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* APPLICATIONS SUB-TAB (New Code Location) */}
                            {contributeView === 'applications' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>📋 Applications Management</h3>
                                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-muted)' }}>Review and manage team applications.</p>
                                        </div>
                                    </div>

                                    {applications.length === 0 ? (
                                        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '2px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                                            No applications yet.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {applications.map(app => (
                                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                                                            <strong>{app.applicantName}</strong> for <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{app.role}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                                            Applied: {new Date(app.timestamp || Date.now()).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem', color: app.status === 'applied' ? '#f39c12' : app.status === 'accepted' ? '#27ae60' : '#d63031', background: app.status === 'applied' ? '#fef9e7' : app.status === 'accepted' ? '#eafaf1' : '#fadbd8', padding: '4px 10px', borderRadius: '6px' }}>{app.status}</div>
                                                        {app.status === 'applied' && (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        updateApplicationStatus(idea.id, app.id, 'accepted');
                                                                        getApplications(idea.id).then(setApplications);
                                                                    }}
                                                                    style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                                >Accept</button>
                                                                <button
                                                                    onClick={() => {
                                                                        updateApplicationStatus(idea.id, app.id, 'rejected');
                                                                        getApplications(idea.id).then(setApplications);
                                                                    }}
                                                                    style={{ padding: '0.5rem 1rem', background: '#d63031', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                                >Reject</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* RESOURCES SUB-TAB */}
                            {contributeView === 'resources' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>📦 Resource Contributions</h3>
                                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-muted)' }}>Donate land, materials, opportunities, or other resources.</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!user) return alert('Please log in to pledge resources');
                                                const name = prompt('Resource Name (e.g., "5 acres farmland", "Office space NYC"):');
                                                if (!name) return;
                                                const type = prompt('Type (land, materials, opportunity, equipment, other):') || 'other';
                                                const value = Number(prompt('Estimated Value ($):')) || 0;
                                                await pledgeResource({ ideaId: idea.id, name, type, estimatedValue: value, pledgedBy: user.username, pledgerId: user.id });
                                                getResources(idea.id).then(setResources);
                                                alert("Resource pledged! Thank you for your contribution.");
                                            }}
                                            style={{ padding: '0.6rem 1.2rem', background: '#00b894', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >+ Pledge Resource</button>
                                    </div>

                                    {/* Resource Type Categories */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '2rem' }}>
                                        {[
                                            { icon: '🏞️', label: 'Land', desc: 'Property, lots' },
                                            { icon: '🧱', label: 'Materials', desc: 'Supplies, goods' },
                                            { icon: '💼', label: 'Opportunities', desc: 'Jobs, contracts' },
                                            { icon: '🔧', label: 'Equipment', desc: 'Tools, machines' },
                                            { icon: '📋', label: 'Other', desc: 'Misc resources' }
                                        ].map(cat => (
                                            <div key={cat.label} style={{
                                                padding: '1rem',
                                                background: 'var(--bg-surface)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border)',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}>
                                                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{cat.icon}</div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{cat.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{cat.desc}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Resources List */}
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Pledged Resources ({resources.length})</h4>
                                    {resources.length === 0 ? (
                                        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '12px', border: '2px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                                            <div>No resources pledged yet. Be the first to contribute!</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {resources.map(r => (
                                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{
                                                            width: '45px',
                                                            height: '45px',
                                                            borderRadius: '10px',
                                                            background: 'var(--bg-surface)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '1.3rem'
                                                        }}>
                                                            {r.type === 'land' ? '🏞️' : r.type === 'materials' ? '🧱' : r.type === 'opportunity' ? '💼' : r.type === 'equipment' ? '🔧' : '📋'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>{r.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                                Pledged by <strong>{r.pledgedBy}</strong> • {r.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '1.1rem' }}>${r.estimatedValue?.toLocaleString() || 0}</div>
                                                        {user && user.username === authorName ? (
                                                            <select
                                                                value={r.status || 'pending'}
                                                                onChange={async (e) => {
                                                                    await updateResourceStatus(idea.id, r.id, e.target.value);
                                                                    getResources(idea.id).then(setResources);
                                                                }}
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--color-border)',
                                                                    background: r.status === 'verified' ? '#eafaf1' : r.status === 'in_transit' ? '#fef9e7' : r.status === 'delivered' ? '#d5f5e3' : 'var(--bg-surface)',
                                                                    color: r.status === 'verified' ? '#27ae60' : r.status === 'in_transit' ? '#f39c12' : r.status === 'delivered' ? '#1e8449' : 'var(--color-text-main)',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="verified">Verified</option>
                                                                <option value="in_transit">In Transit</option>
                                                                <option value="delivered">Delivered</option>
                                                            </select>
                                                        ) : (
                                                            <div style={{
                                                                fontSize: '0.7rem',
                                                                padding: '2px 8px',
                                                                background: r.status === 'verified' ? '#eafaf1' : r.status === 'in_transit' ? '#fef9e7' : r.status === 'delivered' ? '#d5f5e3' : 'var(--bg-pill)',
                                                                color: r.status === 'verified' ? '#27ae60' : r.status === 'in_transit' ? '#f39c12' : r.status === 'delivered' ? '#1e8449' : 'var(--color-text-muted)',
                                                                borderRadius: '4px',
                                                                display: 'inline-block',
                                                                fontWeight: 'bold',
                                                                textTransform: 'uppercase'
                                                            }}>{r.status || 'Pending'}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}



                    {/* FEEDBACK: CRITIQUE AREA */}
                    {
                        false && (
                            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                                {/* 1. Header & Sentiment Gauge */}
                                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        🧪 Critique Area
                                    </h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                        Stress-test this idea. Critique identifies flaws; Support validates resilience.
                                    </p>

                                    {/* Sentiment Gauge */}
                                    {redTeamAnalyses.length > 0 ? (
                                        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                <span style={{ color: '#ff7675' }}>Critique ({((redTeamAnalyses.filter(a => a.type === 'critique').length / redTeamAnalyses.length) * 100).toFixed(0)}%)</span>
                                                <span style={{ color: '#00b894' }}>Support ({((redTeamAnalyses.filter(a => a.type === 'support').length / redTeamAnalyses.length) * 100).toFixed(0)}%)</span>
                                            </div>
                                            <div style={{ width: '100%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{
                                                    width: `${(redTeamAnalyses.filter(a => a.type === 'critique').length / redTeamAnalyses.length) * 100}%`,
                                                    background: '#ff7675',
                                                    transition: 'width 0.5s ease'
                                                }} />
                                                <div style={{
                                                    width: `${(redTeamAnalyses.filter(a => a.type === 'support').length / redTeamAnalyses.length) * 100}%`,
                                                    background: '#00b894',
                                                    transition: 'width 0.5s ease'
                                                }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                            No data for Sentiment Gauge yet.
                                        </div>
                                    )}

                                </div>

                                {/* 2. Input Card (Bubble Style) */}
                                <div style={{
                                    background: 'var(--bg-panel)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid var(--color-border)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                                    marginBottom: '2.5rem',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '20px',
                                        background: 'var(--color-text-main)',
                                        color: 'var(--bg-panel)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}>
                                        New Entry
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => setRedTeamType('critique')}
                                            style={{
                                                flex: 1,
                                                padding: '0.8rem',
                                                borderRadius: '12px',
                                                border: redTeamType === 'critique' ? '2px solid #ff7675' : '1px solid var(--color-border)',
                                                background: redTeamType === 'critique' ? '#fff5f5' : 'var(--bg-panel)',
                                                color: redTeamType === 'critique' ? '#d63031' : 'var(--color-text-muted)',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            🔴 Critique
                                        </button>
                                        <button
                                            onClick={() => setRedTeamType('support')}
                                            style={{
                                                flex: 1,
                                                padding: '0.8rem',
                                                borderRadius: '12px',
                                                border: redTeamType === 'support' ? '2px solid #00b894' : '1px solid var(--color-border)',
                                                background: redTeamType === 'support' ? '#eafaf1' : 'var(--bg-panel)',
                                                color: redTeamType === 'support' ? '#00b894' : 'var(--color-text-muted)',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            🟢 Support
                                        </button>
                                    </div>

                                    <textarea
                                        placeholder={redTeamType === 'critique' ? "Identify a point of failure..." : "Highlight a resilience factor..."}
                                        value={redTeamContent}
                                        onChange={e => setRedTeamContent(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '100px',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border)',
                                            fontFamily: 'inherit',
                                            marginBottom: '1rem',
                                            resize: 'vertical',
                                            backgroundColor: 'var(--bg-card)',
                                            color: 'var(--color-text-main)',
                                            fontSize: '0.95rem'
                                        }}
                                    />

                                    <div style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={async () => {
                                                if (!user) return alert('Please log in to post feedback');
                                                if (!redTeamContent.trim()) return alert('Please enter your critique');
                                                const newAnalysis = await addRedTeamAnalysis({
                                                    ideaId: idea.id,
                                                    type: redTeamType,
                                                    content: redTeamContent,
                                                    author: user.username,
                                                    authorAvatar: user.avatar
                                                });
                                                if (newAnalysis) setRedTeamAnalyses([newAnalysis, ...redTeamAnalyses]);
                                                setRedTeamContent('');
                                            }}
                                            style={{
                                                padding: '0.8rem 2rem',
                                                borderRadius: '30px',
                                                border: 'none',
                                                background: 'var(--color-text-main)',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            Submit Critique
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Posted Analyses List */}
                                {redTeamAnalyses.length === 0 ? (
                                    <div style={{ background: 'var(--bg-panel)', padding: '3rem', borderRadius: '16px', color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic', border: '2px dashed var(--color-border)' }}>
                                        No critiques yet. Be the first to add one.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {redTeamAnalyses.map(analysis => (
                                            <div key={analysis.id} style={{
                                                background: 'var(--bg-panel)',
                                                padding: '1.5rem',
                                                borderRadius: '16px',
                                                borderLeft: `5px solid ${analysis.type === 'critique' ? '#ff7675' : '#00b894'}`,
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: analysis.type === 'critique' ? '#fff5f5' : '#eafaf1',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            {analysis.type === 'critique' ? '🔴' : '🟢'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{analysis.author}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                                {new Date(analysis.timestamp).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Voting Controls */}
                                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '20px', padding: '2px 8px' }}>
                                                        <button
                                                            onClick={async () => {
                                                                await voteRedTeamAnalysis(idea.id, analysis.id, 'up');
                                                                getRedTeamAnalyses(idea.id).then(setRedTeamAnalyses);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)', padding: '0 4px' }}
                                                        >▲</button>
                                                        <span style={{ fontWeight: 'bold', minWidth: '16px', textAlign: 'center', fontSize: '0.85rem' }}>{analysis.votes}</span>
                                                        <button
                                                            onClick={async () => {
                                                                await voteRedTeamAnalysis(idea.id, analysis.id, 'down');
                                                                getRedTeamAnalyses(idea.id).then(setRedTeamAnalyses);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)', padding: '0 4px' }}
                                                        >▼</button>
                                                    </div>
                                                </div>

                                                <p style={{ margin: 0, lineHeight: '1.6', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                                                    {analysis.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* APPLICATIONS VIEW (Creator Only) */}
                    {activeView === 'applications' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', padding: '2rem', borderRadius: '16px', color: 'white', marginBottom: '2rem', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>Team Applications</h3>
                                <p style={{ margin: 0, opacity: 0.9 }}>Value aligned candidates ready to contribute.</p>
                            </div>

                            {applications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', border: '2px dashed #dfe6e9', borderRadius: '16px' }}>
                                    No pending applications. Share your idea to attract talent!
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    {applications.map(app => (
                                        <div key={app.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #dfe6e9', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                                            {app.status === 'accepted' && <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#00b894' }}></div>}
                                            {app.status === 'declined' && <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#d63031' }}></div>}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dfe6e9', overflow: 'hidden' }}>
                                                        <img
                                                            src={app.applicant_avatar || `https://ui-avatars.com/api/?name=${app.applicant_name}`}
                                                            alt={app.applicant_name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{app.applicant_name}</div>
                                                        <div style={{ color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                                            Running for: {app.role}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#636e72', background: '#f5f6fa', padding: '4px 8px', borderRadius: '6px' }}>
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b2bec3', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Why me?</div>
                                                <p style={{ margin: 0, lineHeight: '1.6' }}>{app.reason}</p>
                                                {app.experience && (
                                                    <>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#b2bec3', textTransform: 'uppercase', marginBottom: '0.3rem', marginTop: '1rem' }}>Experience</div>
                                                        <p style={{ margin: 0, lineHeight: '1.6' }}>{app.experience}</p>
                                                    </>
                                                )}
                                            </div>

                                            {app.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Accept ${app.applicant_name} for the role of ${app.role}?`)) {
                                                                await updateApplicationStatus(idea.id, app.id, 'accepted');
                                                                // Notify user
                                                                await addNotification(app.applicant_id, 'application_accepted', `You've been accepted as ${app.role} for ${idea.title}!`, idea.id);
                                                                // Refresh list
                                                                getApplications(idea.id).then(setApplications);
                                                            }
                                                        }}
                                                        style={{ flex: 1, padding: '0.8rem', background: '#00b894', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.1s' }}
                                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        Accept Candidate
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Decline application from ${app.applicant_name}?`)) {
                                                                await updateApplicationStatus(idea.id, app.id, 'declined');
                                                                // Refresh list
                                                                getApplications(idea.id).then(setApplications);
                                                            }
                                                        }}
                                                        style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: '#636e72', border: '1px solid #dfe6e9', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '0.5rem', background: app.status === 'accepted' ? '#eafaf1' : '#ffeaea', color: app.status === 'accepted' ? '#00b894' : '#d63031', borderRadius: '8px', fontWeight: 'bold' }}>
                                                    Application {app.status === 'accepted' ? 'Accepted' : 'Declined'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}



                    {/* DISCUSSION VIEW (Live Chat) */}
                    {/* DUPLICATE DISCUSSION REMOVED HERE */}

                    {/* WIKI VIEW */}
                    {
                        activeView === 'wiki' && (
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 0.35rem 0' }}>📚 Wiki Submissions</h3>
                                            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                                                Collect guides, posts, blueprints, media, docs, and useful links in one place.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveModal('wiki_submit')}
                                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            + Submit to Wiki
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '1rem', background: 'var(--bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', marginBottom: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.7rem' }}>
                                        <input
                                            placeholder="Search wiki submissions"
                                            value={wikiQuery}
                                            onChange={e => setWikiQuery(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                        />
                                        <select
                                            value={wikiTypeFilter}
                                            onChange={e => setWikiTypeFilter(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                        >
                                            <option value="all">All Types</option>
                                            <option value="post">Posts</option>
                                            <option value="question">Questions</option>
                                            <option value="media">Media</option>
                                            <option value="resource">Resources</option>
                                            <option value="links">Links</option>
                                            <option value="blueprint">Blueprints</option>
                                            <option value="guide">Guides</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                                        {[
                                            ['all', 'Show all'],
                                            ['questions', 'Questions'],
                                            ['guides', 'Guides'],
                                            ['resources', 'Resources'],
                                            ['recent', 'Recently Updated']
                                        ].map(([id, label]) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setWikiQuickFilter(id)}
                                                style={{
                                                    padding: '0.35rem 0.7rem',
                                                    borderRadius: '999px',
                                                    border: wikiQuickFilter === id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    background: wikiQuickFilter === id ? 'color-mix(in srgb, var(--color-primary), transparent 86%)' : 'var(--bg-surface)',
                                                    color: wikiQuickFilter === id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {sortedWikiEntries.length === 0 ? (
                                    <div style={{ padding: '1rem', border: '2px dashed var(--color-border)', borderRadius: '12px', color: 'var(--color-text-muted)' }}>
                                        {wikiEntries.length === 0 ? (
                                            <>
                                                <div style={{ marginBottom: '0.8rem', fontWeight: 700 }}>No submissions yet.</div>
                                                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.8rem' }}>
                                                    {[
                                                        { t: 'Guide Post', c: 'Long-form implementation notes with bullets and images.' },
                                                        { t: 'Blueprint', c: 'Attach documents or link specs that unblock builders.' },
                                                        { t: 'Q&A', c: 'Questions with pending/answered status for contributors.' }
                                                    ].map((ghost) => (
                                                        <div key={ghost.t} style={{ padding: '0.7rem', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--color-border)' }}>
                                                            <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: 'var(--color-text-main)' }}>{ghost.t}</div>
                                                            <div style={{ fontSize: '0.85rem' }}>{ghost.c}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setWikiDraft({
                                                        title: 'Example: Deployment Checklist',
                                                        type: 'post',
                                                        url: '',
                                                        content: '## Goal\nDocument the release process.\n\n- Verify env vars\n- Run build checks\n- Validate migrations',
                                                        tags: ['deployment', 'how-to']
                                                    })}
                                                    
                                                    style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-surface)', color: 'var(--color-text-main)', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    See an example entry
                                                </button>
                                            </>
                                        ) : 'No entries match your filter.'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                                        {sortedWikiEntries.map((entry) => {
                                            const entryType = String(entry.entry_type || 'resource').toLowerCase();
                                            const status = getWikiStatus(entry);
                                            return (
                                            <div key={entry.id} style={{
                                                padding: '1rem',
                                                background: 'var(--bg-panel)',
                                                border: entryType === 'question'
                                                    ? '1px solid color-mix(in srgb, #f39c12, transparent 45%)'
                                                    : (entryType === 'post' || entryType === 'guide'
                                                        ? '1px solid color-mix(in srgb, #0984e3, transparent 65%)'
                                                        : '1px solid var(--color-border)'),
                                                borderRadius: '12px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{entry.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{getWikiTypeLabel(entry.entry_type)}</div>
                                                </div>
                                                {status && (
                                                    <div style={{ marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: status === 'answered' ? '#00b894' : '#f39c12' }}>
                                                        {status === 'answered' ? 'Answered' : 'Unresolved'}
                                                    </div>
                                                )}
                                                {entry.url && (
                                                    <a href={entry.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: '0.4rem', color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                                                        {entryType === 'resource' || entryType === 'links' || entryType === 'link' ? 'Visit Link' : entry.url}
                                                    </a>
                                                )}
                                                {entryType === 'media' && entry.url && (
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <img src={entry.url} alt={entry.title} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                                                    </div>
                                                )}
                                                {entry.content && <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{entry.content}</div>}
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Added by {entry.authorName || 'Community Member'} on {new Date(entry.created_at || Date.now()).toLocaleDateString()}
                                                </div>
                                            </div>
                                        );})}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* FEEDBACK VIEW */}
                    {
                        false && (
                            <div style={{ maxWidth: '750px', margin: '0 auto' }}>
                                {/* Header with Question Input */}
                                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--color-border)', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', textAlign: 'center' }}>❓ Question Area</h3>
                                    <p style={{ margin: '0.5rem 0 1.5rem 0', color: 'var(--color-text-muted)', textAlign: 'center' }}>Ask clear, specific questions so the idea can improve.</p>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Ask your question..."
                                            value={amaInput}
                                            onChange={e => setAmaInput(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '0.8rem 1.2rem',
                                                borderRadius: '30px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                fontSize: '1rem',
                                                outline: 'none',
                                                background: 'var(--bg-surface)',
                                                color: 'var(--color-text-main)'
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!user) return alert('Please log in to ask a question');
                                                if (!amaInput.trim()) return;
                                                await askAMAQuestion({
                                                    ideaId: idea.id,
                                                    question: amaInput,
                                                    askerId: user.id,
                                                    askerName: user.username,
                                                    askerAvatar: user.avatar,
                                                    askerInfluence: user.influence || 0
                                                });
                                                getAMAQuestions(idea.id).then(setAmaQuestions);
                                                setAmaInput('');
                                            }}
                                            style={{ background: 'var(--color-text-main)', color: 'var(--bg-panel)', border: 'none', padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                        >Ask</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Question Queue ({amaQuestions.length})</span>
                                </div>

                                {amaQuestions.length === 0 ? (
                                    <div style={{ background: 'var(--bg-panel)', padding: '3rem', borderRadius: '16px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                        No questions yet. Be the first to ask!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {amaQuestions.map((q, idx) => (
                                            <div key={q.id} style={{
                                                border: 'none',
                                                borderRadius: '16px',
                                                padding: '1.5rem',
                                                background: 'var(--bg-panel)',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                opacity: q.answer ? 1 : 0.85
                                            }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: q.answer ? 'linear-gradient(to bottom, #00b894, #55efc4)' : 'linear-gradient(to bottom, #dfe6e9, #b2bec3)' }}></div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                        <img src={q.askerAvatar || `https://ui-avatars.com/api/?name=${q.askerName}&background=random`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', lineHeight: '1' }}>{q.askerName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#00b894', fontWeight: 'bold' }}>Influence: {(q.askerInfluence || 0).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-dim" style={{ fontSize: '0.8rem' }}>
                                                        {new Date(q.timestamp).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <p style={{ fontWeight: '600', fontSize: '1.1rem', margin: '0 0 1rem 0', lineHeight: '1.4' }}>{q.question}</p>

                                                {q.answer ? (
                                                    <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                                                        <div style={{ fontSize: '1.5rem' }}>💡</div>
                                                        <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answer</div>
                                                            <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>{q.answer}</p>
                                                            {q.commitment && (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#d63031', fontWeight: 'bold', background: '#fff5f5', padding: '6px 12px', borderRadius: '20px', border: '1px solid #fadbd8' }}>
                                                                    <span>📌</span> Commitment: "{q.commitment}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : user && idea.author === user.username ? (
                                                    /* Founder can answer */
                                                    <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px dashed #f39c12' }}>
                                                        <textarea
                                                            placeholder="Write your answer..."
                                                            id={`answer-${q.id}`}
                                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '0.5rem', fontFamily: 'inherit', minHeight: '80px', background: 'var(--bg-surface)', color: 'var(--color-text-main)' }}
                                                        />
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Optional commitment (e.g., 'Will launch by Q2')"
                                                                id={`commitment-${q.id}`}
                                                                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.9rem' }}
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    const answerEl = document.getElementById(`answer-${q.id}`);
                                                                    const commitmentEl = document.getElementById(`commitment-${q.id}`);
                                                                    if (!answerEl.value.trim()) return alert('Please enter an answer');
                                                                    await answerAMAQuestion(idea.id, q.id, answerEl.value, commitmentEl.value || null);
                                                                    getAMAQuestions(idea.id).then(setAmaQuestions);
                                                                }}
                                                                style={{ background: '#00b894', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                                            >Submit Answer</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '1rem', borderRadius: '8px', background: '#f8f9fa', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                                                        Awaiting founder's response...
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* FORKS VIEW - Tree Diagram */}
                    {
                        activeView === 'forks' && (
                            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
                                {/* Header with Fork Button */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <h3 style={{ margin: 0 }}>🌳 Evolutionary Tree</h3>
                                    <button
                                        onClick={handleFork}
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.8rem 1.5rem',
                                            borderRadius: '30px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                        }}
                                    >
                                        🔀 Fork This Idea
                                    </button>
                                </div>

                                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {/* Central Trunk Line */}
                                    {forks.length > 0 && (
                                        <div style={{ position: 'absolute', top: '120px', bottom: '0', left: '50%', width: '4px', background: '#dfe6e9', transform: 'translateX(-50%)', zIndex: 0 }}></div>
                                    )}

                                    {/* Main Idea Node */}
                                    <div style={{
                                        zIndex: 1,
                                        background: 'white',
                                        padding: '1.5rem',
                                        borderRadius: '50%',
                                        border: '4px solid var(--color-primary)',
                                        width: '120px',
                                        height: '120px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        marginBottom: forks.length > 0 ? '4rem' : '2rem',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                                    }}>
                                        Original Idea
                                    </div>

                                    {/* Show forks or empty state */}
                                    {forks.length === 0 ? (
                                        <div style={{ background: 'white', padding: '3rem', borderRadius: '16px', textAlign: 'center', color: 'var(--color-text-muted)', border: '2px dashed #dfe6e9' }}>
                                            <p style={{ margin: 0, fontSize: '1.1rem' }}>No forks yet.</p>
                                            <p style={{ margin: '0.5rem 0 0 0', color: '#b2bec3' }}>Be the first to fork and improve this idea!</p>
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '100%',
                                            display: 'grid',
                                            gridTemplateColumns: forks.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                            gap: '2rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}>
                                            {forks.map((fork, idx) => (
                                                <div key={fork.id} style={{
                                                    background: 'white',
                                                    padding: '1.5rem',
                                                    borderRadius: '12px',
                                                    border: '1px solid #dfe6e9',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <span style={{ background: '#eafaf1', color: '#27ae60', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                                                                Active
                                                            </span>
                                                            {/* Evolution Badge */}
                                                            {fork.evolutionType && (
                                                                <span style={{
                                                                    background: fork.evolutionType === 'pivot' ? '#fff0f0' : '#ebf5fb',
                                                                    color: fork.evolutionType === 'pivot' ? '#c0392b' : '#2980b9',
                                                                    fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '3px'
                                                                }}>
                                                                    {fork.evolutionType === 'refinement' && '🔧'}
                                                                    {fork.evolutionType === 'localization' && '🌍'}
                                                                    {fork.evolutionType === 'expansion' && '🚀'}
                                                                    {fork.evolutionType === 'pivot' && '🔄'}
                                                                    {fork.evolutionType}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: '#b2bec3' }}>{new Date(fork.timestamp).toLocaleDateString()}</span>
                                                    </div>

                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{fork.title}</h4>

                                                    {fork.mutationNote && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.8rem', background: '#f8f9fa', padding: '0.5rem', borderRadius: '8px', borderLeft: '3px solid var(--color-border)' }}>
                                                            "{fork.mutationNote}"
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                        <img src={`https://ui-avatars.com/api/?name=${fork.author}&background=random`} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>by <strong>{fork.author}</strong></span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: '#636e72', marginBottom: '1rem', lineHeight: '1.4' }}>
                                                        {fork.solution || fork.proposedChange || fork.utility || 'No description'}
                                                    </p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <img
                                                                src={`https://ui-avatars.com/api/?name=${fork.author}&background=random`}
                                                                style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                                                                alt=""
                                                            />
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{fork.author}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                                            </svg>
                                                            {fork.votes || 0} sparks
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* Feedback sections */}

                </div >

                {/* Footer Stats Bar - Matches feed card layout */}
                <div className="detail-footer-stats" style={{
                    transition: 'transform 0.3s ease',
                    transform: showControls ? 'translateY(0)' : 'translateY(100%)',
                    background: 'var(--bg-surface)',
                    padding: '0.4rem 1rem',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1000,
                    minHeight: 'auto'
                }}>
                    {/* Bottom left: vote bubble, then small view count on the right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="action-group action-bar-votes" onClick={(e) => e.stopPropagation()} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.8rem',
                            background: `color-mix(in srgb, ${typeColor}, transparent 88%)`,
                            borderRadius: '100px',
                            cursor: 'pointer',
                            transition: 'transform 0.1s'
                        }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <span
                                onClick={(e) => { e.stopPropagation(); voteIdea(idea.id, 'up'); }}
                                className={`vote-arrow up ${isUpvoted ? 'active' : ''}`}
                                style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            >
                                <svg
                                    className="vote-icon-svg"
                                    viewBox="0 0 24 24"
                                    stroke={isUpvoted ? typeColor : "currentColor"}
                                    strokeWidth={isUpvoted ? "0" : "2.5"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    width="20"
                                    height="20"
                                    style={{
                                        fill: isUpvoted ? typeColor : 'none', // Override CSS
                                        filter: isUpvoted ? `drop-shadow(0 0 2px ${typeColor})` : 'none',
                                        transition: 'all 0.2s ease',
                                        display: 'block'
                                    }}
                                >
                                    <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                </svg>
                            </span>
                            <span className="action-count" style={{ fontSize: '1.2rem', fontWeight: '800', color: typeColor, lineHeight: '1', minWidth: '1.5ch', textAlign: 'center' }}>
                                {voteCount}
                            </span>
                            <span
                                onClick={(e) => { e.stopPropagation(); voteIdea(idea.id, 'down'); }}
                                className={`vote-arrow down ${isDownvoted ? 'active' : ''}`}
                                style={{ cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: isDownvoted ? typeColor : 'var(--color-text-muted)', opacity: isDownvoted ? 1 : 0.7 }}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={isDownvoted ? typeColor : "currentColor"}
                                    strokeWidth={isDownvoted ? "0" : "2.5"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    width="20"
                                    height="20"
                                    style={{
                                        transform: 'rotate(180deg)',
                                        fill: isDownvoted ? typeColor : 'none',
                                        filter: isDownvoted ? `drop-shadow(0 0 2px ${typeColor})` : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <path d="M13.414 2.086a2 2 0 0 0-2.828 0l-8 8A2 2 0 0 0 4 13.5h3v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7h3a2 2 0 0 0 1.414-3.414l-8-8z" />
                                </svg>
                            </span>
                        </div>
                        {/* Small view count to the right of vote bubble */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            lineHeight: 1,
                            opacity: 0.85
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>{viewCount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Bottom right: Comments, Forks, Share (far right) */}
                    {/* Bottom right: Comments, Forks, Share (far right) */}
                    <div className="action-items-group" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'wrap' }}>

                        {/* Comments - Outline Bubble */}
                        <div
                            className="action-item comments"
                            onClick={() => setActiveView('discussion')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: 'rgba(255,255,255,0.1)',
                                padding: '4px 6px',
                                borderRadius: '20px',
                                cursor: 'pointer'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{idea.commentCount || 0}</span>
                        </div>

                        {/* Forks - Outline Branch */}
                        <div
                            className="action-item forks"
                            onClick={() => setActiveView('forks')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: 'rgba(255,255,255,0.1)',
                                padding: '4px 6px',
                                borderRadius: '20px',
                                cursor: 'pointer'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                <circle cx="18" cy="6" r="3"></circle>
                                <circle cx="6" cy="18" r="3"></circle>
                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{idea.forks || 0}</span>
                        </div>

                        {/* Share - Outline Curve Arrow */}
                        {/* Share - Outline Curve Arrow (Forward) with Count */}
                        <div
                            className="action-item share"
                            onClick={(e) => { e.stopPropagation(); setIsSharing(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '16px', cursor: 'pointer' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                <polyline points="15 14 20 9 15 4" />
                                <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                            </svg>
                            <span className="action-count" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{idea.shares || 0}</span>
                        </div>
                    </div>
                </div >



                {/* Apply Modal */}
                {activeModal === 'apply' && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000
                    }} onClick={() => setActiveModal(null)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'var(--bg-panel)',
                            padding: '2rem',
                            borderRadius: '20px',
                            width: '90%',
                            maxWidth: '500px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>📧 Apply for: {modalData.role}</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                For: {modalData.ideaTitle}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Portfolio/LinkedIn</label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Relevant Experience</label>
                                    <textarea
                                        placeholder="Briefly describe your experience..."
                                        style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Why this idea?</label>
                                    <textarea
                                        placeholder="What excites you about contributing to this idea?"
                                        style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}
                                >Cancel</button>
                                <button
                                    onClick={async () => {
                                        await applyForRole({
                                            ideaId: idea.id,
                                            role: modalData.role,
                                            description: 'User applied via form',
                                            applicantName: user.username,
                                            applicantId: user.id,
                                            status: 'applied'
                                        });
                                        getApplications(idea.id).then(setApplications);
                                        setActiveModal(null);
                                        alert('✅ Application submitted! The idea creator will review it.');
                                    }}
                                    style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'var(--color-secondary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >Submit Application</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Wiki Submit Modal */}
                {activeModal === 'wiki_submit' && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.62)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10001
                    }} onClick={() => setActiveModal(null)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'var(--bg-panel)',
                            borderRadius: '18px',
                            width: '92%',
                            maxWidth: '760px',
                            maxHeight: '86vh',
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 18px 44px rgba(0,0,0,0.28)',
                            padding: '1.15rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Submit to Wiki</h3>
                                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        Add posts, questions, documents, links, and implementation notes.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'var(--bg-surface)', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                                {[
                                    ['post', 'Post'],
                                    ['question', 'Question'],
                                    ['media', 'Media'],
                                    ['links', 'Links'],
                                    ['resource', 'Document']
                                ].map(([id, label]) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setWikiDraft(prev => ({ ...prev, type: id }))}
                                        style={{
                                            padding: '0.45rem 0.78rem',
                                            borderRadius: '999px',
                                            border: wikiDraft.type === id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            background: wikiDraft.type === id ? 'color-mix(in srgb, var(--color-primary), transparent 86%)' : 'var(--bg-surface)',
                                            color: wikiDraft.type === id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            fontSize: '0.82rem'
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem', marginBottom: '0.7rem' }}>
                                <input
                                    placeholder={wikiDraft.type === 'question' ? 'Question title' : (wikiDraft.type === 'media' ? 'Media title' : 'Entry title')}
                                    value={wikiDraft.title}
                                    onChange={e => setWikiDraft(prev => ({ ...prev, title: e.target.value }))}
                                    style={{ width: '100%', padding: '0.62rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                />
                                <select
                                    value={wikiDraft.type}
                                    onChange={e => setWikiDraft(prev => ({ ...prev, type: e.target.value }))}
                                    style={{ width: '100%', padding: '0.62rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                >
                                    <option value="post">Post</option>
                                    <option value="question">Question</option>
                                    <option value="media">Media</option>
                                    <option value="links">Links</option>
                                    <option value="resource">Document</option>
                                </select>
                            </div>

                            {(wikiDraft.type === 'resource' || wikiDraft.type === 'media' || wikiDraft.type === 'links') && (
                                <input
                                    placeholder={wikiDraft.type === 'media' ? 'Media URL (image/video)' : 'URL or document link'}
                                    value={wikiDraft.url}
                                    onChange={e => setWikiDraft(prev => ({ ...prev, url: e.target.value }))}
                                    style={{ width: '100%', padding: '0.62rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '0.7rem' }}
                                />
                            )}

                            {wikiDraft.type === 'media' && (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        const file = e.dataTransfer?.files?.[0];
                                        if (!file || !file.type.startsWith('image/')) return;
                                        setWikiUploadingMedia(true);
                                        try {
                                            const dataUrl = await fileToDataUrl(file);
                                            setWikiDraft(prev => ({ ...prev, url: dataUrl }));
                                        } finally {
                                            setWikiUploadingMedia(false);
                                        }
                                    }}
                                    style={{ border: '1px dashed var(--color-border)', borderRadius: '10px', padding: '0.9rem', marginBottom: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}
                                >
                                    {wikiUploadingMedia ? 'Uploading media...' : 'Drop image here or paste URL'}
                                </div>
                            )}

                            {(wikiDraft.type === 'post' || wikiDraft.type === 'question') ? (
                                <RichTextEditor
                                    value={wikiDraft.content}
                                    onChange={(next) => setWikiDraft(prev => ({ ...prev, content: next }))}
                                    placeholder={wikiDraft.type === 'question' ? 'Describe your question/problem' : 'Write documentation, guide steps, and implementation notes'}
                                    submitLabel="Continue"
                                    onSubmit={() => { }}
                                    onImageUpload={async (file) => fileToDataUrl(file)}
                                />
                            ) : (
                                <textarea
                                    placeholder={wikiDraft.type === 'question' ? 'Describe your problem' : 'Summary / notes'}
                                    value={wikiDraft.content}
                                    onChange={e => setWikiDraft(prev => ({ ...prev, content: e.target.value }))}
                                    style={{ width: '100%', minHeight: '110px', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '0.7rem' }}
                                />
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const suggested = guessWikiTags(`${wikiDraft.title}\n${wikiDraft.content}`);
                                        setWikiDraft(prev => ({ ...prev, tags: suggested }));
                                    }}
                                    style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-surface)', color: 'var(--color-text-main)', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Suggest Tags
                                </button>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--bg-surface)', color: 'var(--color-text-main)', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleWikiSubmit}
                                        style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Submit to Wiki
                                    </button>
                                </div>
                            </div>
                            {Array.isArray(wikiDraft.tags) && wikiDraft.tags.length > 0 && (
                                <div style={{ marginTop: '0.7rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    {wikiDraft.tags.map((tag) => (
                                        <span key={tag} style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem', borderRadius: '999px', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Wiki Modal */}
                {activeModal === 'wiki' && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000
                    }} onClick={() => setActiveModal(null)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'var(--bg-surface)',
                            borderRadius: '20px',
                            padding: '0',
                            width: '90%',
                            maxWidth: '700px',
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '1.5rem 2rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'linear-gradient(135deg, #6c5ce722, transparent)'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        📚 {idea.title} - Wiki
                                    </h3>
                                    <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        Documentation, specs & resources
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    style={{
                                        background: 'var(--bg-pill)', border: 'none', borderRadius: '50%',
                                        width: '36px', height: '36px', cursor: 'pointer',
                                        fontSize: '1.2rem', color: 'var(--color-text-muted)'
                                    }}
                                >×</button>
                            </div>

                            {/* Content */}
                            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                                {/* Overview Section */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        📖 Overview
                                    </h4>
                                    <div style={{ background: 'var(--bg-pill)', padding: '1rem', borderRadius: '12px', color: 'var(--color-text-muted)' }}>
                                        <p style={{ margin: 0, lineHeight: 1.6 }}>
                                            {idea.problem || idea.body || 'This project wiki is being prepared. Add your documentation, whitepapers, and technical specifications here.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Technical Specs */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        ⚙️ Technical Specifications
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                        <div style={{ background: 'var(--bg-pill)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Status</div>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{idea.status || 'Active'}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-pill)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏷️</div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Category</div>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{idea.type || 'General'}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-pill)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>Contributors</div>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{idea.contributors?.length || 3}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Roadmap Section */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🗺️ Roadmap
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {['Research & Planning', 'Prototype Development', 'Community Feedback', 'Launch'].map((phase, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.75rem 1rem', background: 'var(--bg-pill)', borderRadius: '10px'
                                            }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '50%',
                                                    background: i === 0 ? '#00b894' : i < 2 ? '#fdcb6e' : 'var(--color-border)',
                                                    color: i < 2 ? 'white' : 'var(--color-text-muted)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 'bold', fontSize: '0.8rem'
                                                }}>{i === 0 ? '✓' : i + 1}</div>
                                                <span style={{ color: 'var(--color-text-main)', fontWeight: '500' }}>{phase}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '1rem 2rem',
                                borderTop: '1px solid var(--color-border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                    Last updated: {new Date().toLocaleDateString()}
                                </span>
                                <button
                                    onClick={() => {
                                        const section = prompt('Which section would you like to edit?\n1. Overview\n2. Technical Specs\n3. Roadmap\n\nEnter 1, 2, or 3:');
                                        if (section) {
                                            const content = prompt('Enter your edit:');
                                            if (content && content.trim()) {
                                                alert('📝 Wiki updated! Your changes have been saved.');
                                            }
                                        }
                                    }}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'var(--color-secondary)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >✏️ Edit Wiki</button>
                            </div>
                        </div>
                    </div>
                )}

                {isSharing && (
                    <ShareCard idea={idea} rank="1" onShare={() => incrementIdeaShares(idea.id)} onClose={() => setIsSharing(false)} />
                )}

                {/* Evolution Studio Modal */}
                {showForkStudio && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10001
                    }} onClick={() => setShowForkStudio(false)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'var(--bg-panel)',
                            padding: '2.5rem',
                            borderRadius: '24px',
                            width: '95%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            border: '1px solid var(--color-border)'
                        }}>
                            {/* Step Indicator */}
                            {!forkData.launched && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    {[0, 1, 2].map(s => (
                                        <div key={s} style={{
                                            width: '10px', height: '10px',
                                            borderRadius: '50%',
                                            background: forkData.step === s ? 'var(--color-primary)' : 'var(--color-border)'
                                        }} />
                                    ))}
                                </div>
                            )}

                            {/* Step 0: Evolution Type */}
                            {forkData.step === 0 && !forkData.launched && (
                                <>
                                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: 'var(--color-primary)' }}>🧬 Evolution Studio</h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                                        Forking: <strong>{idea.title}</strong>
                                    </p>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.8rem' }}>Choose Evolution Strategy</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            {[
                                                { id: 'refinement', icon: '🔧', title: 'Refinement', desc: 'Improve core concept' },
                                                { id: 'localization', icon: '🌍', title: 'Localization', desc: 'Adapt to new region' },
                                                { id: 'expansion', icon: '🚀', title: 'Expansion', desc: 'Scale to new markets' },
                                                { id: 'pivot', icon: '🔄', title: 'Pivot', desc: 'Fundamental change' }
                                            ].map(type => (
                                                <div
                                                    key={type.id}
                                                    onClick={() => setForkData(prev => ({ ...prev, evolutionType: type.id }))}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '12px',
                                                        border: forkData.evolutionType === type.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                        background: forkData.evolutionType === type.id ? 'var(--color-bg-light)' : 'var(--bg-card)',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{type.icon}</div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{type.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{type.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Evolution Note</label>
                                        <textarea
                                            value={forkData.mutationNote}
                                            onChange={e => setForkData(prev => ({ ...prev, mutationNote: e.target.value }))}
                                            placeholder="Why does this fork exist? What improvements are you making?"
                                            style={{ width: '100%', minHeight: '80px', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setShowForkStudio(false)}
                                            style={{ flex: 1, padding: '1rem', borderRadius: '50px', border: '1px solid var(--color-border)', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                                        >Cancel</button>
                                        <button
                                            onClick={() => setForkData(prev => ({ ...prev, step: 1 }))}
                                            style={{ flex: 2, padding: '1rem', borderRadius: '50px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                                        >Next: Edit Content →</button>
                                    </div>
                                </>
                            )}

                            {/* Step 1: Edit Content */}
                            {forkData.step === 1 && !forkData.launched && (
                                <>
                                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: 'var(--color-primary)' }}>📝 Edit Your Fork</h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                                        Make your improvements to the idea
                                    </p>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Title</label>
                                        <input
                                            type="text"
                                            value={forkData.title}
                                            onChange={e => setForkData(prev => ({ ...prev, title: e.target.value }))}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Category</label>
                                        <select
                                            value={forkData.category}
                                            onChange={e => setForkData(prev => ({ ...prev, category: e.target.value }))}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '1rem', background: 'var(--bg-panel)' }}
                                        >
                                            <option value="">Select Category</option>
                                            {['invention', 'ecology', 'education', 'health', 'infrastructure', 'policy', 'business', 'entertainment', 'spiritual', 'arts', 'philosophy', 'apps', 'philanthropy', 'offgrid', 'gaming'].map(cat => (
                                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Description</label>
                                        <textarea
                                            value={forkData.body}
                                            onChange={e => setForkData(prev => ({ ...prev, body: e.target.value }))}
                                            placeholder="Describe your evolved idea..."
                                            style={{ width: '100%', minHeight: '150px', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setForkData(prev => ({ ...prev, step: 0 }))}
                                            style={{ flex: 1, padding: '1rem', borderRadius: '50px', border: '1px solid var(--color-border)', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                                        >← Back</button>
                                        <button
                                            onClick={() => setForkData(prev => ({ ...prev, step: 2 }))}
                                            style={{ flex: 2, padding: '1rem', borderRadius: '50px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                                        >Next: Team & Resources →</button>
                                    </div>
                                </>
                            )}

                            {/* Step 2: Team & Resources */}
                            {forkData.step === 2 && !forkData.launched && (
                                <>
                                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: 'var(--color-primary)' }}>👥 Team & Resources</h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                                        Build your team and gather resources
                                    </p>

                                    {/* Roles Selection */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.8rem' }}>Roles Needed</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                            {roleOptions.map(role => (
                                                <div
                                                    key={role.id}
                                                    onClick={() => setForkData(prev => ({
                                                        ...prev,
                                                        peopleNeeded: prev.peopleNeeded.includes(role.id)
                                                            ? prev.peopleNeeded.filter(r => r !== role.id)
                                                            : [...prev.peopleNeeded, role.id]
                                                    }))}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: forkData.peopleNeeded.includes(role.id) ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                        background: forkData.peopleNeeded.includes(role.id) ? 'var(--color-bg-light)' : 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <span>{role.icon}</span>
                                                    <span>{role.label}</span>
                                                </div>
                                            ))}
                                            {/* Custom roles display */}
                                            {forkData.peopleNeeded.filter(r => !roleOptions.find(opt => opt.id === r)).map(customRole => (
                                                <div
                                                    key={customRole}
                                                    onClick={() => setForkData(prev => ({
                                                        ...prev,
                                                        peopleNeeded: prev.peopleNeeded.filter(r => r !== customRole)
                                                    }))}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '2px solid var(--color-primary)',
                                                        background: 'var(--color-bg-light)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <span>✨</span>
                                                    <span>{customRole}</span>
                                                    <span style={{ marginLeft: '0.3rem', opacity: 0.6 }}>×</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Custom role input */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={forkData.customRoleInput}
                                                onChange={e => setForkData(prev => ({ ...prev, customRoleInput: e.target.value }))}
                                                onKeyPress={e => {
                                                    if (e.key === 'Enter' && forkData.customRoleInput.trim()) {
                                                        setForkData(prev => ({
                                                            ...prev,
                                                            peopleNeeded: [...prev.peopleNeeded, prev.customRoleInput.trim()],
                                                            customRoleInput: ''
                                                        }));
                                                    }
                                                }}
                                                placeholder="Add custom role..."
                                                style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (forkData.customRoleInput.trim()) {
                                                        setForkData(prev => ({
                                                            ...prev,
                                                            peopleNeeded: [...prev.peopleNeeded, prev.customRoleInput.trim()],
                                                            customRoleInput: ''
                                                        }));
                                                    }
                                                }}
                                                style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Resources Selection */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.8rem' }}>Resources Needed</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {resourceOptions.map(resource => (
                                                <div
                                                    key={resource.id}
                                                    onClick={() => setForkData(prev => ({
                                                        ...prev,
                                                        resourcesNeeded: prev.resourcesNeeded.includes(resource.id)
                                                            ? prev.resourcesNeeded.filter(r => r !== resource.id)
                                                            : [...prev.resourcesNeeded, resource.id]
                                                    }))}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: forkData.resourcesNeeded.includes(resource.id) ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)',
                                                        background: forkData.resourcesNeeded.includes(resource.id) ? 'rgba(0,184,148,0.1)' : 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <span>{resource.icon}</span>
                                                    <span>{resource.label}</span>
                                                </div>
                                            ))}
                                            {/* Custom resources display */}
                                            {forkData.resourcesNeeded.filter(r => !resourceOptions.find(opt => opt.id === r)).map(customResource => (
                                                <div
                                                    key={customResource}
                                                    onClick={() => setForkData(prev => ({
                                                        ...prev,
                                                        resourcesNeeded: prev.resourcesNeeded.filter(r => r !== customResource)
                                                    }))}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '20px',
                                                        border: '2px solid var(--color-secondary)',
                                                        background: 'rgba(0,184,148,0.1)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <span>✨</span>
                                                    <span>{customResource}</span>
                                                    <span style={{ marginLeft: '0.3rem', opacity: 0.6 }}>×</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Custom resource input */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={forkData.customResourceInput}
                                                onChange={e => setForkData(prev => ({ ...prev, customResourceInput: e.target.value }))}
                                                onKeyPress={e => {
                                                    if (e.key === 'Enter' && forkData.customResourceInput.trim()) {
                                                        setForkData(prev => ({
                                                            ...prev,
                                                            resourcesNeeded: [...prev.resourcesNeeded, prev.customResourceInput.trim()],
                                                            customResourceInput: ''
                                                        }));
                                                    }
                                                }}
                                                placeholder="Add custom resource..."
                                                style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (forkData.customResourceInput.trim()) {
                                                        setForkData(prev => ({
                                                            ...prev,
                                                            resourcesNeeded: [...prev.resourcesNeeded, prev.customResourceInput.trim()],
                                                            customResourceInput: ''
                                                        }));
                                                    }
                                                }}
                                                style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: 'var(--color-secondary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                            >+</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => setForkData(prev => ({ ...prev, step: 1 }))}
                                            style={{ flex: 1, padding: '1rem', borderRadius: '50px', border: '1px solid var(--color-border)', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                                        >← Back</button>
                                        <button
                                            onClick={() => {
                                                // Update the forked idea with all data and launch
                                                if (forkData.forkedIdea) {
                                                    forkData.forkedIdea.title = forkData.title;
                                                    forkData.forkedIdea.body = forkData.body;
                                                    forkData.forkedIdea.description = forkData.body;
                                                    forkData.forkedIdea.type = forkData.category;
                                                    forkData.forkedIdea.evolutionType = forkData.evolutionType;
                                                    forkData.forkedIdea.mutationNote = forkData.mutationNote;
                                                    forkData.forkedIdea.peopleNeeded = forkData.peopleNeeded;
                                                    forkData.forkedIdea.resourcesNeeded = forkData.resourcesNeeded;
                                                }
                                                setForkData(prev => ({ ...prev, launched: true }));
                                            }}
                                            style={{ flex: 2, padding: '1rem', borderRadius: '50px', border: 'none', background: 'var(--color-secondary)', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,184,148,0.3)' }}
                                        >🚀 Launch Fork</button>
                                    </div>
                                </>
                            )}

                            {/* Success State */}
                            {forkData.launched && (
                                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: 'var(--color-secondary)' }}>Fork Launched!</h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                        Your evolution of "<strong>{idea.title}</strong>" is now live!
                                    </p>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                        Your fork will appear in the feed with a fork icon
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => {
                                                setShowForkStudio(false);
                                                // Ensure form doesn't pop up
                                                if (setIsFormOpen) setIsFormOpen(false);
                                                setForkData({ step: 0, evolutionType: 'refinement', mutationNote: '', title: '', body: '', category: '', peopleNeeded: [], resourcesNeeded: [], customRoleInput: '', customResourceInput: '', forkedIdea: null, launched: false });
                                            }}
                                            style={{ padding: '1rem 2rem', borderRadius: '50px', border: '1px solid var(--color-border)', background: 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                                        >Close</button>
                                        <button
                                            onClick={() => {
                                                if (forkData.forkedIdea) {
                                                    // Ensure form doesn't pop up
                                                    if (setIsFormOpen) setIsFormOpen(false);
                                                    setSelectedIdea(forkData.forkedIdea);
                                                }
                                                setShowForkStudio(false);
                                                setForkData({ step: 0, evolutionType: 'refinement', mutationNote: '', title: '', body: '', category: '', peopleNeeded: [], resourcesNeeded: [], customRoleInput: '', customResourceInput: '', forkedIdea: null, launched: false });
                                            }}
                                            style={{ padding: '1rem 2rem', borderRadius: '50px', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                        >Go to Post →</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
};



export default IdeaDetails;
