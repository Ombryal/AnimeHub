/**
 * auth.js - The Production Engine (Updated with Stats & Search)
 */

const CONFIG = {
    CLIENT_ID: '22649',
    REDIRECT_URI: window.location.origin + window.location.pathname, 
    API_URL: 'https://graphql.anilist.co'
};

const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
} else if (!localStorage.getItem('anilist_token')) {
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
}

async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    if (!activeToken) return null;

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
        if (json.errors && json.errors[0].status === 401) {
            localStorage.removeItem('anilist_token');
            window.location.reload();
        }
        return json.data;
    } catch (err) {
        return null;
    }
}

// --- NEW: Global UI Logic ---

async function initGlobalUI() {
    // 1. Search Sheet Toggle (Only applies if the sheet exists, like on index.html)
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch && searchSheet) {
        openSearch.onclick = () => searchSheet.classList.add('active');
    }
    if (closeSearch && searchSheet) {
        closeSearch.onclick = () => searchSheet.classList.remove('active');
    }

    // 2. Stats Loader Logic (DEFENSIVE: Only fetch data if dashboard elements exist!)
    if (document.getElementById('username-display')) {
        const query = `query { 
            Viewer { 
                name 
                avatar { large } 
                statistics { 
                    anime { episodesWatched } 
                    manga { chaptersRead } 
                } 
            } 
        }`;
        
        const data = await apiFetch(query);
        if (data && data.Viewer) {
            const v = data.Viewer;
            document.getElementById('username-display').innerText = v.name;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
            if(document.getElementById('ep-stat')) document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched;
            if(document.getElementById('ch-stat')) document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead;
        }
    }
}

function renderScrollerItems(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;
    container.innerHTML = items.map(m => {
        const media = m.media || m;
        const score = media.meanScore ? (media.meanScore / 10).toFixed(1) : "??";
        return `
            <div class="media-item" onclick="window.location.href='details.html?id=${media.id}&type=${type}'">
                <div class="img-box">
                    <img src="${media.coverImage.large}" loading="lazy">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${media.title.romaji}</div>
            </div>`;
    }).join('');
}

function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

document.addEventListener('DOMContentLoaded', initGlobalUI);
