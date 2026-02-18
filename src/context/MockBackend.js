// Mock Backend to simulate DB interaction via LocalStorage

const DB_KEYS = {
    IDEAS: 'woi_ideas',
    CURRENT_USER: 'woi_current_user',
    USERS: 'woi_users',
    VOTES: 'woi_votes',
    DISCUSSIONS: 'woi_discussions',
    CHATS: 'woi_chats',
    RED_TEAM: 'woi_red_team',
    AMA: 'woi_ama',
    RESOURCES: 'woi_resources',
    APPLICATIONS: 'woi_applications',
    GROUPS: 'woi_groups',
    NOTIFICATIONS: 'woi_notifications',
    GUIDES: 'woi_guides', // Added
    CLANS: 'woi_clans' // Added
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const DAILY_INFLUENCE = 10;
const VOTE_COST = 1;

export const MockBackend = {
    // --- Clans ---
    getClans: () => {
        let clans = localStorage.getItem(DB_KEYS.CLANS);
        if (!clans) {
            const mocks = [
                {
                    id: 'c1',
                    name: 'Technomancers',
                    description: 'Builders of the digital frontier. Integrating AI and blockchain.',
                    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
                    members: ['atlas_id'],
                    color: '#00d2d3'
                },
                {
                    id: 'c2',
                    name: 'Green Guardians',
                    description: 'Stewards of the earth. Permaculture and solarpunk advocates.',
                    banner: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
                    members: ['nova_id'],
                    color: '#26de81'
                },
                {
                    id: 'c3',
                    name: 'Void Walkers',
                    description: 'Explorers of the unknown. Space, deep sea, and consciousness.',
                    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
                    members: ['campton_id'],
                    color: '#a55eea'
                }
            ];
            clans = JSON.stringify(mocks);
            localStorage.setItem(DB_KEYS.CLANS, clans);
        }
        return JSON.parse(clans);
    },

    joinClan: (clanId, userId) => {
        const clans = MockBackend.getClans();
        const users = MockBackend.getUsers();

        // Remove user from old clan
        clans.forEach(c => {
            c.members = c.members.filter(id => id !== userId);
        });

        // Add to new clan
        const clan = clans.find(c => c.id === clanId);
        if (clan) {
            clan.members.push(userId);
            localStorage.setItem(DB_KEYS.CLANS, JSON.stringify(clans));

            // Update user profile
            const userIdx = users.findIndex(u => u.id === userId);
            if (userIdx !== -1) {
                users[userIdx].clanId = clanId;
                localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

                // Update session if it's current user
                const currentUser = MockBackend.getCurrentUser();
                if (currentUser && currentUser.id === userId) {
                    currentUser.clanId = clanId;
                    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(currentUser));
                }
            }
            return { success: true, clan, user: users[userIdx] };
        }
        return { success: false };
    },

    leaveClan: (userId) => {
        const clans = MockBackend.getClans();
        const users = MockBackend.getUsers();

        clans.forEach(c => {
            c.members = c.members.filter(id => id !== userId);
        });
        localStorage.setItem(DB_KEYS.CLANS, JSON.stringify(clans));

        const userIdx = users.findIndex(u => u.id === userId);
        if (userIdx !== -1) {
            users[userIdx].clanId = null;
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

            const currentUser = MockBackend.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                currentUser.clanId = null;
                localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(currentUser));
            }
            return { success: true, user: users[userIdx] };
        }
        return { success: false };
    },

    getLeaderboard: () => {
        const users = MockBackend.getUsers();
        const ideas = MockBackend.getIdeas();
        const clans = MockBackend.getClans();

        // Top Users
        const topUsers = [...users].sort((a, b) => b.influence - a.influence).slice(0, 10);

        // Top Ideas
        const topIdeas = [...ideas].sort((a, b) => b.votes - a.votes).slice(0, 10);

        // Top Clans (by total influence of members)
        const clanStats = clans.map(c => {
            const totalRep = c.members.reduce((acc, userId) => {
                const u = users.find(user => user.id === userId);
                return acc + (u ? u.influence : 0);
            }, 0);
            return { ...c, totalRep };
        }).sort((a, b) => b.totalRep - a.totalRep);

        return { topUsers, topIdeas, topClans: clanStats };
    },

    getUserActivity: (userId) => {
        const ideas = MockBackend.getIdeas();
        const votes = MockBackend.getUserVotes(userId);

        const myIdeas = ideas.filter(i => i.author === userId || (i.author === 'Campton' && userId === 'campton_id')); // Hack for username match
        const sparksGiven = ideas.filter(i => votes.includes(i.id));
        const myForks = ideas.filter(i => i.forkedBy === (userId === 'campton_id' ? 'Campton' : 'User')); // Approximate

        return { myIdeas, sparksGiven, myForks };
    },

    getUserDiscussionVotes: (userId) => {
        const votes = JSON.parse(localStorage.getItem('woi_discussion_votes') || '{}');
        return votes[userId] || [];
    },

    // --- Discussions (Reddit-style) ---
    getDiscussions: (category) => {
        let discussions = localStorage.getItem(DB_KEYS.DISCUSSIONS);
        if (!discussions) {
            // Mock Data
            const mocks = [
                { id: 'd1', category: 'invention', title: "Best material for solar casing?", author: "SolarDev", votes: 12, comments: 4, timestamp: Date.now() - 1000000 },
                { id: 'd2', category: 'invention', title: "Anyone working on modular batteries?", author: "EnergyFreak", votes: 8, comments: 2, timestamp: Date.now() - 500000 },
                { id: 'd3', category: 'policy', title: "Legal frameworks for UBI implementation", author: "LawNerd", votes: 45, comments: 21, timestamp: Date.now() - 200000 },
                { id: 'd4', category: 'gaming', title: "LFG: City Sim alpha testers needed", author: "GameMaster", votes: 5, comments: 0, timestamp: Date.now() - 10000 }
            ];
            discussions = JSON.stringify(mocks);
            localStorage.setItem(DB_KEYS.DISCUSSIONS, discussions);
        }
        const parsed = JSON.parse(discussions);
        return category === 'all' ? parsed : parsed.filter(d => d.category === category);
    },

    addDiscussion: (thread) => {
        const discussions = JSON.parse(localStorage.getItem(DB_KEYS.DISCUSSIONS) || '[]');
        const newThread = {
            id: generateId(),
            votes: 1,
            comments: 0,
            timestamp: Date.now(),
            ...thread
        };
        discussions.unshift(newThread);
        localStorage.setItem(DB_KEYS.DISCUSSIONS, JSON.stringify(discussions));
        return newThread;
    },

    // --- Guides / Write-ups ---
    getGuides: () => {
        let guides = localStorage.getItem(DB_KEYS.GUIDES);
        if (!guides) {
            const mocks = [
                {
                    id: 'guide1',
                    title: "How to Build a Solar Generator in 3 Steps",
                    author: "SolInvictus",
                    authorAvatar: null,
                    snippet: "A complete walkthrough for absolute beginners. Parts list included under $500.",
                    votes: 156,
                    views: 1200,
                    category: 'Invention',
                    timestamp: Date.now() - 86400000
                },
                {
                    id: 'guide2',
                    title: "Navigating IP Law for Open Source Hardware",
                    author: "LunaLegal",
                    authorAvatar: null,
                    snippet: "Don't get sued. Here is the legal framework for sharing your hardware designs safely.",
                    votes: 89,
                    views: 850,
                    category: 'Policy',
                    timestamp: Date.now() - 172800000
                },
                {
                    id: 'guide3',
                    title: "Permaculture 101: Urban Balcony Edition",
                    author: "NovaScout",
                    authorAvatar: null,
                    snippet: "Turn your 5ft balcony into a food forest. Layering techniques and plant selection.",
                    votes: 210,
                    views: 3400,
                    category: 'Ecology',
                    timestamp: Date.now() - 259200000
                }
            ];
            guides = JSON.stringify(mocks);
            localStorage.setItem(DB_KEYS.GUIDES, guides);
        }
        return JSON.parse(guides);
    },

    addGuide: (guideData) => {
        const guides = JSON.parse(localStorage.getItem(DB_KEYS.GUIDES) || '[]');
        const newGuide = {
            id: generateId(),
            votes: 0,
            views: 0,
            timestamp: Date.now(),
            ...guideData
        };
        guides.unshift(newGuide);
        localStorage.setItem(DB_KEYS.GUIDES, JSON.stringify(guides));
        return newGuide;
    },

    getUserGuideVotes: (userId) => {
        const votes = JSON.parse(localStorage.getItem('woi_guide_votes') || '{}');
        const userVotes = votes[userId] || {}; // { guideId: 'up' | 'down' }
        return userVotes;
    },

    voteGuide: (guideId, userId, direction) => {
        const guides = JSON.parse(localStorage.getItem(DB_KEYS.GUIDES) || '[]');
        const index = guides.findIndex(g => g.id === guideId);
        if (index === -1) return { success: false };

        const votes = JSON.parse(localStorage.getItem('woi_guide_votes') || '{}');
        const userVotes = votes[userId] || {};
        const oldVote = userVotes[guideId]; // 'up' or 'down' (or undefined)

        // Simple Toggle Logic for now
        // if oldVote == direction -> remove vote? 
        // For now, let's just assume simple upvote/downvote increment without complex toggle removal for speed
        // Actually, let's just do it right

        if (oldVote === direction) {
            // No change (or toggle off) - let's just return success without changing
            return { success: true };
        }

        if (direction === 'up') {
            guides[index].votes++;
            if (oldVote === 'down') guides[index].votes++; // recover the downvote
        } else {
            guides[index].votes--;
            if (oldVote === 'up') guides[index].votes--; // recover the upvote
        }

        userVotes[guideId] = direction;
        votes[userId] = userVotes;

        localStorage.setItem('woi_guide_votes', JSON.stringify(votes));
        localStorage.setItem(DB_KEYS.GUIDES, JSON.stringify(guides));

        return { success: true, guide: guides[index], userVotes };
    },

    getGuideComments: (guideId) => {
        const guides = JSON.parse(localStorage.getItem(DB_KEYS.GUIDES) || '[]');
        const guide = guides.find(g => g.id === guideId);
        return guide ? (guide.comments || []) : [];
    },

    addGuideComment: (guideId, comment) => {
        const guides = JSON.parse(localStorage.getItem(DB_KEYS.GUIDES) || '[]');
        const index = guides.findIndex(g => g.id === guideId);
        if (index === -1) return null;

        const newComment = {
            id: generateId(),
            text: comment.text,
            author: comment.author,
            authorAvatar: comment.authorAvatar,
            timestamp: Date.now()
        };

        if (!guides[index].comments) guides[index].comments = [];
        guides[index].comments.push(newComment);

        localStorage.setItem(DB_KEYS.GUIDES, JSON.stringify(guides));
        return newComment;
    },

    // --- Live Chat ---
    getChatMessages: (ideaId) => {
        const allChats = JSON.parse(localStorage.getItem(DB_KEYS.CHATS) || '{}');
        return allChats[ideaId] || [];
    },

    sendChatMessage: (ideaId, message) => {
        const allChats = JSON.parse(localStorage.getItem(DB_KEYS.CHATS) || '{}');
        if (!allChats[ideaId]) allChats[ideaId] = [];

        const newMsg = {
            id: generateId(),
            ...message,
            timestamp: Date.now()
        };

        allChats[ideaId].push(newMsg);

        // Limit history to 50 messages
        if (allChats[ideaId].length > 50) allChats[ideaId].shift();

        localStorage.setItem(DB_KEYS.CHATS, JSON.stringify(allChats));
        return newMsg;
    },

    // --- Ideas ---
    getIdeas: () => {
        let ideas = localStorage.getItem(DB_KEYS.IDEAS);
        if (!ideas) {
            // Populate random examples for Dev/MVP
            const examples = [
                { id: generateId(), type: 'invention', title: "Micro-Modular Solar Grids", solution: "Interlocking solar tiles that anyone can plug into a neighborhood micro-grid without permits.", votes: 42, forks: 5, commentCount: 12, timestamp: Date.now() - 100000, isLocal: true, location: { city: "Miami, FL", lat: 25.7617, lng: -80.1918 } },
                { id: generateId(), type: 'policy', title: "Universal Creative Income", proposedChange: "A 1% tech-tax distribution to anyone publishing creative commons art daily.", votes: 89, forks: 14, commentCount: 45, timestamp: Date.now() - 50000 },
                { id: generateId(), type: 'infrastructure', title: "Underground Maglev Logistics", utility: "Replacing semi-trucks with subterranean freight tubes.", votes: 120, forks: 2, commentCount: 8, timestamp: Date.now() - 200000 },
                { id: generateId(), type: 'entertainment', title: "Decentralized Interactive Film", utility: "Movies where every scene choice is voted on by token holders.", votes: 65, forks: 22, commentCount: 156, timestamp: Date.now() - 15000 },
                { id: generateId(), type: 'philosophy', title: "The Ethics of Digital Eternity", utility: "Legal rights for AI-generated personas of deceased relatives.", votes: 33, forks: 0, commentCount: 4, timestamp: Date.now() - 300000 },
                { id: generateId(), type: 'policy', title: "Federal Right to Disconnect", proposedChange: "Illegal for bosses to email after 6pm. Fines go to employee.", votes: 210, forks: 45, commentCount: 312, timestamp: Date.now() - 4000000 },
                { id: generateId(), type: 'business', title: "DAO-Managed Food Truck Franchise", solution: "Community-owned mobile kitchens where profits are split via smart contracts.", problem: "High startup costs prevent culinary entrepreneurs from launching.", utility: "Token holders vote on menu and location schedules.", votes: 78, forks: 8, commentCount: 34, timestamp: Date.now() - 800000, isLocal: true, location: { city: "Austin, TX", lat: 30.2672, lng: -97.7431 } },
                { id: generateId(), type: 'business', title: "Hyperlocal Skill-Sharing Marketplace", solution: "App connecting neighbors for micro-services (lawn care, tutoring, repairs) with time-banking.", problem: "Gig economy takes 20-30% of worker income.", utility: "Zero platform fees; reputation is portable across communities.", votes: 156, forks: 12, commentCount: 89, timestamp: Date.now() - 600000 },
                { id: generateId(), type: 'apps', title: "Open-Source City Planning Simulator", solution: "A SimCity-style app where citizens can simulate zoning changes and see projected outcomes.", problem: "City planning feels opaque to residents.", utility: "Export proposals directly to city council.", votes: 94, forks: 7, commentCount: 28, timestamp: Date.now() - 450000 },
                { id: generateId(), type: 'apps', title: "Decentralized Voting dApp", solution: "Blockchain-based voting app for HOAs, clubs, and small orgs with verifiable results.", problem: "Traditional voting is slow and hard to audit.", utility: "Works offline, syncs when connected.", votes: 187, forks: 23, commentCount: 112, timestamp: Date.now() - 350000 },
                { id: generateId(), type: 'philanthropy', title: "Micro-Grant Network for Rural Farms", solution: "Platform matching small donors with family farms needing equipment under $500.", problem: "Traditional grants have too much overhead for small amounts.", utility: "100% of donations go to farmers; admin funded separately.", votes: 134, forks: 9, commentCount: 56, timestamp: Date.now() - 520000 },
                { id: generateId(), type: 'philanthropy', title: "Refugee Skill-Matching Program", solution: "Database connecting displaced professionals with remote work opportunities in their field.", problem: "Refugees' professional skills are underutilized.", utility: "Partnering with UNHCR for verification.", votes: 221, forks: 31, commentCount: 178, timestamp: Date.now() - 700000 },
                { id: generateId(), type: 'education', title: "AI Tutor for Rural Schools", solution: "Offline-capable AI assistant pre-loaded with curriculum for areas with poor internet.", problem: "Rural students lack access to quality tutoring.", utility: "Solar-powered tablets with 2-year battery life.", votes: 167, forks: 14, commentCount: 67, timestamp: Date.now() - 480000 },
                { id: generateId(), type: 'education', title: "Trade Skills Apprenticeship DAO", solution: "Blockchain-verified apprenticeship program matching skilled tradespeople with learners.", problem: "Trade skills are dying out; formal programs are expensive.", utility: "Masters earn tokens for teaching; apprentices earn credentials.", votes: 89, forks: 6, commentCount: 41, timestamp: Date.now() - 380000 },
                { id: generateId(), type: 'ecology', title: "Urban Mycoremediation Network", solution: "Deploy mushroom beds in polluted urban lots to break down toxins naturally.", problem: "Brownfield sites sit unused due to cleanup costs.", utility: "Mycelium networks monitored via IoT sensors.", votes: 145, forks: 11, commentCount: 72, timestamp: Date.now() - 550000, isLocal: true, location: { city: "Chicago, IL", lat: 41.8781, lng: -87.6298 } },
                { id: generateId(), type: 'ecology', title: "Rewilding Corridors Initiative", solution: "Connect fragmented nature reserves with wildlife corridors through private land easements.", problem: "Habitat fragmentation threatens biodiversity.", utility: "Landowners receive tax credits for participation.", votes: 198, forks: 18, commentCount: 94, timestamp: Date.now() - 620000 },
                { id: generateId(), type: 'health', title: "Community Health Data Cooperative", solution: "Patient-owned health data pools for research with profit-sharing.", problem: "Big pharma profits from our data without compensation.", utility: "HIPAA-compliant, blockchain-verified consent.", votes: 176, forks: 15, commentCount: 88, timestamp: Date.now() - 430000, isLocal: true, location: { city: "Seattle, WA", lat: 47.6062, lng: -122.3321 } },
                { id: generateId(), type: 'health', title: "Mobile Mental Health Pods", solution: "Solar-powered therapy pods in underserved neighborhoods with telehealth access.", problem: "Mental health services are inaccessible in many areas.", utility: "Soundproof, climate-controlled, 24/7 availability.", votes: 234, forks: 27, commentCount: 156, timestamp: Date.now() - 510000 },
                { id: generateId(), type: 'offgrid', title: "Open-Source Earthship Blueprints", solution: "Free, tested designs for off-grid homes using recycled materials.", problem: "Sustainable housing knowledge is gatekept.", utility: "Includes plumbing, solar, and greywater systems.", votes: 312, forks: 45, commentCount: 198, timestamp: Date.now() - 720000 },
                { id: generateId(), type: 'offgrid', title: "Decentralized Water Harvesting Network", solution: "P2P rainwater collection with community cisterns and quality testing.", problem: "Water independence requires expensive infrastructure.", utility: "IoT monitoring, gravity-fed distribution.", votes: 187, forks: 21, commentCount: 103, timestamp: Date.now() - 650000 },
                { id: generateId(), type: 'gaming', title: "Civic Simulation MMO", solution: "Massively multiplayer game where players govern virtual cities with real policy debates.", problem: "Civic engagement is boring for young people.", utility: "Top policies exported to real advocacy groups.", votes: 267, forks: 34, commentCount: 287, timestamp: Date.now() - 400000 },
                { id: generateId(), type: 'gaming', title: "DAO-Governed Game Studio", solution: "Player-owned game development studio where token holders vote on features.", problem: "AAA studios ignore player feedback.", utility: "Revenue shared with contributors and voters.", votes: 189, forks: 19, commentCount: 134, timestamp: Date.now() - 470000 },
                { id: generateId(), type: 'arts', title: "Decentralized Art Residency Network", solution: "Global network of artist housing swaps with blockchain reputation.", problem: "Art residencies are exclusive and expensive.", utility: "Artists host each other; reputation travels.", votes: 156, forks: 12, commentCount: 67, timestamp: Date.now() - 530000, isLocal: true, location: { city: "Berlin, DE", lat: 52.5200, lng: 13.4050 } },
                { id: generateId(), type: 'arts', title: "Public Mural DAO", solution: "Community-funded murals where neighborhoods vote on themes and artists.", problem: "Public art decisions are made by committees.", utility: "Smart contracts release funds upon completion.", votes: 134, forks: 8, commentCount: 56, timestamp: Date.now() - 580000 },
                { id: generateId(), type: 'spiritual', title: "Interfaith Dialogue Platform", solution: "Moderated online space for respectful cross-tradition conversations.", problem: "Religious discourse online is polarized.", utility: "AI moderation trained on sacred texts.", votes: 98, forks: 5, commentCount: 78, timestamp: Date.now() - 490000 },
                { id: generateId(), type: 'spiritual', title: "Sacred Site Preservation DAO", solution: "Crowdfunded protection for indigenous and ancient sacred sites worldwide.", problem: "Sacred sites face development pressure.", utility: "Token holders vote on preservation priorities.", votes: 178, forks: 14, commentCount: 92, timestamp: Date.now() - 560000 }
            ];
            ideas = JSON.stringify(examples);
            localStorage.setItem(DB_KEYS.IDEAS, ideas);
        }
        return JSON.parse(ideas);
    },

    getLocalProjects: () => {
        const ideas = MockBackend.getIdeas();
        return ideas.filter(i => i.isLocal);
    },

    addIdea: (idea) => {
        const ideas = MockBackend.getIdeas();

        // Increment fork count on parent if this is a fork
        const newIdea = {
            id: generateId(),
            ...idea,
            votes: 0,
            timestamp: Date.now(),
            comments: []
        };

        // Increment fork count and notify parent author
        if (idea.parentIdeaId) {
            const parent = ideas.find(i => i.id === idea.parentIdeaId);
            if (parent) {
                parent.forks = (parent.forks || 0) + 1;

                // Notify parent author
                const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
                const parentAuthorUser = users.find(u => u.username === parent.author);

                if (parentAuthorUser) {
                    const allNotifs = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '{}');
                    if (!allNotifs[parentAuthorUser.id]) allNotifs[parentAuthorUser.id] = [];

                    allNotifs[parentAuthorUser.id].unshift({
                        id: generateId(),
                        type: 'fork',
                        message: `${idea.author || 'Someone'} evolved your idea "${parent.title}" into "${newIdea.title}"`,
                        ideaId: newIdea.id,
                        ideaTitle: newIdea.title,
                        read: false,
                        timestamp: Date.now()
                    });

                    if (allNotifs[parentAuthorUser.id].length > 50) allNotifs[parentAuthorUser.id] = allNotifs[parentAuthorUser.id].slice(0, 50);
                    localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
                }
            }
        }

        ideas.push(newIdea);
        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));
        return newIdea;
    },

    forkIdea: (ideaId, userId, userName) => {
        const ideas = MockBackend.getIdeas();
        const originalIdea = ideas.find(i => i.id === ideaId);
        if (!originalIdea) return { success: false, error: 'Idea not found' };

        const forkedIdea = {
            id: generateId(),
            ...originalIdea,
            parentIdeaId: ideaId,
            forkedFrom: originalIdea.title,
            forkedBy: userName,
            author: userName,
            votes: 0,
            forks: 0,
            commentCount: 0,
            timestamp: Date.now(),
            title: `${originalIdea.title} (Fork)`
        };

        // Increment fork count on original
        originalIdea.forks = (originalIdea.forks || 0) + 1;

        ideas.push(forkedIdea);
        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));
        return { success: true, idea: forkedIdea, originalIdea };
    },

    getForksOf: (ideaId) => {
        const ideas = MockBackend.getIdeas();
        return ideas.filter(i => i.parentIdeaId === ideaId);
    },


    getUserVotes: (userId) => {
        const votes = JSON.parse(localStorage.getItem(DB_KEYS.VOTES) || '{}');
        return votes[userId] || [];
    },

    getUserDownvotes: (userId) => {
        const votes = JSON.parse(localStorage.getItem('woi_downvotes') || '{}');
        return votes[userId] || [];
    },

    // --- Category Requests ---
    requestCategory: (name, username) => {
        const requests = JSON.parse(localStorage.getItem('woi_category_requests') || '[]');
        if (requests.find(r => r.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, reason: 'Request already exists' };
        }
        const newReq = { id: generateId(), name, user: username, timestamp: Date.now(), status: 'pending' };
        requests.push(newReq);
        localStorage.setItem('woi_category_requests', JSON.stringify(requests));
        return { success: true, request: newReq };
    },

    getCategoryRequests: () => {
        return JSON.parse(localStorage.getItem('woi_category_requests') || '[]');
    },

    approveCategoryRequest: (id) => {
        const requests = JSON.parse(localStorage.getItem('woi_category_requests') || '[]');
        const idx = requests.findIndex(r => r.id === id);
        if (idx === -1) return { success: false };

        requests[idx].status = 'approved';
        localStorage.setItem('woi_category_requests', JSON.stringify(requests));
        return { success: true };
    },

    rejectCategoryRequest: (id) => {
        const requests = JSON.parse(localStorage.getItem('woi_category_requests') || '[]');
        const idx = requests.findIndex(r => r.id === id);
        if (idx === -1) return { success: false };
        requests.splice(idx, 1);
        localStorage.setItem('woi_category_requests', JSON.stringify(requests));
        return { success: true };
    },

    // --- User / Auth ---
    getUsers: () => {
        const usersStr = localStorage.getItem(DB_KEYS.USERS);
        if (!usersStr) {
            // Seed Users
            const seeds = [
                {
                    id: 'campton_id',
                    username: 'Campton',
                    email: 'campton@worldofideas.com',
                    role: 'admin', // Added Admin Role
                    bio: "Grew up in a broken home, moved cross country at 5 years old. Diagnosed autistic. Found hope through spirituality and magic plant medicines.",
                    jobTitle: "Founder & Visionary",
                    statusMessage: "Building a new world 🌍",
                    borderColor: '#7d5fff', // Visionary Purple
                    skills: ["🎨 Design", "🚜 Regenerative Ag", "🧠 Systems Thinking", "💊 Pharmacology", "⚛️ Nuclear Engineering"],
                    location: 'The Foundry',
                    avatar: null, // Patched in AppContext
                    influence: 850,
                    darkMode: false, // Preference
                    clanId: 'c3', // Void Walkers
                    cash: 100.00, // Added Cash Balance
                    submissions: 12,
                    vibe: 'Visionary',
                    isVerified: true, // Added
                    badges: ['Founder', 'Oracle', 'Genesis'],
                    mentorship: { isMentor: true, verifiedCoach: true, mentorVotes: 15, tags: ["Systems Thinking"] },
                    followers: [],
                    following: [],
                    links: [{ label: 'Personal Site', url: '#' }, { label: 'Twitter', url: '#' }],
                    lastActive: Date.now()
                },
                {
                    id: 'nova_id',
                    username: 'NovaScout',
                    email: 'nova@example.com',
                    bio: "Exploring the boundaries of sustainable tech and urban vertical farming. Let's build green cities.",
                    jobTitle: "Urban Ecologist",
                    statusMessage: "Looking for solar engineers",
                    borderColor: '#26de81', // Naturalist Green
                    skills: ["🌿 Hydroponics", "🏙️ Urban Planning", "⚡ Solar Tech"],
                    location: 'Portland, OR',
                    clanId: 'c2', // Green Guardians
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
                    influence: 420,
                    submissions: 5,
                    vibe: 'Naturalist',
                    badges: ['Eco-Warrior'],
                    mentorship: { isMentor: false, verifiedCoach: false, mentorVotes: 2, tags: [] },
                    followers: ['campton_id'],
                    following: ['campton_id'],
                    links: [],
                    lastActive: Date.now() - 3600000
                },
                {
                    id: 'atlas_id',
                    username: 'AtlasCoder',
                    email: 'atlas@example.com',
                    bio: "Full stack rust developer obsessed with decentralized governance systems.",
                    jobTitle: "Software Engineer",
                    borderColor: '#4b7bec', // Builder Blue
                    skills: ["🦀 Rust", "🔗 Blockchain", "🏛️ DAO Governance"],
                    location: 'Berlin, DE',
                    clanId: 'c1', // Technomancers
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                    influence: 680,
                    submissions: 8,
                    vibe: 'Builder',
                    isVerified: true, // Added
                    badges: ['Architect'],
                    mentorship: { isMentor: true, verifiedCoach: false, mentorVotes: 8, tags: ["Coding"] },
                    followers: [],
                    following: ['campton_id'],
                    links: [{ label: 'GitHub', url: '#' }],
                    lastActive: Date.now() - 86400000
                },
                {
                    id: 'luna_id',
                    username: 'LunaLegal',
                    email: 'luna@example.com',
                    bio: "Helping projects navigate the complex web of IP and international law.",
                    jobTitle: "Legal Consultant",
                    borderColor: '#fa8231', // Analyst Orange
                    skills: ["⚖️ IP Law", "📝 Contracts", "🤝 Negotiation"],
                    location: 'New York, NY',
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
                    influence: 350,
                    submissions: 2,
                    vibe: 'Analyst',
                    badges: [],
                    mentorship: { isMentor: false, verifiedCoach: false, mentorVotes: 0, tags: [] },
                    followers: ['nova_id'],
                    following: [],
                    links: [],
                    lastActive: Date.now() - 120000
                },
                {
                    id: 'sol_id',
                    username: 'SolInvictus',
                    email: 'sol@example.com',
                    bio: "Solar energy maximalist. If it touches the sun, it should power our lives.",
                    jobTitle: "Energy Engineer",
                    borderColor: '#fed330', // Energy Yellow
                    skills: ["☀️ Photovoltaics", "🔋 Battery Storage", "🔌 Grid Systems"],
                    location: 'Phoenix, AZ',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
                    influence: 510,
                    submissions: 6,
                    vibe: 'Visionary',
                    isVerified: true, // Added
                    badges: ['Energy Guru'],
                    mentorship: { isMentor: true, verifiedCoach: true, mentorVotes: 12, tags: ["Energy"] },
                    followers: ['campton_id', 'atlas_id'],
                    following: ['campton_id'],
                    links: [],
                    lastActive: Date.now() - 450000
                }
            ];
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify(seeds));
            return seeds;
        }
        return JSON.parse(usersStr);
    },



    updateProfile: (userId, updates) => {
        const users = MockBackend.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) return { success: false, reason: "User not found" };

        users[index] = { ...users[index], ...updates };
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        return { success: true, user: users[index] };
    },
    followUser: (followerId, targetId) => {
        const users = MockBackend.getUsers();
        const follower = users.find(u => u.id === followerId);
        const target = users.find(u => u.id === targetId);

        if (!follower || !target) return { success: false, reason: "User not found" };

        // Initialize arrays if missing
        if (!follower.following) follower.following = [];
        if (!target.followers) target.followers = [];

        // Check if already following
        if (follower.following.includes(targetId)) {
            // Unfollow logic
            follower.following = follower.following.filter(id => id !== targetId);
            target.followers = target.followers.filter(id => id !== followerId);
        } else {
            // Follow logic
            follower.following.push(targetId);
            target.followers.push(followerId);

            // Notification
            MockBackend.addNotification({
                userId: targetId,
                type: 'follow',
                message: `${follower.username} started following you!`,
                ideaId: null,
                ideaTitle: null
            });
        }

        // Save
        const followerIdx = users.findIndex(u => u.id === followerId);
        const targetIdx = users.findIndex(u => u.id === targetId);
        users[followerIdx] = follower;
        users[targetIdx] = target;

        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

        // Update current user session if it matches
        const currentUser = MockBackend.getCurrentUser();
        if (currentUser && currentUser.id === followerId) {
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(follower));
        }

        return { success: true, user: follower, targetUser: target };
    },

    sendMessage: (fromId, toId, text) => {
        const allChats = JSON.parse(localStorage.getItem(DB_KEYS.CHATS) || '{}');
        // We use a combined key "minId_maxId" for DM channels to keep them unique
        const channelId = [fromId, toId].sort().join('_');

        if (!allChats[channelId]) allChats[channelId] = [];

        const newMsg = {
            id: generateId(),
            from: fromId,
            to: toId,
            text,
            timestamp: Date.now(),
            read: false
        };

        allChats[channelId].push(newMsg);
        localStorage.setItem(DB_KEYS.CHATS, JSON.stringify(allChats));
        return { success: true, message: newMsg };
    },

    getMessages: (userId) => {
        // Collect all messages where userId is either sender or receiver
        const allChats = JSON.parse(localStorage.getItem(DB_KEYS.CHATS) || '{}');
        const userMessages = [];

        Object.keys(allChats).forEach(channelId => {
            if (channelId.includes(userId)) {
                // Get the other user ID
                const [id1, id2] = channelId.split('_');
                const otherId = id1 === userId ? id2 : id1;

                // Add channel info only (simplification for "Inbox" view)
                const msgs = allChats[channelId];
                const lastMsg = msgs[msgs.length - 1];
                userMessages.push({
                    channelId,
                    otherUserId: otherId,
                    lastMessage: lastMsg,
                    unreadCount: msgs.filter(m => m.to === userId && !m.read).length
                });
            }
        });

        return userMessages.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
    },

    getCurrentUser: () => {
        const user = localStorage.getItem(DB_KEYS.CURRENT_USER);
        return user ? JSON.parse(user) : null;
    },

    register: (userData) => {
        const users = MockBackend.getUsers();
        if (users.find(u => u.username === userData.username)) {
            return { success: false, reason: "Username already exists" };
        }
        const newUser = {
            id: generateId(),
            username: userData.username,
            email: userData.email || '',
            bio: userData.bio || '',
            skills: userData.skills || [],
            location: userData.location || '',
            avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.username}&background=random&color=fff`,
            influence: DAILY_INFLUENCE,
            forks: 0,
            submissions: 0,
            vibe: 'Creative',
            badges: [],
            lastActive: Date.now(),
            badges: ['Genesis'], // Auto-award Genesis badge
            mentorship: {
                isMentor: false,
                isApprentice: false,
                verifiedCoach: false,
                mentorVotes: 0,
                tags: []
            }
        };
        users.push(newUser);
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(newUser));
        return { success: true, user: newUser };
    },

    login: (username) => {
        let users = MockBackend.getUsers();
        let user = users.find(u => u.username === username);

        // Always patch Campton with the canonical founder data if needed
        if (username === 'Campton' && !user) {
            // Should have been seeded by getUsers, but just in case
            user = users.find(u => u.username === 'Campton');
        }

        if (!user) return { success: false, reason: "User not found" };

        if (user.isBanned) return { success: false, reason: "Account suspended." };

        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        return { success: true, user };
    },

    updateProfile: (updates) => {
        const user = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER));
        if (!user) return { success: false };

        const updatedUser = { ...user, ...updates };
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(updatedUser)); // update session

        const users = MockBackend.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            users[idx] = updatedUser;
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users)); // update db
        }
        return { success: true, user: updatedUser };
    },

    voteIdea: (ideaId, userId, direction = 'up') => {
        const user = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER));
        if (!user || user.id !== userId) return { success: false, reason: "Auth error" };

        const ideas = MockBackend.getIdeas();
        const ideaIndex = ideas.findIndex(i => i.id === ideaId);
        if (ideaIndex === -1) return { success: false, reason: "Idea not found" };

        // Upvotes
        const votes = JSON.parse(localStorage.getItem(DB_KEYS.VOTES) || '{}'); // Upvotes
        const userUpvotes = votes[userId] || [];
        const isUpvoted = userUpvotes.includes(ideaId);

        // Downvotes (New)
        const downvotes = JSON.parse(localStorage.getItem('woi_downvotes') || '{}');
        const userDownvotes = downvotes[userId] || [];
        const isDownvoted = userDownvotes.includes(ideaId);

        let voteChange = 0;
        let influenceChange = 0;

        if (direction === 'up') {
            if (isUpvoted) {
                // Remove Upvote
                votes[userId] = userUpvotes.filter(id => id !== ideaId);
                voteChange = -1;
                influenceChange = VOTE_COST; // Refund
            } else {
                // Add Upvote
                if (!votes[userId]) votes[userId] = [];
                votes[userId].push(ideaId);
                voteChange = 1;
                influenceChange = -VOTE_COST;

                // Remove Downvote if exists
                if (isDownvoted) {
                    downvotes[userId] = userDownvotes.filter(id => id !== ideaId);
                    voteChange += 1; // Recover the -1 from downvote
                    // No refund for switching? Or handling purely as net score.
                    // Let's keep it simple: Removing downvote (+1) + Adding upvote (+1) = +2
                }
            }
        } else if (direction === 'down') {
            if (isDownvoted) {
                // Remove Downvote
                downvotes[userId] = userDownvotes.filter(id => id !== ideaId);
                voteChange = 1; // Score goes back up
                influenceChange = VOTE_COST; // Refund
            } else {
                // Add Downvote
                if (!downvotes[userId]) downvotes[userId] = [];
                downvotes[userId].push(ideaId);
                voteChange = -1;
                influenceChange = -VOTE_COST;

                // Remove Upvote if exists
                if (isUpvoted) {
                    votes[userId] = userUpvotes.filter(id => id !== ideaId);
                    voteChange -= 1; // Remove the +1 from upvote
                }
            }
        }

        // Apply Changes
        ideas[ideaIndex].votes += voteChange;

        // Update User Profile (Influence)
        const result = MockBackend.updateProfile({ influence: (user.influence || 0) + influenceChange });

        // Save DB
        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));
        localStorage.setItem(DB_KEYS.VOTES, JSON.stringify(votes));
        localStorage.setItem('woi_downvotes', JSON.stringify(downvotes));

        return {
            success: true,
            newIdea: ideas[ideaIndex],
            newUser: result.user,
            action: direction
        };
    },

    boostIdea: (ideaId, userId) => {
        const user = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER));
        if (!user || user.id !== userId) return { success: false, reason: "Auth error" };

        const cost = 5.00; // $5.00 for a boost
        if ((user.cash || 0) < cost) return { success: false, reason: "Insufficient cash balance" };

        const ideas = MockBackend.getIdeas();
        const idx = ideas.findIndex(i => i.id === ideaId);
        if (idx === -1) return { success: false, reason: "Idea not found" };

        ideas[idx].boostedUntil = Date.now() + (48 * 60 * 60 * 1000); // 48h boost

        const result = MockBackend.updateProfile({ cash: (user.cash || 0) - cost });
        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));

        return { success: true, newIdea: ideas[idx], user: result.user };
    },

    // --- Red Team Analysis ---
    getRedTeamAnalyses: (ideaId) => {
        const allAnalyses = JSON.parse(localStorage.getItem(DB_KEYS.RED_TEAM) || '{}');
        return allAnalyses[ideaId] || [];
    },

    addRedTeamAnalysis: ({ ideaId, type, content, author, authorAvatar }) => {
        const allAnalyses = JSON.parse(localStorage.getItem(DB_KEYS.RED_TEAM) || '{}');
        if (!allAnalyses[ideaId]) allAnalyses[ideaId] = [];

        const newAnalysis = {
            id: generateId(),
            type, // 'critique' or 'support'
            content,
            author,
            authorAvatar,
            votes: 0,
            timestamp: Date.now()
        };

        allAnalyses[ideaId].unshift(newAnalysis);
        localStorage.setItem(DB_KEYS.RED_TEAM, JSON.stringify(allAnalyses));
        return newAnalysis;
    },

    voteRedTeamAnalysis: (ideaId, analysisId, direction = 'up') => {
        const allAnalyses = JSON.parse(localStorage.getItem(DB_KEYS.RED_TEAM) || '{}');
        if (!allAnalyses[ideaId]) return { success: false };

        const analysis = allAnalyses[ideaId].find(a => a.id === analysisId);
        if (!analysis) return { success: false };

        analysis.votes += direction === 'up' ? 1 : -1;
        localStorage.setItem(DB_KEYS.RED_TEAM, JSON.stringify(allAnalyses));
        return { success: true, analysis };
    },

    // --- AMA System ---
    getAMAQuestions: (ideaId) => {
        const allAMAs = JSON.parse(localStorage.getItem(DB_KEYS.AMA) || '{}');
        const questions = allAMAs[ideaId] || [];
        return questions.sort((a, b) => (b.askerInfluence || 0) - (a.askerInfluence || 0));
    },

    askAMAQuestion: ({ ideaId, question, askerId, askerName, askerAvatar, askerInfluence }) => {
        const allAMAs = JSON.parse(localStorage.getItem(DB_KEYS.AMA) || '{}');
        if (!allAMAs[ideaId]) allAMAs[ideaId] = [];

        const newQuestion = {
            id: generateId(),
            question,
            askerId,
            askerName,
            askerAvatar,
            askerInfluence: askerInfluence || 0,
            answer: null,
            commitment: null,
            timestamp: Date.now()
        };

        allAMAs[ideaId].push(newQuestion);
        localStorage.setItem(DB_KEYS.AMA, JSON.stringify(allAMAs));
        return newQuestion;
    },

    answerAMAQuestion: (ideaId, questionId, answer, commitment = null) => {
        const allAMAs = JSON.parse(localStorage.getItem(DB_KEYS.AMA) || '{}');
        if (!allAMAs[ideaId]) return { success: false };

        const question = allAMAs[ideaId].find(q => q.id === questionId);
        if (!question) return { success: false };

        question.answer = answer;
        question.commitment = commitment;
        question.answeredAt = Date.now();
        localStorage.setItem(DB_KEYS.AMA, JSON.stringify(allAMAs));
        return { success: true, question };
    },

    // --- Resource Vault ---
    getResources: (ideaId) => {
        const allResources = JSON.parse(localStorage.getItem(DB_KEYS.RESOURCES) || '{}');
        return allResources[ideaId] || [];
    },

    pledgeResource: ({ ideaId, item, description, estimatedValue, pledgerId, pledgerName }) => {
        const allResources = JSON.parse(localStorage.getItem(DB_KEYS.RESOURCES) || '{}');
        if (!allResources[ideaId]) allResources[ideaId] = [];

        const newResource = {
            id: generateId(),
            item,
            description,
            estimatedValue,
            pledgerId,
            pledgerName,
            status: 'pending',
            influenceBoost: Math.floor(estimatedValue * 0.2),
            clanVerified: false,
            timestamp: Date.now()
        };

        allResources[ideaId].push(newResource);
        localStorage.setItem(DB_KEYS.RESOURCES, JSON.stringify(allResources));
        return newResource;
    },

    updateResourceStatus: (ideaId, resourceId, status) => {
        const allResources = JSON.parse(localStorage.getItem(DB_KEYS.RESOURCES) || '{}');
        if (!allResources[ideaId]) return { success: false };

        const resource = allResources[ideaId].find(r => r.id === resourceId);
        if (!resource) return { success: false };

        resource.status = status;
        localStorage.setItem(DB_KEYS.RESOURCES, JSON.stringify(allResources));
        return { success: true, resource };
    },

    // --- Skill Marketplace / Applications ---
    getApplications: (ideaId) => {
        const allApps = JSON.parse(localStorage.getItem(DB_KEYS.APPLICATIONS) || '{}');
        return allApps[ideaId] || [];
    },

    applyForRole: ({ ideaId, roleId, roleName, userId, userName, userAvatar, message }) => {
        const allApps = JSON.parse(localStorage.getItem(DB_KEYS.APPLICATIONS) || '{}');
        if (!allApps[ideaId]) allApps[ideaId] = [];

        const newApp = {
            id: generateId(),
            roleId,
            roleName,
            userId,
            userName,
            userAvatar,
            message,
            status: 'pending',
            timestamp: Date.now()
        };

        allApps[ideaId].push(newApp);
        localStorage.setItem(DB_KEYS.APPLICATIONS, JSON.stringify(allApps));
        return newApp;
    },

    updateApplicationStatus: (ideaId, applicationId, status) => {
        const allApps = JSON.parse(localStorage.getItem(DB_KEYS.APPLICATIONS) || '{}');
        if (!allApps[ideaId]) return { success: false };

        const app = allApps[ideaId].find(a => a.id === applicationId);
        if (!app) return { success: false };

        app.status = status;
        localStorage.setItem(DB_KEYS.APPLICATIONS, JSON.stringify(allApps));
        return { success: true, application: app };
    },

    // --- Groups ---
    getGroups: () => {
        let groups = localStorage.getItem(DB_KEYS.GROUPS);
        if (!groups) {
            const defaults = [
                { id: 'g1', name: "Purple Orb Collective", icon: "🔮", color: "#8e44ad", members: ['campton_id'], memberCount: 120, description: "Exploring the mystic side of tech." },
                { id: 'g2', name: "Free Gardens United", icon: "☀️", color: "#f39c12", members: [], memberCount: 840, description: "Guerrilla gardening and urban farming." },
                { id: 'g3', name: "Green Logic", icon: "🏠", color: "#2ecc71", members: [], memberCount: 450, description: "Sustainable architecture and living." },
                { id: 'g4', name: "Pixel Guild", icon: "👾", color: "#3498db", members: [], memberCount: 600, description: "Retro game dev and digital art." }
            ];
            groups = JSON.stringify(defaults);
            localStorage.setItem(DB_KEYS.GROUPS, groups);
        }
        return JSON.parse(groups);
    },

    joinGroup: (groupId, userId) => {
        const groups = MockBackend.getGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { success: false };

        if (!group.members.includes(userId)) {
            group.members.push(userId);
            group.memberCount += 1;
            localStorage.setItem(DB_KEYS.GROUPS, JSON.stringify(groups));
        }
        return { success: true, group };
    },

    getUserGroup: (userId) => {
        const groups = MockBackend.getGroups();
        return groups.find(g => g.members.includes(userId)) || null;
    },

    // --- Notifications ---
    getNotifications: (userId) => {
        const allNotifs = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '{}');
        return (allNotifs[userId] || []).sort((a, b) => b.timestamp - a.timestamp);
    },

    addNotification: ({ userId, type, message, ideaId, ideaTitle }) => {
        const allNotifs = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '{}');
        if (!allNotifs[userId]) allNotifs[userId] = [];

        const newNotif = {
            id: generateId(),
            type, // 'vote', 'comment', 'fork', 'ama', 'application'
            message,
            ideaId,
            ideaTitle,
            read: false,
            timestamp: Date.now()
        };

        allNotifs[userId].unshift(newNotif);
        if (allNotifs[userId].length > 50) allNotifs[userId] = allNotifs[userId].slice(0, 50);

        localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
        return newNotif;
    },

    markNotificationRead: (userId, notificationId) => {
        const allNotifs = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '{}');
        if (!allNotifs[userId]) return { success: false };

        const notif = allNotifs[userId].find(n => n.id === notificationId);
        if (notif) {
            notif.read = true;
            localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
        }
        return { success: true };
    },

    markAllNotificationsRead: (userId) => {
        const allNotifs = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '{}');
        if (!allNotifs[userId]) return { success: false };

        allNotifs[userId].forEach(n => n.read = true);
        localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
        return { success: true };
    },

    // --- Coins / Economy ---
    tipUser: (fromId, toId, amount) => {
        const users = MockBackend.getUsers();
        const senderIndex = users.findIndex(u => u.id === fromId);
        const recipientIndex = users.findIndex(u => u.id === toId);

        if (senderIndex === -1 || recipientIndex === -1) return { success: false, reason: "User not found" };

        const sender = users[senderIndex];
        const recipient = users[recipientIndex];

        if (sender.influence < amount) return { success: false, reason: "Insufficient funds" };

        sender.influence -= amount;
        recipient.influence += amount;

        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

        const currentUser = MockBackend.getCurrentUser();
        if (currentUser && currentUser.id === fromId) {
            localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(sender));
        }

        MockBackend.addNotification({
            userId: toId,
            type: 'tip',
            message: `${sender.username} tipped you ${amount} influence!`,
            ideaId: null,
            ideaTitle: null
        });

        return { success: true, newBalance: sender.influence };
    },

    stakeOnIdea: (userId, ideaId, amount) => {
        const user = MockBackend.getCurrentUser();
        if (!user || user.id !== userId) return { success: false, reason: "Auth error" };

        if (user.influence < amount) return { success: false, reason: "Insufficient funds" };

        const ideas = MockBackend.getIdeas();
        const ideaIndex = ideas.findIndex(i => i.id === ideaId);
        if (ideaIndex === -1) return { success: false, reason: "Idea not found" };

        const updateResult = MockBackend.updateProfile({ influence: user.influence - amount });

        const idea = ideas[ideaIndex];
        idea.stakedAmount = (idea.stakedAmount || 0) + amount;
        idea.stakers = (idea.stakers || 0) + 1;

        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));

        if (idea.author !== user.username) {
            const users = MockBackend.getUsers();
            const author = users.find(u => u.username === idea.author);
            if (author) {
                MockBackend.addNotification({
                    userId: author.id,
                    type: 'stake',
                    message: `${user.username} staked ${amount} influence on "${idea.title}"`,
                    ideaId: idea.id,
                    ideaTitle: idea.title
                });
            }
        }
        return { success: true, newBalance: updateResult.user.influence, idea };
    },

    // --- Discussions Voting ---
    voteDiscussion: (discussionId, userId, direction = 'up') => {
        const discussions = JSON.parse(localStorage.getItem(DB_KEYS.DISCUSSIONS) || '[]');
        const idx = discussions.findIndex(d => d.id === discussionId);
        if (idx === -1) return { success: false };

        // Simple simplified voting logic (no user tracking for now to save time, or we can reuse logic)
        // Let's just create a vote key
        const votes = JSON.parse(localStorage.getItem('woi_discussion_votes') || '{}');
        const userVotes = votes[userId] || [];
        const hasVoted = userVotes.includes(discussionId);

        if (hasVoted) {
            // Toggle off? Or just ignore? Let's assume toggle off if same direction
            // For simplicity, just increment/decrement
        } else {
            votes[userId] = [...userVotes, discussionId];
            localStorage.setItem('woi_discussion_votes', JSON.stringify(votes));
        }

        // Actually, let's just increment/decrement for the prototype without strict user tracking per direction
        // The user just wants it to work.
        if (direction === 'up') discussions[idx].votes++;
        else discussions[idx].votes--;

        localStorage.setItem(DB_KEYS.DISCUSSIONS, JSON.stringify(discussions));
        return { success: true, discussion: discussions[idx] };
    },


    voteFeasibility: (ideaId, userId, score) => {
        const ideas = JSON.parse(localStorage.getItem(DB_KEYS.IDEAS) || '[]');
        const ideaIndex = ideas.findIndex(i => i.id === ideaId);
        if (ideaIndex === -1) return { success: false, reason: "Idea not found" };

        const idea = ideas[ideaIndex];
        if (!idea.feasibilityVotes) idea.feasibilityVotes = {};

        const validScore = Math.min(100, Math.max(0, score));
        idea.feasibilityVotes[userId] = validScore;

        const scores = Object.values(idea.feasibilityVotes);
        idea.feasibilityScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        ideas[ideaIndex] = idea;
        localStorage.setItem(DB_KEYS.IDEAS, JSON.stringify(ideas));
        return { success: true, score: idea.feasibilityScore, votes: idea.feasibilityVotes };
    },

    // --- Mentorship System ---
    toggleMentorshipStatus: (userId, type, value) => {
        const result = MockBackend.updateProfile({
            mentorship: {
                ...MockBackend.getCurrentUser().mentorship,
                [type]: value
            }
        });
        return result;
    },

    voteMentor: (voterId, mentorId) => {
        const users = MockBackend.getUsers();
        const mentorIndex = users.findIndex(u => u.id === mentorId);
        if (mentorIndex === -1) return { success: false, reason: "Mentor not found" };

        const mentor = users[mentorIndex];
        // Simple distinct vote logic simulation (real app would need a 'mentorVotes' DB table)
        mentor.mentorship.mentorVotes = (mentor.mentorship.mentorVotes || 0) + 1;

        users[mentorIndex] = mentor;
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

        return { success: true, mentor };
    },

    // --- Admin Tools ---
    banUser: (userId) => {
        const users = MockBackend.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return { success: false, reason: "User not found" };

        users[idx].isBanned = true;
        users[idx].bannedAt = Date.now();
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

        return { success: true, user: users[idx] };
    },

    unbanUser: (userId) => {
        const users = MockBackend.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return { success: false, reason: "User not found" };

        users[idx].isBanned = false;
        users[idx].bannedAt = null;
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        return { success: true, user: users[idx] };
    },

    getSystemStats: () => {
        const users = MockBackend.getUsers();
        const ideas = MockBackend.getIdeas();
        const reports = JSON.parse(localStorage.getItem('woi_reports') || '[]');

        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.lastActive > Date.now() - 86400000).length,
            totalIdeas: ideas.length,
            pendingReports: reports.filter(r => r.status === 'pending').length,
            dbSize: JSON.stringify(localStorage).length
        };
    },

    // --- Developer Tools ---
    backupDatabase: () => {
        return JSON.stringify(localStorage);
    },

    resetDatabase: () => {
        localStorage.clear();
        window.location.reload();
    },

    seedDatabase: () => {
        // Trigger getters to re-seed
        MockBackend.getUsers();
        MockBackend.getIdeas();
        MockBackend.getClans();
        MockBackend.getGroups();
        MockBackend.getGuides();
        return { success: true };
    }
};
