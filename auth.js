/**
  auth.js - The Production Engine (Final Account Sync & Multi-Search)
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

// --- GLOBAL UI & ACCOUNT SYNC ---

async function initGlobalUI() {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch && searchSheet) {
        openSearch.onclick = () => searchSheet.classList.add('active');
    }
    if (closeSearch && searchSheet) {
        closeSearch.onclick = () => searchSheet.classList.remove('active');
    }

    // AUTHENTICATED FETCH: Profile + Lists
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
            # Fetch User's Current Anime List
            watching: MediaListCollection(status: CURRENT, type: ANIME) {
                lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
            }
            # Fetch User's Current Manga List
            reading: MediaListCollection(status: CURRENT, type: MANGA) {
                lists { entries { media { id title { romaji } coverImage { large } meanScore } } }
            }
        }`;
        
        const data = await apiFetch(query);
        if (data && data.Viewer) {
            const v = data.Viewer;
            document.getElementById('username-display').innerText = v.name;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
            if(document.getElementById('ep-stat')) document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched;
            if(document.getElementById('ch-stat')) document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead;

            // Render Real Account Progress
            if(data.watching.lists[0]) renderScrollerItems('anime-scroll', data.watching.lists[0].entries, 'ANIME');
            if(data.reading.lists[0]) renderScrollerItems('manga-scroll', data.reading.lists[0].entries, 'MANGA');
            
            hideLoader();
        }
    }
}

function renderScrollerItems(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container || !items || items.length === 0) {
        if(container) container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">Nothing here yet...</p>`;
        return;
    }
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

// --- MULTI-TYPE SEARCH LOGIC ---

let currentSearchType = 'ANIME'; // Default

async function handleSearch(inputElement, resultContainerId) {
    const queryStr = inputElement.value.trim();
    const container = document.getElementById(resultContainerId);
    
    if (queryStr.length < 3) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent); font-size:0.8rem; font-weight:700;">
        <i class="fas fa-circle-notch fa-spin"></i> SEARCHING ${currentSearchType}...
    </div>`;

    let query = '';
    let variables = { search: queryStr };

    // Branch query based on filter
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

    let items = data.Page.media || data.Page.characters || data.Page.users || [];

    if (items.length === 0) {
        container.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-dim);">No results.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || item.name?.full || item.name;
        const img = item.coverImage?.large || item.image?.large || item.avatar?.large;
        const sub = item.format || (item.name ? 'Result' : currentSearchType);
        
        // Link logic: characters and users can have different detail pages or just no-op for now
        let onClick = `window.location.href='details.html?id=${item.id}&type=${currentSearchType}'`;
        if(currentSearchType === 'USER' || currentSearchType === 'CHARACTER') onClick = `console.log('Detail for ${currentSearchType} not yet implemented')`;

        return `
            <div class="search-item-row" onclick="${onClick}" style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
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

    // Handle Chip Clicks
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentSearchType = chip.innerText.toUpperCase(); // ANIME, MANGA, USERS...
            if(currentSearchType === 'USERS') currentSearchType = 'USER';
            if(currentSearchType === 'CHARACTERS') currentSearchType = 'CHARACTER';
            
            if(gInput.value.length >= 3) handleSearch(gInput, 'search-results');
        });
    });

    if (gInput) gInput.addEventListener('input', () => handleSearch(gInput, 'search-results'));
});
