/**
 * auth.js - Authentication, API, and shared utilities
 */

const CONFIG = {
    CLIENT_ID: '22649',
    REDIRECT_URI: window.location.origin + window.location.pathname,
    API_URL: 'https://graphql.anilist.co'
};

// OAuth handling
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
} else if (!localStorage.getItem('anilist_token')) {
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
}

/**
 * Execute a GraphQL query against AniList
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Query variables
 * @returns {Promise<Object|null>} Query result data or null on error
 */
async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    if (!activeToken) return null;
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        return json.data;
    } catch (err) {
        console.error('API fetch error:', err);
        return null;
    }
}

/**
 * Render items into a horizontal scroller container
 * @param {string} id - Container element ID
 * @param {Array} entries - Array of media objects or list entries
 * @param {string} type - 'ANIME' or 'MANGA'
 * @param {boolean} isUserList - If true, show progress badge (entry.progress vs total)
 */
function renderScrollerItems(id, entries, type, isUserList = false) {
    const container = document.getElementById(id);
    if (!container) return;
    if (!entries || entries.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">No entries found.</p>`;
        return;
    }

    container.innerHTML = entries.map(e => {
        const m = e.media || e;
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";
        let progressBadge = '';
        if (isUserList) {
            const currentProgress = e.progress || 0;
            const total = (type === 'ANIME' ? m.episodes : m.chapters) || '~';
            progressBadge = `
                <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; color: white; border: 1px solid rgba(255,255,255,0.15); z-index: 2;">
                    ${currentProgress} <span style="color: var(--accent); margin: 0 2px;">|</span> ${total}
                </div>`;
        }
        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${m.id}&type=${type}'">
                <div class="img-box">
                    ${progressBadge}
                    <img src="${m.coverImage.large}" loading="lazy">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${m.title.romaji}</div>
            </div>`;
    }).join('');
}

/**
 * Hide the full‑page loading overlay
 */
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// ------------------------------
// Global Search (bottom sheet)
// ------------------------------
let activeSearchType = 'ANIME';

async function handleSearch(input, containerId, forcedType = null) {
    const queryStr = input.value.trim();
    const container = document.getElementById(containerId);
    if (queryStr.length < 3) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent);"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    const mode = forcedType || activeSearchType;
    let query = '';
    let variables = { search: queryStr };

    if (mode === 'CHARACTER') {
        query = `query ($search: String) { Page(perPage: 15) { characters(search: $search) { id name { full } image { large } } } }`;
    } else if (mode === 'USER') {
        query = `query ($search: String) { Page(perPage: 15) { users(search: $search) { id name avatar { large } } } }`;
    } else {
        query = `query ($search: String, $type: MediaType) { Page(perPage: 15) { media(search: $search, type: $type) { id title { romaji } coverImage { large } meanScore format } } }`;
        variables.type = mode;
    }

    const data = await apiFetch(query, variables);
    if (!data || !data.Page) return;
    const items = data.Page.media || data.Page.characters || data.Page.users || [];

    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || item.name?.full || item.name;
        const img = item.coverImage?.large || item.image?.large || item.avatar?.large;
        const sub = item.format || mode;
        return `
            <div class="search-item-row" onclick="window.location.href='details.html?id=${item.id}&type=${mode}'" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                <img src="${img}" style="width:45px; height:60px; border-radius:8px; object-fit:cover; flex-shrink:0;">
                <div style="flex:1; overflow:hidden;">
                    <h4 style="font-size:0.85rem; margin:0; color:white; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${title}</h4>
                    <p style="font-size:0.7rem; margin:4px 0 0; color:var(--accent); font-weight:600;">${sub}</p>
                </div>
            </div>`;
    }).join('');
}

// Set up search UI if present
document.addEventListener('DOMContentLoaded', () => {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch && closeSearch && searchSheet) {
        openSearch.onclick = () => searchSheet.classList.add('active');
        closeSearch.onclick = () => searchSheet.classList.remove('active');
    }

    const globalInput = document.getElementById('global-search-input');
    const animeInput = document.getElementById('anime-search-input');
    const mangaInput = document.getElementById('manga-search-input');
    const chips = document.querySelectorAll('.chip');

    if (globalInput) globalInput.addEventListener('input', () => handleSearch(globalInput, 'search-results'));
    if (animeInput) animeInput.addEventListener('input', () => handleSearch(animeInput, 'anime-search-results', 'ANIME'));
    if (mangaInput) mangaInput.addEventListener('input', () => handleSearch(mangaInput, 'manga-search-results', 'MANGA'));

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            let t = chip.innerText.toUpperCase();
            activeSearchType = t === 'USERS' ? 'USER' : t === 'CHARACTERS' ? 'CHARACTER' : t;
            if (globalInput && globalInput.value.length >= 3) handleSearch(globalInput, 'search-results');
        });
    });
});
