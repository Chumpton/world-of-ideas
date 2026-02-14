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
import founderImage from './assets/founder.png';
import ActivityFeed from './components/ActivityFeed';
import PeopleFeed from './components/PeopleFeed'; // Added
import GuidesFeed from './components/GuidesFeed'; // Added
import { debugError, debugInfo } from './debug/runtimeDebug';

import PeoplePage from './components/PeoplePage';
import IdeaGlobe from './components/IdeaGlobe';
import IdeaDetails from './components/IdeaDetails';

// Inner component to access context
function AppContent() {
    const { isFormOpen, setIsFormOpen, draftTitle, setDraftTitle, draftData, currentPage, selectedIdea, setSelectedIdea } = useAppContext();
    const [isDarkMode, setIsDarkMode] = React.useState(false);
    const formReopenBlockedUntilRef = React.useRef(0);

    React.useEffect(() => {
        debugInfo('app-content', 'AppContent mounted');
        return () => debugInfo('app-content', 'AppContent unmounted');
    }, []);

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
                                <p className="subtitle" style={{ marginTop: '1rem' }}>Submit your idea. Change the world.</p>
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

                    {/* Founder Profile Footer placed at the bottom */}
                    <div style={{ padding: '6rem 2rem 4rem 2rem', textAlign: 'center', opacity: 0.9, marginTop: 'auto' }}>
                        <img
                            src={founderImage}
                            alt="Campton S. Wilkins"
                            style={{
                                width: '180px',
                                height: 'auto',
                                marginBottom: '1rem',
                                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))'
                            }}
                        />
                        <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontFamily: 'var(--font-title)', color: 'var(--color-title)' }}>Campton S. Wilkins</h3>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>Founder</p>

                        <div style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6', color: 'var(--color-text-main)', fontStyle: 'italic' }}>
                            "Grew up in a broken home, moved cross country at 5 years old. Diagnosed autistic. Found hope through spirituality and magic plant medicines."
                        </div>
                    </div>
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
                    {selectedIdea && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100 }}>
                            <IdeaDetails idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
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
