import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchRows, fetchSingle, insertRow, updateRow, deleteRows, upsertRow, getLastSupabaseError } from './supabaseHelpers';
import founderImage from '../assets/founder.png';
import { debugError, debugInfo, debugWarn } from '../debug/runtimeDebug';

const AppContext = createContext();
const USER_CACHE_KEY = 'woi_cached_user';
const IDEAS_CACHE_KEY = 'woi_cached_ideas'; // [NEW] Cache Key

const PROFILE_ALLOWED_COLUMNS = new Set([
    'username', 'display_name', 'avatar_url', 'bio', 'expertise', 'skills', 'job', 'role',
    'border_color', 'influence', 'coins', 'tier', 'followers', 'following',
    'location', 'links', 'mentorship', 'badges', 'theme_preference'
]);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authDiagnostics, setAuthDiagnostics] = useState([]);

    // [CACHE] Warm start ideas
    const [ideas, setIdeas] = useState(() => {
        try {
            const cached = localStorage.getItem(IDEAS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    // [CACHE] Warm start discussions
    const [discussions, setDiscussions] = useState(() => {
        try {
            const cached = localStorage.getItem(DISCUSSIONS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [guides, setGuides] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftData, setDraftData] = useState(null);
    const [newlyCreatedIdeaId, setNewlyCreatedIdeaId] = useState(null);
    const [showMessaging, setShowMessaging] = useState(false);
    const [messagingUserId, setMessagingUserId] = useState(null);
    const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
    const [selectedIdea, setSelectedIdea] = useState(null);
    const [votedIdeaIds, setVotedIdeaIds] = useState([]);
    const [downvotedIdeaIds, setDownvotedIdeaIds] = useState([]);
    const [savedBountyIds, setSavedBountyIds] = useState([]);
    const [votedDiscussionIds, setVotedDiscussionIds] = useState([]);
    const [votedGuideIds, setVotedGuideIds] = useState({});
    const [developerMode, setDeveloperMode] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('woi_theme');
            return saved ? JSON.parse(saved) : false;
        } catch (e) { return false; }
    });

    const viewProfile = (userId) => setSelectedProfileUserId(userId);
    const isAdmin = user?.role === 'admin';
    const pushAuthDiagnostic = (stage, status, message, extra = null) => {
        const event = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ts: new Date().toISOString(),
            stage,
            status,
            message,
            extra
        };
        setAuthDiagnostics(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [...safePrev.slice(-49), event];
        });
        debugInfo('auth.diagnostic', `${stage}:${status}`, { message, extra });
    };
    const clearAuthDiagnostics = () => setAuthDiagnostics([]);
    const toVoteDirectionValue = (direction) => {
        if (direction === -1 || direction === 'down') return -1;
        return 1;
    };
    const fromVoteDirectionValue = (value) => (Number(value) < 0 ? 'down' : 'up');
    const safeJsonParse = (value, fallback = null) => {
        if (value == null) return fallback;
        if (typeof value === 'object') return value;
        if (typeof value !== 'string') return fallback;
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };

    // ─── Profile Column Mapping (DB ↔ App) ────────────────────
    // DB uses snake_case: avatar_url, border_color, coins
    // App uses camelCase: avatar, borderColor, cash
    const getDefaultAvatar = (nameOrEmail = 'User') =>
        `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrEmail)}&background=random&color=fff`;
    const withSoftTimeout = async (promise, timeoutMs = 6000, fallbackValue = null) => {
        let timer;
        try {
            return await Promise.race([
                promise,
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
                })
            ]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    };
    const buildAuthFallbackProfile = (authUser, fallback = {}) => normalizeProfile({
        id: authUser?.id,
        email: authUser?.email || fallback.email || '',
        username:
            fallback.username
            || authUser?.user_metadata?.username
            || (authUser?.email || fallback.email || '').split('@')[0]
            || 'User',
        avatar_url:
            fallback.avatar
            || authUser?.user_metadata?.avatar_url
            || getDefaultAvatar(
                fallback.username
                || authUser?.user_metadata?.username
                || authUser?.email
                || 'User'
            )
    });

    const normalizeProfile = (p) => {
        if (!p) return p;
        const displayName = p.username || p.email || 'User';
        return {
            ...p,
            avatar: p.avatar_url ?? p.avatar ?? getDefaultAvatar(displayName),
            borderColor: p.border_color ?? p.borderColor ?? '#7d5fff',
            cash: p.coins ?? p.cash ?? 0,
        };
    };
    const normalizeIdea = (idea) => {
        if (!idea) return idea;
        const normalizedType = String(idea.type ?? idea.category ?? 'invention').toLowerCase();
        const parsedRoles = Array.isArray(idea.roles_needed) ? idea.roles_needed : (idea.peopleNeeded || []);
        const parsedResources = Array.isArray(idea.resources_needed) ? idea.resources_needed : (idea.resourcesNeeded || []);
        return {
            ...idea,
            type: normalizedType,
            body: idea.body ?? idea.markdown_body ?? '',
            solution: idea.solution ?? idea.markdown_body ?? '',
            description: idea.description ?? '',
            tags: idea.tags ?? [],
            author: idea.author ?? idea.author_name ?? 'User',
            timestamp: idea.timestamp ?? (idea.created_at ? new Date(idea.created_at).getTime() : Date.now()),
            commentCount: idea.commentCount ?? idea.comment_count ?? 0,
            views: idea.views ?? idea.view_count ?? 0,
            authorAvatar: idea.authorAvatar ?? idea.author_avatar ?? null,
            parentIdeaId: idea.parentIdeaId ?? idea.forked_from ?? null,
            forkedFrom: idea.forkedFrom ?? idea.forked_from ?? null,
            forks: idea.forks ?? 0,
            shares: idea.shares ?? 0,
            peopleNeeded: parsedRoles,
            resourcesNeeded: parsedResources
        };
    };

    const denormalizeProfile = (updates) => {
        const mapped = { ...updates };
        if ('avatar' in mapped) { mapped.avatar_url = mapped.avatar; delete mapped.avatar; }
        if ('borderColor' in mapped) { mapped.border_color = mapped.borderColor; delete mapped.borderColor; }
        if ('cash' in mapped) { mapped.coins = mapped.cash; delete mapped.cash; }
        return Object.fromEntries(Object.entries(mapped).filter(([key]) => PROFILE_ALLOWED_COLUMNS.has(key)));
    };

    // ─── Internal Helpers ───────────────────────────────────────
    const fetchProfile = async (userId) => {
        const raw = await fetchSingle('profiles', { id: userId });
        return normalizeProfile(raw);
    };

    const ensureProfileForAuthUser = async (authUser, fallback = {}) => {
        if (!authUser?.id) return null;
        pushAuthDiagnostic('profile.ensure', 'start', 'Ensuring profile row exists for auth user', { userId: authUser.id });

        const retries = [0, 250, 500];
        let profile = null;

        for (const delayMs of retries) {
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            profile = await fetchProfile(authUser.id);
            if (profile) {
                pushAuthDiagnostic('profile.ensure', 'ok', 'Profile found');
                return profile;
            }
        }

        const base = {
            id: authUser.id,
            username: fallback.username || (authUser.email || fallback.email || 'User').split('@')[0] || 'User',
            avatar_url: fallback.avatar || getDefaultAvatar(fallback.username || authUser.email || 'User')
        };

        const { data: created } = await supabase
            .from('profiles')
            .upsert(base, { onConflict: 'id' })
            .select()
            .single();

        pushAuthDiagnostic('profile.ensure', created ? 'ok' : 'warn', created ? 'Profile upserted/recovered' : 'Profile fallback used');
        return normalizeProfile(created || base);
    };

    // ─── Storage Uploads ────────────────────────────────────────
    const uploadAvatar = async (file, userId) => {
        if (!file || !userId) return null;
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/avatar_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (error) {
            console.error('[Storage] uploadAvatar:', error.message);
            pushAuthDiagnostic('avatar.upload', 'error', error.message || 'Avatar upload failed');
            return null;
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        console.log('[Storage] Avatar uploaded, public URL:', urlData?.publicUrl);
        pushAuthDiagnostic('avatar.upload', 'ok', 'Avatar uploaded', { filePath, publicUrl: urlData?.publicUrl });
        return urlData?.publicUrl || null;
    };

    const uploadIdeaImage = async (file, ideaId) => {
        if (!file) return null;
        const ext = file.name.split('.').pop();
        const filePath = `${ideaId || 'temp'}/cover_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('idea-images').upload(filePath, file, { upsert: true });
        if (error) { console.error('[Storage] uploadIdeaImage:', error.message); return null; }
        const { data: urlData } = supabase.storage.from('idea-images').getPublicUrl(filePath);
        return urlData?.publicUrl || null;
    };

    const refreshIdeas = async () => {
        console.log('[refreshIdeas] Fetching ideas...');
        // Join profiles to get author details
        const { data, error } = await supabase
            .from('ideas')
            .select('*, profiles(username, avatar_url, tier)')
            .order('created_at', { ascending: false });

        // Error Check
        if (error) {
            console.error('[refreshIdeas] Fetch failed:', error);
            pushAuthDiagnostic('data.ideas', 'error', 'Failed to fetch ideas', error);
            return;
        }

        console.log('[refreshIdeas] Fetched count:', data?.length || 0);

        const rows = data || [];
        const forkCounts = rows.reduce((acc, row) => {
            const parentId = row?.forked_from;
            if (!parentId) return acc;
            acc[parentId] = (acc[parentId] || 0) + 1;
            return acc;
        }, {});

        const finalIdeas = rows.map(row => {
            // Flatten profile data
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return normalizeIdea({
                ...row,
                author: profile?.username || row.author, // Prefer profile username
                authorAvatar: profile?.avatar_url,       // Get real avatar
                authorTier: profile?.tier,
                forks: forkCounts[row.id] || 0
            });
        });
        setIdeas(finalIdeas);

        // [CACHE] Update local storage
        try {
            if (finalIdeas.length > 0) {
                localStorage.setItem(IDEAS_CACHE_KEY, JSON.stringify(finalIdeas));
            }
        } catch (e) { console.warn('Cache save failed', e); }

        debugInfo('data.refresh', 'Ideas refreshed', { count: (data || []).length });
    };

    const getFeaturedIdea = async () => {
        const data = await fetchRows('ideas', {}, { order: { column: 'votes', ascending: false }, limit: 1 });
        if (data && data.length > 0) {
            return normalizeIdea(data[0]);
        }
        return null;
    };
    const refreshDiscussions = async () => {
        const data = await fetchRows('discussions', {}, { order: { column: 'created_at', ascending: false } });
        setDiscussions(data || []);

        // [CACHE]
        try {
            if (data && data.length > 0) {
                localStorage.setItem(DISCUSSIONS_CACHE_KEY, JSON.stringify(data));
            }
        } catch (e) { console.warn('Cache save failed', e); }
    };
    const refreshGuides = async () => {
        const data = await fetchRows('guides', {}, { order: { column: 'created_at', ascending: false } });
        setGuides((data || []).map(g => ({
            ...g,
            author: g.author_name || 'User',
            content: g.content || '',
            snippet: g.content ? g.content.slice(0, 180) : '',
        })));
        debugInfo('data.refresh', 'Guides refreshed', { count: (data || []).length });
    };
    const refreshUsers = async () => {
        const data = await fetchRows('profiles');
        setAllUsers(data.map(normalizeProfile));
        debugInfo('data.refresh', 'Users refreshed', { count: (data || []).length });
    };

    const updateInfluence = async (userId, delta) => {
        if (!userId || delta === 0) return;
        const profile = await fetchProfile(userId);
        if (profile) {
            await updateRow('profiles', userId, { influence: (profile.influence || 0) + delta });
        }
    };

    const getCoinsGiven = async (userId) => {
        const stakes = await fetchRows('stakes', { user_id: userId });
        const totalStaked = stakes.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
        return totalStaked;
    };
    const loadFollowingIds = async (userId) => {
        if (!userId) return [];
        const rows = await fetchRows('follows', { follower_id: userId });
        return (rows || []).map(r => r.following_id).filter(Boolean);
    };

    const loadUserVotes = async (userId) => {
        const [up, down, saved, disc, gv] = await Promise.all([
            fetchRows('idea_votes', { user_id: userId, direction: 1 }),
            fetchRows('idea_votes', { user_id: userId, direction: -1 }),
            fetchRows('bounty_saves', { user_id: userId }),
            fetchRows('discussion_votes', { user_id: userId }),
            fetchRows('guide_votes', { user_id: userId })
        ]);
        setVotedIdeaIds(up.map(v => v.idea_id));
        setDownvotedIdeaIds(down.map(v => v.idea_id));
        setSavedBountyIds(saved.map(v => v.bounty_id));
        setVotedDiscussionIds(disc.map(v => v.discussion_id));
        const gMap = {};
        gv.forEach(v => { gMap[v.guide_id] = fromVoteDirectionValue(v.direction); });
        setVotedGuideIds(gMap);
    };

    // ─── Init & Auth Listener ───────────────────────────────────
    useEffect(() => {
        debugInfo('app-context', 'AppProvider mounted');
        // Warm-start user from local cache for hard refresh resilience.
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.id) setUser(normalizeProfile(parsed));
            }
        } catch (err) {
            console.warn('[Auth] Failed to read cached user:', err?.message || err);
            debugWarn('auth.cache', 'Failed to read cached user', { message: err?.message || String(err) });
        }

        const init = async () => {
            const initFailsafe = setTimeout(() => {
                setLoading(false);
                pushAuthDiagnostic('init', 'warn', 'Init failsafe released loading state after 8s timeout');
            }, 8000); // Increased to 8s to distinguish from previous versions
            try {
                pushAuthDiagnostic('init', 'start', 'App auth init started');
                console.time('init_sequence');

                let session = null;
                try {
                    const { data } = await supabase.auth.getSession();
                    session = data?.session || null;
                } catch (sessionErr) {
                    pushAuthDiagnostic('init', 'warn', sessionErr?.message || 'Session lookup failed; continuing');
                }

                if (session?.user) {
                    pushAuthDiagnostic('init', 'ok', 'Existing session detected', { userId: session.user.id });
                    setUser(buildAuthFallbackProfile(session.user));
                    // Wrap profile verification in timeout to prevent hanging the entire app if DB is slow/unreachable
                    const profile = await withSoftTimeout(ensureProfileForAuthUser(session.user), 4000, null);
                    if (profile) {
                        // Tolerate missing tables for auxiliary data
                        try {
                            const following = await loadFollowingIds(profile.id);
                            profile.following = following;
                        } catch (err) {
                            console.warn('[Init] loadFollowingIds failed (table missing?):', err);
                        }

                        setUser(profile);

                        try {
                            await loadUserVotes(profile.id);
                        } catch (err) {
                            console.warn('[Init] loadUserVotes failed (table missing?):', err);
                        }
                    } else {
                        pushAuthDiagnostic('init', 'warn', 'Profile fetch timed out or failed; using collision fallback');
                    }
                } else {
                    pushAuthDiagnostic('init', 'info', 'No active session found');
                }

                // Parallel fetch with individual timeouts - Increased to 15s
                console.time('fetch_all');
                await Promise.allSettled([
                    withSoftTimeout(refreshIdeas(), 15000, 'IDEAS_TIMEOUT').then(r => console.log('Ideas result:', r)).catch(e => console.warn('Ideas init failed', e)),
                    withSoftTimeout(refreshGuides(), 10000, 'GUIDES_TIMEOUT').then(r => console.log('Guides result:', r)).catch(e => console.warn('Guides init failed', e)),
                    withSoftTimeout(refreshUsers(), 10000, 'USERS_TIMEOUT').then(r => console.log('Users result:', r)).catch(e => console.warn('Users init failed', e))
                ]);
                console.timeEnd('fetch_all');

            } catch (err) {
                console.error('[AppContext] init error:', err);
                pushAuthDiagnostic('init', 'error', err.message || 'Init failed');
                debugError('app-context.init', 'Init failed', err);
            } finally {
                clearTimeout(initFailsafe);
                console.timeEnd('init_sequence');
                setLoading(false);
                debugInfo('app-context.init', 'Init finished', { loading: false });
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                pushAuthDiagnostic('auth.state', 'info', `Auth state change: ${event}`, { hasSession: !!session });
                if (event === 'SIGNED_IN' && session?.user) {
                    const fallbackProfile = buildAuthFallbackProfile(session.user);
                    setUser(fallbackProfile);
                    const hydratedProfile = await withSoftTimeout(
                        ensureProfileForAuthUser(session.user),
                        7000,
                        fallbackProfile
                    );
                    if (hydratedProfile) {
                        try {
                            const following = await loadFollowingIds(hydratedProfile.id);
                            hydratedProfile.following = following;
                        } catch (err) {
                            console.warn('[Auth] loadFollowingIds failed:', err);
                        }
                        setUser(hydratedProfile);
                        loadUserVotes(hydratedProfile.id).catch(() => { });
                        // REFRESH DATA to ensure authenticated RLS policies apply
                        refreshIdeas();
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setVotedIdeaIds([]); setDownvotedIdeaIds([]);
                    setSavedBountyIds([]); setVotedDiscussionIds([]);
                    setVotedGuideIds({});
                    try { localStorage.removeItem(USER_CACHE_KEY); } catch (_) { }
                }
            }
        );
        return () => {
            debugInfo('app-context', 'AppProvider unmounted');
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        try {
            if (user?.id) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
            else localStorage.removeItem(USER_CACHE_KEY);
        } catch (_) { }
    }, [user]);

    useEffect(() => {
        debugInfo('app-context.state', 'Core state updated', {
            loading,
            currentPage,
            hasUser: !!user?.id,
            ideas: Array.isArray(ideas) ? ideas.length : 0,
            guides: Array.isArray(guides) ? guides.length : 0,
            users: Array.isArray(allUsers) ? allUsers.length : 0,
            selectedIdea: selectedIdea?.id || null,
        });
    }, [loading, currentPage, user?.id, ideas.length, guides.length, allUsers.length, selectedIdea?.id]);

    useEffect(() => {
        if (!loading) return;
        const timer = setTimeout(() => {
            debugWarn('app-context.watchdog', 'Loading still true after 12s', {
                hasUser: !!user?.id,
                currentPage,
                ideas: Array.isArray(ideas) ? ideas.length : 0,
                guides: Array.isArray(guides) ? guides.length : 0,
                users: Array.isArray(allUsers) ? allUsers.length : 0,
            });
        }, 12000);
        return () => clearTimeout(timer);
    }, [loading, user?.id, currentPage, ideas.length, guides.length, allUsers.length]);

    // ─── Dark Mode ──────────────────────────────────────────────
    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        if (user?.theme_preference) {
            setIsDarkMode(user.theme_preference === 'dark');
        }
    }, [user?.theme_preference]);

    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('woi_theme', JSON.stringify(newMode));
        if (user) {
            updateProfile({ theme_preference: newMode ? 'dark' : 'light' });
        }
    };

    const formatSupabaseError = (error, stage = 'unknown') => {
        if (!error) return { reason: `Unknown error at ${stage}`, debug: null };
        const code = error.code || error.error_code || null;
        const status = error.status || null;
        const hint = error.hint || null;
        const details = error.details || null;
        const message = error.message || 'Unknown Supabase error';
        const reason = `[${stage}] ${message}${code ? ` (code: ${code})` : ''}${status ? ` (status: ${status})` : ''}`;
        return {
            reason,
            debug: { stage, code, status, message, hint, details }
        };
    };

    // ─── Auth ───────────────────────────────────────────────────
    const login = async (email, password) => {
        pushAuthDiagnostic('login', 'start', 'Login attempt started', { email });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            const parsed = formatSupabaseError(error, 'auth.signInWithPassword');
            pushAuthDiagnostic('login', 'error', parsed.reason, parsed.debug || null);
            return { success: false, reason: parsed.reason, debug: parsed.debug };
        }
        const fallbackProfile = buildAuthFallbackProfile(data.user, { email });
        setUser(fallbackProfile);
        setCurrentPage('home');
        pushAuthDiagnostic('login', 'ok', 'Login auth succeeded; profile hydration running', { userId: fallbackProfile.id });

        Promise.resolve().then(async () => {
            const profile = await withSoftTimeout(
                ensureProfileForAuthUser(data.user, { email }),
                7000,
                fallbackProfile
            );
            if (profile) {
                const following = await loadFollowingIds(profile.id);
                setUser({ ...profile, following });
            }
            if (profile?.id) loadUserVotes(profile.id).catch(() => { });
            pushAuthDiagnostic('login.hydrate', profile ? 'ok' : 'warn', profile ? 'Profile hydration complete' : 'Profile hydration timed out; using fallback');
        }).catch((err) => {
            pushAuthDiagnostic('login.hydrate', 'error', err.message || 'Profile hydration failed');
        });

        return { success: true, user: fallbackProfile };
    };

    const register = async ({ email, password, username, avatarFile, ...profileData }) => {
        try {
            pushAuthDiagnostic('register', 'start', 'Signup attempt started', { email, username: username || null });
            const { data, error } = await supabase.auth.signUp({ email, password });

            if (error) {
                const parsed = formatSupabaseError(error, 'auth.signUp');
                pushAuthDiagnostic('register', 'error', parsed.reason, parsed.debug || null);
                return { success: false, reason: parsed.reason, debug: parsed.debug };
            }

            // Supabase v2: duplicate email returns fake user with empty identities
            if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
                pushAuthDiagnostic('register', 'warn', 'Duplicate email detected');
                return { success: false, reason: 'An account with this email already exists.' };
            }

            // If email confirmation is enabled, signup may not return a session.
            if (!data.session) {
                pushAuthDiagnostic('register', 'info', 'Signup created user but requires email confirmation');
                return {
                    success: false,
                    needsEmailConfirmation: true,
                    reason: 'Account created. Please verify your email, then log in.'
                };
            }

            // Optimistically set user so UI can transition immediately after successful auth.
            const optimistic = normalizeProfile({
                id: data.user.id,
                email,
                username: username || (email || '').split('@')[0] || 'User',
                avatar_url: getDefaultAvatar(username || (email || '').split('@')[0] || 'User'),
            });
            setUser(optimistic);
            setCurrentPage('home');
            pushAuthDiagnostic('register', 'ok', 'Signup auth success; user set optimistically', { userId: optimistic.id });

            // Best-effort profile enrichment; never block successful signup UI completion.
            Promise.resolve().then(async () => {
                let avatarUrl = profileData.avatar || optimistic.avatar;
                if (avatarFile) {
                    const uploaded = await uploadAvatar(avatarFile, data.user.id);
                    if (uploaded) {
                        avatarUrl = uploaded;
                        setUser(prev => prev ? { ...prev, avatar: avatarUrl } : prev);
                    }
                }
                const profileAttempts = [
                    {
                        id: data.user.id,
                        username: optimistic.username,
                        avatar_url: avatarUrl,
                        bio: profileData.bio || '',
                    },
                    { id: data.user.id, username: optimistic.username, avatar_url: avatarUrl },
                    { id: data.user.id, username: optimistic.username }
                ];

                let newProfile = null;
                for (const payload of profileAttempts) {
                    const { data: upserted, error: upsertError } = await supabase
                        .from('profiles')
                        .upsert(payload, { onConflict: 'id' })
                        .select()
                        .single();
                    if (!upsertError && upserted) {
                        newProfile = upserted;
                        break;
                    }
                }

                if (!newProfile) {
                    const existing = await fetchProfile(data.user.id);
                    if (existing) newProfile = existing;
                }

                if (newProfile) setUser(normalizeProfile(newProfile));
                pushAuthDiagnostic('register.profile', 'ok', 'Profile enrichment completed');
            }).catch((profileErr) => {
                console.error('[Register] non-blocking profile sync error:', profileErr);
                pushAuthDiagnostic('register.profile', 'error', profileErr.message || 'Profile enrichment failed');
            });

            setAllUsers(prev => {
                const idx = prev.findIndex(u => u.id === optimistic.id);
                if (idx === -1) return [...prev, optimistic];
                const next = [...prev];
                next[idx] = optimistic;
                return next;
            });
            return { success: true, user: optimistic };
        } catch (err) {
            console.error('[Register] unexpected error:', err);
            pushAuthDiagnostic('register', 'error', err.message || 'Registration failed unexpectedly');
            return { success: false, reason: err.message || 'Registration failed unexpectedly' };
        }
    };

    const logout = async () => {
        try {
            // Attempt sign out but don't let it block the UI cleanup for more than 2s
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);
            pushAuthDiagnostic('logout', 'ok', 'User signed out from Supabase (or timed out)');
        } catch (err) {
            console.error('[Logout] Supabase signOut failed', err);
            pushAuthDiagnostic('logout', 'warn', 'Supabase signOut failed; clearing local state anyway', err);
        } finally {
            setUser(null);
            setCurrentPage('home');
            try {
                localStorage.removeItem(USER_CACHE_KEY);
                // Force-clear Supabase tokens so it doesn't auto-relogin on refresh if signOut failed
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.startsWith('supabase.')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (_) { }
            window.location.reload(); // Hard refresh to clear any lingering React state
        }
    };

    const updateProfile = async (updatedData) => {
        if (!user) return { success: false, reason: 'Not logged in' };
        const dbData = denormalizeProfile(updatedData);
        if (Object.keys(dbData).length === 0) {
            const merged = normalizeProfile({ ...user, ...updatedData });
            setUser(merged);
            setAllUsers(prev => prev.map(u => u.id === user.id ? merged : u));
            return { success: true, user: merged };
        }
        const updated = await updateRow('profiles', user.id, dbData);
        if (!updated) return { success: false, reason: 'Update failed' };
        const normalized = normalizeProfile(updated);
        setUser(normalized);
        setAllUsers(prev => prev.map(u => u.id === user.id ? normalized : u));
        return { success: true, user: normalized };
    };

    // ─── Social Graph ───────────────────────────────────────────
    const followUser = async (targetId) => {
        if (!user) return alert('Must be logged in');
        const existing = await fetchRows('follows', { follower_id: user.id, following_id: targetId });
        if (existing.length > 0) {
            await deleteRows('follows', { follower_id: user.id, following_id: targetId });
        } else {
            await insertRow('follows', { follower_id: user.id, following_id: targetId });
            addNotification({
                user_id: targetId,
                type: 'follow',
                message: `${user.username} started following you!`,
                link: `/profile/${user.id}`
            });
        }
        const profile = await fetchProfile(user.id);
        const following = await loadFollowingIds(user.id);
        setUser({ ...profile, following });
        await refreshUsers();
        return { success: true, user: { ...profile, following } };
    };

    // ─── Messaging ──────────────────────────────────────────────
    const sendDirectMessage = async (toId, text) => {
        if (!user) return null;
        return await insertRow('messages', {
            from_id: user.id, to_id: toId, text,
        });
    };

    const getDirectMessages = async () => {
        if (!user) return [];
        const { data: messages } = await supabase.from('messages').select('*')
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        if (!messages) return [];

        // Group messages by counterpart
        const threads = {};
        messages.forEach(msg => {
            const otherId = msg.from_id === user.id ? msg.to_id : msg.from_id;
            const channelId = [user.id, otherId].sort().join('_'); // Simple 1-on-1 ID

            if (!threads[channelId]) {
                threads[channelId] = {
                    channelId,
                    otherId,
                    messages: [],
                    unreadCount: 0
                };
            }
            threads[channelId].messages.push({
                ...msg,
                text: msg.text,
                from: msg.from_id,
                timestamp: new Date(msg.created_at).getTime()
            });
        });

        // Hydrate participants
        // We rely on allUsers being loaded. If not, we might need to fetch them.
        // For now, assume allUsers is populated enough or we fetch missing.
        // Optimally we'd do a fetch for missing users here.

        const result = Object.values(threads).map(thread => {
            const otherUser = allUsers.find(u => u.id === thread.otherId) || { id: thread.otherId, username: 'Unknown User', avatar: null };
            const lastMsg = thread.messages[thread.messages.length - 1];

            return {
                channelId: thread.channelId,
                participants: [user, otherUser],
                messages: thread.messages,
                lastMessage: lastMsg,
                isGroup: false, // Initial support for 1-on-1 only
                unreadCount: 0 // TODO: Track read status
            };
        });

        // Sort by last message
        return result.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
    };

    const openMessenger = (userId = null) => {
        setMessagingUserId(userId);
        setShowMessaging(true);
    };

    // ─── Ideas ──────────────────────────────────────────────────
    const submitIdea = async (ideaData) => {
        if (!user) return null;
        const { id, created_at, timestamp, votes, forks, views, commentCount, ...rest } = ideaData || {};
        const category = String((Array.isArray(rest.categories) && rest.categories[0]) || rest.type || rest.category || 'invention').toLowerCase();
        const tags = Array.isArray(rest.tags) ? rest.tags : [];
        const rolesNeeded = Array.isArray(rest.peopleNeeded) ? rest.peopleNeeded : [];
        const resourcesNeeded = Array.isArray(rest.resourcesNeeded) ? rest.resourcesNeeded : [];
        const markdownBody = rest.body || rest.solution || '';

        const ideaPayload = {
            title: rest.title || 'Untitled Idea',
            description: rest.description || (markdownBody ? markdownBody.slice(0, 200) : ''),
            category,
            tags,
            author_id: user.id,
            author_name: user.username,
            author_avatar: user.avatar || null,
            votes: 0,
            status: 'open',
            forked_from: rest.parentIdeaId || rest.forkedFrom || null,
            roles_needed: rolesNeeded,
            resources_needed: resourcesNeeded,
            markdown_body: markdownBody || null,
            lat: rest.location?.lat || null,
            lng: rest.location?.lng || null,
            city: rest.location?.city || null
        };

        // Attempt insert first. 
        console.log('[submitIdea] Attempting initial insert...');

        // 1. Initial Attempt (Full Payload) - 15s Timeout
        let newIdea = await withSoftTimeout(insertRow('ideas', ideaPayload), 15000);

        // 2. Retry Logic (If initial failed/timed out)
        if (!newIdea) {
            const lastErr = getLastSupabaseError();
            console.warn('[submitIdea] Initial insert failed/timed out:', lastErr?.message || 'Timeout');

            // Retry with minimal payload (No Location) - No Timeout Wrapper to see real error
            console.warn('[submitIdea] Retrying with minimal payload...');
            const { lat, lng, city, ...fallbackPayload } = ideaPayload;

            // Try explicit insert to bypass insertRow overhead if needed, but keeping insertRow for consistency
            newIdea = await insertRow('ideas', fallbackPayload);

            if (newIdea) {
                console.log('[submitIdea] Fallback insert success!');
            } else {
                const finalErr = getLastSupabaseError();
                console.error('[submitIdea] All attempts failed.', finalErr);
            }
        }

        if (newIdea) {
            const normalized = normalizeIdea(newIdea);
            setIdeas(prev => [normalized, ...prev]);
            setNewlyCreatedIdeaId(normalized.id);
            return { success: true, idea: normalized };
        }

        // 3. Last Resort: Profile Check & Retry (If still failing)
        // Sometimes insert fails if the public.profiles row triggers a constraint or is missing
        if (!newIdea) {
            console.log('[submitIdea] Ensuring profile exists...');
            const lastErr = getLastSupabaseError();
            console.warn('[submitIdea] Previous error was:', lastErr?.message);

            // Force check profile
            await withSoftTimeout(ensureProfileForAuthUser(
                { id: user.id, email: user.email },
                { username: user.username, avatar: user.avatar }
            ), 5000);

            console.log('[submitIdea] Retrying insert after profile check...');
            newIdea = await withSoftTimeout(insertRow('ideas', ideaPayload), 10000);
        }

        // Final Result Check
        if (newIdea) {
            const normalized = normalizeIdea(newIdea);
            setIdeas(prev => [normalized, ...prev]);
            setNewlyCreatedIdeaId(normalized.id);
            return { success: true, idea: normalized };
        }

        const finalErr = getLastSupabaseError();
        return { success: false, reason: finalErr?.message || 'Submission failed. Please check connection.' };
    };


    const clearNewIdeaId = () => setNewlyCreatedIdeaId(null);

    const incrementIdeaViews = async (ideaId) => {
        if (!ideaId) return;

        // [MODIFIED] De-duplication logic using localStorage
        // Key format: 'woi_views' = { [ideaId]: timestamp }
        try {
            const STORAGE_KEY = 'woi_views';
            const VIEW_COOLDOWN = 60 * 60 * 1000; // 1 hour
            const now = Date.now();

            const storedViews = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const lastViewed = storedViews[ideaId];

            if (lastViewed && (now - lastViewed < VIEW_COOLDOWN)) {
                // Recently viewed, skip DB increment
                // Still optimistic update local state so UI feels responsive? 
                // Actually, if we skip DB, we probably shouldn't fake it locally either to keep sync,
                // BUT the user expects to see it increment if they click? 
                // Let's increment locally ONLY if it's the very first time this session (handled by hasIncrementedView in component)
                // But this function is called BY that effect.
                // So if we are here, the component *wants* to increment.
                // We will silently skip the DB call.
                console.log(`[Views] Skipped increment for ${ideaId}, cooldown active.`);
                return;
            }

            // Update local storage
            storedViews[ideaId] = now;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedViews));

            // Optimistic update
            setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, views: (i.views || 0) + 1 } : i));

            // Fire and forget DB update
            updateInfluence(ideaId, 0); // Placeholder hook for influence logic if needed

            const { error } = await supabase.rpc('increment_idea_views', { idea_id: ideaId });

            if (error) {
                // Fallback if RPC missing or fails
                console.warn('[incrementIdeaViews] RPC failed, using manual update', error);
                const idea = await fetchSingle('ideas', { id: ideaId });
                if (idea) {
                    await updateRow('ideas', ideaId, { view_count: (idea.view_count || 0) + 1 });
                }
            }
        } catch (e) {
            console.error('[Views] Error in incrementIdeaViews:', e);
            // Fallback: try to increment anyway if storage fails
        }
    };

    const voteIdea = async (ideaId, direction = 'up') => {
        if (!user) return alert('Must be logged in to vote');
        const directionValue = toVoteDirectionValue(direction);
        const existing = await fetchRows('idea_votes', { idea_id: ideaId, user_id: user.id });

        // Fetch idea for author info
        const targetIdea = ideas.find(i => i.id === ideaId) || await fetchSingle('ideas', { id: ideaId });
        const authorId = targetIdea?.author_id || targetIdea?.authorId;

        if (existing.length > 0) {
            if (Number(existing[0].direction) === directionValue) {
                await deleteRows('idea_votes', { id: existing[0].id });
                if (authorId && authorId !== user.id) updateInfluence(authorId, -directionValue);
            } else {
                const oldDirection = Number(existing[0].direction);
                await updateRow('idea_votes', existing[0].id, { direction: directionValue });
                if (authorId && authorId !== user.id) updateInfluence(authorId, directionValue - oldDirection);
            }
        } else {
            await insertRow('idea_votes', { idea_id: ideaId, user_id: user.id, direction: directionValue });
            if (authorId && authorId !== user.id) updateInfluence(authorId, directionValue);
        }
        // Recount
        const ups = await fetchRows('idea_votes', { idea_id: ideaId, direction: 1 });
        const downs = await fetchRows('idea_votes', { idea_id: ideaId, direction: -1 });
        await updateRow('ideas', ideaId, { votes: ups.length - downs.length });
        await refreshIdeas();
        await loadUserVotes(user.id);
        return true;
    };

    // ─── Discussions ────────────────────────────────────────────
    const getDiscussions = async (category) => {
        const filters = category && category !== 'all' ? { category } : {};
        return await fetchRows('discussions', filters, { order: { column: 'created_at', ascending: false } });
    };

    const addDiscussion = async (threadData) => {
        return await insertRow('discussions', {
            ...threadData,
            author: user?.username || 'Guest',
            authorAvatar: user?.avatar || null,
            votes: 0,
        });
    };

    const voteDiscussion = async (discussionId, direction) => {
        if (!user) return alert('Must be logged in');
        const directionValue = toVoteDirectionValue(direction);
        await upsertRow('discussion_votes', {
            discussion_id: discussionId, user_id: user.id, direction: directionValue,
        }, { onConflict: 'discussion_id,user_id' });
        const ups = await fetchRows('discussion_votes', { discussion_id: discussionId, direction: 1 });
        const downs = await fetchRows('discussion_votes', { discussion_id: discussionId, direction: -1 });
        await updateRow('discussions', discussionId, { votes: ups.length - downs.length });
        setVotedDiscussionIds((await fetchRows('discussion_votes', { user_id: user.id })).map(v => v.discussion_id));
        return { success: true };
    };

    // ─── Chat ───────────────────────────────────────────────────
    const getChatMessages = async (ideaId) => {
        return await fetchRows('chat_messages', { idea_id: ideaId }, { order: { column: 'created_at', ascending: true } });
    };

    const sendChatMessage = async (ideaId, text) => {
        if (!user) return null;
        return await insertRow('chat_messages', {
            idea_id: ideaId, text, author: user.username, authorAvatar: user.avatar,
        });
    };

    // ─── Red Team ───────────────────────────────────────────────
    const getRedTeamAnalyses = async (ideaId) => {
        const rows = await fetchRows('red_team_analyses', { idea_id: ideaId }, { order: { column: 'created_at', ascending: false } });
        return rows.map((row) => {
            const parsed = safeJsonParse(row.analysis, {});
            return {
                ...row,
                ...parsed,
                ideaId: ideaId,
                content: parsed?.content ?? String(row.analysis || ''),
                type: parsed?.type ?? 'critique',
                author: parsed?.author ?? 'Community',
                authorAvatar: parsed?.authorAvatar ?? null,
                timestamp: parsed?.timestamp ?? (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
                votes: row.votes ?? 0,
            };
        });
    };
    const addRedTeamAnalysis = async (data) => {
        const row = await insertRow('red_team_analyses', {
            idea_id: data.ideaId,
            votes: 0,
            analysis: data,
        });
        return row
            ? {
                ...row,
                ...data,
                content: data.content,
                type: data.type,
                author: data.author,
                authorAvatar: data.authorAvatar,
                timestamp: data.timestamp || Date.now(),
                votes: row.votes ?? 0,
            }
            : null;
    };
    const voteRedTeamAnalysis = async (ideaId, analysisId, direction) => {
        const a = await fetchSingle('red_team_analyses', { id: analysisId });
        if (!a) return null;
        return await updateRow('red_team_analyses', analysisId, { votes: (a.votes || 0) + (direction === 'up' ? 1 : -1) });
    };

    // ─── AMA ────────────────────────────────────────────────────
    const getAMAQuestions = async (ideaId) => {
        const rows = await fetchRows('ama_questions', { idea_id: ideaId }, { order: { column: 'created_at', ascending: false } });
        return rows.map((row) => {
            const parsedQuestion = safeJsonParse(row.question, null);
            const parsedAnswer = safeJsonParse(row.answer, null);
            return {
                ...row,
                question: parsedQuestion?.text ?? row.question ?? '',
                askerId: parsedQuestion?.askerId ?? null,
                askerName: parsedQuestion?.askerName ?? 'Community Member',
                askerAvatar: parsedQuestion?.askerAvatar ?? null,
                askerInfluence: parsedQuestion?.askerInfluence ?? 0,
                answer: parsedAnswer?.text ?? row.answer,
                timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            };
        });
    };
    const askAMAQuestion = async (data) => insertRow('ama_questions', {
        idea_id: data.ideaId,
        question: JSON.stringify({
            text: data.question,
            askerId: data.askerId || null,
            askerName: data.askerName || 'Community Member',
            askerAvatar: data.askerAvatar || null,
            askerInfluence: data.askerInfluence || 0,
        }),
    });
    const answerAMAQuestion = async (ideaId, questionId, answer, commitment) => updateRow('ama_questions', questionId, { answer, commitment });

    // ─── Resources ──────────────────────────────────────────────
    const getResources = async (ideaId) => {
        const rows = await fetchRows('resources', { idea_id: ideaId }, { order: { column: 'created_at', ascending: false } });
        return rows.map((row) => {
            const parsed = safeJsonParse(row.resource_data, {});
            return {
                ...row,
                ...parsed,
                ideaId: ideaId,
                status: row.status ?? parsed.status ?? 'pending',
            };
        });
    };
    const pledgeResource = async (data) => insertRow('resources', {
        idea_id: data.ideaId || data.idea_id,
        status: data.status || 'pending',
        resource_data: data,
    });
    const updateResourceStatus = async (ideaId, resourceId, status) => updateRow('resources', resourceId, { status });

    // ─── Applications ───────────────────────────────────────────
    const getApplications = async (ideaId) => {
        const rows = await fetchRows('applications', { idea_id: ideaId }, { order: { column: 'created_at', ascending: false } });
        return rows.map((row) => {
            const parsed = safeJsonParse(row.applicant, {});
            return {
                ...row,
                ...parsed,
                ideaId: ideaId,
                status: row.status ?? parsed.status ?? 'pending',
            };
        });
    };
    const applyForRole = async (data) => insertRow('applications', {
        idea_id: data.ideaId || data.idea_id,
        status: data.status || 'pending',
        applicant: data,
    });
    const updateApplicationStatus = async (ideaId, appId, status) => updateRow('applications', appId, { status });

    // ─── Groups ─────────────────────────────────────────────────
    const getGroups = async () => fetchRows('groups');
    const joinGroup = async (groupId) => {
        if (!user) return null;
        return await insertRow('group_members', { group_id: groupId, user_id: user.id });
    };
    const getUserGroup = async (userId) => {
        const membership = await fetchRows('group_members', { user_id: userId });
        if (membership.length === 0) return null;
        return await fetchSingle('groups', { id: membership[0].group_id });
    };

    // ─── Category Requests ──────────────────────────────────────
    const requestCategory = async (name) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const row = await insertRow('category_requests', { name, requested_by: user.username, status: 'pending' });
        return row ? { success: true } : { success: false, reason: 'Insert failed' };
    };
    const getCategoryRequests = async () => fetchRows('category_requests');
    const approveCategoryRequest = async (id) => updateRow('category_requests', id, { status: 'approved' });
    const rejectCategoryRequest = async (id) => updateRow('category_requests', id, { status: 'rejected' });

    // ─── Notifications ──────────────────────────────────────────
    const getNotifications = async () => {
        if (!user) return [];
        const rows = await fetchRows('notifications', { user_id: user.id }, { order: { column: 'created_at', ascending: false } });
        return rows.map((row) => ({ ...row, is_read: row.read ?? false }));
    };
    const addNotification = async (data) => insertRow('notifications', {
        user_id: data.user_id || user?.id,
        type: data.type || 'info',
        message: data.message || '',
        link: data.link || null,
        read: data.read ?? false,
    });
    const markNotificationRead = async (notifId) => updateRow('notifications', notifId, { read: true });
    const markAllNotificationsRead = async () => {
        if (!user) return null;
        const { error } = await supabase.from('notifications')
            .update({ read: true }).eq('user_id', user.id).eq('read', false);
        if (error) console.error('[Supabase] markAllRead:', error.message);
    };

    // ─── Forking ────────────────────────────────────────────────
    const forkIdea = async (ideaId) => {
        if (!user) return { success: false, error: 'Must be logged in' };
        const original = ideas.find(i => i.id === ideaId);
        if (!original) return { success: false, error: 'Idea not found' };
        const forkedIdea = await insertRow('ideas', {
            title: `[Fork] ${original.title}`,
            description: original.description || (original.body || '').slice(0, 200),
            category: String(original.type || original.category || 'invention').toLowerCase(),
            tags: Array.isArray(original.tags) ? original.tags : [],
            author_id: user.id,
            author_name: user.username,
            author_avatar: user.avatar || null,
            votes: 0,
            status: 'open',
            forked_from: ideaId,
            roles_needed: Array.isArray(original.peopleNeeded) ? original.peopleNeeded : [],
            resources_needed: Array.isArray(original.resourcesNeeded) ? original.resourcesNeeded : [],
            markdown_body: original.body || original.markdown_body || null,
        });
        if (!forkedIdea) return { success: false, error: 'Fork failed' };
        await refreshIdeas();
        const normalizedFork = normalizeIdea(forkedIdea);
        return { success: true, idea: normalizedFork, newIdea: normalizedFork };
    };
    const getForksOf = async (ideaId) => {
        const rows = await fetchRows('ideas', { forked_from: ideaId }, { order: { column: 'created_at', ascending: false } });
        return rows.map(normalizeIdea);
    };

    // ─── Economy ────────────────────────────────────────────────
    const tipUser = async (toId, amount) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        if ((user.influence || 0) < amount) return { success: false, reason: 'Not enough influence' };
        // Deduct from sender
        const updated = await updateRow('profiles', user.id, { influence: (user.influence || 0) - amount });
        // Add to receiver
        const target = await fetchProfile(toId);
        if (target) {
            await updateRow('profiles', toId, { influence: (target.influence || 0) + amount });
            addNotification({
                user_id: toId,
                type: 'tip',
                message: `${user.username} tipped you ${amount} influence!`,
                link: `/profile/${user.id}`
            });
        }
        if (updated) setUser(normalizeProfile(updated));
        return { success: true, newBalance: (user.influence || 0) - amount };
    };

    const stakeOnIdea = async (ideaId, amount) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        if ((user.cash || 0) < amount) return { success: false, reason: 'Insufficient funds' };
        await insertRow('stakes', { user_id: user.id, idea_id: ideaId, amount });

        const idea = ideas.find(i => i.id === ideaId);
        if (idea && idea.author_id !== user.id) {
            addNotification({
                user_id: idea.author_id,
                type: 'stake',
                message: `${user.username} staked $${amount} on your idea "${idea.title}"!`,
                link: `/idea/${ideaId}`
            });
        }
        const updated = await updateRow('profiles', user.id, { coins: (user.cash || 0) - amount });
        if (updated) setUser(normalizeProfile(updated));
        await refreshIdeas();
        return { success: true, newBalance: (user.cash || 0) - amount };
    };

    const boostIdea = async (ideaId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const boostCost = 5;
        if ((user.influence || 0) < boostCost) return { success: false, reason: 'Not enough influence' };
        const currentIdea = await fetchSingle('ideas', { id: ideaId });
        const boosters = Array.isArray(currentIdea?.boosters) ? currentIdea.boosters : [];
        const nextBoosters = boosters.includes(user.id) ? boosters : [...boosters, user.id];
        await updateRow('ideas', ideaId, { boosters: nextBoosters });
        const updated = await updateRow('profiles', user.id, { influence: (user.influence || 0) - boostCost });
        if (updated) setUser(normalizeProfile(updated));
        await refreshIdeas();
        return { success: true, user: updated };
    };

    // ─── Bounties ───────────────────────────────────────────────
    const mapBountyRow = (row) => {
        const parsed = safeJsonParse(row.bounty_data, {});
        return {
            ...row,
            ...parsed,
            creator: parsed.creatorName || row.creator,
            status: row.status ?? parsed.status ?? 'open',
        };
    };
    const getBounties = async (ideaId) => (await fetchRows('bounties', { idea_id: ideaId }, { order: { column: 'created_at', ascending: false } })).map(mapBountyRow);
    const getAllBounties = async () => (await fetchRows('bounties', {}, { order: { column: 'created_at', ascending: false } })).map(mapBountyRow);
    const addBounty = async (arg1, arg2) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const isTwoArg = typeof arg1 === 'string' || typeof arg1 === 'number';
        const ideaId = isTwoArg ? arg1 : (arg1?.idea_id || arg1?.ideaId);
        const bountyData = isTwoArg ? (arg2 || {}) : (arg1 || {});
        const row = await insertRow('bounties', {
            idea_id: ideaId,
            creator: user.id,
            status: bountyData.status || 'open',
            bounty_data: { ...bountyData, creatorName: user.username },
        });
        return row ? { success: true, bounty: mapBountyRow(row) } : { success: false, reason: 'Insert failed' };
    };
    const saveBounty = async (bountyId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const existing = await fetchRows('bounty_saves', { bounty_id: bountyId, user_id: user.id });
        if (existing.length > 0) {
            await deleteRows('bounty_saves', { bounty_id: bountyId, user_id: user.id });
        } else {
            await insertRow('bounty_saves', { bounty_id: bountyId, user_id: user.id });
        }
        setSavedBountyIds((await fetchRows('bounty_saves', { user_id: user.id })).map(v => v.bounty_id));
        return { success: true };
    };
    const claimBounty = async (...args) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const bountyId = args.length > 1 ? args[1] : args[0];
        return await updateRow('bounties', bountyId, { claimed_by: user.id, status: 'claimed' });
    };
    const completeBounty = async (...args) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const bountyId = args.length > 1 ? args[1] : args[0];
        return await updateRow('bounties', bountyId, { status: 'completed' });
    };

    const voteFeasibility = async (ideaId, userId, score) => {
        await upsertRow('feasibility_votes', {
            idea_id: ideaId, user_id: userId, score,
        }, { onConflict: 'idea_id,user_id' });

        // Calculate and update average on idea for performance (denormalization)
        const votes = await fetchRows('feasibility_votes', { idea_id: ideaId });
        const avg = Math.round(votes.reduce((acc, v) => acc + (v.score || 0), 0) / (votes.length || 1));
        await updateRow('ideas', ideaId, { feasibility: avg });

        await refreshIdeas();
        return { success: true };
    };

    // ─── Idea Comments ──────────────────────────────────────────
    const getIdeaComments = async (ideaId) => {
        // [MODIFIED] Fetch comments with author profile for avatars
        const { data, error } = await supabase
            .from('idea_comments')
            .select('*, profiles(username, avatar_url, tier)')
            .eq('idea_id', ideaId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[getIdeaComments] Failed:', error);
            return [];
        }

        return (data || []).map(c => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return {
                id: c.id,
                text: c.text,
                author: profile?.username || c.user_id, // Fallback to user_id if needed
                authorAvatar: profile?.avatar_url,      // [NEW] Real avatar
                authorTier: profile?.tier,
                votes: c.votes || 0,
                time: formatTime(c.created_at || new Date().toISOString()),
                replies: [],
                parentId: c.parent_id
            };
        });
    };

    const addIdeaComment = async (ideaId, text, parentId = null) => {
        if (!user) { alert('Login required'); return null; }

        // [MODIFIED] Ensure we store the simplified author string if the join fails
        const newCommentPayload = {
            idea_id: ideaId,
            text,
            author: user.username,        // Store username directly
            user_id: user.id,            // Store ID for RLS
            author_avatar: user.avatar,
            parent_id: parentId,
            votes: 0
        };

        const newComment = await insertRow('idea_comments', newCommentPayload);

        // Update comment count on idea
        if (newComment) {
            const current = ideas.find(i => i.id === ideaId);
            const nextCount = Number(current?.commentCount ?? 0) + 1;
            updateRow('ideas', ideaId, { comment_count: nextCount });

            // Optimistic update for UI speed
            setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, commentCount: nextCount } : i));

            // [MODIFIED] Return a structure that matches getIdeaComments format to prevent UI flicker/disappearance
            // The getIdeaComments mapper expects: { id, text, author, authorAvatar, ... }
            const optimisticComment = {
                ...newComment,
                author: user.username, // Force username
                authorAvatar: user.avatar,
                time: "Just now",
                replies: []
            };

            const idea = ideas.find(i => i.id === ideaId);
            if (idea && idea.author_id && idea.author_id !== user.id) {
                addNotification({
                    user_id: idea.author_id,
                    type: 'comment',
                    message: `${user.username} commented on "${idea.title}"`,
                    link: `/idea/${ideaId}`
                });
                updateInfluence(idea.author_id, 1);
            }
            return optimisticComment;
        }

        return null;
    };

    // ... lines 1363-1466 unchanged ...

    const incrementIdeaShares = async (ideaId) => {
        if (!ideaId) return;
        // Optimistic UI update
        setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, shares: (i.shares || 0) + 1 } : i));

        // Call RPC
        const { error } = await supabase.rpc('increment_idea_shares', { idea_id: ideaId });

        if (error) {
            console.warn('[incrementIdeaShares] RPC failed, falling back to manual update:', error.message);
            // Fallback: Fetch -> Increment -> Update
            const idea = await fetchSingle('ideas', { id: ideaId });
            if (idea) updateRow('ideas', ideaId, { shares: (idea.shares || 0) + 1 });
        } else {
            console.log('[incrementIdeaShares] Success via RPC');
        }
    };

    // ─── Context Value ──────────────────────────────────────────
    return (
        <AppContext.Provider value={{
            user, ideas, allUsers, login, register, logout, updateProfile, submitIdea, voteIdea, loading,
            authDiagnostics, clearAuthDiagnostics,
            uploadAvatar, uploadIdeaImage,
            currentPage, setCurrentPage,
            isFormOpen, setIsFormOpen, draftTitle, setDraftTitle, draftData, setDraftData,
            getDiscussions, addDiscussion, voteDiscussion, votedDiscussionIds, getChatMessages, sendChatMessage,
            newlyCreatedIdeaId, clearNewIdeaId, refreshIdeas,
            incrementIdeaViews, incrementIdeaShares,
            followUser, sendDirectMessage, getDirectMessages, openMessenger,
            showMessaging, setShowMessaging, messagingUserId, setMessagingUserId,
            getRedTeamAnalyses, addRedTeamAnalysis, voteRedTeamAnalysis,
            getAMAQuestions, askAMAQuestion, answerAMAQuestion,
            getResources, pledgeResource, updateResourceStatus,
            getApplications, applyForRole, updateApplicationStatus,
            getGroups, joinGroup, getUserGroup,
            getNotifications, addNotification, markNotificationRead, markAllNotificationsRead,
            forkIdea, getForksOf,
            tipUser, stakeOnIdea, boostIdea,
            getBounties, getAllBounties, addBounty, saveBounty, savedBountyIds, claimBounty, completeBounty,
            voteFeasibility,
            toggleMentorshipStatus, voteMentor,
            selectedProfileUserId, setSelectedProfileUserId, viewProfile,
            votedIdeaIds, downvotedIdeaIds,
            getIdeaComments, addIdeaComment, voteIdeaComment,
            guides, voteGuide, addGuide, getGuideComments, addGuideComment, votedGuideIds,
            developerMode, toggleDeveloperMode: () => setDeveloperMode(prev => !prev),
            requestCategory, getCategoryRequests, approveCategoryRequest, rejectCategoryRequest,
            getClans, joinClan, leaveClan,
            getCoinsGiven,
            getLeaderboard, getUserActivity,
            selectedIdea, setSelectedIdea,
            isAdmin,
            isDarkMode, toggleTheme, getFeaturedIdea,
            banUser, unbanUser, getSystemStats, backupDatabase, resetDatabase, seedDatabase,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
