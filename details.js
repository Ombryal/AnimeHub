/**
 * details.js - Strict Media Engine
 */

async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'ANIME';

    if (!id) { window.location.href = 'index.html'; return; }

    const query = `
    query ($id: Int, $type: MediaType) {
      Media (id: $id, type: $type) {
        id type title { romaji english native }
        synonyms coverImage { extraLarge } bannerImage
        description format status episodes chapters averageScore
        season seasonYear genres popularity
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

    const data = await apiFetch(query, { id: parseInt(id), type: type });
    if (data && data.Media) renderDetails(data.Media);
}

function renderDetails(m) {
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = m.coverImage.extraLarge;
    document.getElementById('det-title').innerText = m.title.english || m.title.romaji;

    // --- 1. THE STATS FIX: STRICT OVERWRITE ---
    const statsGrid = document.getElementById('det-stats-grid');
    const rating = m.averageScore ? (m.averageScore/10).toFixed(1)+'/10' : '??';

    if (m.type === 'MANGA') {
        // High-Class Fix: Hardcoded 6-item layout for Manga
        statsGrid.innerHTML = `
            ${renderStat('fa-play-circle', 'Type', m.type)}
            ${renderStat('fa-star', 'Rating', rating)}
            ${renderStat('fa-file-alt', 'Format', m.format)}
            ${renderStat('fa-info-circle', 'Status', m.status)}
            ${renderStat('fa-chart-line', 'Popularity', m.popularity.toLocaleString())}
            ${renderStat('fa-book-open', 'Chapters', m.chapters || '??')}
        `;
    } else {
        // High-Class Fix: Hardcoded 10-item layout for Anime
        statsGrid.innerHTML = `
            ${renderStat('fa-play-circle', 'Type', m.type)}
            ${renderStat('fa-star', 'Rating', rating)}
            ${renderStat('fa-tv', 'Format', m.format)}
            ${renderStat('fa-info-circle', 'Status', m.status)}
            ${renderStat('fa-chart-line', 'Popularity', m.popularity.toLocaleString())}
            ${renderStat('fa-film', 'Episodes', m.episodes || '??')}
            ${renderStat('fa-calendar-alt', 'Season', m.season || 'N/A')}
            ${renderStat('fa-clock', 'Duration', '24m')}
            ${renderStat('fa-calendar-check', 'Premiered', m.season ? `${m.season} ${m.seasonYear}` : 'N/A')}
            ${renderStat('fa-building', 'Studio', m.studios.nodes[0]?.name || 'N/A')}
        `;
    }

    // --- 2. Content Sections ---
    document.getElementById('det-desc').innerHTML = m.description;
    document.getElementById('romaji-title').innerText = m.title.romaji;
    document.getElementById('synonyms-list').innerText = m.synonyms.length > 0 ? m.synonyms.join(', ') : 'None';

    // Trailer
    const trailerDiv = document.getElementById('trailer-container');
    if (m.trailer && m.trailer.site === 'youtube') {
        trailerDiv.innerHTML = `<h3 class="section-title">Trailer</h3>
        <iframe width="100%" height="220" src="https://www.youtube.com/embed/${m.trailer.id}" frameborder="0" allowfullscreen style="border-radius:15px; border: 1px solid var(--glass-border);"></iframe>`;
    }

    // Relations (White Badge Pill)
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

    // Characters (Anime only)
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

function renderStat(icon, label, val) {
    return `<div class="stat-card">
        <div class="stat-header"><i class="fas ${icon}"></i> <span>${label}</span></div>
        <div class="stat-value">${val || 'N/A'}</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', initDetails);
