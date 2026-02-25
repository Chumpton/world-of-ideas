export const buildIdeaLink = (ideaId) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!ideaId) return origin || '';
    return `${origin}/?idea=${encodeURIComponent(String(ideaId))}`;
};

export const buildProfileLink = (userId) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!userId) return origin || '';
    return `${origin}/?profile=${encodeURIComponent(String(userId))}`;
};

export const extractIdeaIdFromLocation = (href = null) => {
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const url = new URL(href || (typeof window !== 'undefined' ? window.location.href : base), base);

        const queryIdea = url.searchParams.get('idea');
        if (queryIdea) return decodeURIComponent(queryIdea);

        const pathname = url.pathname || '';
        const pathMatch = pathname.match(/^\/idea\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

        const hash = String(url.hash || '').replace(/^#/, '');
        if (hash.startsWith('idea=')) return decodeURIComponent(hash.slice(5));
        if (hash.startsWith('idea/')) return decodeURIComponent(hash.slice(5));

        return null;
    } catch {
        return null;
    }
};

export const extractProfileIdFromLocation = (href = null) => {
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const url = new URL(href || (typeof window !== 'undefined' ? window.location.href : base), base);

        const queryProfile = url.searchParams.get('profile');
        if (queryProfile) return decodeURIComponent(queryProfile);

        const pathname = url.pathname || '';
        const pathMatch = pathname.match(/^\/profile\/([^/?#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

        const hash = String(url.hash || '').replace(/^#/, '');
        if (hash.startsWith('profile=')) return decodeURIComponent(hash.slice(8));
        if (hash.startsWith('profile/')) return decodeURIComponent(hash.slice(8));

        return null;
    } catch {
        return null;
    }
};
