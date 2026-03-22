/**
 * search.js - Full Fixed Logic for AniList Search & Filtering
 */

// --- 1. Configuration & State ---
const urlParams = new URLSearchParams(window.location.search);
const searchType = urlParams.get('type') || 'ANIME';

const typeMap = {
    'ANIME': { queryType: 'ANIME', title: 'Search Anime', mediaType: true },
    'MANGA': { queryType: 'MANGA', title: 'Search Manga', mediaType: true },
    'USER': { queryType: 'USER', title: 'Search Users', mediaType: false },
    'CHARACTER': { queryType: 'CHARACTER', title: 'Search Characters', mediaType: false },
    'STAFF': { queryType: 'STAFF', title: 'Search Staff', mediaType: false },
    'STUDIO': { queryType: 'STUDIO', title: 'Search Studios', mediaType: false }
};

const current = typeMap[searchType] || typeMap['ANIME'];
document.getElementById('search-type-title').innerText = current.title;

const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');
const trendingSection = document.getElementById('trending-section');
const trendingContainer = document.getElementById('trending-results');

// Filter state
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let selectedSources = [];
let yearMin = null;
let yearMax = null;

// --- 2. Core API Fetch Helper ---
async function apiFetch(query, variables = {}) {
    const url = 'https://graphql.anilist.co';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables })
    };

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        if (json.errors) {
            console.error('AniList API Error:', json.errors);
            return null;
        }
        return json.data;
    } catch (err) {
        console.error('Network Error:', err);
        return null;
    }
}

// --- 3. Dynamic Media Search (The Fix) ---
async function performMediaSearch(query) {
    const hasSearch = !!query;
    
    // We build the query parts dynamically to avoid "Variable not used" errors
    let varDefs = ['$type: MediaType'];
    let mediaArgs = ['type: $type', 'isAdult: false'];
    const variables = { type: current.queryType };

    if (hasSearch) {
        varDefs.push('$search: String');
        mediaArgs.push('search: $search');
        variables.search = query;
    } else {
        mediaArgs.push('sort: [POPULARITY_DESC, SCORE_DESC]');
    }

    // Add filter logic only if arrays have items
    if (selectedGenres.length) {
        varDefs.push('$genres: [String]');
        mediaArgs.push('genre_in: $genres');
        variables.genres = selectedGenres;
    }
    if (selectedTags.length) {
        varDefs.push('$tags: [String]');
        mediaArgs.push('tag_in: $tags');
        variables.tags = selectedTags;
    }
    if (selectedFormats.length) {
        varDefs.push('$format: [MediaFormat]');
        mediaArgs.push('format_in: $format');
        variables.format = selectedFormats;
    }
    if (selectedStatus.length) {
        varDefs.push('$status: [MediaStatus]');
        mediaArgs.push('status_in: $status');
        variables.status = selectedStatus;
    }
    if (selectedSeasons.length) {
        varDefs.push('$season: [MediaSeason]');
        mediaArgs.push('season_in: $season');
        variables.season = selectedSeasons;
    }
    if (selectedSources.length) {
        varDefs.push('$source: [MediaSource]');
        mediaArgs.push('source_in: $source');
        variables.source = selectedSources;
    }
    if (yearMin) {
        varDefs.push('$yearGreater: Int');
        mediaArgs.push('startDate_greater: $yearGreater');
        variables.yearGreater = parseInt(`${yearMin}0101`);
    }
    if (yearMax) {
        varDefs.push('$yearLesser: Int');
        mediaArgs.push('startDate_lesser: $yearLesser');
        variables.yearLesser = parseInt(`${yearMax}1231`);
    }

    const graphqlQuery = `
        query (${varDefs.join(', ')}) {
            Page(perPage: 24) {
                media(${mediaArgs.join(', ')}) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;

    const data = await apiFetch(graphqlQuery, variables);
    renderMediaResults(data?.Page?.media || []);
}

// --- 4. Rendering & Non-Media Searches ---
function renderMediaResults(items, isTrending = false) {
    const container = isTrending ? trendingContainer : resultsContainer;
    
    if (!items || !items.length) {
        container.innerHTML = '<div class="empty-message">No results found matching those filters.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const detailPage = current.queryType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
        const score = item.meanScore ? (item.meanScore / 10).toFixed(1) + '★' : '??';
        return `
            <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                <div class="img-box">
                    <img src="${item.coverImage.large}" loading="lazy" alt="${item.title.romaji}">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${item.title.romaji}</div>
                <div class="media-format">${item.format || ''}</div>
            </div>
        `;
    }).join('');
}

async function performUserSearch(query) {
    const q = `query($s:String){ Page{ users(search:$s){ id name avatar{large} } } }`;
    const data = await apiFetch(q, { s: query });
    const items = data?.Page?.users || [];
    resultsContainer.innerHTML = items.map(u => `
        <div class="result-card user-card" onclick="window.location.href='user-detail.html?id=${u.id}'">
            <img src="${u.avatar.large}" loading="lazy">
            <div class="title">${u.name}</div>
        </div>
    `).join('') || '<div class="empty-message">No users found.</div>';
}

// (Characters, Staff, and Studios follow the same simple pattern as performUserSearch)

// --- 5. Global Search Dispatcher ---
async function performSearch(query) {
    const hasFilters = selectedGenres.length || selectedTags.length || selectedFormats.length || 
                       selectedStatus.length || selectedSeasons.length || selectedSources.length || 
                       yearMin || yearMax;

    if (!query && !hasFilters) {
        loadTrending();
        return;
    }

    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `<div class="loading">Searching...</div>`;

    if (current.mediaType) {
        await performMediaSearch(query);
    } else {
        // Simple search for non-media types
        if (current.queryType === 'USER') await performUserSearch(query);
        // Add CHARACTER/STAFF/STUDIO calls here as needed
    }
}

// --- 6. Trending Logic ---
async function loadTrending() {
    if (!current.mediaType) return;
    const q = `query($type:MediaType){ Page(perPage:12){ media(type:$type, sort:TRENDING_DESC, isAdult:false){ id title{romaji} coverImage{large} meanScore format } } }`;
    const data = await apiFetch(q, { type: current.queryType });
    renderMediaResults(data?.Page?.media || [], true);
    trendingSection.style.display = 'block';
    resultsContainer.style.display = 'none';
}

// --- 7. Filter UI & Event Binding ---
function updateSelectedFilters() {
    selectedGenres = getSelectedValues('genre');
    selectedTags = getSelectedValues('tag');
    selectedFormats = getSelectedValues('format');
    selectedStatus = getSelectedValues('status');
    selectedSeasons = getSelectedValues('season');
    selectedSources = getSelectedValues('source');
    yearMin = document.getElementById('year-min')?.value || null;
    yearMax = document.getElementById('year-max')?.value || null;
}

function getSelectedValues(type) {
    return Array.from(document.querySelectorAll(`.filter-chip[data-type="${type}"].selected`))
                .map(c => c.getAttribute('data-value'));
}

// Debounce for the search bar
let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => performSearch(e.target.value.trim()), 500);
});

// Apply / Clear buttons
document.getElementById('apply-filters')?.addEventListener('click', () => {
    updateSelectedFilters();
    document.getElementById('filter-sheet').classList.remove('active');
    performSearch(searchInput.value.trim());
});

document.getElementById('clear-filters')?.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip.selected').forEach(c => c.classList.remove('selected'));
    ['year-min', 'year-max'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
    updateSelectedFilters();
    performSearch(searchInput.value.trim());
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (current.mediaType) {
        loadTrending();
        // Trigger filter option loading here (GenreCollection etc)
    }
});
