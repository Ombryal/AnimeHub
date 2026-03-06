/**
  auth.js - The Production Engine (FIXED Account Sync)
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

// --- GLOBAL UI & ACCOUNT SYNC (FIXED) ---

async function initGlobalUI() {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch) openSearch.onclick = () => searchSheet.classList.add('active');
    if (closeSearch) closeSearch.onclick = () => searchSheet.classList.remove('active');

    if (document.getElementById('username-display')) {
        // Step 1: Get Viewer Profile
        const userQuery = `query { Viewer { id name avatar { large } statistics { anime { episodesWatched } manga { chaptersRead } } } }`;
        const userData = await apiFetch(userQuery);
        
        if (userData && userData.Viewer) {
            const v = userData.Viewer;
            document.getElementById('username-display').innerText = v.name;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
            if(document.getElementById('ep-stat')) document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched;
            if(document.getElementById('ch-stat')) document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead;

            // Step 2: Get Personal Lists explicitly for this User ID
            const listQuery = `query ($userId: Int) {
                watching: MediaListCollection(userId: $userId, status: CURRENT, type: ANIME) {
                    lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
                }
                reading: MediaListCollection(userId: $userId, status: CURRENT, type: MANGA) {
                    lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
                }
            }`;

            const listData = await apiFetch(listQuery, { userId: v.id });
            if (listData) {
                // AniList returns lists in an array; we take the first matching list
                const watchEntries = listData.watching.lists.flatMap(l => l.entries);
                const readEntries = listData.reading.lists.flatMap(l => l.entries);
                
                renderScrollerItems('anime-scroll', watchEntries, 'ANIME');
                renderScrollerItems('manga-scroll', readEntries, 'MANGA');
            }
            hideLoader();
        }
    }
}

function renderScrollerItems(containerId, entries, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!entries || entries.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">No active ${type.toLowerCase()} found.</p>`;
        return;
    }

    container.innerHTML = entries.map(entry => {
        const media = entry.media || entry;
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

// --- MULTI-TYPE SEARCH ENGINE ---

let currentSearchType = 'ANIME';

async function handleSearch(inputElement, resultContainerId) {
    const queryStr = inputElement.value.trim();
    const container = document.getElementById(resultContainerId);
    if (queryStr.length < 3) { container.innerHTML = ''; return; }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent); font-size:0.8rem;"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    let query = '';
    let variables = { search: queryStr };

    if (currentSearchType === 'CHARACTER') {
        query = `query ($search: String) { Page(perPage: 15) { characters(search: $search) { id name { full } image { large } } } }`;
    } else if (currentSearchType === 'USER') {
        query = `query ($search: String) { Page(perPage: 15) { users(search: $search) { id name avatar { large } } } }`;
    } else {
        query = `query ($search: String, $type: MediaType) { Page(perPage: 15) { media(search: $search, type: $type) { id title { romaji } coverImage { large } meanScore format } } }`;
        variables.type = currentSearchType;
    }

    const data = await apiFetch(query, variables);
    renderAdvancedResults(resultContainerId, data);
}

function renderAdvancedResults(containerId, data) {
    const container = document.getElementById(containerId);
    if (!data) return;
    const items = data.Page.media || data.Page.characters || data.Page.users || [];
    if (items.length === 0) { container.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-dim);">No results.</p>`; return; }

    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || item.name?.full || item.name;
        const img = item.coverImage?.large || item.image?.large || item.avatar?.large;
        const sub = item.format || currentSearchType;
        return `
            <div class="search-item-row" onclick="window.location.href='details.html?id=${item.id}&type=${currentSearchType}'" style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                <img src="${img}" style="width:40px; height:55px; border-radius:6px; object-fit:cover;">
                <div>
                    <h4 style="font-size:0.85rem; margin:0; color:white;">${title}</h4>
                    <p style="font-size:0.7rem; margin:4px 0 0; color:var(--accent); font-weight:600;">${sub}</p>
                </div>
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalUI();
    const gInput = document.getElementById('global-search-input');
    const chips = document.querySelectorAll('.chip');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            let type = chip.innerText.toUpperCase();
            currentSearchType = type === 'USERS' ? 'USER' : type === 'CHARACTERS' ? 'CHARACTER' : type;
            if(gInput.value.length >= 3) handleSearch(gInput, 'search-results');
        });
    });

    if (gInput) gInput.addEventListener('input', () => handleSearch(gInput, 'search-results'));
});
