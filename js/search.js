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

function renderMediaResults(items) {
    if (items.length) {
        trendingSection.style.display = 'block';
        resultsContainer.style.display = 'none';
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

async function loadTrending() {
    if (!current.mediaType) return;
    
    const trendingQuery = `
        query ($type: MediaType) {
            Page(page: 1, perPage: 12) {
                media(type: $type, sort: [TRENDING_DESC], isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;
    
    const response = await apiFetch(trendingQuery, { type: current.queryType });
    const items = response?.data?.Page?.media || [];
    
    if (items.length) {
        renderMediaResults(items);
        trendingSection.style.display = 'block';
    } else {
        trendingContainer.innerHTML = '<div class="empty-message">No trending found.</div>';
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

// Build arguments and variables
function buildMediaArgsAndVars(query) {
    const args = ['type: $type', 'sort: [POPULARITY_DESC, SCORE_DESC]'];
    const variables = { type: current.queryType };

    if (query) {
        args.push('search: $search');
        variables.search = query;
    }

    if (selectedGenres.length) {
        args.push('genre_in: $genres');
        variables.genres = selectedGenres;
    }

    if (selectedTags.length) {
        args.push('tag_in: $tags');
        variables.tags = selectedTags;
    }

    if (selectedFormats.length) {
        args.push('format_in: $format');
        variables.format = selectedFormats;
    }

    // Singular fields (take first selection)
    if (selectedStatus.length) {
        args.push('status: $status');
        variables.status = selectedStatus[0];
    }
    if (selectedSeasons.length) {
        args.push('season: $season');
        variables.season = selectedSeasons[0];
    }
    if (selectedSources.length) {
        args.push('source: $source');
        variables.source = selectedSources[0];
    }

    if (yearMin) {
        args.push('startDate_like: $yearGreater');
        variables.yearGreater = { year: yearMin };
    }
    if (yearMax) {
        args.push('startDate_like: $yearLesser');
        variables.yearLesser = { year: yearMax };
    }

    return { args, variables };
}

async function performSearch(query) {
    if (!current.mediaType) return;

    const hasSearch = !!query;
    const hasFilters = selectedGenres.length || selectedTags.length || selectedFormats.length || 
                       selectedStatus.length || selectedSeasons.length || selectedSources.length || 
                       yearMin || yearMax;

    if (!hasSearch && !hasFilters) {
        loadTrending();
        return;
    }

    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `<div class="loading-spinner-small"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    const { args, variables } = buildMediaArgsAndVars(query);

    const graphqlQuery = `
        query ($search: String, $type: MediaType, $genres: [String], $tags: [String], $format: [MediaFormat], $status: MediaStatus, $season: MediaSeason, $source: MediaSource, $yearGreater: FuzzyDateInput, $yearLesser: FuzzyDateInput) {
            Page(page: 1, perPage: 20) {
                media(${args.join(', ')}, isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;

    try {
        const response = await apiFetch(graphqlQuery, variables);
        const items = response?.data?.Page?.media || [];
        
        if (!items.length) {
            resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
            return;
        }

        renderMediaResults(items);
    } catch (error) {
        console.error('API Error:', error);
        resultsContainer.innerHTML = `<div class="empty-message">API Error - check console</div>`;
    }
}

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
            document.querySelectorAll('.category-panel').forEach(p => {
                if (p !== panel) p.style.display = 'none';
            });
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
    filterToggle.onclick = () => {
        filterSheet.classList.add('active');
        document.body.classList.add('filter-sheet-open');
    };
    closeFilter.onclick = () => {
        filterSheet.classList.remove('active');
        document.body.classList.remove('filter-sheet-open');
    };
}

// Apply filters and clear buttons
const applyBtn = document.getElementById('apply-filters');
const clearBtn = document.getElementById('clear-filters');
if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        updateSelectedFilters();
        filterSheet.classList.remove('active');
        document.body.classList.remove('filter-sheet-open');
        const query = searchInput.value.trim();
        performSearch(query);
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
        document.body.classList.remove('filter-sheet-open');
        const query = searchInput.value.trim();
        performSearch(query);
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (current.mediaType) {
        loadFilterOptions();
        loadTrending();
    }
});
