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

// Filter selections (for genres/tags chips)
let selectedGenres = [];
let selectedTags = [];

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

// --- 3. UI Logic: Opening/Closing/Dropdowns ---
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
        // Clear chips
        document.querySelectorAll('.filter-chip.selected').forEach(c => c.classList.remove('selected'));
        // Clear year inputs
        document.getElementById('year-min').value = '';
        document.getElementById('year-max').value = '';
        // Clear dropdowns
        document.getElementById('format-select').value = '';
        document.getElementById('status-select').value = '';
        document.getElementById('season-select').value = '';
        document.getElementById('source-select').value = '';
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

    // Fetch genres and tags from AniList
    const query = `{
        GenreCollection
        MediaTagCollection { name }
    }`;
    const data = await apiFetch(query);

    if (data) {
        renderChips('genre-options', data.GenreCollection, 'genre');
        renderChips('tag-options', data.MediaTagCollection.map(t => t.name), 'tag');
    }

    // Populate dropdowns with options
    const formatSelect = document.getElementById('format-select');
    const statusSelect = document.getElementById('status-select');
    const seasonSelect = document.getElementById('season-select');
    const sourceSelect = document.getElementById('source-select');

    const formats = ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'];
    const statuses = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED'];
    const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const sources = ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'NOVEL'];

    function populate(select, options, placeholder = 'Any') {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        options.forEach(opt => {
            select.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    }

    populate(formatSelect, formats);
    populate(statusSelect, statuses);
    populate(seasonSelect, seasons);
    populate(sourceSelect, sources);
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

// --- 5. The Search Engine (now returns up to 50 results) ---
async function performSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    const trendingSection = document.getElementById('trending-section');
    
    // 1. Gather Filter Data
    const getChipVals = (t) => Array.from(document.querySelectorAll(`.filter-chip[data-type="${t}"].selected`)).map(c => c.dataset.value);
    const genres = getChipVals('genre');
    const tags = getChipVals('tag');

    // Get dropdown values (single)
    const format = document.getElementById('format-select').value;
    const status = document.getElementById('status-select').value;
    const season = document.getElementById('season-select').value;
    const source = document.getElementById('source-select').value;

    // Convert to arrays for _in filters
    const formats = format ? [format] : [];
    const statuses = status ? [status] : [];
    const seasons = season ? [season] : [];
    const sources = source ? [source] : [];

    const yMin = document.getElementById('year-min').value;
    const yMax = document.getElementById('year-max').value;

    const hasFilters = genres.length || tags.length || formats.length || statuses.length || seasons.length || sources.length || yMin || yMax;

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
    if (statuses.length) { varDefs.push('$s: [MediaStatus]'); mediaArgs.push('status_in: $s'); vars.s = statuses; }
    if (seasons.length) { varDefs.push('$sn: [MediaSeason]'); mediaArgs.push('season_in: $sn'); vars.sn = seasons; }
    if (sources.length) { varDefs.push('$src: [MediaSource]'); mediaArgs.push('source_in: $src'); vars.src = sources; }
    
    if (yMin) { varDefs.push('$yG: Int'); mediaArgs.push('startDate_greater: $yG'); vars.yG = parseInt(yMin + "0000"); }
    if (yMax) { varDefs.push('$yL: Int'); mediaArgs.push('startDate_lesser: $yL'); vars.yL = parseInt(yMax + "9999"); }

    // 🔁 Increase perPage to 50 for more results
    const finalQuery = `query(${varDefs.join(',')}){ Page(perPage:50){ media(${mediaArgs.join(',')}){ id title{romaji} coverImage{large} meanScore format } } }`;
    
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
        // Load default trending (now shows 20 items)
        apiFetch(`query($type:MediaType){ Page(perPage:20){ media(type:$type, sort:TRENDING_DESC, isAdult:false){ id title{romaji} coverImage{large} meanScore } } }`, {type: current.queryType})
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
