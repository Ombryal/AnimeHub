/**
 * search.js - Dedicated search page for different categories
 */

const urlParams = new URLSearchParams(window.location.search);
const searchType = (urlParams.get('type') || 'ANIME').toUpperCase();

const typeMap = {
    ANIME: { queryType: 'ANIME', title: 'Search Anime', mediaType: true },
    MANGA: { queryType: 'MANGA', title: 'Search Manga', mediaType: true },
    USER: { queryType: 'USER', title: 'Search Users', mediaType: false },
    CHARACTER: { queryType: 'CHARACTER', title: 'Search Characters', mediaType: false },
    STAFF: { queryType: 'STAFF', title: 'Search Staff', mediaType: false },
    STUDIO: { queryType: 'STUDIO', title: 'Search Studios', mediaType: false }
};

const current = typeMap[searchType] || typeMap.ANIME;

let searchInput = null;
let resultsContainer = null;
let trendingContainer = null;
let trendingSection = null;
let filterToggle = null;
let filterSheet = null;
let closeFilter = null;
let applyBtn = null;
let clearBtn = null;

let debounceTimeout = null;

// Filter state
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let yearMin = null;
let yearMax = null;
let selectedSources = [];

document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.getElementById('search-type-title');
    if (titleEl) titleEl.innerText = current.title;

    searchInput = document.getElementById('search-input');
    resultsContainer = document.getElementById('search-results');
    trendingContainer = document.getElementById('trending-results');
    trendingSection = document.getElementById('trending-section');
    filterToggle = document.getElementById('filter-toggle');
    filterSheet = document.getElementById('filter-sheet');
    closeFilter = document.getElementById('close-filter');
    applyBtn = document.getElementById('apply-filters');
    clearBtn = document.getElementById('clear-filters');

    if (!current.mediaType && filterToggle) {
        filterToggle.style.display = 'none';
    }

    if (current.mediaType) {
        await loadFilterOptions();
        await loadTrending();
    } else if (resultsContainer) {
        resultsContainer.style.display = 'grid';
        resultsContainer.innerHTML = `<div class="empty-message">Type a name to search.</div>`;
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            const query = e.target.value.trim();
            debounceTimeout = setTimeout(() => performSearch(query), 500);
        });
    }

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            const panel = document.getElementById(`${category}-panel`);
            if (!panel) return;

            const isOpen = panel.style.display === 'block';
            document.querySelectorAll('.category-panel').forEach(p => {
                p.style.display = 'none';
            });
            panel.style.display = isOpen ? 'none' : 'block';
        });
    });

    document.querySelectorAll('.filter-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (!target) return;

            const isVisible = target.style.display !== 'none';
            target.style.display = isVisible ? 'none' : 'flex';
            header.classList.toggle('active', !isVisible);
        });
    });

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

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            updateSelectedFilters();
            if (filterSheet) filterSheet.classList.remove('active');
            document.body.classList.remove('filter-sheet-open');
            const query = searchInput ? searchInput.value.trim() : '';
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

            if (filterSheet) filterSheet.classList.remove('active');
            document.body.classList.remove('filter-sheet-open');

            const query = searchInput ? searchInput.value.trim() : '';
            performSearch(query);
        });
    }
});

async function loadTrending() {
    if (!current.mediaType || !trendingContainer || !trendingSection || !resultsContainer) return;

    trendingSection.style.display = 'block';
    resultsContainer.style.display = 'none';

    trendingContainer.innerHTML = `
        <div class="loading-spinner-small">
            <i class="fas fa-circle-notch fa-spin"></i> Loading trending...
        </div>
    `;

    const trendingQuery = `
        query ($type: MediaType) {
            Page(perPage: 12) {
                media(sort: TRENDING_DESC, type: $type, isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;

    const data = await apiFetch(trendingQuery, { type: current.queryType });
    const items = data?.Page?.media || [];

    if (!items.length) {
        trendingContainer.innerHTML = '<div class="empty-message">No trending found.</div>';
        return;
    }

    renderMediaCards(items, trendingContainer);
}

async function loadFilterOptions() {
    if (!current.mediaType) return;

    const genreQuery = `{ GenreCollection }`;
    const tagQuery = `{ MediaTagCollection { name isAdult } }`;

    const formatOptions = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
    const statusOptions = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'];
    const seasonOptions = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const sourceOptions = ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER', 'NOVEL'];

    const genresData = await apiFetch(genreQuery);
    const tagsData = await apiFetch(tagQuery);

    if (genresData?.GenreCollection) {
        renderFilterChips('genre-options', genresData.GenreCollection, 'genre');
    }

    if (tagsData?.MediaTagCollection) {
        const tags = tagsData.MediaTagCollection
            .filter(tag => !tag.isAdult)
            .map(tag => tag.name);
        renderFilterChips('tag-options', tags, 'tag');
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
        <div class="filter-chip" data-type="${type}" data-value="${String(opt).trim()}">${opt}</div>
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

    yearMin = yearMinInput?.value ? parseInt(yearMinInput.value, 10) : null;
    yearMax = yearMaxInput?.value ? parseInt(yearMaxInput.value, 10) : null;

    if (Number.isNaN(yearMin)) yearMin = null;
    if (Number.isNaN(yearMax)) yearMax = null;
}

function getSelectedValues(type) {
    const chips = document.querySelectorAll(`.filter-chip[data-type="${type}"].selected`);
    return Array.from(chips).map(c => c.getAttribute('data-value'));
}

function buildMediaArgsAndVars(query) {
    const hasSearch = !!query;
    const args = ['type: $type', 'sort: POPULARITY_DESC'];
    const variables = { type: current.queryType };

    if (hasSearch) {
        args.push('search: $search');
        variables.search = query;
    }

    if (selectedGenres.length) {
        args.push('genre_in: $genre');
        variables.genre = selectedGenres;
    }

    if (selectedTags.length) {
        args.push('tag_in: $tags');
        variables.tags = selectedTags;
    }

    if (selectedFormats.length) {
        args.push('format_in: $format');
        variables.format = selectedFormats;
    }

    if (selectedStatus.length) {
        args.push('status_in: $status');
        variables.status = selectedStatus;
    }

    if (selectedSeasons.length) {
        args.push('season_in: $season');
        variables.season = selectedSeasons;
    }

    if (selectedSources.length) {
        args.push('source_in: $source');
        variables.source = selectedSources;
    }

    if (yearMin) {
        args.push('startDate_greater: $start');
        variables.start = parseInt(`${yearMin}0101`, 10);
    }

    if (yearMax) {
        args.push('startDate_lesser: $end');
        variables.end = parseInt(`${yearMax}1231`, 10);
    }

    return { args, variables, hasSearch };
}

async function performSearch(query) {
    if (current.mediaType) {
        await performMediaSearch(query);
    } else {
        await performEntitySearch(query);
    }
}

async function performMediaSearch(query) {
    if (!resultsContainer || !trendingSection || !trendingContainer) return;

    const hasSearch = !!query;
    const hasFilters =
        selectedGenres.length ||
        selectedTags.length ||
        selectedFormats.length ||
        selectedStatus.length ||
        selectedSeasons.length ||
        selectedSources.length ||
        yearMin ||
        yearMax;

    if (!hasSearch && !hasFilters) {
        await loadTrending();
        return;
    }

    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `
        <div class="loading-spinner-small">
            <i class="fas fa-circle-notch fa-spin"></i> Searching...
        </div>
    `;

    const { args, variables } = buildMediaArgsAndVars(query);

    const graphqlQuery = `
        query ($search: String, $type: MediaType, $genre: [String], $tags: [String], $format: [MediaFormat], $status: [MediaStatus], $season: [MediaSeason], $source: [MediaSource], $start: FuzzyDateInt, $end: FuzzyDateInt) {
            Page(perPage: 20) {
                media(${args.join(', ')}) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;

    const data = await apiFetch(graphqlQuery, variables);

    const items = data?.Page?.media || [];
    if (!items.length) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    renderMediaCards(items, resultsContainer);
}

async function performEntitySearch(query) {
    if (!resultsContainer) return;

    if (!query) {
        resultsContainer.style.display = 'grid';
        resultsContainer.innerHTML = `<div class="empty-message">Type a name to search.</div>`;
        return;
    }

    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `
        <div class="loading-spinner-small">
            <i class="fas fa-circle-notch fa-spin"></i> Searching...
        </div>
    `;

    let graphqlQuery = '';
    let resultKey = '';
    let variables = { search: query };

    if (current.queryType === 'USER') {
        graphqlQuery = `
            query ($search: String) {
                Page(perPage: 20) {
                    users(search: $search) {
                        id
                        name
                        avatar { large }
                    }
                }
            }`;
        resultKey = 'users';
    } else if (current.queryType === 'CHARACTER') {
        graphqlQuery = `
            query ($search: String) {
                Page(perPage: 20) {
                    characters(search: $search) {
                        id
                        name { full }
                        image { large }
                    }
                }
            }`;
        resultKey = 'characters';
    } else if (current.queryType === 'STAFF') {
        graphqlQuery = `
            query ($search: String) {
                Page(perPage: 20) {
                    staff(search: $search) {
                        id
                        name { full }
                        image { large }
                    }
                }
            }`;
        resultKey = 'staff';
    } else if (current.queryType === 'STUDIO') {
        graphqlQuery = `
            query ($search: String) {
                Page(perPage: 20) {
                    studios(search: $search) {
                        id
                        name
                    }
                }
            }`;
        resultKey = 'studios';
    }

    if (!graphqlQuery) {
        resultsContainer.innerHTML = `<div class="empty-message">Search is not available for this category yet.</div>`;
        return;
    }

    const data = await apiFetch(graphqlQuery, variables);
    const items = data?.Page?.[resultKey] || [];

    if (!items.length) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    resultsContainer.innerHTML = renderEntityResults(items, current.queryType);
}

function renderMediaCards(items, container) {
    const detailPage = current.queryType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';

    container.innerHTML = items.map(item => {
        const score = item.meanScore ? `${(item.meanScore / 10).toFixed(1)}★` : '??';

        return `
            <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                <div class="img-box">
                    <img src="${item.coverImage?.large || 'placeholder.jpg'}" loading="lazy" alt="${item.title?.romaji || 'Media cover'}">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${item.title?.romaji || 'Unknown'}</div>
            </div>
        `;
    }).join('');
}

function renderEntityResults(items, type) {
    if (type === 'STUDIO') {
        return items.map(item => `
            <div class="result-card studio-card">
                <div class="studio-badge">${(item.name || '?').slice(0, 1).toUpperCase()}</div>
                <div class="title">${item.name || 'Unknown'}</div>
                <div class="sub">Studio</div>
            </div>
        `).join('');
    }

    const isUser = type === 'USER';

    return items.map(item => {
        const title = item.name?.full || item.name || 'Unknown';
        const img = isUser ? item.avatar?.large : item.image?.large;
        const sub = isUser ? 'User' : type === 'CHARACTER' ? 'Character' : 'Staff';

        return `
            <div class="result-card ${isUser ? 'user-card' : ''}">
                ${img ? `<img src="${img}" loading="lazy" alt="${title}">` : `<div class="studio-badge">${title.slice(0, 1).toUpperCase()}</div>`}
                <div class="title">${title}</div>
                <div class="sub">${sub}</div>
            </div>
        `;
    }).join('');
}
