/**
 * search.js - Dedicated search page for different categories
 */

const urlParams = new URLSearchParams(window.location.search);
const searchType = urlParams.get('type') || 'ANIME';

// Map type to API-friendly values and display names
const typeMap = {
    'ANIME': { queryType: 'ANIME', title: 'Anime', mediaType: true },
    'MANGA': { queryType: 'MANGA', title: 'Manga', mediaType: true },
    'USER': { queryType: 'USER', title: 'Users', mediaType: false },
    'CHARACTER': { queryType: 'CHARACTER', title: 'Characters', mediaType: false },
    'STAFF': { queryType: 'STAFF', title: 'Staff', mediaType: false },
    'STUDIO': { queryType: 'STUDIO', title: 'Studios', mediaType: false }
};

const current = typeMap[searchType] || typeMap['ANIME'];
document.getElementById('search-type-title').innerText = `Search ${current.title}`;

const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');

// Filter state
let selectedGenres = [];
let selectedTags = [];
let selectedFormats = [];
let selectedStatus = [];
let selectedSeasons = [];
let yearMin = null;
let yearMax = null;
let selectedSources = [];

// Load available genres and tags (only for media types)
async function loadFilterOptions() {
    if (!current.mediaType) return;
    const genreQuery = `{ GenreCollection }`;
    const tagQuery = `{ MediaTagCollection { name } }`;
    const formatOptions = ['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
    const statusOptions = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED'];
    const seasonOptions = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const sourceOptions = ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER'];

    const genresData = await apiFetch(genreQuery);
    const tagsData = await apiFetch(tagQuery);
    if (genresData?.GenreCollection) {
        renderFilterChips('genre-filters', genresData.GenreCollection, 'genre');
    }
    if (tagsData?.MediaTagCollection) {
        renderFilterChips('tag-filters', tagsData.MediaTagCollection.map(t => t.name), 'tag');
    }
    renderFilterChips('format-filters', formatOptions, 'format');
    renderFilterChips('status-filters', statusOptions, 'status');
    renderFilterChips('season-filters', seasonOptions, 'season');
    renderFilterChips('source-filters', sourceOptions, 'source');
}

function renderFilterChips(containerId, options, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = options.map(opt => `
        <div class="filter-chip" data-type="${type}" data-value="${opt}">${opt}</div>
    `).join('');
    // Attach click handlers
    document.querySelectorAll(`#${containerId} .filter-chip`).forEach(chip => {
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
    yearMin = document.getElementById('year-min')?.value ? parseInt(document.getElementById('year-min').value) : null;
    yearMax = document.getElementById('year-max')?.value ? parseInt(document.getElementById('year-max').value) : null;
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
    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = `<div class="loading-spinner-small"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    let graphqlQuery = '';
    let variables = { search: query };

    if (current.mediaType) {
        let filterArgs = buildFilterArgs();
        graphqlQuery = `
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
        variables.type = current.queryType;
    } else if (current.queryType === 'USER') {
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
    }

    const data = await apiFetch(graphqlQuery, variables);
    if (!data || !data.Page) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    let items = [];
    if (current.mediaType) items = data.Page.media;
    else if (current.queryType === 'USER') items = data.Page.users;
    else if (current.queryType === 'CHARACTER') items = data.Page.characters;
    else if (current.queryType === 'STAFF') items = data.Page.staff;
    else if (current.queryType === 'STUDIO') items = data.Page.studios;

    if (!items || items.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-message">No results found.</div>`;
        return;
    }

    // Render results
    if (current.mediaType) {
        resultsContainer.innerHTML = items.map(item => {
            const detailPage = current.queryType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
            return `
                <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                    <div class="img-box">
                        <img src="${item.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                        <div class="purple-badge">${item.meanScore ? (item.meanScore/10).toFixed(1)+'★' : '??'}</div>
                    </div>
                    <div class="media-title">${item.title.romaji}</div>
                </div>
            `;
        }).join('');
    } else {
        resultsContainer.innerHTML = items.map(item => {
            let title = '';
            let img = '';
            let sub = '';
            let link = '';

            if (current.queryType === 'USER') {
                title = item.name;
                img = item.avatar?.large;
                sub = 'User';
                link = `user-detail.html?id=${item.id}`;
            } else if (current.queryType === 'CHARACTER') {
                title = item.name.full;
                img = item.image?.large;
                sub = 'Character';
                link = `character-detail.html?id=${item.id}`;
            } else if (current.queryType === 'STAFF') {
                title = item.name.full;
                img = item.image?.large;
                sub = 'Staff';
                link = `staff-detail.html?id=${item.id}`;
            } else if (current.queryType === 'STUDIO') {
                title = item.name;
                img = null;
                sub = 'Studio';
                link = `studio-detail.html?id=${item.id}`;
            }

            return `
                <div class="result-card ${current.queryType === 'USER' ? 'user-card' : ''}" onclick="window.location.href='${link}'">
                    ${img ? `<img src="${img}" loading="lazy">` : `<div style="width:100%; height:150px; background:rgba(255,255,255,0.1); border-radius:12px;"></div>`}
                    <div class="title">${title}</div>
                    <div class="sub">${sub}</div>
                </div>
            `;
        }).join('');
    }
}

let debounceTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    debounceTimeout = setTimeout(() => performSearch(query), 500);
});

// Filter panel UI
document.addEventListener('DOMContentLoaded', () => {
    const filterToggle = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    if (filterToggle && filterPanel) {
        filterToggle.addEventListener('click', () => {
            if (filterPanel.style.display === 'none') {
                filterPanel.style.display = 'block';
            } else {
                filterPanel.style.display = 'none';
            }
        });
    }
    const applyBtn = document.getElementById('apply-filters');
    const clearBtn = document.getElementById('clear-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            updateSelectedFilters();
            if (searchInput.value.trim().length >= 2) performSearch(searchInput.value.trim());
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Clear all selections
            document.querySelectorAll('.filter-chip.selected').forEach(chip => chip.classList.remove('selected'));
            document.getElementById('year-min').value = '';
            document.getElementById('year-max').value = '';
            updateSelectedFilters();
            if (searchInput.value.trim().length >= 2) performSearch(searchInput.value.trim());
        });
    }
    if (current.mediaType) {
        loadFilterOptions();
    }
});
