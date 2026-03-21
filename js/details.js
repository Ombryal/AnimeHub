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
            media (perPage: 6) {
              edges {
                node { id title { romaji } type coverImage { large } }
                characterRole
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
            staffMedia (perPage: 6) {
              edges {
                node { id title { romaji } type coverImage { large } }
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
            media (perPage: 6) {
              edges {
                node { id title { romaji } type coverImage { large } }
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

// --- Media Details (your existing function) ---
function renderMediaDetails(m, type) {
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = m.coverImage.extraLarge;
    document.getElementById('det-title').innerText = m.title.english || m.title.romaji;

    // DURATION LOGIC FIX
    let displayDuration = "N/A";
    if (m.duration) {
        if (m.format === 'MOVIE') {
            const hrs = Math.floor(m.duration / 60);
            const mins = m.duration % 60;
            displayDuration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        } else {
            displayDuration = `${m.duration}m`;
        }
    }

    const statsGrid = document.getElementById('det-stats-grid');
    const rating = m.averageScore ? (m.averageScore/10).toFixed(1)+'/10' : '??';

    if (m.type === 'MANGA') {
        statsGrid.innerHTML = `
            ${renderStat('fa-play-circle', 'Type', m.type)}
            ${renderStat('fa-star', 'Rating', rating)}
            ${renderStat('fa-file-alt', 'Format', m.format)}
            ${renderStat('fa-info-circle', 'Status', m.status)}
            ${renderStat('fa-chart-line', 'Popularity', m.popularity.toLocaleString())}
            ${renderStat('fa-book-open', 'Chapters', m.chapters || '??')}
        `;
    } else {
        statsGrid.innerHTML = `
            ${renderStat('fa-play-circle', 'Type', m.type)}
            ${renderStat('fa-star', 'Rating', rating)}
            ${renderStat('fa-tv', 'Format', m.format)}
            ${renderStat('fa-info-circle', 'Status', m.status)}
            ${renderStat('fa-chart-line', 'Popularity', m.popularity.toLocaleString())}
            ${renderStat('fa-film', 'Episodes', m.episodes || '??')}
            ${renderStat('fa-calendar-alt', 'Season', m.season || 'N/A')}
            ${renderStat('fa-clock', 'Duration', displayDuration)}
            ${renderStat('fa-calendar-check', 'Premiered', m.season ? `${m.season} ${m.seasonYear}` : 'N/A')}
            ${renderStat('fa-building', 'Studio', m.studios.nodes[0]?.name || 'N/A')}
        `;
    }

    // Content Sections
    document.getElementById('det-desc').innerHTML = m.description;
    document.getElementById('romaji-title').innerText = m.title.romaji;
    document.getElementById('synonyms-list').innerText = m.synonyms.length > 0 ? m.synonyms.join(', ') : 'None';

    // Trailer
    const trailerDiv = document.getElementById('trailer-container');
    if (m.trailer && m.trailer.site === 'youtube') {
        trailerDiv.innerHTML = `<h3 class="section-title">Trailer</h3>
        <iframe width="100%" height="220" src="https://www.youtube.com/embed/${m.trailer.id}" frameborder="0" allowfullscreen style="border-radius:15px; border: 1px solid var(--glass-border);"></iframe>`;
    }

    // Relations
    if (m.relations.edges.length > 0) {
        document.getElementById('relations-section').innerHTML = `
        <h3 class="section-title">Relations</h3>
        <div class="relation-scroller">
            ${m.relations.edges.map(e => `
                <div class="relation-card" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                    <img src="${e.node.coverImage.large}">
                    <div class="relation-info">
                        <div class="relation-name">${e.node.title.romaji}</div>
                        <div class="relation-badge"><i class="fas fa-play"></i> ${e.relationType.replace(/_/g, ' ')}</div>
                    </div>
                </div>`).join('')}
        </div>`;
    }

    // Characters
    if (m.type === 'ANIME' && m.characters.edges.length > 0) {
        document.getElementById('characters-section').innerHTML = `<h3 class="section-title">Characters & Cast</h3>
        <div class="char-grid">${m.characters.edges.map(e => `
            <div class="char-card">
                <div class="char-side">
                    <img src="${e.node.image.large}">
                    <div class="char-info"><span>${e.node.name.full}</span><small>${e.role}</small></div>
                </div>
                ${e.voiceActors[0] ? `<div class="va-side">
                    <div class="va-info"><span>${e.voiceActors[0].name.full}</span><small>JP</small></div>
                    <img src="${e.voiceActors[0].image.large}">
                </div>` : ''}
            </div>`).join('')}</div>`;
    }

    renderScrollerItems('recommendations-scroll', m.recommendations.nodes.map(n => n.mediaRecommendation), m.type);
    hideLoader();
}

// --- Character Details ---
function renderCharacterDetails(char) {
    const banner = char.image?.large || '';
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = char.image?.large || '';
    document.getElementById('det-title').innerText = char.name.full;
    document.getElementById('det-desc').innerHTML = char.description || 'No description available.';
    document.getElementById('romaji-title').innerText = char.name.native || 'N/A';
    document.getElementById('synonyms-list').innerText = '—';

    // Stats for character
    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-star', 'Favourites', char.favourites || 0)}
        ${renderStat('fa-tv', 'Appears in', char.media?.edges?.length || 0)}
    `;

    // Appearances
    const relationsDiv = document.getElementById('relations-section');
    if (char.media?.edges?.length) {
        relationsDiv.innerHTML = `
            <h3 class="section-title">Appears in</h3>
            <div class="relation-scroller">
                ${char.media.edges.map(e => `
                    <div class="relation-card" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                        <img src="${e.node.coverImage.large}">
                        <div class="relation-name">${e.node.title.romaji}</div>
                        <div class="relation-badge">${e.characterRole}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    hideLoader();
}

// --- Staff Details ---
function renderStaffDetails(staff) {
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

// --- User Details ---
function renderUserDetails(user) {
    document.getElementById('det-banner').style.backgroundImage = `url('${user.avatar?.large || ''}')`;
    document.getElementById('det-cover').src = user.avatar?.large || '';
    document.getElementById('det-title').innerText = user.name;
    document.getElementById('det-desc').innerHTML = user.about || 'No bio available.';
    document.getElementById('romaji-title').innerText = '';
    document.getElementById('synonyms-list').innerHTML = '';

    const statsGrid = document.getElementById('det-stats-grid');
    statsGrid.innerHTML = `
        ${renderStat('fa-tv', 'Anime Count', user.statistics?.anime?.count || 0)}
        ${renderStat('fa-film', 'Episodes Watched', user.statistics?.anime?.episodesWatched || 0)}
        ${renderStat('fa-book', 'Manga Count', user.statistics?.manga?.count || 0)}
        ${renderStat('fa-book-open', 'Chapters Read', user.statistics?.manga?.chaptersRead || 0)}
    `;

    // Add external link to AniList profile
    const relationsDiv = document.getElementById('relations-section');
    relationsDiv.innerHTML = `
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://anilist.co/user/${user.name}" target="_blank" class="glass-card" style="display: inline-block; padding: 12px 24px; border-radius: 25px; color: var(--accent); text-decoration: none;">
                View full profile on AniList <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    `;
    hideLoader();
}

// --- Studio Details ---
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
