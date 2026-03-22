/**
 * anime-detail.js - Handles anime detail page with user list status, characters, staff
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

// Media query with staff
const mediaQuery = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id type title { romaji english native }
    synonyms coverImage { extraLarge } bannerImage
    description format status episodes averageScore
    season seasonYear genres popularity duration
    trailer { id site }
    studios(isMain: true) { nodes { name } }
    relations {
      edges { 
        relationType 
        node { id title { romaji } type coverImage { large } } 
      }
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node { id name { full } image { large } }
        voiceActors(language: JAPANESE) { id name { full } image { large } }
      }
    }
    staff(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node { id name { full } image { large } }
      }
    }
    recommendations(perPage: 12) {
      nodes { mediaRecommendation { id title { romaji } type coverImage { large } meanScore } }
    }
  }
}`;

// List status query
const listQuery = `
query ($userId: Int, $mediaId: Int) {
  MediaList(userId: $userId, mediaId: $mediaId) {
    status
    progress
    score
    repeat
    startedAt { year month day }
    completedAt { year month day }
  }
}`;

let userId = null;

async function getUserId() {
    const viewerQuery = `query { Viewer { id } }`;
    const data = await apiFetch(viewerQuery);
    if (data && data.Viewer) return data.Viewer.id;
    return null;
}

async function loadAnime() {
    const mediaData = await apiFetch(mediaQuery, { id: parseInt(id) });
    if (!mediaData || !mediaData.Media) {
        showError("Anime not found");
        return;
    }

    userId = await getUserId();
    let listEntry = null;
    if (userId) {
        const listData = await apiFetch(listQuery, { userId: userId, mediaId: parseInt(id) });
        if (listData && listData.MediaList) listEntry = listData.MediaList;
    }

    renderMediaDetails(mediaData.Media, listEntry);
}

function renderMediaDetails(m, listEntry) {
    // Banner and cover
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = m.coverImage.extraLarge;
    document.getElementById('det-title').innerText = m.title.english || m.title.romaji;

    // List status section
    const listStatusDiv = document.getElementById('list-status');
    if (listEntry && m.episodes) {
        const status = listEntry.status;
        const progress = listEntry.progress || 0;
        const total = m.episodes;
        const percent = (progress / total) * 100;

        let statusText = '';
        if (status === 'CURRENT') statusText = 'WATCHING';
        else if (status === 'PLANNING') statusText = 'PLANNING TO WATCH';
        else if (status === 'COMPLETED') statusText = 'COMPLETED';
        else if (status === 'PAUSED') statusText = 'PAUSED';
        else if (status === 'DROPPED') statusText = 'DROPPED';
        else statusText = status;

        document.getElementById('list-status-title').innerText = statusText;
        document.getElementById('progress-bar').style.width = `${percent}%`;
        document.getElementById('progress-text').innerHTML = `Episode ${progress} of ${total}<br>${percent.toFixed(2)}%`;
        listStatusDiv.style.display = 'block';
    } else {
        listStatusDiv.style.display = 'none';
    }

    // Stats
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
    const rating = m.averageScore ? (m.averageScore / 10).toFixed(1) + '/10' : '??';

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

    // Synopsis (formatted)
    document.getElementById('det-desc').innerHTML = formatAnilistText(m.description);
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
                <div class="relation-card" onclick="window.location.href='${e.node.type === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html'}?id=${e.node.id}'">
                    <img src="${e.node.coverImage.large}">
                    <div class="relation-name">${e.node.title.romaji}</div>
                    <div class="relation-badge"><i class="fas fa-play"></i> ${e.relationType.replace(/_/g, ' ')}</div>
                </div>`).join('')}
        </div>`;
    }

    // Characters (horizontal scroller)
    const charactersSection = document.getElementById('characters-section');
    if (m.characters.edges.length > 0) {
        const charactersHtml = `
            <h3 class="section-title">Characters & Cast</h3>
            <div class="scroller" id="characters-scroll">
                ${m.characters.edges.map(edge => {
                    const char = edge.node;
                    const role = edge.role;
                    const va = edge.voiceActors[0];
                    return `
                        <div class="character-card" onclick="window.location.href='character-detail.html?id=${char.id}'">
                            <div class="character-image">
                                <img src="${char.image.large}" loading="lazy">
                            </div>
                            <div class="character-name">${char.name.full}</div>
                            <div class="character-role">${role}</div>
                            ${va ? `
                                <div class="voice-actor" onclick="event.stopPropagation(); window.location.href='staff-detail.html?id=${va.id}'">
                                    🎙️ ${va.name.full}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        charactersSection.innerHTML = charactersHtml;
    } else {
        charactersSection.innerHTML = '';
    }

    // Staff (horizontal scroller)
    const staffSection = document.getElementById('staff-section');
    if (m.staff && m.staff.edges.length > 0) {
        const staffHtml = `
            <h3 class="section-title">Staff</h3>
            <div class="scroller" id="staff-scroll">
                ${m.staff.edges.map(edge => {
                    const staff = edge.node;
                    const role = edge.role;
                    return `
                        <div class="staff-card" onclick="window.location.href='staff-detail.html?id=${staff.id}'">
                            <div class="staff-image">
                                <img src="${staff.image?.large || 'placeholder.jpg'}" loading="lazy">
                            </div>
                            <div class="staff-name">${staff.name.full}</div>
                            <div class="staff-role">${role}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        staffSection.innerHTML = staffHtml;
    } else {
        staffSection.innerHTML = '';
    }

    // Recommendations
    const recs = m.recommendations.nodes.map(n => n.mediaRecommendation);
    renderScrollerItems('recommendations-scroll', recs, 'ANIME', false);
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

loadAnime();
