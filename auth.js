/**
 * auth.js - The Production Engine
 * Includes Auth, Fetching, and UI Rendering
 */

const CONFIG = {
    CLIENT_ID: '22649',
    // Uses the base URL (e.g., https://user.github.io/repo/) for redirects
    REDIRECT_URI: window.location.origin + window.location.pathname, 
    API_URL: 'https://graphql.anilist.co'
};

// 1. Token Management
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
} else {
    // Only redirect if we aren't already logged in
    if (!localStorage.getItem('anilist_token')) {
        const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
        window.location.href = authUrl;
    }
}

// 2. Global API Fetcher
async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    
    if (!activeToken) {
        console.error("Auth Error: No token found.");
        return null;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();
        
        if (json.errors) {
            // Handle expired token
            if (json.errors[0].status === 401) {
                localStorage.removeItem('anilist_token');
                window.location.reload();
            }
            console.error("GraphQL Errors:", json.errors);
            return null;
        }
        return json.data;
    } catch (err) {
        console.error("Network Error:", err);
        return null;
    }
}

/**
 * 3. THE MISSING LINK: The Card Renderer
 * This creates the HTML for your anime/manga scrollers
 */
function renderScrollerItems(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container #${containerId} not found.`);
        return;
    }
    
    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px;">No results found.</p>`;
        return;
    }

    container.innerHTML = items.map(m => {
        // AniList returns 'media' directly for discovery, or inside a wrapper for user lists
        const media = m.media || m; 
        const score = media.meanScore ? (media.meanScore / 10).toFixed(1) : "??";
        
        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${media.id}&type=${type}'">
                <div class="img-box">
                    <img src="${media.coverImage.large}" loading="lazy" alt="${media.title.romaji}">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${media.title.romaji}</div>
            </div>
        `;
    }).join('');
}

// 4. UI Utility: Sync Header (Safe version)
async function updateHeaderPFP() {
    const nameEl = document.getElementById('user-name');
    const pfpEl = document.getElementById('user-pfp');
    
    // If these don't exist (like on Discovery pages), just exit
    if (!nameEl && !pfpEl) return;

    const query = `query { Viewer { name avatar { large } } }`;
    const data = await apiFetch(query);
    
    if (data && data.Viewer) {
        if (nameEl) nameEl.innerText = data.Viewer.name;
        if (pfpEl) pfpEl.src = data.Viewer.avatar.large;
    }
}

// 5. Loader Control
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}
