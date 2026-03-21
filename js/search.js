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

async function performSearch(query) {
    resultsContainer.innerHTML = `<div class="loading-spinner-small"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    let graphqlQuery = '';
    let variables = { search: query };

    if (current.mediaType) {
        graphqlQuery = `
            query ($search: String, $type: MediaType) {
                Page(perPage: 20) {
                    media(search: $search, type: $type) {
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
        // Use media-item style for anime/manga
        resultsContainer.innerHTML = items.map(item => `
            <div class="media-item" onclick="window.location.href='details.html?id=${item.id}&type=${current.queryType}'">
                <div class="img-box">
                    <img src="${item.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                    <div class="purple-badge">${item.meanScore ? (item.meanScore/10).toFixed(1)+'★' : '??'}</div>
                </div>
                <div class="media-title">${item.title.romaji}</div>
            </div>
        `).join('');
    } else {
        // For users, characters, staff, studios
        resultsContainer.innerHTML = items.map(item => {
            let title = '';
            let img = '';
            let sub = '';
            let link = '';

            if (current.queryType === 'USER') {
                title = item.name;
                img = item.avatar?.large;
                sub = 'User';
                link = `details.html?id=${item.id}&type=USER`;
            } else if (current.queryType === 'CHARACTER') {
                title = item.name.full;
                img = item.image?.large;
                sub = 'Character';
                link = `details.html?id=${item.id}&type=CHARACTER`;
            } else if (current.queryType === 'STAFF') {
                title = item.name.full;
                img = item.image?.large;
                sub = 'Staff';
                link = `details.html?id=${item.id}&type=STAFF`;
            } else if (current.queryType === 'STUDIO') {
                title = item.name;
                img = null;
                sub = 'Studio';
                link = `details.html?id=${item.id}&type=STUDIO`;
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
