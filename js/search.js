/**
 * search.js - AniStats Pro Search & Filter Engine
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

// Filter selections
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let selectedSources = [];

// --- 2. Core API Helper ---
async function apiFetch(query, variables = {}) {
    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        return json.data;
    } catch (err) {
        console.error("API Fetch Error:", err);
        return null;
    }
}

// --- 3. UI Logic: Opening/Closing/Panels ---
function initUI() {
    const filterToggle = document.getElementById('filter-toggle');
    const filterSheet = document.getElementById('filter-sheet');
    const closeFilter = document.getElementById('close-filter');
    const searchInput = document.getElementById('search-input');

    // Set page title
    document.getElementById('search-type-title').innerText = current.title;

    // Toggle Bottom Sheet
    filterToggle.onclick = () => filterSheet.classList.add('active');
    closeFilter.onclick = () => filterSheet.classList.remove('active');

    // Category Panel Switching (Source, Format, etc.)
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = () => {
            const cat = btn.getAttribute('data-category');
            // Hide all panels
            document.querySelectorAll('.category-panel').forEach(p => p.style.display = 'none');
            // Show target panel
            const target = document.getElementById(`${cat}-panel`);
            if (target) target.style.display = 'block';
            
            // UI Feedback
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    // Collapsible Genres/Tags
    document.querySelectorAll('.filter-group-header').forEach(header => {
        header.onclick = () => {
            const targetId = header.getAttribute('data-target');
            const target = document.getElementById(targetId);
            const isHidden = target.style.display === 'none';
            target.style.display = isHidden ? 'flex' : 'none';
        };
    });

    // Apply & Clear Buttons
    document.getElementById('apply-filters').onclick = () => {
        filterSheet.classList.remove('active');
        performSearch(searchInput.value.trim());
    };

    document.getElementById('clear-filters').onclick = () => {
        document.querySelectorAll('.filter-chip.selected').forEach(c => c.classList.remove('selected'));
        document.getElementById('year-min').value = '';
        document.getElementById('year-max').value = '';
        filterSheet.classList.remove('active');
        performSearch(searchInput.value.trim());
    };

    // Search Input Debounce
    let timer;
    searchInput.oninput = (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => performSearch(e.target.value.trim()), 500);
    };
}

// --- 4. Filter Generation ---
async function loadFilterOptions() {
    if (!current.mediaType) return;

    const query = `{
        GenreCollection
        MediaTagCollection { name }
    }`;
    const data = await apiFetch(query);

    if (data) {
        renderChips('genre-options', data.GenreCollection, 'genre');
        renderChips('tag-options', data.MediaTagCollection.map(t => t.name), 'tag');
    }

    renderChips('format-options', ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'], 'format');
    renderChips('status-options', ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED'], 'status');
    renderChips('season-options', ['WINTER', 'SPRING', 'SUMMER', 'FALL'], 'season');
    renderChips('source-options', ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'NOVEL'], 'source');
}

function renderChips(containerId, list, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = list.map(item => `
        <div class="filter-chip" data-type="${type}" data-value="${item}">${item}</div>
    `).join('');

    container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => chip.classList.toggle('selected');
    });
}

// --- 5. The Search Engine ---
async function performSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    const trendingSection = document.getElementById('trending-section');
    
    // 1. Gather Filter Data
    const getVals = (t) => Array.from(document.querySelectorAll(`.filter-chip[data-type="${t}"].selected`)).map(c => c.dataset.value);
    const genres = getVals('genre');
    const tags = getVals('tag');
    const formats = getVals('format');
    const status = getVals('status');
    const seasons = getVals('season');
    const sources = getVals('source');
    const yMin = document.getElementById('year-min').value;
    const yMax = document.getElementById('year-max').value;

    const hasFilters = genres.length || tags.length || formats.length || status.length || seasons.length || sources.length || yMin || yMax;

    if (!query && !hasFilters) {
        trendingSection.style.display = 'block';
        resultsContainer.style.display = 'none';
        return;
    }

    // 2. Build Dynamic Query
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = '<div class="loading">Searching AniList...</div>';

    let varDefs = ['$type: MediaType'];
    let mediaArgs = ['type: $type', 'isAdult: false'];
    let vars = { type: current.queryType };

    if (query) {
        varDefs.push('$search: String');
        mediaArgs.push('search: $search');
        vars.search = query;
    } else {
        mediaArgs.push('sort: POPULARITY_DESC');
    }

    if (genres.length) { varDefs.push('$g: [String]'); mediaArgs.push('genre_in: $g'); vars.g = genres; }
    if (tags.length) { varDefs.push('$t: [String]'); mediaArgs.push('tag_in: $t'); vars.t = tags; }
    if (formats.length) { varDefs.push('$f: [MediaFormat]'); mediaArgs.push('format_in: $f'); vars.f = formats; }
    if (status.length) { varDefs.push('$s: [MediaStatus]'); mediaArgs.push('status_in: $s'); vars.s = status; }
    if (seasons.length) { varDefs.push('$sn: [MediaSeason]'); mediaArgs.push('season_in: $sn'); vars.sn = seasons; }
    if (sources.length) { varDefs.push('$src: [MediaSource]'); mediaArgs.push('source_in: $src'); vars.src = sources; }
    
    if (yMin) { varDefs.push('$yG: Int'); mediaArgs.push('startDate_greater: $yG'); vars.yG = parseInt(yMin + "0000"); }
    if (yMax) { varDefs.push('$yL: Int'); mediaArgs.push('startDate_lesser: $yL'); vars.yL = parseInt(yMax + "9999"); }

    const finalQuery = `query(${varDefs.join(',')}){ Page(perPage:20){ media(${mediaArgs.join(',')}){ id title{romaji} coverImage{large} meanScore format } } }`;
    
    const data = await apiFetch(finalQuery, vars);
    renderResults(data?.Page?.media || []);
}

function renderResults(items) {
    const resultsContainer = document.getElementById('search-results');
    if (!items.length) {
        resultsContainer.innerHTML = '<div class="empty-message">No results found.</div>';
        return;
    }
    resultsContainer.innerHTML = items.map(item => `
        <div class="media-item" onclick="window.location.href='${current.queryType.toLowerCase()}-detail.html?id=${item.id}'">
            <div class="img-box">
                <img src="${item.coverImage.large}" loading="lazy">
                <div class="purple-badge">${item.meanScore ? (item.meanScore/10).toFixed(1) : '??'}★</div>
            </div>
            <div class="media-title">${item.title.romaji}</div>
        </div>
    `).join('');
}

// --- 6. Startup ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    if (current.mediaType) {
        loadFilterOptions();
        // Load default trending
        apiFetch(`query($type:MediaType){ Page(perPage:12){ media(type:$type, sort:TRENDING_DESC, isAdult:false){ id title{romaji} coverImage{large} meanScore } } }`, {type: current.queryType})
            .then(data => {
                const trend = document.getElementById('trending-results');
                if (data) {
                    trend.innerHTML = data.Page.media.map(item => `
                        <div class="media-item" onclick="window.location.href='${current.queryType.toLowerCase()}-detail.html?id=${item.id}'">
                            <div class="img-box">
                                <img src="${item.coverImage.large}" loading="lazy">
                            </div>
                            <div class="media-title">${item.title.romaji}</div>
                        </div>
                    `).join('');
                }
            });
    }
});
