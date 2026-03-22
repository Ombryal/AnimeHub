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
const trendingSection = document.getElementById('trending-section');
const trendingContainer = document.getElementById('trending-results');

// Filter state
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let yearMin = null;
let yearMax = null;
let selectedSources = [];

// ---------- Helper: render media results ----------
function renderMediaResults(items, isTrending = false) {
    if (!items.length) {
        if (isTrending) {
            trendingContainer.innerHTML = '<div class="empty-message">No trending found.</div>';
        } else {
            resultsContainer.innerHTML = '<div class="empty-message">No results found.</div>';
        }
        return;
    }

    const html = items.map(item => {
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

    if (isTrending) {
        trendingContainer.innerHTML = html;
    } else {
        resultsContainer.innerHTML = html;
    }
}

// ---------- Trending ----------
async function loadTrending() {
    if (!current.mediaType) return;
    const trendingQuery = `
        query ($type: MediaType) {
            Page(perPage: 12) {
                media(type: $type, sort: TRENDING_DESC, isAdult: false) {
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
    renderMediaResults(items, true);
    trendingSection.style.display = items.length ? 'block' : 'none';
    resultsContainer.style.display = 'none';
}

// ---------- Build query for media (anime/manga) ----------
async function performMediaSearch(query, hasFilters) {
    const hasSearch = !!query;
    const args = [`type: $type`, `isAdult: false`];
    const variables = { type: current.queryType };

    if (hasSearch) {
        args.push(`search: $search`);
        variables.search = query;
    } else {
        // When no search term, allow sorting by popularity, but don't force if search exists
        args.push(`sort: [POPULARITY_DESC, SCORE_DESC]`);
    }

    // Add filters only if they have values
    if (selectedGenres.length) {
        args.push(`genre_in: $genres`);
        variables.genres = selectedGenres;
    }
    if (selectedTags.length) {
        args.push(`tag_in: $tags`);
        variables.tags = selectedTags;
    }
    if (selectedFormats.length) {
        args.push(`format_in: $format`);
        variables.format = selectedFormats;
    }
    if (selectedStatus.length) {
        args.push(`status_in: $status`);
        variables.status = selectedStatus;
    }
    if (selectedSeasons.length) {
        args.push(`season_in: $season`);
        variables.season = selectedSeasons;
    }
    if (selectedSources.length) {
        args.push(`source_in: $source`);
        variables.source = selectedSources;
    }

    // Year range: convert to YYYYMMDD integers
    if (yearMin) {
        args.push(`startDate_greater: $yearGreater`);
        variables.yearGreater = parseInt(`${yearMin}0101`);
    }
    if (yearMax) {
        args.push(`startDate_lesser: $yearLesser`);
        variables.yearLesser = parseInt(`${yearMax}1231`);
    }

    const graphqlQuery = `
        query ($search: String, $type: MediaType, $genres: [String], $tags: [String], $format: [MediaFormat], $status: [MediaStatus], $season: [MediaSeason], $source: [MediaSource], $yearGreater: Int, $yearLesser: Int) {
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
    renderMediaResults(items, false);
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
}

// ---------- Non‑media searches ----------
async function performUserSearch(query) {
    const graphqlQuery = `
        query ($search: String) {
            Page(perPage: 20) {
                users(search: $search) {
                    id
                    name
                    avatar { large }
                }
            }
        }`;
    const data = await apiFetch(graphqlQuery, { search: query });
    const items = data?.Page?.users || [];
    if (items.length) {
        resultsContainer.innerHTML = items.map(user => `
            <div class="result-card user-card" onclick="window.location.href='user-detail.html?id=${user.id}'">
                <img src="${user.avatar?.large || 'placeholder.jpg'}" loading="lazy">
                <div class="title">${user.name}</div>
                <div class="sub">User</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<div class="empty-message">No users found.</div>';
    }
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
}

async function performCharacterSearch(query) {
    const graphqlQuery = `
        query ($search: String) {
            Page(perPage: 20) {
                characters(search: $search) {
                    id
                    name { full }
                    image { large }
                }
            }
        }`;
    const data = await apiFetch(graphqlQuery, { search: query });
    const items = data?.Page?.characters || [];
    if (items.length) {
        resultsContainer.innerHTML = items.map(char => `
            <div class="result-card" onclick="window.location.href='character-detail.html?id=${char.id}'">
                <img src="${char.image?.large || 'placeholder.jpg'}" loading="lazy">
                <div class="title">${char.name.full}</div>
                <div class="sub">Character</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<div class="empty-message">No characters found.</div>';
    }
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
}

async function performStaffSearch(query) {
    const graphqlQuery = `
        query ($search: String) {
            Page(perPage: 20) {
                staff(search: $search) {
                    id
                    name { full }
                    image { large }
                }
            }
        }`;
    const data = await apiFetch(graphqlQuery, { search: query });
    const items = data?.Page?.staff || [];
    if (items.length) {
        resultsContainer.innerHTML = items.map(staff => `
            <div class="result-card" onclick="window.location.href='staff-detail.html?id=${staff.id}'">
                <img src="${staff.image?.large || 'placeholder.jpg'}" loading="lazy">
                <div class="title">${staff.name.full}</div>
                <div class="sub">Staff</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<div class="empty-message">No staff found.</div>';
    }
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
}

async function performStudioSearch(query) {
    const graphqlQuery = `
        query ($search: String) {
            Page(perPage: 20) {
                studios(search: $search) {
                    id
                    name
                }
            }
        }`;
    const data = await apiFetch(graphqlQuery, { search: query });
    const items = data?.Page?.studios || [];
    if (items.length) {
        resultsContainer.innerHTML = items.map(studio => `
            <div class="result-card" onclick="window.location.href='studio-detail.html?id=${studio.id}'">
                <div style="width:100%; height:150px; background:rgba(255,255,255,0.1); border-radius:12px;"></div>
                <div class="title">${studio.name}</div>
                <div class="sub">Studio</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<div class="empty-message">No studios found.</div>';
    }
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
}

// ---------- Main search dispatcher ----------
async function performSearch(query) {
    const hasSearch = !!query;
    const hasFilters = selectedGenres.length || selectedTags.length || selectedFormats.length ||
                       selectedStatus.length || selectedSeasons.length || selectedSources.length ||
                       yearMin || yearMax;

    // If no search and no filters, show trending
    if (!hasSearch && !hasFilters) {
        await loadTrending();
        return;
    }

    // Show loading spinner
    trendingSection.style.display = 'none';
    resultsContainer.style.display = 'grid';
    resultsContainer.innerHTML = `<div class="loading-spinner-small"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    try {
        if (current.mediaType) {
            await performMediaSearch(query, hasFilters);
        } else {
            // Non‑media types: no filters, just search
            switch (current.queryType) {
                case 'USER':
                    await performUserSearch(query);
                    break;
                case 'CHARACTER':
                    await performCharacterSearch(query);
                    break;
                case 'STAFF':
                    await performStaffSearch(query);
                    break;
                case 'STUDIO':
                    await performStudioSearch(query);
                    break;
                default:
                    resultsContainer.innerHTML = '<div class="empty-message">Invalid search type.</div>';
            }
        }
    } catch (error) {
        console.error('Search API error:', error);
        resultsContainer.innerHTML = '<div class="empty-message">Search failed. Please try again.</div>';
    }
}

// ---------- Debounced input handler ----------
let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    debounceTimeout = setTimeout(() => performSearch(query), 500);
});

// ---------- Filter UI helpers ----------
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

// ---------- UI event binding ----------
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
    } else {
        // For non-media types, hide trending and filter UI
        trendingSection.style.display = 'none';
        document.getElementById('filter-toggle').style.display = 'none';
    }
});
