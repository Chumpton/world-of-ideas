import React from 'react';
import Layout from './components/Layout';
import QuickSubmit from './components/QuickSubmit';
import SubmissionForm from './components/SubmissionForm';
import ProfileView from './components/ProfileView';
import GroupsPage from './components/GroupsPage';
import Leaderboard from './components/Leaderboard';
import Dashboard from './components/Dashboard';
import Feed from './components/Feed';
import AdminPage from './components/AdminPage';
import { AppProvider, useAppContext } from './context/AppContext';

import logo from './assets/logo.png';
import ActivityFeed from './components/ActivityFeed';
import PeopleFeed from './components/PeopleFeed'; // Added
import GuidesFeed from './components/GuidesFeed'; // Added
import { debugError, debugInfo } from './debug/runtimeDebug';

import PeoplePage from './components/PeoplePage';
import IdeaGlobe from './components/IdeaGlobe';
import IdeaDetails from './components/IdeaDetails';
import DiscussionDetails from './components/DiscussionDetails'; // [NEW]
import { extractIdeaIdFromLocation } from './utils/deepLinks';

// Inner component to access context
function AppContent() {
    const {
        isFormOpen, setIsFormOpen, draftTitle, setDraftTitle, draftData,
        currentPage, selectedIdea, setSelectedIdea, selectedProfileUserId,
        viewProfile, selectedDiscussion, ideas, loading, refreshIdeas, setCurrentPage
    } = useAppContext();
    const [isDarkMode, setIsDarkMode] = React.useState(false);
    const [pendingIdeaId, setPendingIdeaId] = React.useState(null);
    const formReopenBlockedUntilRef = React.useRef(0);

    React.useEffect(() => {
        debugInfo('app-content', 'AppContent mounted');
        return () => debugInfo('app-content', 'AppContent unmounted');
    }, []);

    // Parse deep links like /?idea=<id> or /idea/<id>.
    React.useEffect(() => {
        const syncFromUrl = () => {
            const deepLinkedIdeaId = extractIdeaIdFromLocation();
            if (deepLinkedIdeaId) {
                setPendingIdeaId(deepLinkedIdeaId);
            }
        };
        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        window.addEventListener('hashchange', syncFromUrl);
        return () => {
            window.removeEventListener('popstate', syncFromUrl);
            window.removeEventListener('hashchange', syncFromUrl);
        };
    }, []);

    // Open idea card when deep-link id resolves in loaded ideas.
    React.useEffect(() => {
        if (!pendingIdeaId) return;
        const match = (ideas || []).find((i) => String(i.id) === String(pendingIdeaId));
        if (match) {
            setCurrentPage('home');
            setSelectedIdea(match);
            setPendingIdeaId(null);
            return;
        }
        if (!loading) {
            refreshIdeas?.();
        }
    }, [pendingIdeaId, ideas, loading, refreshIdeas, setSelectedIdea, setCurrentPage]);

    // Keep URL deep link aligned with selected idea card.
    React.useEffect(() => {
        const url = new URL(window.location.href);
        const currentIdea = url.searchParams.get('idea');
        const selectedId = selectedIdea?.id ? String(selectedIdea.id) : null;
        if (selectedId && currentIdea !== selectedId) {
            url.searchParams.set('idea', selectedId);
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        } else if (!selectedId && currentIdea) {
            url.searchParams.delete('idea');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }
    }, [selectedIdea?.id]);

    // Apply dark mode class to body
    React.useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    const handleQuickStart = (title) => {
        if (Date.now() < formReopenBlockedUntilRef.current) return;
        if (selectedIdea) return;
        setDraftTitle(title);
        setIsFormOpen(true);
    };

    // Safety: Ensure form is closed if we are viewing an idea
    React.useEffect(() => {
        if (selectedIdea) {
            setIsFormOpen(false);
        }
    }, [selectedIdea]);

    return (
        <Layout>
            {currentPage === 'home' && (
                <>
                    {/* Hide Hero/QuickSubmit when viewing an idea to prevent ghost clicks and glitches */}
                    {!selectedIdea && (
                        <>
                            {/* Header / Hero */}
                            <div className="hero-section">
                                <img src={logo} alt="World of Ideas Logo" style={{ width: '180px', height: 'auto', marginBottom: '-1rem', position: 'relative', zIndex: 2 }} />
                                <h1 className="hero-title" style={{ position: 'relative', zIndex: 1 }}>World of Ideas.</h1>
                                <p className="subtitle" style={{ marginTop: '1.35rem', lineHeight: 1.35 }}>Submit your idea. Change the world.</p>
                                {!isFormOpen && <QuickSubmit onExpand={handleQuickStart} />}
                            </div>

                            {/* Activity Feed */}
                            <ActivityFeed />

                            {isFormOpen && (
                                <SubmissionForm
                                    initialTitle={draftTitle}
                                    initialData={draftData}
                                    onClose={(submittedIdea) => {
                                        // Prevent immediate reopen from ghost clicks after modal unmount.
                                        formReopenBlockedUntilRef.current = Date.now() + 700;
                                        setIsFormOpen(false);
                                        // If an idea was passed, navigate to it
                                        if (submittedIdea && submittedIdea.id) {
                                            setSelectedIdea(submittedIdea);
                                        }
                                    }}
                                />
                            )}
                        </>
                    )}
                    <Feed />

                    {/* People & Guides moved after Feed */}
                    <PeopleFeed />
                    <GuidesFeed />
                </>
            )}
            {currentPage === 'people' && <PeoplePage />}
            {currentPage === 'groups' && <GroupsPage />}
            {currentPage === 'leaderboard' && <Leaderboard />}
            {currentPage === 'admin' && <AdminPage />}
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'guides' && <div className="feed-container"><GuidesFeed /></div>}
            {currentPage === 'world' && (
                <div style={{ height: 'calc(100vh - 80px)', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <IdeaGlobe onSelectIdea={setSelectedIdea} />
                    {/* Overlays */}
                    {selectedIdea && <IdeaDetails idea={selectedIdea} onClose={() => setSelectedIdea(null)} />}
                    {selectedDiscussion && <DiscussionDetails />}
                    {/* [NEW] Global Profile View */}
                    {selectedProfileUserId && (
                        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
                            <ProfileView
                                targetUserId={selectedProfileUserId}
                                onClose={() => viewProfile(null)}
                            />
                        </div>
                    )}

                    {showMessaging && (
                        <div className="modal-backdrop" onClick={() => setShowMessaging(false)}>
                            {/* Messaging component goes here */}
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <h2>Messaging</h2>
                                <p>This is where your messaging interface would be.</p>
                                <button onClick={() => setShowMessaging(false)}>Close</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
}

// Error Boundary for debugging standalone issues
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
        debugError('react.error-boundary', 'ErrorBoundary captured render error', error, {
            componentStack: errorInfo?.componentStack || null,
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'red', background: '#ffe6e6' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ErrorBoundary>
    );
}

export default App;
