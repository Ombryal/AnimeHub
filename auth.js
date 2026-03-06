/**
 * auth.js - Final Robust Engine
 * Handles OAuth, Persistence, and API Communication
 */

const CONFIG = {
    CLIENT_ID: '22649', // Your AniList Client ID
    API_URL: 'https://graphql.anilist.co'
};

// 1. Unified Token Management
// Check URL hash (new login) first, then fallback to LocalStorage (returning user)
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    // Save to storage so it persists across page refreshes and navigations
    localStorage.setItem('anilist_token', token);
    
    // Clean the URL hash immediately to keep the address bar tidy
    // We use replaceState to keep query params like ?id=123 safe
    if (window.location.hash) {
        const cleanUrl = window.location.pathname + window.location.search;
        history.replaceState(null, "", cleanUrl);
    }
} else {
    // Redirect to AniList only if no token is found in storage
    // This prevents redirect loops on details.html
    if (!localStorage.getItem('anilist_token')) {
        const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
        window.location.href = authUrl;
    }
}

/**
 * 2. Global API Fetcher
 * Use this in index.js and details.js to talk to AniList
 */
async function apiFetch(query, variables = {}) {
    // Always pull the freshest token directly from storage
    const activeToken = localStorage.getItem('anilist_token');
    
    if (!activeToken) {
        console.error("Auth Error: No access token found.");
        return null;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + activeToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();

        // Check for GraphQL specific errors (like invalid IDs or bad queries)
        if (json.errors) {
            console.error("AniList API Error Log:", json.errors);
            return null;
        }

        return json.data;
    } catch (err) {
        console.error("Network Error: Could not connect to AniList.", err);
        return null;
    }
}

/**
 * 3. Global UI Utilities
 */

// Fades out and removes the loading spinner
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none'; // Ensure it doesn't block clicks
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// Renders lists of anime/manga cards (Home, Anime, and Manga tabs)
function renderScrollerItems(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return; 
    
    if (!items || items.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px;">No results found.</p>`;
        return;
    }

    container.innerHTML = items.map(m => {
        // AniList returns data differently depending on the query
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

// Simple Logout (Use this for a 'Log Out' button if needed)
function logout() {
    localStorage.removeItem('anilist_token');
    window.location.reload();
}
