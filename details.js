/**
 * details.js - Optimized for Condensed Manga Stats & Relation Badges
 */

async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') || 'ANIME';

    if (!id) { window.location.href = 'index.html'; return; }

    const query = `
    query ($id: Int, $type: MediaType) {
      Media (id: $id, type: $type) {
        id title { romaji english native }
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

    // --- 1. Condensed Statistics Logic ---
    let stats = [
        { icon: 'fa-play-circle', label: 'Type', val: m.type },
        { icon: 'fa-star', label: 'Rating', val: m.averageScore ? (m.averageScore/10).toFixed(1)+'/10' : '??' },
        { icon: 'fa-file-alt', label: 'Format', val: m.format },
        { icon: 'fa-info-circle', label: 'Status', val: m.status },
        { icon: 'fa-chart-line', label: 'Popularity', val: m.popularity.toLocaleString() }
    ];

    // If Anime, add the extra 5 options from the image
    if (m.type === 'ANIME') {
        stats.push(
            { icon: 'fa-film', label: 'Episodes', val: m.episodes || '??' },
            { icon: 'fa-calendar-alt', label: 'Season', val: m.season || 'N/A' },
            { icon: 'fa-clock', label: 'Duration', val: '24m' }, // Standard placeholder or fetch duration
            { icon: 'fa-calendar-check', label: 'Premiered', val: m.season ? `${m.season} ${m.seasonYear}` : 'N/A' },
            { icon: 'fa-building', label: 'Studio', val: m.studios.nodes[0]?.name || 'N/A' }
        );
    }

    document.getElementById('det-stats-grid').innerHTML = stats.map(s => `
        <div class="stat-card">
            <div class="stat-header"><i class="fas ${s.icon}"></i> <span>${s.label}</span></div>
            <div class="stat-value">${s.val || 'N/A'}</div>
        </div>`).join('');

    // --- 2. Synopsis & Titles ---
    document.getElementById('det-desc').innerHTML = m.description;
    document.getElementById('romaji-title').innerText = m.title.romaji;
    document.getElementById('synonyms-list').innerText = m.synonyms.length > 0 ? m.synonyms.join(', ') : 'None';

    // --- 3. Trailer ---
    const trailerDiv = document.getElementById('trailer-container');
    if (m.trailer && m.trailer.site === 'youtube') {
        trailerDiv.innerHTML = `<h3 class="section-title">Trailer</h3>
        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${m.trailer.id}" frameborder="0" allowfullscreen style="border-radius:15px;"></iframe>`;
    }

    // --- 4. Relations (Updated with Badges) ---
    if (m.relations.edges.length > 0) {
        document.getElementById('relations-section').innerHTML = `
        <h3 class="section-title">Relations</h3>
        <div class="relation-scroller">
            ${m.relations.edges.map(e => `
                <div class="relation-card" onclick="window.location.href='details.html?id=${e.node.id}&type=${e.node.type}'">
                    <img src="${e.node.coverImage.large}">
                    <div class="relation-info">
                        <div class="relation-name">${e.node.title.romaji}</div>
                        <div class="relation-badge">
                            <i class="fas fa-play"></i> ${e.relationType.replace(/_/g, ' ')}
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;
    }

    // --- 5. Characters & Cast ---
    if (m.type === 'ANIME' && m.characters.edges.length > 0) {
        document.getElementById('characters-section').innerHTML = `<h3 class="section-title">Characters & Cast</h3>
        <div class="char-grid">${m.characters.edges.map(e => `
            <div class="char-card">
                <div class="char-side">
                    <img src="${e.node.image.large}">
                    <div class="char-info"><span>${e.node.name.full}</span><small>${e.role}</small></div>
                </div>
                ${e.voiceActors[0] ? `
                <div class="va-side">
                    <div class="va-info"><span>${e.voiceActors[0].name.full}</span><small>JP</small></div>
                    <img src="${e.voiceActors[0].image.large}">
                </div>` : ''}
            </div>`).join('')}</div>`;
    }

    // --- 6. Recommendations ---
    renderScrollerItems('recommendations-scroll', m.recommendations.nodes.map(n => n.mediaRecommendation), m.type);
    hideLoader();
}

document.addEventListener('DOMContentLoaded', initDetails);
