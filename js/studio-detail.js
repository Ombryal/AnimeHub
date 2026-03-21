/**
 * studio-detail.js - Handles studio detail page
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

const query = `
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

async function loadStudio() {
    const data = await apiFetch(query, { id: parseInt(id) });
    if (data && data.Studio) {
        renderStudioDetails(data.Studio);
    } else {
        showError("Studio not found");
    }
}

function renderStudioDetails(studio) {
    document.getElementById('det-title').innerText = studio.name;
    document.getElementById('det-desc').innerHTML = studio.isAnimationStudio ? 'Animation Studio' : 'Non-animation studio';
    document.getElementById('det-cover').style.display = 'none';
    
    // Hide romaji/synonyms card
    const romajiCard = document.getElementById('romaji-synonyms-card');
    if (romajiCard) romajiCard.style.display = 'none';

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
                ${studio.media.edges.map(edge => {
                    const detailPage = edge.node.type === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
                    return `
                        <div class="relation-card" onclick="window.location.href='${detailPage}?id=${edge.node.id}'">
                            <img src="${edge.node.coverImage.large}">
                            <div class="relation-name">${edge.node.title.romaji}</div>
                            <div class="relation-score">${edge.node.meanScore ? (edge.node.meanScore/10).toFixed(1)+'★' : '?'}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        relationsDiv.innerHTML = '';
    }

    const recSection = document.getElementById('recommendations-section');
    if (recSection) recSection.style.display = 'none';

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

loadStudio();
