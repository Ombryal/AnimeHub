/**
 * manga-detail.js - Handles manga detail page
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

const query = `
query ($id: Int) {
  Media (id: $id, type: MANGA) {
    id type title { romaji english native }
    synonyms coverImage { extraLarge } bannerImage
    description format status chapters averageScore
    genres popularity
    relations {
      edges { 
        relationType 
        node { id title { romaji } type coverImage { large } } 
      }
    }
    recommendations(perPage: 12) {
      nodes { mediaRecommendation { id title { romaji } type coverImage { large } meanScore } }
    }
  }
}`;

async function loadManga() {
    const data = await apiFetch(query, { id: parseInt(id) });
    if (data && data.Media) {
        renderMediaDetails(data.Media, 'MANGA');
    } else {
        showError("Manga not found");
    }
}

function renderMediaDetails(m, type) {
    const banner = m.bannerImage || m.coverImage.extraLarge;
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = m.coverImage.extraLarge;
    document.getElementById('det-title').innerText = m.title.english || m.title.romaji;

    const statsGrid = document.getElementById('det-stats-grid');
    const rating = m.averageScore ? (m.averageScore / 10).toFixed(1) + '/10' : '??';

    statsGrid.innerHTML = `
        ${renderStat('fa-play-circle', 'Type', m.type)}
        ${renderStat('fa-star', 'Rating', rating)}
        ${renderStat('fa-file-alt', 'Format', m.format)}
        ${renderStat('fa-info-circle', 'Status', m.status)}
        ${renderStat('fa-chart-line', 'Popularity', m.popularity.toLocaleString())}
        ${renderStat('fa-book-open', 'Chapters', m.chapters || '??')}
    `;

    // Synopsis (formatted)
    document.getElementById('det-desc').innerHTML = formatAnilistText(m.description);
    document.getElementById('romaji-title').innerText = m.title.romaji;
    document.getElementById('synonyms-list').innerText = m.synonyms.length > 0 ? m.synonyms.join(', ') : 'None';

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

    // Recommendations
    const recs = m.recommendations.nodes.map(n => n.mediaRecommendation);
    renderScrollerItems('recommendations-scroll', recs, 'MANGA', false);
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

loadManga();
