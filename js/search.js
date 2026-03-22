/**
 * search.js - Dedicated search page for different categories
 */

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
const trendingContainer = document.getElementById('trending-results');
const trendingSection = document.getElementById('trending-section');

// Filter state
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let yearMin = null;
let yearMax = null;
let selectedSources = [];

// Load trending media on page load
async function loadTrending() {
    if (!current.mediaType) return;
    const trendingQuery = `
        query {
            Page(perPage: 12) {
                media(sort: TRENDING_DESC, type: ${current.queryType}, isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;
    const data = await apiFetch(trendingQuery);
    if (data?.Page?.media) {
        renderMediaResults(data.Page.media);
    } else {
        trendingContainer.innerHTML = '<div class="empty-message">No trending found.</div>';
    }
}

// Render media results (for both search and trending)
function renderMediaResults(items) {
    trendingSection.style.display = 'block';
    resultsContainer.style.display = 'none';
    if (items.length) {
        trendingContainer.innerHTML = items.map(item => {
            const detailPage = current.queryType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
            const score = item.meanScore ? (item.meanScore/10).toFixed(1)+'★' : '??';
            return `
                <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                    <div class="img-box">
                        <img src="${item.coverImage.large}" loading="lazy">
                        <div class="purple-badge">${score}</div>
                    </div>
                    <div class="media-title">${item.title.romaji}</div>
                </div>
            `;
        }).join('');
    } else {
        trendingContainer.innerHTML = '<div class="empty-message">No results found.</div>';
    }
}

// Load filter options (genres, tags, etc.)
async function loadFilterOptions() {
    if (!current.mediaType) return;
    const genreQuery = `{ GenreCollection }`;
    const tagQuery = `{ MediaTagCollection { name } }`;
    const formatOptions = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
    const statusOptions = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED'];
    const seasonOptions = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const sourceOptions = ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER', 'NOVEL'];

    const genresData = await apiFetch(genreQuery);
    const tagsData = await apiFetch(tagQuery);
    if (genresData?.GenreCollection) {
        renderFilterChips('genre-options', genresData.GenreCollection, 'genre');
    }
    if (tagsData?.MediaTagCollection) {
        renderFilterChips('tag-options', tagsData.MediaTagCollection.map(t => t.name), 'tag');
    }
    renderFilterChips('format-options', formatOptions, 'format');
    renderFilterChips('status-options', statusOptions, 'status');
    renderFilterChips('season-options', seasonOptions, 'season');
    renderFilterChips('source-options', sourceOptions, 'source');
}

function renderFilterChips(containerId, options, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = options.map(opt => `
        <div class="filter-chip" data-type="${type}" data-value="${opt}">${opt}</div>
    `).join('');
    container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            updateSelectedFilters();
        });
    });
}

function updateSelectedFilters() {
    selectedGenres = getSelectedValues('genre');
    selectedTags = getSelectedValues('tag');
    selectedFormats = getSelectedValues('format');
    selectedStatus = getSelectedValues('status');
    selectedSeasons = getSelectedValues('season');
    selectedSources = getSelectedValues('source');
    const yearMinInput = document.getElementById('year-min');
    const yearMaxInput = document.getElementById('year-max');
    yearMin = yearMinInput?.value ? parseInt(yearMinInput.value) : null;
    yearMax = yearMaxInput?.value ? parseInt(yearMaxInput.value) : null;
}

function getSelectedValues(type) {
    const chips = document.querySelectorAll(`.filter-chip[data-type="${type}"].selected`);
    return Array.from(chips).map(c => c.getAttribute('data-value'));
}

// Build GraphQL filter arguments
function buildFilterArgs() {
    let filterStr = '';
    if (selectedGenres.length) {
        filterStr += `, genre_in: ${JSON.stringify(selectedGenres)}`;
    }
    if (selectedTags.length) {
        filterStr += `, tag_in: ${JSON.stringify(selectedTags)}`;
    }
    if (selectedFormats.length) {
        filterStr += `, format_in: ${JSON.stringify(selectedFormats)}`;
    }
    if (selectedStatus.length) {
        filterStr += `, status_in: ${JSON.stringify(selectedStatus)}`;
    }
    if (selectedSeasons.length) {
        filterStr += `, season_in: ${JSON.stringify(selectedSeasons)}`;
    }
    if (yearMin) {
        filterStr += `, startDate_greater: ${yearMin}0101, startDate_lesser: ${yearMax ? yearMax + '1231' : '21001231'}`;
    } else if (yearMax) {
        filterStr += `, startDate_lesser: ${yearMax}1231`;
    }
    if (selectedSources.length) {
        filterStr += `, source_in: ${JSON.stringify(selectedSources)}`;
    }
    return filterStr;
}

async function performSearch(query) {
    if (!current.mediaType) return;

    if (!query || query.length < 2) {
        await loadTrending();
        return;
    }

    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `<div class="loading-spinner-small"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    let filterArgs = buildFilterArgs();
    const graphqlQuery = `
        query ($search: String, $type: MediaType) {
            Page(perPage: 20) {
                media(search: $search, type: $type ${filterArgs}) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;
    const variables = { search: query, type: current.queryType };

    const data = await apiFetch(graphqlQuery, variables);
    if (!data?.Page?.media) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    const items = data.Page.media;
    if (items.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    resultsContainer.innerHTML = items.map(item => {
        const detailPage = current.queryType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
        const score = item.meanScore ? (item.meanScore/10).toFixed(1)+'★' : '??';
        return `
            <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                <div class="img-box">
                    <img src="${item.coverImage.large}" loading="lazy">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${item.title.romaji}</div>
            </div>
        `;
    }).join('');
}

// Debounced search
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    debounceTimeout = setTimeout(() => performSearch(query), 500);
});

// Category buttons: show/hide the corresponding panel
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');
        const panel = document.getElementById(`${category}-panel`);
        if (panel) {
            // Hide all other panels
            document.querySelectorAll('.category-panel').forEach(p => {
                if (p !== panel) p.style.display = 'none';
            });
            // Toggle this panel
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    });
});

// Collapsible sections (Genres and Tags)
document.querySelectorAll('.filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-target');
        const target = document.getElementById(targetId);
        if (target) {
            const isVisible = target.style.display !== 'none';
            target.style.display = isVisible ? 'none' : 'flex';
            header.classList.toggle('active', !isVisible);
        }
    });
});

// Bottom sheet toggle
const filterToggle = document.getElementById('filter-toggle');
const filterSheet = document.getElementById('filter-sheet');
const closeFilter = document.getElementById('close-filter');

if (filterToggle && filterSheet && closeFilter) {
    filterToggle.onclick = () => filterSheet.classList.add('active');
    closeFilter.onclick = () => filterSheet.classList.remove('active');
}

// Apply filters and clear buttons
const applyBtn = document.getElementById('apply-filters');
const clearBtn = document.getElementById('clear-filters');
if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        updateSelectedFilters();
        filterSheet.classList.remove('active');
        if (searchInput.value.trim().length >= 2) performSearch(searchInput.value.trim());
    });
}
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip.selected').forEach(chip => chip.classList.remove('selected'));
        const yearMinInput = document.getElementById('year-min');
        const yearMaxInput = document.getElementById('year-max');
        if (yearMinInput) yearMinInput.value = '';
        if (yearMaxInput) yearMaxInput.value = '';
        updateSelectedFilters();
        filterSheet.classList.remove('active');
        if (searchInput.value.trim().length >= 2) performSearch(searchInput.value.trim());
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (current.mediaType) {
        loadFilterOptions();
        loadTrending();
    }
});
