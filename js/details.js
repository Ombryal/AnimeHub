/**
 * details.js - Handles all details pages: anime, manga, user, character, staff, studio
 */

async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'ANIME';

    if (!id) { window.location.href = 'index.html'; return; }

    let query = '';
    let variables = { id: parseInt(id) };

    // Build query based on type
    if (type === 'ANIME' || type === 'MANGA') {
        query = `
        query ($id: Int, $type: MediaType) {
          Media (id: $id, type: $type) {
            id type title { romaji english native }
            synonyms coverImage { extraLarge } bannerImage
            description format status episodes chapters averageScore
            season seasonYear genres popularity duration
            trailer { id site }
            studios(isMain: true) { nodes { name } }
            relations {
              edges { 
                relationType 
                node { id title { romaji } type coverImage { large } } 
              }
            }
            characters(sort: [ROLE, RELEVANCE], perPage: 6) {
              edges {
                role
                node { name { full } image { large } }
                voiceActors(language: JAPANESE) { name { full } image { large } }
              }
            }
            recommendations(perPage: 6) {
              nodes { mediaRecommendation { id title { romaji } type coverImage { large } meanScore } }
            }
          }
        }`;
        variables.type = type;
    } 
    else if (type === 'CHARACTER') {
        query = `
        query ($id: Int) {
          Character (id: $id) {
            id name { full native }
            image { large }
            description
            favourites
            age
            dateOfBirth { year month day }
            gender
            bloodType
            media(perPage: 12, sort: POPULARITY_DESC) {
              edges {
                node {
                  id
                  title { romaji }
                  type
                  coverImage { large }
                  meanScore
                }
                characterRole
                voiceActors(language: JAPANESE) { id name { full } image { large } }
                voiceActors(language: ENGLISH) { id name { full } image { large } }
              }
            }
          }
        }`;
    }
    else if (type === 'STAFF') {
        query = `
        query ($id: Int) {
          Staff (id: $id) {
            id name { full native }
            image { large }
            description
            favourites
            primaryOccupations
            staffMedia (perPage: 12) {
              edges {
                node { id title { romaji } type coverImage { large } meanScore }
                staffRole
              }
            }
          }
        }`;
    }
    else if (type === 'USER') {
        query = `
        query ($id: Int) {
          User (id: $id) {
            id name
            avatar { large }
            about
            statistics {
              anime { count episodesWatched }
              manga { count chaptersRead }
            }
            favourites {
              anime(perPage: 6) {
                nodes {
                  id
                  title { userPreferred }
                  coverImage { large }
                  averageScore
                }
              }
              manga(perPage: 6) {
                nodes {
                  id
                  title { userPreferred }
                  coverImage { large }
                  averageScore
                }
              }
              characters(perPage: 6) {
                nodes {
                  id
                  name { userPreferred }
                  image { large }
                }
              }
            }
          }
        }`;
    }
    else if (type === 'STUDIO') {
        query = `
        query ($id: Int) {
          Studio (id: $id) {
            id name
            isAnimationStudio
            favourites
            media (perPage: 12) {
              edges {
                node { id title { romaji } type coverImage { large } meanScore }
              }
            }
          }
        }`;
    }

    const data = await apiFetch(query, variables);
    if (data) {
        if (type === 'ANIME' || type === 'MANGA') renderMediaDetails(data.Media, type);
        else if (type === 'CHARACTER') renderCharacterDetails(data.Character);
        else if (type === 'STAFF') renderStaffDetails(data.Staff);
        else if (type === 'USER') renderUserDetails(data.User);
        else if (type === 'STUDIO') renderStudioDetails(data.Studio);
    } else {
        showError("Data not found");
    }
}

// --- Media Details (unchanged, keep as is) ---
function renderMediaDetails(m, type) {
    // ... (your existing renderMediaDetails function, copy from your current code)
    // I'll assume it's present; if not, paste from earlier versions.
}

// --- Character Details (enhanced) ---
function renderCharacterDetails(char) {
    const banner = char.image?.large || '';
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = char.image?.large || '';
    document.getElementById('det-title').innerText = char.name.full;
    document.getElementById('det-desc').innerHTML = char.description || 'No description available.';
    document.getElementById('romaji-title').innerText = char.name.native || 'N/A';
    document.getElementById('synonyms-list').innerHTML = '—';

    // Personal info stats
    const birthStr = char.dateOfBirth?.year ? 
        `${char.dateOfBirth.year}-${char.dateOfBirth.month || '?'}-${char.dateOfBirth.day || '?'}` : 
        (char.dateOfBirth ? 'Unknown date' : 'N/A');
    const ageStr = char.age ? `${char.age} years old` : 'N/A';

    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-birthday-cake', 'Age', ageStr)}
        ${renderStat('fa-calendar', 'Birthday', birthStr)}
        ${renderStat('fa-venus-mars', 'Gender', char.gender || 'N/A')}
        ${renderStat('fa-tint', 'Blood Type', char.bloodType || 'N/A')}
        ${renderStat('fa-star', 'Favourites', char.favourites || 0)}
        ${renderStat('fa-tv', 'Appearances', char.media?.edges?.length || 0)}
    `;

    // Voice Actors (collect unique from all media edges)
    const vaMap = new Map(); // key: id, value: { name, image, languages }
    if (char.media?.edges) {
        char.media.edges.forEach(edge => {
            // Japanese
            if (edge.voiceActors && edge.voiceActors.length) {
                edge.voiceActors.forEach(va => {
                    if (va && va.id) {
                        if (!vaMap.has(va.id)) vaMap.set(va.id, { name: va.name.full, image: va.image?.large, languages: new Set() });
                        vaMap.get(va.id).languages.add('Japanese');
                    }
                });
            }
            // English – note: we might need to query separately. For now, we only fetched Japanese, but we can add another field for English.
            // For simplicity, we'll only show Japanese VAs. If you want English, we'd need to add that to the query (e.g., voiceActors(language: ENGLISH)).
            // We'll add English later if needed. For now, Japanese only.
        });
    }
    const vaList = Array.from(vaMap.values());
    const voiceActorsHtml = vaList.length ? `
        <div class="voice-actors-section">
            <h3 class="section-title">Voice Actors</h3>
            <div class="voice-actors-list">
                ${vaList.map(va => `
                    <div class="voice-actor-card">
                        <img src="${va.image || 'placeholder.jpg'}" alt="${va.name}">
                        <div class="voice-actor-name">${va.name}</div>
                        <div class="voice-actor-lang">Japanese</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Roles (media appearances)
    const rolesHtml = char.media?.edges?.length ? `
        <div class="roles-section">
            <h3 class="section-title">Roles</h3>
            <div class="relation-scroller">
                ${char.media.edges.map(edge => `
                    <div class="relation-card" onclick="window.location.href='details.html?id=${edge.node.id}&type=${edge.node.type}'">
                        <img src="${edge.node.coverImage.large}" loading="lazy">
                        <div class="relation-name">${edge.node.title.romaji}</div>
                        <div class="relation-badge">${edge.characterRole}</div>
                        <div class="relation-score">${edge.node.meanScore ? (edge.node.meanScore/10).toFixed(1)+'★' : '?'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Insert voice actors and roles into the page
    const relationsDiv = document.getElementById('relations-section');
    relationsDiv.innerHTML = voiceActorsHtml + rolesHtml;

    hideLoader();
}

// --- User Details (enhanced) ---
function renderUserDetails(user) {
    document.getElementById('det-banner').style.backgroundImage = `url('${user.avatar?.large || ''}')`;
    document.getElementById('det-cover').src = user.avatar?.large || '';
    document.getElementById('det-title').innerText = user.name;
    document.getElementById('det-desc').innerHTML = user.about || 'No bio available.';
    document.getElementById('romaji-title').innerText = '';
    document.getElementById('synonyms-list').innerHTML = '';

    // Stats
    const animeStats = user.statistics.anime;
    const mangaStats = user.statistics.manga;
    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-tv', 'Anime Count', animeStats?.count || 0)}
        ${renderStat('fa-film', 'Episodes Watched', animeStats?.episodesWatched || 0)}
        ${renderStat('fa-book', 'Manga Count', mangaStats?.count || 0)}
        ${renderStat('fa-book-open', 'Chapters Read', mangaStats?.chaptersRead || 0)}
    `;

    // Favourites (using same layout as profile page)
    const favAnime = user.favourites?.anime?.nodes || [];
    const favManga = user.favourites?.manga?.nodes || [];
    const favChars = user.favourites?.characters?.nodes || [];

    let favouritesHtml = '';
    if (favAnime.length || favManga.length || favChars.length) {
        favouritesHtml = `<div class="user-favourites">`;
        if (favAnime.length) {
            favouritesHtml += `
                <h3 class="section-title">Favourite Anime</h3>
                <div class="scroller">
                    ${favAnime.map(anime => `
                        <div class="media-item" onclick="window.location.href='details.html?id=${anime.id}&type=ANIME'">
                            <div class="img-box">
                                <img src="${anime.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                                <div class="purple-badge">${anime.averageScore ? (anime.averageScore/10).toFixed(1)+'★' : '??'}</div>
                            </div>
                            <div class="media-title">${anime.title.userPreferred}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        if (favManga.length) {
            favouritesHtml += `
                <h3 class="section-title">Favourite Manga</h3>
                <div class="scroller">
                    ${favManga.map(manga => `
                        <div class="media-item" onclick="window.location.href='details.html?id=${manga.id}&type=MANGA'">
                            <div class="img-box">
                                <img src="${manga.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                                <div class="purple-badge">${manga.averageScore ? (manga.averageScore/10).toFixed(1)+'★' : '??'}</div>
                            </div>
                            <div class="media-title">${manga.title.userPreferred}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        if (favChars.length) {
            favouritesHtml += `
                <h3 class="section-title">Favourite Characters</h3>
                <div class="scroller characters-scroller">
                    ${favChars.map(char => `
                        <div class="character-item" onclick="window.location.href='details.html?id=${char.id}&type=CHARACTER'">
                            <img src="${char.image?.large || 'placeholder.jpg'}">
                            <div class="title">${char.name.userPreferred}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        favouritesHtml += `</div>`;
    }

    const relationsDiv = document.getElementById('relations-section');
    relationsDiv.innerHTML = favouritesHtml;

    // External link to AniList
    const externalDiv = document.getElementById('trailer-container');
    externalDiv.innerHTML = `
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://anilist.co/user/${user.name}" target="_blank" class="glass-card" style="display: inline-block; padding: 12px 24px; border-radius: 25px; color: var(--accent); text-decoration: none;">
                View full profile on AniList <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    `;
    hideLoader();
}

// --- Staff Details (unchanged) ---
function renderStaffDetails(staff) {
    // ... (your existing renderStaffDetails, or a simple version)
    // For brevity, we'll keep the one from earlier.
    document.getElementById('det-banner').style.backgroundImage = `url('${staff.image?.large || ''}')`;
    document.getElementById('det-cover').src = staff.image?.large || '';
    document.getElementById('det-title').innerText = staff.name.full;
    document.getElementById('det-desc').innerHTML = staff.description || 'No description available.';
    document.getElementById('romaji-title').innerText = staff.name.native || 'N/A';
    document.getElementById('synonyms-list').innerHTML = staff.primaryOccupations?.join(', ') || '—';

    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-star', 'Favourites', staff.favourites || 0)}
        ${renderStat('fa-briefcase', 'Occupations', staff.primaryOccupations?.length || 0)}
    `;

    const relationsDiv = document.getElementById('relations-section');
    if (staff.staffMedia?.edges?.length) {
        relationsDiv.innerHTML = `
            <h3 class="section-title">Worked on</h3>
            <div class="relation-scroller">
                ${staff.staffMedia.edges.map(e => `
                    <div class="relation-card" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                        <img src="${e.node.coverImage.large}">
                        <div class="relation-name">${e.node.title.romaji}</div>
                        <div class="relation-badge">${e.staffRole}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    hideLoader();
}

// --- Studio Details (unchanged) ---
function renderStudioDetails(studio) {
    document.getElementById('det-banner').style.backgroundImage = `url('')`;
    document.getElementById('det-cover').style.display = 'none';
    document.getElementById('det-title').innerText = studio.name;
    document.getElementById('det-desc').innerHTML = studio.isAnimationStudio ? 'Animation Studio' : 'Non-animation studio';
    document.getElementById('romaji-title').innerText = '';
    document.getElementById('synonyms-list').innerHTML = '';

    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-star', 'Favourites', studio.favourites || 0)}
        ${renderStat('fa-tv', 'Anime Produced', studio.media?.edges?.length || 0)}
    `;

    const relationsDiv = document.getElementById('relations-section');
    if (studio.media?.edges?.length) {
        relationsDiv.innerHTML = `
            <h3 class="section-title">Anime</h3>
            <div class="relation-scroller">
                ${studio.media.edges.map(e => `
                    <div class="relation-card" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                        <img src="${e.node.coverImage.large}">
                        <div class="relation-name">${e.node.title.romaji}</div>
                        <div class="relation-score">${e.node.meanScore ? (e.node.meanScore/10).toFixed(1)+'★' : '?'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    hideLoader();
}

function renderStat(icon, label, val) {
    return `<div class="stat-card">
        <div class="stat-header"><i class="fas ${icon}"></i> <span>${label}</span></div>
        <div class="stat-value">${val || 'N/A'}</div>
    </div>`;
}

function showError(message) {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('det-title').innerText = 'Error';
    document.getElementById('det-desc').innerHTML = message;
}

document.addEventListener('DOMContentLoaded', initDetails);
