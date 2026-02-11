import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchRows, fetchSingle, insertRow, updateRow, deleteRows, upsertRow } from './supabaseHelpers';
import founderImage from '../assets/founder.png';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [ideas, setIdeas] = useState([]);
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
    const [isDarkMode, setIsDarkMode] = useState(false);

    const viewProfile = (userId) => setSelectedProfileUserId(userId);
    const isAdmin = user?.role === 'admin';

    // ─── Profile Column Mapping (DB ↔ App) ────────────────────
    // DB uses snake_case: avatar_url, border_color, coins
    // App uses camelCase: avatar, borderColor, cash
    const normalizeProfile = (p) => {
        if (!p) return p;
        return {
            ...p,
            avatar: p.avatar_url ?? p.avatar ?? '',
            borderColor: p.border_color ?? p.borderColor ?? '#7d5fff',
            cash: p.coins ?? p.cash ?? 0,
        };
    };

    const denormalizeProfile = (updates) => {
        const mapped = { ...updates };
        if ('avatar' in mapped) { mapped.avatar_url = mapped.avatar; delete mapped.avatar; }
        if ('borderColor' in mapped) { mapped.border_color = mapped.borderColor; delete mapped.borderColor; }
        if ('cash' in mapped) { mapped.coins = mapped.cash; delete mapped.cash; }
        return mapped;
    };

    // ─── Internal Helpers ───────────────────────────────────────
    const fetchProfile = async (userId) => {
        const raw = await fetchSingle('profiles', { id: userId });
        return normalizeProfile(raw);
    };

    // ─── Storage Uploads ────────────────────────────────────────
    const uploadAvatar = async (file, userId) => {
        if (!file || !userId) return null;
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/avatar_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (error) { console.error('[Storage] uploadAvatar:', error.message); return null; }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
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
        const data = await fetchRows('ideas', {}, { order: { column: 'created_at', ascending: false } });
        setIdeas(data);
    };
    const refreshGuides = async () => {
        const data = await fetchRows('guides', {}, { order: { column: 'created_at', ascending: false } });
        setGuides(data);
    };
    const refreshUsers = async () => {
        const data = await fetchRows('profiles');
        setAllUsers(data.map(normalizeProfile));
    };

    const loadUserVotes = async (userId) => {
        const [up, down, saved, disc, gv] = await Promise.all([
            fetchRows('idea_votes', { user_id: userId, direction: 'up' }),
            fetchRows('idea_votes', { user_id: userId, direction: 'down' }),
            fetchRows('bounty_saves', { user_id: userId }),
            fetchRows('discussion_votes', { user_id: userId }),
            fetchRows('guide_votes', { user_id: userId })
        ]);
        setVotedIdeaIds(up.map(v => v.idea_id));
        setDownvotedIdeaIds(down.map(v => v.idea_id));
        setSavedBountyIds(saved.map(v => v.bounty_id));
        setVotedDiscussionIds(disc.map(v => v.discussion_id));
        const gMap = {};
        gv.forEach(v => { gMap[v.guide_id] = v.direction; });
        setVotedGuideIds(gMap);
    };

    // ─── Init & Auth Listener ───────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    if (profile) {
                        setUser(profile);
                        if (profile.darkMode) setIsDarkMode(true);
                        await loadUserVotes(profile.id);
                    }
                }
                await Promise.all([refreshIdeas(), refreshGuides(), refreshUsers()]);
            } catch (err) {
                console.error('[AppContext] init error:', err);
            } finally {
                setLoading(false);
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    if (profile) { setUser(profile); await loadUserVotes(profile.id); }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setVotedIdeaIds([]); setDownvotedIdeaIds([]);
                    setSavedBountyIds([]); setVotedDiscussionIds([]);
                    setVotedGuideIds({});
                }
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    // ─── Dark Mode ──────────────────────────────────────────────
    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (user) await updateProfile({ darkMode: newMode });
    };

    // ─── Auth ───────────────────────────────────────────────────
    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, reason: error.message };
        const profile = await fetchProfile(data.user.id);
        if (!profile) return { success: false, reason: 'Profile not found' };
        setUser(profile);
        await loadUserVotes(profile.id);
        if (profile.darkMode !== undefined) setIsDarkMode(profile.darkMode);
        return { success: true, user: profile };
    };

    const register = async ({ email, password, username, avatarFile, ...profileData }) => {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) return { success: false, reason: error.message };

            // Supabase v2: duplicate email returns fake user with empty identities
            if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
                return { success: false, reason: 'An account with this email already exists.' };
            }

            // Upload avatar file if provided, otherwise use generated URL
            let avatarUrl = profileData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff`;
            if (avatarFile) {
                const uploaded = await uploadAvatar(avatarFile, data.user.id);
                if (uploaded) avatarUrl = uploaded;
            }

            const newProfile = await insertRow('profiles', {
                id: data.user.id, username, email,
                bio: profileData.bio || '',
                skills: profileData.skills || [],
                location: profileData.location || '',
                avatar_url: avatarUrl,
                influence: 10, coins: 0, role: 'user',
                followers: [], following: [], submissions: 0, badges: [],
                border_color: '#7d5fff',
            });
            if (!newProfile) return { success: false, reason: 'Failed to create profile — check column names in Supabase.' };
            const normalized = normalizeProfile(newProfile);
            setUser(normalized);
            setAllUsers(prev => [...prev, normalized]);
            return { success: true, user: normalized };
        } catch (err) {
            console.error('[Register] unexpected error:', err);
            return { success: false, reason: err.message || 'Registration failed unexpectedly' };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const updateProfile = async (updatedData) => {
        if (!user) return { success: false, reason: 'Not logged in' };
        const dbData = denormalizeProfile(updatedData);
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
        }
        const profile = await fetchProfile(user.id);
        setUser(profile);
        await refreshUsers();
        return { success: true, user: profile };
    };

    // ─── Messaging ──────────────────────────────────────────────
    const sendDirectMessage = async (toId, text) => {
        if (!user) return null;
        return await insertRow('messages', {
            from_id: user.id, to_id: toId, text,
            sender_name: user.username, sender_avatar: user.avatar,
        });
    };

    const getDirectMessages = async () => {
        if (!user) return [];
        const { data } = await supabase.from('messages').select('*')
            .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
            .order('created_at', { ascending: true });
        return data || [];
    };

    const openMessenger = (userId = null) => {
        setMessagingUserId(userId);
        setShowMessaging(true);
    };

    // ─── Ideas ──────────────────────────────────────────────────
    const submitIdea = async (ideaData) => {
        if (!user) return null;
        const newIdea = await insertRow('ideas', {
            ...ideaData,
            author_id: user.id, author: user.username, authorAvatar: user.avatar,
            votes: 0, forks: 0, views: 0,
        });
        if (!newIdea) return null;
        setIdeas(prev => [newIdea, ...prev]);
        setNewlyCreatedIdeaId(newIdea.id);
        await updateProfile({ submissions: (user.submissions || 0) + 1 });
        return newIdea;
    };

    const clearNewIdeaId = () => setNewlyCreatedIdeaId(null);

    const voteIdea = async (ideaId, direction = 'up') => {
        if (!user) return alert('Must be logged in to vote');
        const existing = await fetchRows('idea_votes', { idea_id: ideaId, user_id: user.id });
        if (existing.length > 0) {
            if (existing[0].direction === direction) {
                await deleteRows('idea_votes', { id: existing[0].id });
            } else {
                await updateRow('idea_votes', existing[0].id, { direction });
            }
        } else {
            await insertRow('idea_votes', { idea_id: ideaId, user_id: user.id, direction });
        }
        // Recount
        const ups = await fetchRows('idea_votes', { idea_id: ideaId, direction: 'up' });
        const downs = await fetchRows('idea_votes', { idea_id: ideaId, direction: 'down' });
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
        await upsertRow('discussion_votes', {
            discussion_id: discussionId, user_id: user.id, direction,
        }, { onConflict: 'discussion_id,user_id' });
        const ups = await fetchRows('discussion_votes', { discussion_id: discussionId, direction: 'up' });
        const downs = await fetchRows('discussion_votes', { discussion_id: discussionId, direction: 'down' });
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
    const getRedTeamAnalyses = async (ideaId) => fetchRows('red_team_analyses', { idea_id: ideaId });
    const addRedTeamAnalysis = async (data) => insertRow('red_team_analyses', data);
    const voteRedTeamAnalysis = async (ideaId, analysisId, direction) => {
        const a = await fetchSingle('red_team_analyses', { id: analysisId });
        if (!a) return null;
        return await updateRow('red_team_analyses', analysisId, { votes: (a.votes || 0) + (direction === 'up' ? 1 : -1) });
    };

    // ─── AMA ────────────────────────────────────────────────────
    const getAMAQuestions = async (ideaId) => fetchRows('ama_questions', { idea_id: ideaId });
    const askAMAQuestion = async (data) => insertRow('ama_questions', data);
    const answerAMAQuestion = async (ideaId, questionId, answer, commitment) => updateRow('ama_questions', questionId, { answer, commitment });

    // ─── Resources ──────────────────────────────────────────────
    const getResources = async (ideaId) => fetchRows('resources', { idea_id: ideaId });
    const pledgeResource = async (data) => insertRow('resources', data);
    const updateResourceStatus = async (ideaId, resourceId, status) => updateRow('resources', resourceId, { status });

    // ─── Applications ───────────────────────────────────────────
    const getApplications = async (ideaId) => fetchRows('applications', { idea_id: ideaId });
    const applyForRole = async (data) => insertRow('applications', data);
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
        return await fetchRows('notifications', { user_id: user.id }, { order: { column: 'created_at', ascending: false } });
    };
    const addNotification = async (data) => insertRow('notifications', data);
    const markNotificationRead = async (notifId) => updateRow('notifications', notifId, { is_read: true });
    const markAllNotificationsRead = async () => {
        if (!user) return null;
        const { error } = await supabase.from('notifications')
            .update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
        if (error) console.error('[Supabase] markAllRead:', error.message);
    };

    // ─── Forking ────────────────────────────────────────────────
    const forkIdea = async (ideaId) => {
        if (!user) return { success: false, error: 'Must be logged in' };
        const original = ideas.find(i => i.id === ideaId);
        if (!original) return { success: false, error: 'Idea not found' };
        const forkedIdea = await insertRow('ideas', {
            ...original, id: undefined, // let Supabase generate
            parentIdeaId: ideaId, forkedFrom: original.author,
            author: user.username, authorAvatar: user.avatar, author_id: user.id,
            votes: 0, forks: 0, views: 0,
            title: `[Fork] ${original.title}`,
        });
        if (!forkedIdea) return { success: false, error: 'Fork failed' };
        await refreshIdeas();
        return { success: true, idea: forkedIdea };
    };
    const getForksOf = async (ideaId) => fetchRows('ideas', { parentIdeaId: ideaId });

    // ─── Economy ────────────────────────────────────────────────
    const tipUser = async (toId, amount) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        if ((user.influence || 0) < amount) return { success: false, reason: 'Not enough influence' };
        // Deduct from sender
        const updated = await updateRow('profiles', user.id, { influence: (user.influence || 0) - amount });
        // Add to receiver
        const target = await fetchProfile(toId);
        if (target) await updateRow('profiles', toId, { influence: (target.influence || 0) + amount });
        if (updated) setUser(updated);
        return { success: true, newBalance: (user.influence || 0) - amount };
    };

    const stakeOnIdea = async (ideaId, amount) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        if ((user.cash || 0) < amount) return { success: false, reason: 'Insufficient funds' };
        await insertRow('stakes', { user_id: user.id, idea_id: ideaId, amount });
        const updated = await updateRow('profiles', user.id, { coins: (user.cash || 0) - amount });
        if (updated) setUser(normalizeProfile(updated));
        await refreshIdeas();
        return { success: true, newBalance: (user.cash || 0) - amount };
    };

    const boostIdea = async (ideaId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const boostCost = 5;
        if ((user.influence || 0) < boostCost) return { success: false, reason: 'Not enough influence' };
        const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await updateRow('ideas', ideaId, { boostedUntil });
        const updated = await updateRow('profiles', user.id, { influence: (user.influence || 0) - boostCost });
        if (updated) setUser(updated);
        await refreshIdeas();
        return { success: true, user: updated };
    };

    // ─── Bounties ───────────────────────────────────────────────
    const getBounties = async (ideaId) => fetchRows('bounties', { idea_id: ideaId });
    const getAllBounties = async () => fetchRows('bounties');
    const addBounty = async (bountyData) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const row = await insertRow('bounties', { ...bountyData, creator: user.username });
        return row ? { success: true, bounty: row } : { success: false, reason: 'Insert failed' };
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
    const claimBounty = async (bountyId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        return await updateRow('bounties', bountyId, { claimed_by: user.id, status: 'claimed' });
    };
    const completeBounty = async (bountyId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        return await updateRow('bounties', bountyId, { status: 'completed' });
    };

    const voteFeasibility = async (ideaId, userId, score) => {
        await upsertRow('feasibility_votes', {
            idea_id: ideaId, user_id: userId, score,
        }, { onConflict: 'idea_id,user_id' });
        await refreshIdeas();
        return { success: true };
    };

    // ─── Mentorship ─────────────────────────────────────────────
    const toggleMentorshipStatus = async (type, value) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        const mentorData = { ...(user.mentorshipData || {}), [type]: value };
        const updated = await updateProfile({ mentorshipData: mentorData });
        return updated;
    };

    const voteMentor = async (mentorId) => {
        if (!user) return { success: false, reason: 'Must be logged in' };
        return await insertRow('mentor_votes', { voter_id: user.id, mentor_id: mentorId });
    };

    // ─── Guides ─────────────────────────────────────────────────
    const voteGuide = async (guideId, direction = 'up') => {
        if (!user) { alert('Must be logged in to vote'); return { success: false }; }
        await upsertRow('guide_votes', {
            guide_id: guideId, user_id: user.id, direction,
        }, { onConflict: 'guide_id,user_id' });
        await refreshGuides();
        setVotedGuideIds(Object.fromEntries(
            (await fetchRows('guide_votes', { user_id: user.id })).map(v => [v.guide_id, v.direction])
        ));
        return { success: true };
    };

    const addGuide = async (guideData) => {
        if (!user) { alert('Must be logged in to create a guide'); return null; }
        const newGuide = await insertRow('guides', {
            ...guideData, author: user.username, authorAvatar: user.avatar, votes: 0,
        });
        if (newGuide) setGuides(prev => [newGuide, ...prev]);
        return newGuide;
    };

    const getGuideComments = async (guideId) => fetchRows('guide_comments', { guide_id: guideId }, { order: { column: 'created_at', ascending: true } });

    const addGuideComment = async (guideId, text) => {
        if (!user) { alert('Login required'); return null; }
        const newComment = await insertRow('guide_comments', {
            guide_id: guideId, text, author: user.username, authorAvatar: user.avatar,
        });
        if (newComment) {
            setGuides(prev => prev.map(g => g.id === guideId
                ? { ...g, comments: [...(g.comments || []), newComment] } : g));
        }
        return newComment;
    };

    // ─── Clans ──────────────────────────────────────────────────
    const getClans = async () => fetchRows('clans');
    const joinClan = async (clanId, userId) => insertRow('clan_members', { clan_id: clanId, user_id: userId });
    const leaveClan = async (userId) => deleteRows('clan_members', { user_id: userId });

    // ─── Leaderboard & Activity ─────────────────────────────────
    const getLeaderboard = async () => {
        return await fetchRows('profiles', {}, {
            order: { column: 'influence', ascending: false }, limit: 50,
        });
    };
    const getUserActivity = async (userId) => fetchRows('activity_log', { user_id: userId }, { order: { column: 'created_at', ascending: false } });

    // ─── Admin / Dev Tools ──────────────────────────────────────
    const banUser = async (userId) => updateRow('profiles', userId, { banned: true });
    const unbanUser = async (userId) => updateRow('profiles', userId, { banned: false });

    const getSystemStats = async () => {
        const [i, u, d] = await Promise.all([
            fetchRows('ideas'), fetchRows('profiles'), fetchRows('discussions'),
        ]);
        return { ideas: i.length, users: u.length, discussions: d.length };
    };

    const backupDatabase = async () => { console.log('[Admin] Backup triggered — use Supabase dashboard for real backups.'); return { success: true }; };
    const resetDatabase = async () => { console.warn('[Admin] Reset is disabled in production.'); return { success: false }; };
    const seedDatabase = async () => { console.log('[Admin] Seed is disabled — use SQL scripts in Supabase dashboard.'); return { success: false }; };

    // ─── Context Value ──────────────────────────────────────────
    return (
        <AppContext.Provider value={{
            user, ideas, allUsers, login, register, logout, updateProfile, submitIdea, voteIdea, loading,
            uploadAvatar, uploadIdeaImage,
            currentPage, setCurrentPage,
            isFormOpen, setIsFormOpen, draftTitle, setDraftTitle, draftData, setDraftData,
            getDiscussions, addDiscussion, voteDiscussion, votedDiscussionIds, getChatMessages, sendChatMessage,
            newlyCreatedIdeaId, clearNewIdeaId,
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
            guides, voteGuide, addGuide, getGuideComments, addGuideComment, votedGuideIds,
            developerMode, toggleDeveloperMode: () => setDeveloperMode(prev => !prev),
            requestCategory, getCategoryRequests, approveCategoryRequest, rejectCategoryRequest,
            getClans, joinClan, leaveClan,
            getLeaderboard, getUserActivity,
            selectedIdea, setSelectedIdea,
            isAdmin,
            isDarkMode, toggleTheme,
            banUser, unbanUser, getSystemStats, backupDatabase, resetDatabase, seedDatabase,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
