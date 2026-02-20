import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchRows, fetchSingle, insertRow, updateRow, deleteRows, upsertRow, getLastSupabaseError } from './supabaseHelpers';
import { debugError, debugInfo, debugWarn } from '../debug/runtimeDebug';
import { buildIdeaLink } from '../utils/deepLinks';

const AppContext = createContext();
const USER_CACHE_KEY = 'woi_cached_user_v4'; // Bumped to force a clean profile/session refresh
const IDEAS_CACHE_KEY = 'woi_cached_ideas_v4'; // Bumped to force a clean ideas refresh
const IDEAS_CACHE_META_KEY = 'woi_cached_ideas_meta_v1';
const DISCUSSIONS_CACHE_KEY = 'woi_cached_discussions_v1';
const GUIDES_CACHE_KEY = 'woi_cached_guides_v1';
const ALL_USERS_CACHE_KEY = 'woi_cached_all_users_v3'; // Bumped to refresh People & profiles cache
const ALL_USERS_CACHE_META_KEY = 'woi_cached_all_users_meta_v3';
const VOTES_CACHE_KEY = 'woi_cached_votes'; // [NEW]
const USER_MAP_CACHE_KEY = 'woi_user_cache_v2';
const VIEWS_CACHE_KEY = 'woi_views_v1';
const LEGACY_CACHE_KEYS = [
    'woi_cached_user_v1',
    'woi_cached_user_v2',
    'woi_cached_user_v3',
    'woi_cached_ideas_v1',
    'woi_cached_ideas_v2',
    'woi_cached_ideas_v3',
    'woi_cached_all_users_v1',
    'woi_cached_all_users_v2',
    'woi_cached_all_users_meta_v1',
    'woi_cached_all_users_meta_v2',
    'woi_user_cache_v1'
];

const safeReadArrayCache = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const safeReadArrayCacheWithMaxAge = (key, metaKey, maxAgeMs) => {
    try {
        const rawMeta = localStorage.getItem(metaKey);
        if (rawMeta) {
            const parsedMeta = JSON.parse(rawMeta);
            const lastSyncedAt = Number(parsedMeta?.lastSyncedAt || 0);
            if (lastSyncedAt > 0 && Date.now() - lastSyncedAt > maxAgeMs) {
                localStorage.removeItem(key);
                localStorage.removeItem(metaKey);
                return [];
            }
        }
    } catch (_) { }
    return safeReadArrayCache(key);
};

const safeWriteCache = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { }
};

const safeRemoveCache = (...keys) => {
    try {
        keys.forEach((key) => localStorage.removeItem(key));
    } catch (_) { }
};

const PROFILE_ALLOWED_COLUMNS = new Set([
    'username', 'display_name', 'avatar_url', 'bio', 'expertise', 'skills', 'job',
    'border_color', 'influence', 'coins', 'tier', 'followers', 'following',
    'location', 'links', 'mentorship', 'badges', 'theme_preference', 'submissions'
]);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authDiagnostics, setAuthDiagnostics] = useState([]);

    // [CACHE] Warm start ideas
    const [ideas, setIdeas] = useState(() => safeReadArrayCacheWithMaxAge(
        IDEAS_CACHE_KEY,
        IDEAS_CACHE_META_KEY,
        15 * 60 * 1000
    ));

    // [CACHE] Warm start discussions
    const [discussions, setDiscussions] = useState(() => safeReadArrayCache(DISCUSSIONS_CACHE_KEY));
    const [guides, setGuides] = useState(() => safeReadArrayCache(GUIDES_CACHE_KEY));

    // Keep people directory DB-first to avoid stale profile modal data.
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
    const [selectedDiscussion, setSelectedDiscussion] = useState(null); // [NEW] Discussion Details View

    // [CACHE] Warm start votes (Sparks)
    const [votedIdeaIds, setVotedIdeaIds] = useState(() => safeReadArrayCache(VOTES_CACHE_KEY));

    const [downvotedIdeaIds, setDownvotedIdeaIds] = useState([]);
    const [votedCommentIds, setVotedCommentIds] = useState([]);
    const [downvotedCommentIds, setDownvotedCommentIds] = useState([]);
    const [savedIdeaIds, setSavedIdeaIds] = useState([]);
    const [votedDiscussionIds, setVotedDiscussionIds] = useState([]);
    const [votedGuideIds, setVotedGuideIds] = useState({});
    const [developerMode, setDeveloperMode] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('woi_theme');
            return saved ? JSON.parse(saved) : false;
        } catch (e) { return false; }
    });

    useEffect(() => {
        try {
            const marker = localStorage.getItem('woi_cache_migrated_v4');
            if (!marker) {
                LEGACY_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
                localStorage.setItem('woi_cache_migrated_v4', '1');
            }
        } catch (_) { }
    }, []);

    const viewProfile = (userId) => setSelectedProfileUserId(userId);
    const isAdmin = user?.role === 'admin';
    const isModerator = user?.role === 'moderator' || isAdmin;
    const canModerate = isAdmin || isModerator;
    const pushAuthDiagnostic = (..._args) => { };
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
    const toStringArray = (value) => {
        if (Array.isArray(value)) {
            return value.map((item) => String(item || '').trim()).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value
                .split(/[\n,]/g)
                .map((item) => item.trim())
                .filter(Boolean);
        }
        return [];
    };

    // ─── Profile Column Mapping (DB ↔ App) ────────────────────
    // DB uses snake_case: avatar_url, border_color, coins
    // App uses camelCase: avatar, borderColor, cash
    const getDefaultAvatar = (nameOrEmail = 'User') =>
        `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrEmail)}&background=random&color=fff`;

    const formatTime = (isoString) => {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

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
        display_name:
            fallback.display_name
            || fallback.username
            || authUser?.user_metadata?.display_name
            || authUser?.user_metadata?.username
            || (authUser?.email || fallback.email || '').split('@')[0]
            || 'User',
        username:
            fallback.username
            || fallback.display_name
            || authUser?.user_metadata?.username
            || authUser?.user_metadata?.display_name
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
        // [FIX] Sanitize username: strip email domain if present
        const rawUsername = p.username || p.user_metadata?.username || (p.email ? p.email.split('@')[0] : 'User');
        const safeUsername = rawUsername.includes('@') ? rawUsername.split('@')[0] : rawUsername;

        // [FIX] display_name is independent: use it if set, else fall back to cleaned username
        const rawDisplayName = p.display_name || p.user_metadata?.display_name || safeUsername;
        const safeDisplayName = rawDisplayName.includes('@') ? rawDisplayName.split('@')[0] : rawDisplayName;

        const normalizedSkills = toStringArray(p.skills);
        const normalizedExpertise = toStringArray(p.expertise);
        const effectiveExpertise = normalizedExpertise.length > 0 ? normalizedExpertise : normalizedSkills;
        const parsedLinksRaw = safeJsonParse(p.links, p.links);
        const normalizedLinks = Array.isArray(parsedLinksRaw)
            ? parsedLinksRaw
                .map((item) => {
                    if (!item) return null;
                    if (typeof item === 'string') {
                        const url = item.trim();
                        return url ? { url } : null;
                    }
                    if (typeof item === 'object') {
                        const url = String(item.url || item.href || '').trim();
                        if (!url) return null;
                        return { ...item, url };
                    }
                    return null;
                })
                .filter(Boolean)
            : [];
        const normalizedFollowersCount = Number(
            p.followers_count ?? p.followersCount ?? (Array.isArray(p.followers) ? p.followers.length : 0) ?? 0
        ) || 0;
        const normalizedFollowingCount = Number(
            p.following_count ?? p.followingCount ?? (Array.isArray(p.following) ? p.following.length : 0) ?? 0
        ) || 0;

        return {
            ...p,
            username: safeUsername,
            display_name: safeDisplayName,
            avatar: p.avatar_url || p.avatar || getDefaultAvatar(safeDisplayName),
            borderColor: p.border_color ?? p.borderColor ?? '#7d5fff',
            cash: p.coins ?? p.cash ?? 0,
            followersCount: normalizedFollowersCount,
            followingCount: normalizedFollowingCount,
            influence: Number(p.influence ?? 0) || 0,
            bio: p.bio || '',
            skills: normalizedSkills,
            expertise: effectiveExpertise,
            expertiseText: effectiveExpertise.join(', '),
            location: p.location || '',
            links: normalizedLinks,
            submissions: Number(p.submissions ?? 0) || 0,
        };
    };
    const normalizeIdea = (idea) => {
        if (!idea) return idea;
        const normalizedType = String(idea.type ?? idea.category ?? 'invention').toLowerCase();
        const parsedRoles = Array.isArray(idea.roles_needed) ? idea.roles_needed : (idea.peopleNeeded || []);
        const parsedResources = Array.isArray(idea.resources_needed) ? idea.resources_needed : (idea.resourcesNeeded || []);
        const ideaData = safeJsonParse(idea.idea_data, {});
        return {
            ...idea,
            type: normalizedType,
            body: idea.body ?? idea.markdown_body ?? '',
            solution: idea.solution ?? idea.markdown_body ?? '',
            description: idea.description ?? '',
            tags: idea.tags ?? [],
            // [FIX] Strictly flatten author: if object, pull username/name, else use string, else 'User'
            author: (typeof idea.author === 'object' && idea.author !== null)
                ? (idea.author.username || idea.author.display_name || idea.author_name || 'User')
                : (idea.author || idea.author_name || 'User'),
            timestamp: idea.timestamp ?? (idea.created_at ? new Date(idea.created_at).getTime() : Date.now()),
            commentCount: idea.commentCount ?? idea.comment_count ?? 0,
            views: idea.views ?? idea.view_count ?? 0,
            authorAvatar: idea.authorAvatar ?? idea.author_avatar ?? null,
            parentIdeaId: idea.parentIdeaId ?? idea.forked_from ?? null,
            forkedFrom: idea.forkedFrom ?? idea.forked_from ?? null,
            forks: idea.forks ?? 0,
            shares: idea.shares ?? 0,
            titleImage: idea.titleImage ?? idea.title_image ?? ideaData?.titleImage ?? null,
            thumbnail: idea.thumbnail ?? idea.thumbnail_url ?? ideaData?.thumbnail ?? ideaData?.titleImage ?? null,
            notes: idea.notes ?? ideaData?.notes ?? '',
            teamDescription: idea.teamDescription ?? ideaData?.teamDescription ?? '',
            isLocal: idea.isLocal ?? ideaData?.isLocal ?? Boolean(idea.city || idea.lat || idea.lng),
            location: idea.location ?? ideaData?.location ?? { city: idea.city ?? '', lat: idea.lat ?? null, lng: idea.lng ?? null },
            categories: Array.isArray(idea.categories) ? idea.categories : (Array.isArray(ideaData?.categories) ? ideaData.categories : [normalizedType]),
            evolutionType: idea.evolutionType ?? ideaData?.evolutionType ?? null,
            mutationNote: idea.mutationNote ?? ideaData?.mutationNote ?? null,
            inheritanceMap: idea.inheritanceMap ?? ideaData?.inheritanceMap ?? null,
            peopleNeeded: parsedRoles,
            resourcesNeeded: parsedResources
        };
    };
    const getAuthorLabel = (profileLike) => {
        const p = profileLike || {};
        return p.display_name || p.username || 'User';
    };

    const denormalizeProfile = (updates) => {
        const mapped = { ...updates };
        if ('avatar' in mapped) { mapped.avatar_url = mapped.avatar; delete mapped.avatar; }
        if ('borderColor' in mapped) { mapped.border_color = mapped.borderColor; delete mapped.borderColor; }
        if ('cash' in mapped) { mapped.coins = mapped.cash; delete mapped.cash; }
        if ('skills' in mapped) {
            mapped.skills = toStringArray(mapped.skills);
        }
        if ('expertiseText' in mapped && !('skills' in mapped)) {
            mapped.skills = toStringArray(mapped.expertiseText);
        }
        if ('expertise' in mapped && !('skills' in mapped)) {
            mapped.skills = toStringArray(mapped.expertise);
        }
        delete mapped.expertiseText;
        delete mapped.expertise;
        return Object.fromEntries(
            Object.entries(mapped).filter(([key, value]) => PROFILE_ALLOWED_COLUMNS.has(key) && value !== undefined)
        );
    };

    // ─── Internal Helpers ───────────────────────────────────────
    // [CACHE] Central User Cache & Request Deduplication
    const userCache = React.useRef(new Map());
    const userPromises = React.useRef(new Map());

    // Load cache from local storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(USER_MAP_CACHE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([k, v]) => userCache.current.set(k, v));
            }
        } catch (e) { }
    }, []);

    const saveUserCache = () => {
        try {
            const obj = Object.fromEntries(userCache.current);
            localStorage.setItem(USER_MAP_CACHE_KEY, JSON.stringify(obj));
        } catch (e) { }
    };

    const getUser = async (userId) => {
        if (!userId) return null;

        // 1. Check Cache
        if (userCache.current.has(userId)) {
            return userCache.current.get(userId);
        }

        // 2. Check Context State (Fallback to allUsers if loaded)
        // const existing = allUsers.find(u => u.id === userId);
        // if (existing) {
        //    userCache.current.set(userId, existing);
        //    return existing;
        // }

        // 3. Deduplicate Requests
        if (userPromises.current.has(userId)) {
            return userPromises.current.get(userId);
        }

        // 4. Fetch
        const promise = (async () => {
            try {
                const raw = await fetchSingle('profiles', { id: userId });
                if (raw) {
                    const normalized = normalizeProfile(raw);
                    userCache.current.set(userId, normalized);
                    saveUserCache();
                    return normalized;
                }
            } catch (err) {
                console.warn(`[getUser] Failed to load ${userId}`, err);
            } finally {
                userPromises.current.delete(userId);
            }
            return null;
        })();

        userPromises.current.set(userId, promise);
        return promise;
    };

    const fetchProfile = async (userId) => getUser(userId); // Alias for compatibility
    const getProfileFresh = async (userId) => {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error || !data) return null;
            const normalized = normalizeProfile(data);
            userCache.current.set(userId, normalized);
            saveUserCache();
            setAllUsers((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const idx = list.findIndex((u) => u?.id === userId);
                if (idx === -1) return [...list, normalized];
                const next = [...list];
                next[idx] = normalized;
                return next;
            });
            if (user?.id === userId) {
                setUser((prev) => {
                    const preservedFollowing = Array.isArray(prev?.following) ? prev.following : [];
                    return { ...normalized, following: preservedFollowing };
                });
            }
            return normalized;
        } catch (_) {
            return null;
        }
    };

    const ensureProfileForAuthUser = async (authUser, fallback = {}) => {
        if (!authUser?.id) return null;
        pushAuthDiagnostic('profile.ensure', 'start', 'Ensuring profile row exists for auth user', { userId: authUser.id });

        // [FIX] Direct lookup to check specific error codes.
        // fetchSingle swallows errors, which caused us to assume "not found" on network errors, leading to overwrite.
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (data) {
            pushAuthDiagnostic('profile.ensure', 'ok', 'Profile found');
            console.log('[ensureProfile] RAW DB row:', JSON.stringify(data, null, 2));
            const normalized = normalizeProfile(data);
            console.log('[ensureProfile] NORMALIZED:', { display_name: normalized.display_name, username: normalized.username, avatar: normalized.avatar, avatar_url: data.avatar_url, influence: normalized.influence });
            return normalized;
        }

        // If error is anything OTHER than "Row not found" (PGRST116), it is likely a connection issue.
        // DO NOT overwrite profile in this case. Return null to fail safely (user might need to refresh).
        if (error && error.code !== 'PGRST116') {
            console.error('[ensureProfileForAuthUser] Fetch failed with non-404 error (aborting overwrite):', error);
            pushAuthDiagnostic('profile.ensure', 'error', 'Profile fetch failed (presumed network/db issue)', error);
            return null;
        }

        console.log('[ensureProfileForAuthUser] Profile definitively not found (PGRST116). Creating default...');

        const base = {
            id: authUser.id,
            username: authUser.user_metadata?.username || authUser.user_metadata?.display_name || fallback.username || fallback.display_name || (authUser.email || fallback.email || 'User').split('@')[0] || 'User',
            display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.username || fallback.display_name || fallback.username || (authUser.email || fallback.email || 'User').split('@')[0] || 'User',
            avatar_url: authUser.user_metadata?.avatar_url || fallback.avatar || getDefaultAvatar(authUser.user_metadata?.display_name || authUser.user_metadata?.username || fallback.display_name || fallback.username || authUser.email || 'User')
        };

        const { data: created, error: createError } = await supabase
            .from('profiles')
            .upsert(base, { onConflict: 'id', ignoreDuplicates: true })
            .select()
            .single();

        if (createError) {
            console.error('[ensureProfileForAuthUser] Creation failed:', createError);
            return null;
        }

        pushAuthDiagnostic('profile.ensure', created ? 'ok' : 'warn', created ? 'Profile created' : 'Profile fallback used');
        return normalizeProfile(created || base);
    };

    // ─── Storage Uploads ────────────────────────────────────────
    const uploadAvatar = async (file, userId) => {
        if (!file || !userId) {
            const message = 'Missing avatar file or user id';
            console.warn('[Storage] uploadAvatar:', message, { hasFile: !!file, userId });
            return { success: false, reason: message, error: null };
        }
        const supportedTypes = new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/avif'
        ]);
        const lowerType = String(file.type || '').toLowerCase();
        const lowerName = String(file.name || '').toLowerCase();
        if (!supportedTypes.has(lowerType) || lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
            const message = 'Unsupported image format. Please upload JPG, PNG, WEBP, GIF, or AVIF.';
            console.warn('[Storage] uploadAvatar:', message, { fileType: file.type, fileName: file.name });
            return { success: false, reason: message, error: null };
        }

        // Verify we have a valid session before uploading. Try one refresh before failing.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
            try {
                await supabase.auth.refreshSession();
            } catch (_) { }
        }
        const { data: finalSession } = await supabase.auth.getSession();
        if (!finalSession?.session) {
            const message = 'No active auth session for storage upload';
            console.error('[Storage] uploadAvatar:', message);
            pushAuthDiagnostic('avatar.upload', 'error', message);
            return { success: false, reason: message, error: null };
        }

        const extRaw = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'jpg';
        const ext = String(extRaw || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const filePath = `${userId}/avatar_${Date.now()}.${ext}`;
        const bucketCandidates = ['avatars', 'avatar', 'profile-images', 'profile_images'];
        const errors = [];

        for (const bucket of bucketCandidates) {
            console.log('[Storage] Uploading avatar:', { bucket, filePath, fileSize: file.size, fileType: file.type });
            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
                upsert: false,
                contentType: file.type || 'image/jpeg'
            });

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
                const publicUrl = urlData?.publicUrl || null;
                console.log('[Storage] Avatar uploaded OK, public URL:', publicUrl);
                pushAuthDiagnostic('avatar.upload', 'ok', 'Avatar uploaded', { bucket, filePath, publicUrl });
                return { success: true, url: publicUrl, bucket, filePath };
            }

            // Retry on conflict by enabling upsert on the same path.
            if (String(uploadError.statusCode || '') === '409') {
                const { error: upsertError } = await supabase.storage.from(bucket).upload(filePath, file, {
                    upsert: true,
                    contentType: file.type || 'image/jpeg'
                });
                if (!upsertError) {
                    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
                    const publicUrl = urlData?.publicUrl || null;
                    pushAuthDiagnostic('avatar.upload', 'ok', 'Avatar uploaded after upsert retry', { bucket, filePath, publicUrl });
                    return { success: true, url: publicUrl, bucket, filePath };
                }
                errors.push({ bucket, ...upsertError });
                continue;
            }

            errors.push({ bucket, ...uploadError });
            console.warn('[Storage] avatar upload attempt failed', {
                bucket,
                message: uploadError.message,
                statusCode: uploadError.statusCode,
                code: uploadError.code
            });
            // Continue through all candidate buckets for policy mismatch / missing bucket / stale bucket setup.
            continue;
        }

        const lastError = errors[errors.length - 1] || null;
        const reason = lastError?.message || 'Unknown storage error';
        console.error('[Storage] uploadAvatar FAILED:', {
            attempts: errors,
            message: lastError?.message,
            statusCode: lastError?.statusCode,
            code: lastError?.code,
            details: lastError?.details
        });
        pushAuthDiagnostic(
            'avatar.upload',
            'error',
            `Upload failed: ${reason} (${lastError?.statusCode || 'unknown'})`,
            lastError
        );
        return { success: false, reason, error: lastError, attempts: errors };
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
            pushAuthDiagnostic('data.ideas', 'warn', 'Joined ideas fetch failed, attempting fallback', error);

            // Fallback: load ideas without profile join so feed does not stay blank.
            const fallbackRows = await fetchRows('ideas', {}, { order: { column: 'created_at', ascending: false } });
            const fallbackIdeas = (fallbackRows || []).map((row) => normalizeIdea({
                ...row,
                author: row.author_name || 'User',
                authorAvatar: row.author_avatar || null
            }));
            setIdeas(fallbackIdeas);
            safeWriteCache(IDEAS_CACHE_KEY, fallbackIdeas);
            localStorage.setItem(IDEAS_CACHE_META_KEY, JSON.stringify({ lastSyncedAt: Date.now() }));
            debugInfo('data.refresh', 'Ideas refreshed via fallback query', { count: fallbackIdeas.length });
            return fallbackIdeas;
        }

        console.log('[refreshIdeas] Fetched count:', data?.length || 0);

        const rows = data || [];
        const forkCounts = rows.reduce((acc, row) => {
            const parentId = row?.forked_from;
            if (!parentId) return acc;
            acc[parentId] = (acc[parentId] || 0) + 1;
            return acc;
        }, {});

        // Flatten data for UI
        const finalIdeas = rows.map(row => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

            // [CACHE] Pre-load author into cache if we have it here
            if (profile && profile.id && row.author_id) {
                // Determine display name safely
                const dName = profile.display_name || profile.username || (profile.email ? profile.email.split('@')[0] : 'User');

                const cachedProfile = {
                    id: row.author_id,
                    username: dName,
                    avatar: profile.avatar_url,
                    points: profile.points || 0,
                    ...profile
                };

                // Only update cache if new (simple check)
                if (!userCache.current.has(row.author_id)) {
                    userCache.current.set(row.author_id, normalizeProfile(cachedProfile));
                }
            }

            return normalizeIdea({
                ...row,
                // Still return flat strings for backward compat, but components should use getUser(idea.author_id)
                author: (profile?.username || row.author_name || 'User'),
                authorAvatar: profile?.avatar_url,
                authorTier: profile?.tier,
                forks: forkCounts[row.id] || 0
            });
        }).filter((idea) => idea && idea.id);

        saveUserCache(); // Persist any new profiles found
        setIdeas(finalIdeas);

        // [CACHE] Update local storage (Always update to ensure deletions are reflected)
        safeWriteCache(IDEAS_CACHE_KEY, finalIdeas);
        localStorage.setItem(IDEAS_CACHE_META_KEY, JSON.stringify({ lastSyncedAt: Date.now() }));

        debugInfo('data.refresh', 'Ideas refreshed', { count: (data || []).length });
    };


    const refreshDiscussions = async () => {
        // [MODIFIED] Join profiles for accurate author info
        const { data, error } = await supabase
            .from('discussions')
            .select('*, profiles(username, avatar_url, tier)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[refreshDiscussions] Error:', error);
            // Fallback
            const fallbackData = await fetchRows('discussions', {}, { order: { column: 'created_at', ascending: false } });
            const fallbackRows = fallbackData || [];
            setDiscussions(fallbackRows);
            safeWriteCache(DISCUSSIONS_CACHE_KEY, fallbackRows);
            return;
        }

        const mapped = (data || []).map(d => {
            const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
            return {
                ...d,
                author: profile?.username || d.author || 'User',
                authorAvatar: profile?.avatar_url || d.author_avatar,
                authorTier: profile?.tier
            };
        });

        setDiscussions(mapped);
        safeWriteCache(DISCUSSIONS_CACHE_KEY, mapped);
    };
    const refreshGuides = async () => {
        // [MODIFIED] Fetch guides with joined profile data for accurate author info
        const { data, error } = await supabase
            .from('guides')
            .select('*, profiles(username, avatar_url, tier)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[refreshGuides] Error:', error);
            // Fallback to basic fetch if join fails (e.g. RLS issue) or table missing
            const fallbackData = await fetchRows('guides', {}, { order: { column: 'created_at', ascending: false } });
            const fallbackGuides = (fallbackData || []).map(g => ({
                id: g.id,
                title: g.title,
                category: g.category,
                author: g.author_name || 'Unknown',
                votes: g.votes || 0,
                views: g.views || 0,
                timestamp: g.created_at,
                snippet: g.snippet || (g.content ? g.content.slice(0, 180) : ''),
                content: g.content,
                comments: []
            }));
            setGuides(fallbackGuides);
            safeWriteCache(GUIDES_CACHE_KEY, fallbackGuides);
            return;
        }

        const mappedGuides = (data || []).map(g => {
            const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
            return {
                id: g.id,
                title: g.title,
                category: g.category,
                author: profile?.username || g.author_name || 'Unknown',
                authorAvatar: profile?.avatar_url,
                authorTier: profile?.tier,
                votes: g.votes || 0,
                views: g.views || 0,
                timestamp: g.created_at,
                snippet: g.snippet || (g.content ? g.content.slice(0, 180) : ''),
                content: g.content,
                comments: []
            };
        });
        setGuides(mappedGuides);
        safeWriteCache(GUIDES_CACHE_KEY, mappedGuides);
        debugInfo('data.refresh', 'Guides refreshed', { count: (data || []).length });
    };

    const addGuide = async (guideData) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        console.log('[addGuide] Submitting:', guideData);

        const row = await insertRow('guides', {
            ...guideData,
            author_id: user.id,
            author_name: getAuthorLabel(user),
            votes: 0
        });

        if (row) {
            console.log('[addGuide] Success:', row);
            await refreshGuides();
            return { success: true, guide: row };
        }

        const error = getLastSupabaseError();
        console.error('[addGuide] Insert failed:', error);
        return { success: false, reason: error?.message || 'Insert failed' };
    };

    const voteGuide = async (guideId, direction = 'up') => {
        if (!user) return alert('Must be logged in');
        const directionValue = toVoteDirectionValue(direction);

        await upsertRow('guide_votes', {
            guide_id: guideId,
            user_id: user.id,
            direction: directionValue
        }, { onConflict: 'guide_id,user_id' });

        const ups = await fetchRows('guide_votes', { guide_id: guideId, direction: 1 });
        const downs = await fetchRows('guide_votes', { guide_id: guideId, direction: -1 });
        await updateRow('guides', guideId, { votes: (ups.length || 0) - (downs.length || 0) });

        // Update local state
        setVotedGuideIds(prev => ({ ...prev, [guideId]: direction }));
        await refreshGuides();
        return { success: true };
    };

    const getGuideComments = async (guideId) => {
        const rows = await fetchRows('guide_comments', { guide_id: guideId }, { order: { column: 'created_at', ascending: true } });
        return rows.map(c => ({
            ...c,
            author: c.author || 'User',
            authorAvatar: c.author_avatar || null,
            time: formatTime(c.created_at)
        }));
    };

    const addGuideComment = async (guideId, text) => {
        if (!user) return null;
        const row = await insertRow('guide_comments', {
            guide_id: guideId,
            text,
            author: getAuthorLabel(user),
            author_avatar: user.avatar
        });
        return row ? { ...row, time: 'Just now' } : null;
    };
    const refreshUsers = async ({ force = false, minIntervalMs = 90_000 } = {}) => {
        const now = Date.now();
        let lastSyncedAt = 0;
        try {
            const rawMeta = localStorage.getItem(ALL_USERS_CACHE_META_KEY);
            const parsedMeta = rawMeta ? JSON.parse(rawMeta) : null;
            lastSyncedAt = Number(parsedMeta?.lastSyncedAt || 0) || 0;
        } catch (_) { }

        const hasWarmUsers = Array.isArray(allUsers) && allUsers.length > 0;
        if (!force && hasWarmUsers && lastSyncedAt > 0 && (now - lastSyncedAt) < minIntervalMs) {
            return allUsers;
        }

        const data = await fetchRows('profiles', {}, { order: { column: 'updated_at', ascending: false } });
        const normalized = (data || [])
            .map(normalizeProfile)
            .filter((u) => u && u.id && (u.username || u.display_name));

        if (normalized.length === 0 && hasWarmUsers) {
            return allUsers;
        }

        setAllUsers(normalized);
        try {
            userCache.current.clear();
            normalized.forEach((u) => {
                if (u?.id) userCache.current.set(u.id, u);
            });
            saveUserCache();
        } catch (_) { }
        try {
            safeWriteCache(ALL_USERS_CACHE_KEY, normalized);
            localStorage.setItem(ALL_USERS_CACHE_META_KEY, JSON.stringify({ lastSyncedAt: now }));
        } catch (e) { console.warn('User cache save failed', e); }
        debugInfo('data.refresh', 'Users refreshed', { count: normalized.length, force, minIntervalMs });
        return normalized;
    };

    const updateInfluence = async (userId, delta) => {
        if (!userId || delta === 0) return;

        // Try RPC first (Atomic)
        const { error } = await supabase.rpc('increment_influence', { user_id: userId, delta });

        if (error) {
            console.warn('[updateInfluence] RPC failed, falling back to manual update:', error.message);
            // Fallback: Read-Modify-Write (Susceptible to races, but better than nothing)
            const profile = await fetchProfile(userId);
            if (profile) {
                await updateRow('profiles', userId, { influence: (profile.influence || 0) + delta });
            }
        }

        // Keep local state in sync so profile stats update immediately.
        setAllUsers(prev => prev.map((u) => (
            u.id === userId ? { ...u, influence: (Number(u.influence || 0) + delta) } : u
        )));
        if (user?.id === userId) {
            setUser(prev => (
                prev ? { ...prev, influence: (Number(prev.influence || 0) + delta) } : prev
            ));
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
        const [up, down, savedIdeas, disc, gv, c_up, c_down] = await Promise.all([
            fetchRows('idea_votes', { user_id: userId, direction: 1 }),
            fetchRows('idea_votes', { user_id: userId, direction: -1 }),
            fetchRows('saved_ideas', { user_id: userId }),
            fetchRows('discussion_votes', { user_id: userId }),
            fetchRows('guide_votes', { user_id: userId }),
            // [NEW] Comment Votes
            fetchRows('idea_comment_votes', { user_id: userId, direction: 1 }),
            fetchRows('idea_comment_votes', { user_id: userId, direction: -1 })
        ]);
        const upIds = up.map(v => v.idea_id);
        setVotedIdeaIds(upIds);
        try {
            safeWriteCache(VOTES_CACHE_KEY, upIds);
        } catch (e) { console.warn('Vote cache save failed', e); }

        setDownvotedIdeaIds(down.map(v => v.idea_id));
        setSavedIdeaIds(savedIdeas.map(v => v.idea_id));
        setVotedDiscussionIds(disc.map(v => v.discussion_id));
        const gMap = {};
        gv.forEach(v => { gMap[v.guide_id] = fromVoteDirectionValue(v.direction); });
        setVotedGuideIds(gMap);

        // [NEW] Set Comment Votes
        setVotedCommentIds(c_up ? c_up.map(v => v.comment_id) : []);
        setDownvotedCommentIds(c_down ? c_down.map(v => v.comment_id) : []);
    };

    // ─── Init & Auth Listener ───────────────────────────────────
    useEffect(() => {
        debugInfo('app-context', 'AppProvider mounted');
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
                    if (session?.user) {
                        // Extra guard: if account was deleted/revoked, clear stale local session/cache.
                        const { data: verified, error: verifyErr } = await supabase.auth.getUser();
                        if (verifyErr || !verified?.user?.id) {
                            session = null;
                        }
                    }
                } catch (sessionErr) {
                    pushAuthDiagnostic('init', 'warn', sessionErr?.message || 'Session lookup failed; continuing');
                }

                if (session?.user) {
                    pushAuthDiagnostic('init', 'ok', 'Existing session detected', { userId: session.user.id });
                    const fallback = buildAuthFallbackProfile(session.user);
                    // Set temporary fallback only if we don't already have this signed-in user in state.
                    setUser((prev) => {
                        if (prev?.id === session.user.id) return prev;
                        return fallback;
                    });
                    // Wrap profile verification in timeout to prevent hanging the entire app if DB is slow/unreachable
                    const profile = await withSoftTimeout(ensureProfileForAuthUser(session.user), 4000, null);
                    if (profile) {
                        if (profile.is_banned) {
                            pushAuthDiagnostic('init', 'warn', 'Signed-in account is banned; forcing sign out');
                            await supabase.auth.signOut();
                            setUser(null);
                            setCurrentPage('home');
                            return;
                        }
                        // Tolerate missing tables for auxiliary data
                        try {
                            const following = await loadFollowingIds(profile.id);
                            profile.following = following;
                        } catch (err) {
                            console.warn('[Init] loadFollowingIds failed (table missing?):', err);
                        }

                        if (profile) {
                            console.log('[Init] Setting user from DB profile:', { display_name: profile.display_name, username: profile.username, avatar: profile.avatar?.substring(0, 60), influence: profile.influence });
                            setUser(profile);
                            try {
                                await loadUserVotes(profile.id);
                            } catch (err) {
                                console.warn('[Init] loadUserVotes failed (table missing?):', err);
                            }
                        } else {
                            // If ensureProfile returns null (e.g. error), fall back but don't overwrite if we have a valid cached user
                            console.warn('[Init] Profile fetch failed, using fallback');
                            // [FIX] Avoid stale closure checks; preserve existing user for same id.
                            setUser((prev) => {
                                if (prev?.id === session.user.id) return prev;
                                return fallback;
                            });
                        }
                    } else {
                        pushAuthDiagnostic('init', 'warn', 'Profile fetch timed out or failed; using collision fallback');
                    }
                } else {
                    pushAuthDiagnostic('init', 'info', 'No active session found - Clearing any stale cache');
                    setUser(null);
                    setVotedIdeaIds([]);
                    setDownvotedIdeaIds([]);
                    setSavedIdeaIds([]);
                    setVotedDiscussionIds([]);
                    setVotedGuideIds({});
                    setVotedCommentIds([]);
                    setDownvotedCommentIds([]);
                    try {
                        safeRemoveCache(USER_CACHE_KEY, VOTES_CACHE_KEY, USER_MAP_CACHE_KEY, VIEWS_CACHE_KEY);
                        userCache.current.clear();
                    } catch (_) { }
                }

                // Parallel fetch with individual timeouts - Increased to 15s
                console.time('fetch_all');
                await Promise.allSettled([
                    withSoftTimeout(refreshIdeas(), 15000, 'IDEAS_TIMEOUT').then(r => console.log('Ideas result:', r)).catch(e => console.warn('Ideas init failed', e)),
                    withSoftTimeout(refreshDiscussions(), 10000, 'DISCUSSIONS_TIMEOUT').then(r => console.log('Discussions result:', r)).catch(e => console.warn('Discussions init failed', e)),
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

                    // [FIX] Don't set fallback immediately if we already have a valid profile for this user
                    // This prevents "flicker" or overwriting rich data with basic data on refresh
                    // Only set fallback if no matching user is already loaded.
                    setUser((prev) => {
                        if (prev?.id === session.user.id) return prev;
                        return fallbackProfile;
                    });

                    const hydratedProfile = await withSoftTimeout(
                        ensureProfileForAuthUser(session.user),
                        7000,
                        fallbackProfile
                    );

                    if (hydratedProfile) {
                        if (hydratedProfile.is_banned) {
                            pushAuthDiagnostic('auth.state', 'warn', 'Banned account attempted sign-in');
                            await supabase.auth.signOut();
                            setUser(null);
                            setCurrentPage('home');
                            return;
                        }
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
                    setVotedDiscussionIds([]);
                    setSavedIdeaIds([]);
                    setVotedGuideIds({});
                    setVotedCommentIds([]);
                    setDownvotedCommentIds([]);

                    // Clear user/session-specific caches only. Keep public content caches warm.
                    try {
                        safeRemoveCache(USER_CACHE_KEY, VOTES_CACHE_KEY, USER_MAP_CACHE_KEY, VIEWS_CACHE_KEY);
                        userCache.current.clear(); // Clear in-memory cache
                    } catch (_) { }
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
            if (user?.id) safeWriteCache(USER_CACHE_KEY, user);
            else safeRemoveCache(USER_CACHE_KEY);
        } catch (_) { }
    }, [user]);

    useEffect(() => {
        safeWriteCache(IDEAS_CACHE_KEY, Array.isArray(ideas) ? ideas : []);
        try {
            localStorage.setItem(IDEAS_CACHE_META_KEY, JSON.stringify({ lastSyncedAt: Date.now() }));
        } catch (_) { }
    }, [ideas]);

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
            const result = await updateProfile({ theme_preference: newMode ? 'dark' : 'light' });
            if (!result?.success) {
                const reverted = !newMode;
                setIsDarkMode(reverted);
                localStorage.setItem('woi_theme', JSON.stringify(reverted));
            }
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

        // Wait for profile to be sure we have the latest data
        let profile = await withSoftTimeout(ensureProfileForAuthUser(data.user, { email }), 7000);

        // If timeout or failure, fallback to basic auth data
        if (!profile) {
            console.warn('[Login] Profile fetch timed out or failed, using fallback.');
            profile = buildAuthFallbackProfile(data.user, { email });
            pushAuthDiagnostic('login.hydrate', 'warn', 'Profile hydration timed out; using fallback');
        } else {
            pushAuthDiagnostic('login.hydrate', 'ok', 'Profile loaded successfully');
            // Load extra data in background to not block too long
            loadUserVotes(profile.id).catch(() => { });
        }

        // Ensure follower data is attached if possible
        let following = [];
        try {
            following = await loadFollowingIds(profile.id);
        } catch (e) { console.warn('Failed to load following list', e); }

        if (profile?.is_banned) {
            await supabase.auth.signOut();
            setUser(null);
            return { success: false, reason: 'This account has been suspended.' };
        }

        const finalUser = { ...profile, following };
        setUser(finalUser);
        setCurrentPage('home');

        return { success: true, user: finalUser };
    };

    const register = async ({ email, password, displayName }) => {
        try {
            const normalizedDisplayName = (displayName || '').trim() || (email || '').split('@')[0] || 'User';
            pushAuthDiagnostic('register', 'start', 'Signup attempt started', { email, displayName: normalizedDisplayName });
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: normalizedDisplayName,
                        display_name: normalizedDisplayName,
                        avatar_url: null
                    }
                }
            });

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
                console.error('[Register] ❌ NO SESSION — email confirmation required.');
                pushAuthDiagnostic('register', 'info', 'Signup created user but requires email confirmation');
                return {
                    success: false,
                    needsEmailConfirmation: true,
                    reason: 'Account created. Please verify your email, then log in.'
                };
            }

            console.log('[Register] ✅ Session obtained. Setting up profile...');

            // Ensure the session is active
            await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });

            // Try RPC to ensure display_name and username are set correctly
            try {
                const { data: rpcResult, error: rpcError } = await supabase.rpc('setup_profile', {
                    p_username: normalizedDisplayName,
                    p_display_name: normalizedDisplayName
                });
                if (rpcError) {
                    console.warn('[Register] RPC setup_profile failed (non-fatal):', rpcError.message);
                } else {
                    console.log('[Register] Profile set via RPC:', rpcResult?.username);
                }
            } catch (rpcErr) {
                console.warn('[Register] RPC call threw (non-fatal):', rpcErr);
            }

            // Fetch the profile that the trigger created (+ any RPC updates)
            const profile = await withSoftTimeout(ensureProfileForAuthUser(data.user), 4000, null);
            const finalUser = profile ? normalizeProfile(profile) : normalizeProfile({
                id: data.user.id,
                email,
                username: normalizedDisplayName,
                display_name: normalizedDisplayName,
                avatar_url: getDefaultAvatar(normalizedDisplayName),
            });

            setUser(finalUser);
            setAllUsers(prev => {
                const idx = prev.findIndex(u => u.id === finalUser.id);
                if (idx === -1) return [...prev, finalUser];
                const next = [...prev];
                next[idx] = finalUser;
                return next;
            });

            setCurrentPage('home');
            pushAuthDiagnostic('register', 'ok', 'Registration complete', { userId: finalUser.id });
            return { success: true, user: finalUser };

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
        const sanitizedInput = Object.fromEntries(
            Object.entries({ ...(updatedData || {}) }).filter(([, value]) => value !== undefined)
        );
        const dbData = denormalizeProfile(sanitizedInput);
        const extractMissingColumn = (err) => {
            const message = String(err?.message || '');
            const detail = String(err?.details || '');
            const combined = `${message} ${detail}`;
            const m1 = combined.match(/column\s+'?([a-zA-Z0-9_]+)'?/i);
            if (m1?.[1]) return m1[1];
            const m2 = combined.match(/'([a-zA-Z0-9_]+)'\s+column/i);
            if (m2?.[1]) return m2[1];
            return null;
        };
        const updateProfileRowWithSchemaFallback = async (payload) => {
            let candidate = { ...payload };
            for (let i = 0; i < 4; i += 1) {
                const row = await updateRow('profiles', user.id, candidate);
                if (row) return row;
                const err = getLastSupabaseError();
                const missing = extractMissingColumn(err);
                if (!missing || !(missing in candidate)) break;
                console.warn('[updateProfile] Removing missing profile column and retrying:', missing);
                delete candidate[missing];
                if (Object.keys(candidate).length === 0) break;
            }
            return null;
        };
        console.log('[updateProfile] Input keys:', Object.keys(sanitizedInput));
        console.log('[updateProfile] Denormalized dbData keys:', Object.keys(dbData), 'avatar_url:', dbData.avatar_url?.substring(0, 80));
        if (Object.keys(dbData).length === 0) {
            console.warn('[updateProfile] dbData is EMPTY — nothing to save to DB!');
            const merged = normalizeProfile({ ...user, ...sanitizedInput });
            setUser(merged);
            setAllUsers(prev => prev.map(u => u.id === user.id ? merged : u));
            return { success: true, user: merged };
        }
        let updated = await updateProfileRowWithSchemaFallback(dbData);
        if (!updated) {
            const firstErr = getLastSupabaseError();
            console.warn('[updateProfile] First update attempt failed, ensuring profile then retrying', firstErr);
            pushAuthDiagnostic('profile.update', 'warn', 'First profile update failed, retrying after profile ensure', firstErr);

            await ensureProfileForAuthUser(
                {
                    id: user.id,
                    email: user.email || null,
                    user_metadata: {
                        username: user.username || null,
                        display_name: user.display_name || user.username || null,
                        avatar_url: user.avatar || null
                    }
                },
                {
                    email: user.email || null,
                    username: user.username || null,
                    display_name: user.display_name || user.username || null,
                    avatar: user.avatar || null
                }
            );

            updated = await updateProfileRowWithSchemaFallback(dbData);
            if (!updated) {
                // Fallback path for profile drift / stricter RLS:
                // try SECURITY DEFINER RPC for avatar/display/username updates.
                if (dbData.avatar_url || dbData.display_name || dbData.username) {
                    try {
                        const { error: rpcErr } = await supabase.rpc('setup_profile', {
                            p_username: dbData.username ?? user.username ?? null,
                            p_display_name: dbData.display_name ?? user.display_name ?? user.username ?? null,
                            p_avatar_url: dbData.avatar_url ?? user.avatar ?? null
                        });
                        if (!rpcErr) {
                            const fetched = await fetchSingle('profiles', { id: user.id });
                            if (fetched) {
                                updated = fetched;
                            }
                        } else {
                            console.warn('[updateProfile] setup_profile fallback RPC failed:', rpcErr);
                        }
                    } catch (rpcFallbackErr) {
                        console.warn('[updateProfile] setup_profile fallback RPC threw:', rpcFallbackErr);
                    }
                }
            }
            if (!updated) {
                // Fallback path: update without RETURNING, then fetch row.
                let candidate = { ...dbData };
                for (let i = 0; i < 4; i += 1) {
                    const { error: blindUpdateError } = await supabase
                        .from('profiles')
                        .update(candidate)
                        .eq('id', user.id);
                    if (!blindUpdateError) {
                        updated = await fetchSingle('profiles', { id: user.id });
                        break;
                    }
                    const missing = extractMissingColumn(blindUpdateError);
                    if (!missing || !(missing in candidate)) break;
                    delete candidate[missing];
                    if (Object.keys(candidate).length === 0) break;
                }
            }
            if (!updated) {
                const finalErr = getLastSupabaseError();
                console.error('[updateProfile] updateRow failed after retry', finalErr);
                pushAuthDiagnostic('profile.update', 'error', finalErr?.message || 'Profile update failed');
                return { success: false, reason: finalErr?.message || 'Profile update failed', debug: finalErr || null };
            }
        }
        console.log('[updateProfile] DB returned avatar_url:', updated.avatar_url?.substring(0, 80));
        const normalized = normalizeProfile(updated);
        setUser(normalized);
        setAllUsers(prev => prev.map(u => u.id === user.id ? normalized : u));
        userCache.current.set(user.id, normalized);
        saveUserCache();

        // Keep auth metadata in sync for fields seeded into new profiles.
        if (dbData.avatar_url || dbData.display_name || dbData.username) {
            try {
                await supabase.auth.updateUser({
                    data: {
                        avatar_url: dbData.avatar_url ?? user.avatar ?? null,
                        display_name: dbData.display_name ?? user.display_name ?? user.username ?? null,
                        username: dbData.username ?? user.username ?? user.display_name ?? null
                    }
                });
            } catch (metaErr) {
                console.warn('[updateProfile] Failed to sync profile metadata to auth:', metaErr);
            }
        }

        return { success: true, user: normalized };
    };

    const saveAvatarUrl = async (avatarUrl) => {
        if (!user?.id) return { success: false, reason: 'Not logged in' };
        const nextAvatarUrl = String(avatarUrl || '').trim();
        if (!nextAvatarUrl) return { success: false, reason: 'Avatar URL is required' };

        const extractMissingColumn = (err) => {
            const message = String(err?.message || '');
            const detail = String(err?.details || '');
            const combined = `${message} ${detail}`;
            const m1 = combined.match(/column\s+'?([a-zA-Z0-9_]+)'?/i);
            if (m1?.[1]) return m1[1];
            const m2 = combined.match(/'([a-zA-Z0-9_]+)'\s+column/i);
            if (m2?.[1]) return m2[1];
            return null;
        };

        let payload = { avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() };
        let updated = null;

        for (let i = 0; i < 3; i += 1) {
            const row = await updateRow('profiles', user.id, payload);
            if (row) {
                updated = row;
                break;
            }
            const err = getLastSupabaseError();
            const missing = extractMissingColumn(err);
            if (!missing || !(missing in payload)) break;
            delete payload[missing];
        }

        if (!updated) {
            try {
                const { error: rpcErr } = await supabase.rpc('setup_profile', {
                    p_username: user.username || user.display_name || null,
                    p_display_name: user.display_name || user.username || null,
                    p_avatar_url: nextAvatarUrl
                });
                if (!rpcErr) {
                    updated = await fetchSingle('profiles', { id: user.id });
                }
            } catch (_) { }
        }

        if (!updated) {
            const err = getLastSupabaseError();
            return { success: false, reason: err?.message || 'Failed to save avatar', debug: err || null };
        }

        const normalized = normalizeProfile(updated);
        setUser(normalized);
        setAllUsers(prev => prev.map(u => u.id === user.id ? normalized : u));
        userCache.current.set(user.id, normalized);
        saveUserCache();
        try {
            await supabase.auth.updateUser({
                data: {
                    avatar_url: nextAvatarUrl,
                    display_name: normalized.display_name || normalized.username || null,
                    username: normalized.username || normalized.display_name || null
                }
            });
        } catch (metaErr) {
            console.warn('[saveAvatarUrl] Failed to sync avatar metadata to auth:', metaErr);
        }
        return { success: true, user: normalized };
    };

    // ─── Social Graph ───────────────────────────────────────────
    const followUser = async (targetId) => {
        if (!user) return alert('Must be logged in');
        if (!targetId || targetId === user.id) return { success: false, reason: 'Invalid follow target' };
        const existing = await fetchRows('follows', { follower_id: user.id, following_id: targetId });
        const isUnfollow = existing.length > 0;
        if (existing.length > 0) {
            await deleteRows('follows', { follower_id: user.id, following_id: targetId });
        } else {
            await insertRow('follows', { follower_id: user.id, following_id: targetId });
            addNotification({
                user_id: targetId,
                type: 'follow',
                message: `${getAuthorLabel(user)} started following you!`,
                link: `/profile/${user.id}`
            });
        }
        const following = await loadFollowingIds(user.id);
        setUser((prev) => {
            const base = normalizeProfile(prev || user);
            return {
                ...base,
                following,
                followingCount: following.length
            };
        });
        setAllUsers((prev) => prev.map((u) => {
            if (!u?.id) return u;
            if (u.id === user.id) {
                return normalizeProfile({
                    ...u,
                    following,
                    following_count: following.length
                });
            }
            if (u.id === targetId) {
                const delta = isUnfollow ? -1 : 1;
                const nextFollowers = Math.max(0, Number(u.followersCount ?? u.followers_count ?? 0) + delta);
                return normalizeProfile({
                    ...u,
                    followers_count: nextFollowers
                });
            }
            return u;
        }));
        await refreshUsers();
        return { success: true };
    };

    // ─── Messaging ──────────────────────────────────────────────
    const sendDirectMessage = async (toId, text) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const cleanText = String(text || '').trim();
        if (!toId || !cleanText) return { success: false, reason: 'Recipient and message are required' };

        const inserted = await insertRow('messages', {
            from_id: user.id,
            to_id: toId,
            text: cleanText,
            read: false
        });
        if (!inserted) {
            const err = getLastSupabaseError();
            return {
                success: false,
                reason: err?.message || 'Failed to send message',
                debug: err || null
            };
        }
        return { success: true, message: inserted };
    };

    const getDirectMessages = async () => {
        if (!user) return [];
        const { data: messages, error } = await supabase.from('messages').select('*')
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[getDirectMessages] Failed to fetch:', error);
            return [];
        }
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
                to: msg.to_id,
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
        if (typeof window !== 'undefined') {
            window.__WOI_LAST_SUBMIT_ERROR__ = null;
        }
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
            author_name: getAuthorLabel(user),
            author_avatar: user.avatar || null,
            votes: 0,
            status: 'open',
            roles_needed: rolesNeeded,
            resources_needed: resourcesNeeded,
            markdown_body: markdownBody || rest.content || null,
            lat: rest.location?.lat ?? null,
            lng: rest.location?.lng ?? null,
            city: rest.location?.city ?? null,
            title_image: rest.titleImage || null,
            thumbnail_url: rest.thumbnail || rest.titleImage || null,
            idea_data: {
                title: rest.title || 'Untitled Idea',
                categories: Array.isArray(rest.categories) ? rest.categories : [category],
                tags,
                peopleNeeded: rolesNeeded,
                resourcesNeeded,
                notes: rest.notes || '',
                teamDescription: rest.teamDescription || '',
                isLocal: Boolean(rest.isLocal),
                location: rest.location || null,
                titleImage: rest.titleImage || null,
                thumbnail: rest.thumbnail || rest.titleImage || null,
                parentIdeaId: rest.parentIdeaId || null,
                forkedFrom: rest.forkedFrom || null,
                evolutionType: rest.evolutionType || null,
                mutationNote: rest.mutationNote || null,
                inheritanceMap: rest.inheritanceMap || null
            },
            // [FIX] Ensure parent ID is correctly mapped for forks
            forked_from: rest.parentIdeaId || rest.forkedFrom || null
        };
        const variantFull = { ...ideaPayload };
        const { lat, lng, city, title_image, thumbnail_url, idea_data, ...variantNoGeoMedia } = variantFull;
        const { roles_needed, resources_needed, ...variantNoRolesResources } = variantNoGeoMedia;
        const variantMinimal = {
            title: variantFull.title,
            description: variantFull.description,
            category: variantFull.category,
            author_id: variantFull.author_id,
            author_name: variantFull.author_name,
            author_avatar: variantFull.author_avatar,
            markdown_body: variantFull.markdown_body,
            status: 'open',
            votes: 0
        };

        const variants = [
            { label: 'full', payload: variantFull, timeoutMs: 20000 },
            { label: 'no_geo_media', payload: variantNoGeoMedia, timeoutMs: 12000 },
            { label: 'no_roles_resources', payload: variantNoRolesResources, timeoutMs: 12000 },
            { label: 'minimal', payload: variantMinimal, timeoutMs: 10000 }
        ];
        const timedOutError = (variant, timeoutMs) => ({
            code: 'CLIENT_TIMEOUT',
            message: `Insert timed out after ${timeoutMs}ms (${variant})`,
            details: null,
            hint: null,
            stage: 'submitIdea'
        });
        const extractMissingColumn = (err) => {
            const message = String(err?.message || '');
            const detail = String(err?.details || '');
            const combined = `${message} ${detail}`;
            const m1 = combined.match(/column\s+'?([a-zA-Z0-9_]+)'?/i);
            if (m1?.[1]) return m1[1];
            const m2 = combined.match(/'([a-zA-Z0-9_]+)'\s+column/i);
            if (m2?.[1]) return m2[1];
            return null;
        };
        const pruneUndefined = (obj) => Object.fromEntries(
            Object.entries(obj || {}).filter(([, value]) => value !== undefined)
        );
        const isAbortLikeError = (error) => {
            const message = String(error?.message || '');
            const details = String(error?.details || '');
            return error?.name === 'AbortError'
                || message.includes('AbortError')
                || message.includes('aborted')
                || details.includes('AbortError')
                || details.includes('aborted');
        };
        const tryInsertVariant = async (variant, payload, timeoutMs) => {
            let candidate = pruneUndefined(payload);
            for (let i = 0; i < 6; i += 1) {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                let timer = null;
                try {
                    if (controller) {
                        timer = setTimeout(() => controller.abort(), timeoutMs);
                    }
                    let query = supabase.from('ideas').insert(candidate).select().single();
                    if (controller) {
                        query = query.abortSignal(controller.signal);
                    }
                    const { data, error } = await query;
                    if (!error && data) {
                        return { data, error: null, __timeout: false };
                    }
                    if (error && isAbortLikeError(error)) {
                        // Timeout fallback path:
                        // check for recently inserted matching idea before attempting a blind insert.
                        try {
                            const { data: recentRows } = await supabase
                                .from('ideas')
                                .select('*')
                                .eq('author_id', user.id)
                                .eq('title', candidate.title || '')
                                .order('created_at', { ascending: false })
                                .limit(1);
                            const recent = Array.isArray(recentRows) ? recentRows[0] : null;
                            if (recent?.created_at) {
                                const ageMs = Date.now() - new Date(recent.created_at).getTime();
                                if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 120000) {
                                    return { data: recent, error: null, __timeout: true };
                                }
                            }
                        } catch (_) { }

                        const { error: blindInsertError } = await supabase.from('ideas').insert(candidate);
                        if (!blindInsertError) {
                            const { data: rows } = await supabase
                                .from('ideas')
                                .select('*')
                                .eq('author_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(1);
                            const newest = Array.isArray(rows) ? rows[0] : null;
                            if (newest) {
                                return { data: newest, error: null, __timeout: true };
                            }
                            return { data: { ...candidate, id: `pending_${Date.now()}` }, error: null, __timeout: true };
                        }
                        const missingAfterBlind = extractMissingColumn(blindInsertError);
                        if (missingAfterBlind && (missingAfterBlind in candidate)) {
                            delete candidate[missingAfterBlind];
                            if (Object.keys(candidate).length === 0) break;
                            continue;
                        }
                        return { data: null, error: timedOutError(variant, timeoutMs), __timeout: true };
                    }
                    const missing = extractMissingColumn(error);
                    if (missing && (missing in candidate)) {
                        console.warn('[submitIdea] Removing missing ideas column and retrying:', missing);
                        delete candidate[missing];
                        if (Object.keys(candidate).length === 0) break;
                        continue;
                    }
                    return { data: null, error, __timeout: false };
                } catch (error) {
                    if (isAbortLikeError(error)) {
                        return { data: null, error: timedOutError(variant, timeoutMs), __timeout: true };
                    }
                    const missing = extractMissingColumn(error);
                    if (missing && (missing in candidate)) {
                        console.warn('[submitIdea] Removing missing ideas column after throw and retrying:', missing);
                        delete candidate[missing];
                        if (Object.keys(candidate).length === 0) break;
                        continue;
                    }
                    return { data: null, error, __timeout: false };
                } finally {
                    if (timer) clearTimeout(timer);
                }
            }
            return { data: null, error: { code: 'SCHEMA_DRIFT', message: `Unable to insert variant ${variant} after schema fallback` }, __timeout: false };
        };

        await withSoftTimeout(ensureProfileForAuthUser(
            { id: user.id, email: user.email },
            { username: user.username, avatar: user.avatar }
        ), 5000);

        let newIdea = null;
        let lastInsertError = null;
        for (const attempt of variants) {
            console.log(`[submitIdea] Attempting insert variant: ${attempt.label}`);
            let { data, error, __timeout } = await tryInsertVariant(attempt.label, attempt.payload, attempt.timeoutMs);
            if (!data && (error?.code === '23503' || String(error?.message || '').toLowerCase().includes('foreign key'))) {
                await withSoftTimeout(ensureProfileForAuthUser(
                    { id: user.id, email: user.email },
                    { username: user.username, avatar: user.avatar }
                ), 5000);
                ({ data, error, __timeout } = await tryInsertVariant(`${attempt.label}_after_profile_ensure`, attempt.payload, attempt.timeoutMs));
            }
            if (data) {
                newIdea = data;
                console.log('[submitIdea] Insert succeeded with variant:', attempt.label);
                break;
            }
            lastInsertError = error || timedOutError(attempt.label, attempt.timeoutMs);
            console.warn('[submitIdea] Insert variant failed:', {
                variant: attempt.label,
                timeout: Boolean(__timeout),
                message: lastInsertError?.message,
                code: lastInsertError?.code,
                details: lastInsertError?.details
            });
        }

        // Last resort: ensure profile exists then retry the safest payload.
        if (!newIdea) {
            console.log('[submitIdea] Ensuring profile exists before final retry...');
            // First try SECURITY DEFINER RPC path (bypasses profile RLS drift).
            try {
                const { error: setupErr } = await supabase.rpc('setup_profile', {
                    p_username: user.username || user.display_name || null,
                    p_display_name: user.display_name || user.username || null,
                    p_avatar_url: user.avatar || null
                });
                if (setupErr) {
                    console.warn('[submitIdea] setup_profile RPC failed:', setupErr);
                    pushAuthDiagnostic('idea.submit', 'warn', 'setup_profile RPC failed before final retry', setupErr);
                } else {
                    pushAuthDiagnostic('idea.submit', 'ok', 'setup_profile RPC completed before final retry');
                }
            } catch (rpcErr) {
                console.warn('[submitIdea] setup_profile RPC threw:', rpcErr);
            }

            await withSoftTimeout(ensureProfileForAuthUser(
                { id: user.id, email: user.email },
                { username: user.username, avatar: user.avatar }
            ), 5000);
            const { data, error } = await tryInsertVariant('final_minimal', variantMinimal, 10000);
            newIdea = data || null;
            if (!newIdea && error) {
                lastInsertError = error;
            }
        }

        if (!newIdea) {
            const finalErr = lastInsertError || getLastSupabaseError() || null;
            // Last recovery: insert may have committed even when client aborted/failed to parse response.
            try {
                const { data: rows } = await supabase
                    .from('ideas')
                    .select('*')
                    .eq('author_id', user.id)
                    .eq('title', ideaPayload.title || '')
                    .order('created_at', { ascending: false })
                    .limit(1);
                const newest = Array.isArray(rows) ? rows[0] : null;
                if (newest?.id) {
                    const normalizedRecovered = normalizeIdea(newest);
                    setIdeas(prev => [normalizedRecovered, ...prev.filter((i) => i.id !== normalizedRecovered.id)]);
                    setNewlyCreatedIdeaId(normalizedRecovered.id);
                    pushAuthDiagnostic('idea.submit', 'ok', 'Idea recovered after transient submit failure', { ideaId: normalizedRecovered.id });
                    return normalizedRecovered;
                }
            } catch (_) { }
            console.error('[submitIdea] Final failure:', finalErr);
            if (typeof window !== 'undefined') {
                window.__WOI_LAST_SUBMIT_ERROR__ = finalErr;
            }
            pushAuthDiagnostic('idea.submit', 'error', finalErr?.message || 'Idea insert failed', finalErr);
            return null;
        }

        const normalized = normalizeIdea(newIdea);
        setIdeas(prev => [normalized, ...prev]);
        setNewlyCreatedIdeaId(normalized.id);
        pushAuthDiagnostic('idea.submit', 'ok', 'Idea submitted', { ideaId: normalized.id });
        return normalized;
    };


    const clearNewIdeaId = () => setNewlyCreatedIdeaId(null);

    const incrementIdeaViews = async (ideaId) => {
        if (!ideaId) return;

        // [MODIFIED] De-duplication logic using localStorage
        // Key format: 'woi_views' = { [ideaId]: timestamp }
        try {
            const VIEW_COOLDOWN = 60 * 60 * 1000; // 1 hour
            const now = Date.now();

            const storedViews = JSON.parse(localStorage.getItem(VIEWS_CACHE_KEY) || '{}');
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
            localStorage.setItem(VIEWS_CACHE_KEY, JSON.stringify(storedViews));

            // Optimistic update
            setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, views: (i.views || 0) + 1 } : i));

            // Fire and forget DB update
            updateInfluence(ideaId, 0); // Placeholder hook for influence logic if needed

            const { error } = await supabase.rpc('increment_idea_views', { p_idea_id: ideaId });

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

        // [CACHE] Optimistic Update
        if (directionValue === 1) {
            setVotedIdeaIds(prev => {
                if (prev.includes(ideaId)) return prev;
                const newIds = [...prev, ideaId];
                safeWriteCache(VOTES_CACHE_KEY, newIds);
                return newIds;
            });
        }

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
        // Update via RPC to bypass RLS
        const newScore = ups.length - downs.length;

        // Optimistic UI update
        setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, votes: newScore } : i));

        await supabase.rpc('update_idea_vote_count', { idea_id: ideaId, new_count: newScore });
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

    // [NEW] Get Discussion Comments (Deeply Nested)
    const getDiscussionComments = async (discussionId) => {
        // Fetch flat list of comments
        const { data: allComments, error } = await supabase
            .from('discussion_comments')
            .select(`
                *,
                profiles (
                   username, avatar_url, tier
                )
            `)
            .eq('discussion_id', discussionId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching discussion comments:", error);
            return [];
        }

        // Helper to normalize and nest
        const nestComments = (comments) => {
            const commentMap = {};
            const roots = [];

            // 1. Initialize map
            comments.forEach(c => {
                commentMap[c.id] = {
                    ...c,
                    author: c.profiles?.username || 'Unknown',
                    authorAvatar: c.profiles?.avatar_url,
                    authorTier: c.profiles?.tier,
                    replies: []
                };
            });

            // 2. Build tree
            comments.forEach(c => {
                if (c.parent_id && commentMap[c.parent_id]) {
                    commentMap[c.parent_id].replies.push(commentMap[c.id]);
                } else {
                    roots.push(commentMap[c.id]);
                }
            });

            return roots;
        };

        return nestComments(allComments);
    };

    const addDiscussionComment = async (discussionId, content, parentId = null) => {
        if (!user) return null;
        return await insertRow('discussion_comments', {
            discussion_id: discussionId,
            user_id: user.id,
            content,
            parent_id: parentId,
            votes: 0
        });
    };

    const voteDiscussionComment = async (commentId, direction) => {
        if (!user) return;
        const directionValue = toVoteDirectionValue(direction);

        // Upsert vote
        const { error } = await supabase
            .from('discussion_comment_votes')
            .upsert({
                comment_id: commentId,
                user_id: user.id,
                vote_type: directionValue
            }, { onConflict: 'comment_id, user_id' });

        if (error) {
            console.error("Error voting on discussion comment:", error);
            return;
        }

        // Recalculate score (Simple RPC or manual count)
        const ups = await fetchRows('discussion_comment_votes', { comment_id: commentId, vote_type: 1 });
        const downs = await fetchRows('discussion_comment_votes', { comment_id: commentId, vote_type: -1 });
        const newScore = ups.length - downs.length;

        await updateRow('discussion_comments', commentId, { votes: newScore });
        return { success: true, newScore };
    };

    // ─── Chat ───────────────────────────────────────────────────
    const getChatMessages = async (ideaId) => {
        return await fetchRows('chat_messages', { idea_id: ideaId }, { order: { column: 'created_at', ascending: true } });
    };

    const sendChatMessage = async (ideaId, text) => {
        if (!user) return null;
        return await insertRow('chat_messages', {
            idea_id: ideaId, text, author: getAuthorLabel(user), authorAvatar: user.avatar,
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
        const { data, error } = await supabase
            .from('resources')
            .select('*, profiles(username, avatar_url)')
            .eq('idea_id', ideaId)
            .order('created_at', { ascending: false });

        return (data || []).map(row => ({
            ...row,
            pledgedBy: row.profiles?.username || row.pledger_name || 'Anonymous',
            pledgerAvatar: row.profiles?.avatar_url,
            quantity: row.quantity || 1
        }));
    };
    const pledgeResource = async (data) => insertRow('resources', {
        idea_id: data.ideaId || data.idea_id,
        status: data.status || 'pending',
        name: data.item || data.name || 'Resource',
        type: data.type || 'other',
        pledged_by: user.id,
        pledger_name: user.username,
        quantity: data.quantity || 1,
        estimated_value: data.estimatedValue || 0
    });
    const updateResourceStatus = async (ideaId, resourceId, status) => updateRow('resources', resourceId, { status });

    // ─── Idea Wiki ──────────────────────────────────────────────
    const getIdeaWikiEntries = async (ideaId) => {
        const { data, error } = await supabase
            .from('idea_wiki_entries')
            .select('*, profiles(username, avatar_url)')
            .eq('idea_id', ideaId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('[getIdeaWikiEntries] Failed:', error);
            return [];
        }
        return (data || []).map((row) => ({
            ...row,
            authorName: row.profiles?.username || 'Community Member',
            authorAvatar: row.profiles?.avatar_url || null
        }));
    };

    const addIdeaWikiEntry = async (data) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const payload = {
            idea_id: data.ideaId || data.idea_id,
            user_id: user.id,
            title: String(data.title || '').trim(),
            entry_type: data.entryType || data.entry_type || 'resource',
            url: data.url ? String(data.url).trim() : null,
            content: data.content ? String(data.content).trim() : ''
        };
        if (!payload.idea_id || !payload.title) return { success: false, reason: 'Missing idea or title' };

        const { data: row, error } = await supabase
            .from('idea_wiki_entries')
            .insert(payload)
            .select('*, profiles(username, avatar_url)')
            .single();

        if (error) {
            return { success: false, reason: error.message, debug: error };
        }
        return {
            success: true,
            entry: {
                ...row,
                authorName: row.profiles?.username || user.username || 'Community Member',
                authorAvatar: row.profiles?.avatar_url || user.avatar || null
            }
        };
    };

    // ─── Applications ───────────────────────────────────────────
    const getApplications = async (ideaId) => {
        const { data, error } = await supabase
            .from('applications')
            .select('*, profiles(username, avatar_url, tier)')
            .eq('idea_id', ideaId)
            .order('created_at', { ascending: false });

        if (error) { console.error('getApplications error', error); return []; }

        return data.map((row) => ({
            ...row,
            applicantName: row.profiles?.username || 'Unknown',
            applicantAvatar: row.profiles?.avatar_url,
            applicantTier: row.profiles?.tier,
            status: row.status || 'pending',
            message: row.message || ''
        }));
    };
    const applyForRole = async (data) => insertRow('applications', {
        idea_id: data.ideaId || data.idea_id,
        status: data.status || 'pending',
        applicant_id: user.id,
        role_name: data.role || data.roleName || 'Contributor',
        message: data.reason || data.message || ''
    });
    const updateApplicationStatus = async (ideaId, appId, status) => updateRow('applications', appId, { status });

    // ─── Groups ─────────────────────────────────────────────────

    const getUserGroup = async (userId) => {
        const membership = await fetchRows('group_members', { user_id: userId });
        if (membership.length === 0) return null;
        return await fetchSingle('groups', { id: membership[0].group_id });
    };

    // ─── Groups ─────────────────────────────────────────────────
    const getGroups = async () => {
        const { data, error } = await supabase
            .from('groups')
            .select('*, members:group_members(user_id, role)');
        if (error) {
            console.error('[getGroups] Error:', error);
            // Schema drift fallback: group_members may not have role column.
            const { data: fallbackGroups, error: fallbackGroupsError } = await supabase
                .from('groups')
                .select('*');
            if (fallbackGroupsError) {
                console.error('[getGroups] Fallback groups fetch failed:', fallbackGroupsError);
                return [];
            }
            const groupIds = (fallbackGroups || []).map((g) => g.id).filter(Boolean);
            let membersByGroup = new Map();
            if (groupIds.length > 0) {
                const { data: memberRows } = await supabase
                    .from('group_members')
                    .select('group_id, user_id')
                    .in('group_id', groupIds);
                membersByGroup = (memberRows || []).reduce((acc, row) => {
                    if (!acc.has(row.group_id)) acc.set(row.group_id, []);
                    acc.get(row.group_id).push(row.user_id);
                    return acc;
                }, new Map());
            }
            return (fallbackGroups || []).map(g => ({
                ...g,
                id: g.id,
                name: g.name,
                description: g.description,
                banner: g.banner_url || g.banner,
                color: g.color,
                badge: g.badge || '⚡',
                motto: g.motto || null,
                leader_id: g.leader_id || null,
                members: membersByGroup.get(g.id) || [],
                memberCount: (membersByGroup.get(g.id) || []).length
            }));
        }
        return data.map(g => ({
            ...g,
            id: g.id,
            name: g.name,
            description: g.description,
            banner: g.banner_url || g.banner,
            color: g.color,
            badge: g.badge || '⚡',
            motto: g.motto || null,
            leader_id: g.leader_id || null,
            members: (g.members || []).map(m => m.user_id),
            memberCount: (g.members || []).length
        }));
    };

    const createGroup = async ({ name, description = '', banner_url = null, color = '#7d5fff' }) => {
        if (!user) return { success: false, reason: 'Login required' };
        const cleanName = String(name || '').trim();
        if (!cleanName) return { success: false, reason: 'Group name is required' };

        const created = await insertRow('groups', {
            name: cleanName,
            description: String(description || '').trim() || null,
            banner_url: banner_url || null,
            color: color || '#7d5fff',
            leader_id: user.id
        });
        if (!created) {
            const err = getLastSupabaseError();
            return { success: false, reason: err?.message || 'Failed to create group', debug: err || null };
        }

        await supabase.from('group_members').upsert(
            { group_id: created.id, user_id: user.id, role: 'leader' },
            { onConflict: 'group_id,user_id' }
        );

        return { success: true, group: created };
    };

    const getFeaturedIdea = async () => {
        // Fetch top voted idea that has a valid author
        const { data, error } = await supabase
            .from('ideas')
            .select('*, author:profiles(id, username, avatar_url)')
            .eq('status', 'open')
            .order('votes', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return null;

        const row = data[0];
        // Handle array or object return from join
        const profile = Array.isArray(row.author) ? row.author[0] : row.author;

        if (!profile) return null; // Orphan check

        // Flatten for UI
        const flattened = {
            ...row,
            author: profile.username || 'Unknown',
            authorAvatar: profile.avatar_url
        };

        return normalizeIdea(flattened);
    };

    const joinGroup = async (groupId, userId) => {
        if (!user) return { success: false, reason: 'Login required' };
        const existing = await fetchRows('group_members', { group_id: groupId, user_id: userId });
        if (existing.length > 0) return { success: true };

        const { error } = await supabase
            .from('group_members')
            .insert({ group_id: groupId, user_id: userId, role: 'member' });

        if (error) return { success: false, reason: error.message };

        // Refresh User to update local state
        await refreshUsers();
        await setUser(prev => ({ ...prev }));

        return { success: true };
    };

    const leaveGroup = async (groupId, userId) => {
        if (!user) return { success: false, reason: 'Login required' };
        if (!groupId || !userId) return { success: false, reason: 'Missing group or user id' };
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) return { success: false, reason: error.message };

        await refreshUsers();
        await setUser(prev => ({ ...prev }));
        return { success: true };
    };

    const getGroupWiki = async (groupId) => {
        const rows = await fetchRows('group_wikis', { group_id: groupId }, { order: { column: 'updated_at', ascending: false }, limit: 1 });
        if (!rows || rows.length === 0) return { content: '' };
        return rows[0];
    };

    const saveGroupWiki = async (groupId, content) => {
        if (!user) return { success: false, reason: 'Login required' };
        const row = await upsertRow('group_wikis', {
            group_id: groupId,
            content: String(content || ''),
            updated_by: user.id,
            updated_at: new Date().toISOString()
        }, { onConflict: 'group_id' });
        if (!row) {
            const err = getLastSupabaseError();
            return { success: false, reason: err?.message || 'Failed to save wiki', debug: err || null };
        }
        return { success: true, wiki: row };
    };

    // Group Discussions
    const getGroupPosts = async (groupId) => {
        const { data } = await supabase
            .from('group_posts')
            .select('*, author:profiles(username, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });
        return data || [];
    };

    const addGroupPost = async (groupId, title, body) => {
        if (!user) return { success: false };
        const { data, error } = await supabase
            .from('group_posts')
            .insert({ group_id: groupId, author_id: user.id, title, body })
            .select()
            .single();
        return { success: !error, post: data };
    };

    // Group Chat
    const getGroupChat = async (groupId) => {
        const { data } = await supabase
            .from('group_chat_messages')
            .select('*, author:profiles(username, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true }) // Oldest first
            .limit(50);
        return data || [];
    };

    const sendGroupChat = async (groupId, text) => {
        if (!user) return { success: false };
        const { error } = await supabase
            .from('group_chat_messages')
            .insert({ group_id: groupId, user_id: user.id, text });
        return { success: !error };
    };

    const getGroupMedia = async (groupId) => {
        const { data, error } = await supabase
            .from('group_media')
            .select('*, author:profiles(username, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });
        if (error) {
            console.warn('[getGroupMedia] Failed:', error);
            return [];
        }
        return data || [];
    };

    const addGroupMedia = async (groupId, payload = {}) => {
        if (!user) return { success: false, reason: 'Login required' };
        const title = String(payload.title || '').trim();
        const mediaUrl = String(payload.media_url || payload.url || '').trim();
        const mediaType = String(payload.media_type || 'link').trim().toLowerCase();
        const caption = String(payload.caption || '').trim();
        if (!title || !mediaUrl) {
            return { success: false, reason: 'Title and media URL are required' };
        }
        const { data, error } = await supabase
            .from('group_media')
            .insert({
                group_id: groupId,
                user_id: user.id,
                title,
                media_url: mediaUrl,
                media_type: mediaType,
                caption: caption || null
            })
            .select('*, author:profiles(username, avatar_url)')
            .single();

        if (error) {
            return { success: false, reason: error.message, debug: error };
        }
        return { success: true, media: data };
    };

    // ─── Leaderboard & Activity ─────────────────────────────────
    const getLeaderboard = async () => {
        const [users, ideas, groups] = await Promise.all([
            fetchRows('profiles', {}, { order: { column: 'influence', ascending: false }, limit: 20 }),
            fetchRows('ideas', {}, { order: { column: 'votes', ascending: false }, limit: 20 }),
            getGroups()
        ]);

        // Calculate Group "Reputation" based on member count for now
        const scoredGroups = groups.map(g => ({
            ...g,
            totalRep: (g.members?.length || 0) * 100 // Placeholder metric
        })).sort((a, b) => b.totalRep - a.totalRep);

        return {
            topUsers: users.map(normalizeProfile),
            topIdeas: ideas,
            topGroups: scoredGroups
        };
    };

    const getUserActivity = async (userId) => {
        if (!userId) return { myIdeas: [], sparksGiven: [] };

        const [myIdeas, sparksGiven] = await Promise.all([
            fetchRows('ideas', { author_id: userId }, { order: { column: 'created_at', ascending: false }, limit: 200 }),
            fetchRows('activity_log', { user_id: userId }, { order: { column: 'created_at', ascending: false }, limit: 50 })
        ]);

        return {
            myIdeas: Array.isArray(myIdeas) ? myIdeas : [],
            sparksGiven: Array.isArray(sparksGiven) ? sparksGiven : []
        };
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
            author_name: getAuthorLabel(user),
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
                message: `${getAuthorLabel(user)} tipped you ${amount} influence!`,
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
                message: `${getAuthorLabel(user)} staked $${amount} on your idea "${idea.title}"!`,
                link: buildIdeaLink(ideaId)
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

    const saveIdea = async (ideaId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        if (!ideaId) return { success: false, reason: 'Missing idea id' };

        const existing = await fetchRows('saved_ideas', { idea_id: ideaId, user_id: user.id });
        let saved = true;
        if (existing.length > 0) {
            await deleteRows('saved_ideas', { idea_id: ideaId, user_id: user.id });
            saved = false;
        } else {
            await insertRow('saved_ideas', { idea_id: ideaId, user_id: user.id });
            saved = true;
        }

        const rows = await fetchRows('saved_ideas', { user_id: user.id });
        const ids = Array.from(new Set((rows || []).map(v => v.idea_id).filter(Boolean)));
        setSavedIdeaIds(ids);
        return { success: true, saved };
    };

    const getSavedIdeas = async (targetUserId = null) => {
        const userId = targetUserId || user?.id;
        if (!userId) return [];

        const { data, error } = await supabase
            .from('saved_ideas')
            .select('idea_id, created_at, ideas(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
            return data
                .map((row) => {
                    const joined = Array.isArray(row.ideas) ? row.ideas[0] : row.ideas;
                    return joined ? normalizeIdea(joined) : null;
                })
                .filter(Boolean);
        }

        const fallbackRows = await fetchRows('saved_ideas', { user_id: userId }, { order: { column: 'created_at', ascending: false } });
        const ideaMap = new Map((ideas || []).map((i) => [i.id, i]));
        return (fallbackRows || [])
            .map((row) => ideaMap.get(row.idea_id))
            .filter(Boolean);
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
        const hydrateProfilesByUserId = async (rows = []) => {
            const userIds = [...new Set(
                rows
                    .map((r) => r?.user_id)
                    .filter(Boolean)
            )];
            if (userIds.length === 0) return new Map();

            const { data: profileRows, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, tier')
                .in('id', userIds);

            if (profileError) {
                console.warn('[getIdeaComments] profile hydration failed:', profileError);
                return new Map();
            }

            return new Map((profileRows || []).map((p) => [p.id, p]));
        };

        const mapRowsToComments = (rows = [], profileMap = new Map()) => rows.map(c => {
            const profileFromJoin = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            const profileFromMap = c.user_id ? profileMap.get(c.user_id) : null;
            const profile = profileFromJoin || profileFromMap;
            return {
                id: c.id,
                text: c.text ?? c.content ?? c.body ?? '',
                // [FIX] Prioritize joined profile data ("live" data) over saved snapshot
                author: profile?.username || c.author || c.username || 'Community Member',
                authorAvatar: profile?.avatar_url || c.author_avatar || c.avatar_url || null,
                authorTier: profile?.tier || c.tier,
                author_id: c.user_id ?? c.author_id ?? null,
                votes: c.votes || 0,
                // [NEW] Hydrate vote status
                hasVoted: votedCommentIds.includes(c.id),
                hasDownvoted: downvotedCommentIds.includes(c.id),
                time: formatTime(c.created_at || new Date().toISOString()),
                replies: [],
                parentId: c.parent_id ?? c.parentId ?? null
            };
        });

        // Primary source: modern table
        const { data, error } = await supabase
            .from('idea_comments')
            .select('*, profiles(username, avatar_url, tier)')
            .eq('idea_id', ideaId)
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[getIdeaComments] idea_comments fetch failed, trying legacy fallback:', error);
        }

        let rawRows = Array.isArray(data) ? data : [];

        // Fallback: if join query failed, retry without relation join so comments still load.
        if (error) {
            const { data: plainRows, error: plainError } = await supabase
                .from('idea_comments')
                .select('*')
                .eq('idea_id', ideaId)
                .order('created_at', { ascending: true });

            if (plainError) {
                console.warn('[getIdeaComments] plain idea_comments fallback failed:', plainError);
            } else {
                rawRows = Array.isArray(plainRows) ? plainRows : [];
            }
        }

        const profileMap = await hydrateProfilesByUserId(rawRows);
        let rawComments = mapRowsToComments(rawRows, profileMap);

        // Fallback source: legacy comments table, only when modern table appears empty.
        if (rawComments.length === 0) {
            const { data: legacyData, error: legacyError } = await supabase
                .from('comments')
                .select('*')
                .eq('idea_id', ideaId)
                .order('created_at', { ascending: true });
            if (legacyError) {
                console.warn('[getIdeaComments] Legacy comments fallback failed:', legacyError);
            } else if (Array.isArray(legacyData) && legacyData.length > 0) {
                rawComments = mapRowsToComments(legacyData);
            }
        }

        // Build Tree Structure
        const commentMap = {};
        rawComments.forEach(c => { commentMap[c.id] = c; });

        const rootComments = [];
        rawComments.forEach(c => {
            if (c.parentId && commentMap[c.parentId]) {
                commentMap[c.parentId].replies.push(c);
            } else {
                rootComments.push(c);
            }
        });

        return rootComments;
    };

    const addIdeaComment = async (ideaId, text, parentId = null) => {
        if (!user) { alert('Login required'); return null; }
        const cleanText = String(text || '').trim();
        if (!cleanText) return null;

        // Preferred path: SECURITY DEFINER RPC (handles profile upsert + schema drift safely)
        let rpcComment = null;
        try {
            const { data, error } = await supabase.rpc('add_idea_comment', {
                p_idea_id: ideaId,
                p_text: cleanText,
                p_parent_id: parentId
            });
            if (!error) {
                rpcComment = Array.isArray(data) ? data[0] : data;
            } else {
                console.warn('[addIdeaComment] add_idea_comment RPC failed, trying direct insert:', error);
            }
        } catch (rpcErr) {
            console.warn('[addIdeaComment] add_idea_comment RPC threw, trying direct insert:', rpcErr);
        }

        const tryDirectInsertVariants = async () => {
            const variants = [
                {
                    name: 'full',
                    payload: {
                        idea_id: ideaId,
                        text: cleanText,
                        author: getAuthorLabel(user),
                        user_id: user.id,
                        author_avatar: user.avatar,
                        parent_id: parentId,
                        votes: 0
                    }
                },
                {
                    name: 'no_author_avatar',
                    payload: {
                        idea_id: ideaId,
                        text: cleanText,
                        author: getAuthorLabel(user),
                        user_id: user.id,
                        parent_id: parentId,
                        votes: 0
                    }
                },
                {
                    name: 'minimal',
                    payload: {
                        idea_id: ideaId,
                        text: cleanText,
                        user_id: user.id,
                        parent_id: parentId
                    }
                }
            ];

            for (const variant of variants) {
                const inserted = await insertRow('idea_comments', variant.payload);
                if (inserted) {
                    return inserted;
                }
                const err = getLastSupabaseError();
                console.warn('[addIdeaComment] direct insert variant failed:', { variant: variant.name, err });

                // FK profile drift is common; ensure profile then retry next variant.
                if (err?.code === '23503' || String(err?.message || '').toLowerCase().includes('foreign key')) {
                    try {
                        const authRes = await supabase.auth.getUser();
                        const authUser = authRes?.data?.user;
                        if (authUser?.id) {
                            await ensureProfileForAuthUser(authUser, {
                                email: authUser.email || user.email || null,
                                username: user.username || null,
                                display_name: user.display_name || user.username || null,
                                avatar: user.avatar || null
                            });
                        }
                    } catch (ensureErr) {
                        console.warn('[addIdeaComment] ensureProfileForAuthUser fallback failed:', ensureErr);
                    }
                }
            }
            return null;
        };

        // Fallback path: direct insert
        let newComment = rpcComment;
        if (!newComment) {
            newComment = await tryDirectInsertVariants();
        }

        // Update comment count on idea
        if (newComment) {
            const current = ideas.find(i => i.id === ideaId);
            const serverCount = Number(newComment.idea_comment_count ?? NaN);
            const nextCount = Number.isFinite(serverCount)
                ? serverCount
                : (Number(current?.commentCount ?? 0) + 1);
            if (!Number.isFinite(serverCount)) {
                updateRow('ideas', ideaId, { comment_count: nextCount });
            }

            // Optimistic update for UI speed
            setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, commentCount: nextCount } : i));

            // [MODIFIED] Return a structure that matches getIdeaComments format to prevent UI flicker/disappearance
            // The getIdeaComments mapper expects: { id, text, author, authorAvatar, ... }
            const optimisticComment = {
                ...newComment,
                author: getAuthorLabel(user),
                authorAvatar: user.avatar,
                time: "Just now",
                replies: []
            };

            const idea = ideas.find(i => i.id === ideaId);
            if (idea && idea.author_id && idea.author_id !== user.id) {
                addNotification({
                    user_id: idea.author_id,
                    type: 'comment',
                    message: `${getAuthorLabel(user)} commented on "${idea.title}"`,
                    link: buildIdeaLink(ideaId)
                });
                updateInfluence(idea.author_id, 1);
            }
            return optimisticComment;
        }

        const lastErr = getLastSupabaseError();
        alert(`Could not save comment. ${lastErr?.message || 'Please try again.'}`);
        return null;
    };

    const voteIdeaComment = async (commentId, direction = 'up') => {
        if (!user) return alert('Must be logged in');
        const directionValue = toVoteDirectionValue(direction);

        // Optimistic State Update
        if (directionValue === 1) {
            setVotedCommentIds(prev => [...prev, commentId]);
            setDownvotedCommentIds(prev => prev.filter(id => id !== commentId));
        } else {
            setDownvotedCommentIds(prev => [...prev, commentId]);
            setVotedCommentIds(prev => prev.filter(id => id !== commentId));
        }

        // Call RPC
        const { data, error } = await supabase.rpc('vote_idea_comment', {
            p_comment_id: commentId,
            p_direction: directionValue
        });

        if (error) {
            console.error('[VoteComment] RPC failed:', error);
            // Revert state? Ideally yes, but lazy for now as next refresh fixes it.
            // Just warn user.
            pushAuthDiagnostic('vote.comment', 'error', 'Vote failed', error);
            return { success: false };
        }

        if (data && data.success) {
            // Update the comment's vote count in local state
            setIdeas(prev => prev.map(idea => ({
                ...idea,
                // We don't have comments in idea state usually, but if we did...
            })));

            // If we are viewing a discussion, we need to update that state
            // But we don't have direct access to the specific discussion state here if it's inside a component.
            // However, if we have a global cache of comments (we don't really), we'd update it.
            // For now, the component likely re-fetches or uses the optimistic value.
            return { success: true, newScore: data.new_score };
        }

        return { success: false };
    };

    // ... lines 1363-1466 unchanged ...

    const incrementIdeaShares = async (ideaId) => {
        if (!ideaId) return false;
        if (!user?.id) {
            // Guests can still copy links, but must not mutate share metrics.
            return false;
        }
        // Optimistic UI update
        setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, shares: (i.shares || 0) + 1 } : i));

        // Call RPC
        const { error } = await supabase.rpc('increment_idea_shares', { idea_id: ideaId });

        if (error) {
            console.warn('[incrementIdeaShares] RPC failed, falling back to manual update:', error.message);
            // Fallback: Fetch -> Increment -> Update
            const idea = await fetchSingle('ideas', { id: ideaId });
            if (idea) updateRow('ideas', ideaId, { shares: (idea.shares || 0) + 1 });
            return false;
        } else {
            console.log('[incrementIdeaShares] Success via RPC');
            return true;
        }
    };

    // ─── Moderation / Admin ─────────────────────────────────────
    const assignUserRole = async (targetUserId, role) => {
        if (!isAdmin) return { success: false, reason: 'Admin access required' };
        const nextRole = String(role || '').toLowerCase();
        if (!['user', 'moderator', 'admin'].includes(nextRole)) {
            return { success: false, reason: 'Invalid role' };
        }
        const { error } = await supabase.rpc('set_user_role', {
            p_target_user_id: targetUserId,
            p_new_role: nextRole
        });
        if (error) return { success: false, reason: error.message, debug: error };
        await refreshUsers();
        if (user?.id === targetUserId) {
            const refreshed = await fetchSingle('profiles', { id: targetUserId });
            if (refreshed) setUser(normalizeProfile(refreshed));
        }
        return { success: true };
    };

    const banUser = async (userId, reason = null) => {
        if (!canModerate) return { success: false, reason: 'Moderator access required' };
        const { error } = await supabase.rpc('set_user_banned_status', {
            p_target_user_id: userId,
            p_banned: true,
            p_reason: reason
        });
        if (error) return { success: false, reason: error.message, debug: error };
        await refreshUsers();
        return { success: true };
    };

    const unbanUser = async (userId) => {
        if (!canModerate) return { success: false, reason: 'Moderator access required' };
        const { error } = await supabase.rpc('set_user_banned_status', {
            p_target_user_id: userId,
            p_banned: false,
            p_reason: null
        });
        if (error) return { success: false, reason: error.message, debug: error };
        await refreshUsers();
        return { success: true };
    };

    const submitReport = async ({ targetType, targetId, reason, details }) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const payload = {
            reporter_id: user.id,
            target_type: targetType,
            target_id: targetId,
            reason: String(reason || '').trim(),
            details: details ? String(details).trim() : null,
            status: 'open'
        };
        if (!payload.target_type || !payload.target_id || !payload.reason) {
            return { success: false, reason: 'Missing report fields' };
        }
        const row = await insertRow('reports', payload);
        return row ? { success: true, report: row } : { success: false, reason: getLastSupabaseError()?.message || 'Failed to submit report' };
    };

    const getModerationReports = async () => {
        if (!canModerate) return [];
        const { data, error } = await supabase
            .from('reports')
            .select('*, reporter:profiles!reports_reporter_id_fkey(username, avatar_url), reviewer:profiles!reports_reviewed_by_fkey(username)')
            .order('created_at', { ascending: false });
        if (error) {
            console.warn('[getModerationReports] Failed:', error);
            return [];
        }
        return data || [];
    };

    const reviewReport = async (reportId, actionNotes = '', status = 'resolved') => {
        if (!canModerate) return { success: false, reason: 'Moderator access required' };
        const { error } = await supabase
            .from('reports')
            .update({
                status,
                review_notes: actionNotes || null,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', reportId);
        if (error) return { success: false, reason: error.message, debug: error };
        return { success: true };
    };

    const deleteIdeaModeration = async (ideaId) => {
        if (!canModerate) return { success: false, reason: 'Moderator access required' };
        const { error } = await supabase.from('ideas').delete().eq('id', ideaId);
        if (error) return { success: false, reason: error.message, debug: error };
        await refreshIdeas();
        return { success: true };
    };

    const getSystemStats = async () => {
        if (!canModerate) return { users: 0, ideas: 0, pendingReports: 0 };
        const [usersCount, ideasCount, reportsCount] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('ideas').select('*', { count: 'exact', head: true }),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open')
        ]);
        return {
            totalUsers: usersCount.count || 0,
            totalIdeas: ideasCount.count || 0,
            pendingReports: reportsCount.count || 0,
            activeUsers: 0,
            dbSize: 0
        };
    };
    const backupDatabase = async () => { console.log('backupDatabase'); };
    const resetDatabase = async () => { console.log('resetDatabase'); };
    const seedDatabase = async () => { console.log('seedDatabase'); };

    // ─── Mentorship (Stubs/Placeholders) ────────────────────────
    const toggleMentorshipStatus = async () => {
        if (!user) return;
        const mentorshipData = user.mentorship_data || {};
        const newStatus = !mentorshipData.is_mentor;
        await updateRow('profiles', user.id, { mentorship_data: { ...mentorshipData, is_mentor: newStatus } });
        await refreshUsers();
    };
    const voteMentor = async (mentorId) => { console.log('voteMentor', mentorId); return { success: true }; };

    // ─── Context Value ──────────────────────────────────────────
    return (
        <AppContext.Provider value={{
            user, ideas, allUsers, login, register, logout, updateProfile, saveAvatarUrl, submitIdea, voteIdea, loading,
            authDiagnostics, clearAuthDiagnostics,
            uploadAvatar, uploadIdeaImage,
            currentPage, setCurrentPage,
            isFormOpen, setIsFormOpen, draftTitle, setDraftTitle, draftData, setDraftData,
            getDiscussions, addDiscussion, voteDiscussion, votedDiscussionIds,
            // [NEW] Discussion Comments
            selectedDiscussion, setSelectedDiscussion,
            getDiscussionComments, addDiscussionComment, voteDiscussionComment,

            // Chat
            getChatMessages, sendChatMessage,
            newlyCreatedIdeaId, clearNewIdeaId, refreshIdeas,
            incrementIdeaViews, incrementIdeaShares,
            followUser, sendDirectMessage, getDirectMessages, openMessenger,
            showMessaging, setShowMessaging, messagingUserId, setMessagingUserId,
            getRedTeamAnalyses, addRedTeamAnalysis, voteRedTeamAnalysis,
            getAMAQuestions, askAMAQuestion, answerAMAQuestion,
            getResources, pledgeResource, updateResourceStatus, getIdeaWikiEntries, addIdeaWikiEntry,
            getApplications, applyForRole, updateApplicationStatus,
            getGroups, createGroup, joinGroup, getUserGroup,
            getNotifications, addNotification, markNotificationRead, markAllNotificationsRead,
            forkIdea, getForksOf,
            tipUser, stakeOnIdea, boostIdea,
            saveIdea, getSavedIdeas, savedIdeaIds,
            voteFeasibility,
            // toggleMentorshipStatus, voteMentor, // Moved to end
            selectedProfileUserId, setSelectedProfileUserId, viewProfile,
            votedIdeaIds, downvotedIdeaIds,
            votedCommentIds, downvotedCommentIds, // [NEW] Exported state
            getIdeaComments, addIdeaComment, voteIdeaComment,
            guides, voteGuide, addGuide, getGuideComments, addGuideComment, votedGuideIds,
            developerMode, toggleDeveloperMode: () => setDeveloperMode(prev => !prev),
            requestCategory, getCategoryRequests, approveCategoryRequest, rejectCategoryRequest,
            leaveGroup, getGroupPosts, addGroupPost, getGroupChat, sendGroupChat, getGroupWiki, saveGroupWiki,
            getGroupMedia, addGroupMedia,
            getFeaturedIdea,
            getCoinsGiven,
            getLeaderboard, getUserActivity, refreshUsers,
            getProfileFresh,
            selectedIdea, setSelectedIdea,
            isAdmin,
            isModerator, canModerate,
            isDarkMode, toggleTheme,
            banUser, unbanUser, assignUserRole, getSystemStats, backupDatabase, resetDatabase, seedDatabase,
            submitReport, getModerationReports, reviewReport, deleteIdeaModeration,
            toggleMentorshipStatus, voteMentor
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
