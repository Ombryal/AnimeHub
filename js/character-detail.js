/**
 * character-detail.js - Handles character detail page
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

const query = `
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
        englishVA: voiceActors(language: ENGLISH) { id name { full } image { large } }
      }
    }
  }
}`;

async function loadCharacter() {
    const data = await apiFetch(query, { id: parseInt(id) });
    if (data && data.Character) {
        renderCharacterDetails(data.Character);
    } else {
        showError("Character not found");
    }
}

function renderCharacterDetails(char) {
    const banner = char.image?.large || '';
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = char.image?.large || '';
    document.getElementById('det-title').innerText = char.name.full;
    
    // Description
    document.getElementById('det-desc').innerHTML = char.description || 'No description available.';
    
    // Hide romaji/synonyms card (it's hidden by default in HTML, but ensure)
    const romajiCard = document.getElementById('romaji-synonyms-card');
    if (romajiCard) romajiCard.style.display = 'none';
    
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

    // Voice actors: collect unique from all edges (Japanese and English)
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
            // English
            if (edge.englishVA && edge.englishVA.length) {
                edge.englishVA.forEach(va => {
                    if (va && va.id) {
                        if (!vaMap.has(va.id)) vaMap.set(va.id, { name: va.name.full, image: va.image?.large, languages: new Set() });
                        vaMap.get(va.id).languages.add('English');
                    }
                });
            }
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
                        <div class="voice-actor-lang">${Array.from(va.languages).join(', ')}</div>
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
                ${char.media.edges.map(edge => {
                    const detailPage = edge.node.type === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
                    return `
                        <div class="relation-card" onclick="window.location.href='${detailPage}?id=${edge.node.id}'">
                            <img src="${edge.node.coverImage.large}" loading="lazy">
                            <div class="relation-name">${edge.node.title.romaji}</div>
                            <div class="relation-badge">${edge.characterRole}</div>
                            <div class="relation-score">${edge.node.meanScore ? (edge.node.meanScore/10).toFixed(1)+'★' : '?'}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    // Insert voice actors and roles
    const vaContainer = document.getElementById('voice-actors-section');
    const relationsDiv = document.getElementById('relations-section');
    if (vaContainer) vaContainer.innerHTML = voiceActorsHtml;
    if (relationsDiv) relationsDiv.innerHTML = rolesHtml;

    // Hide the recommendations section (already hidden in HTML, but ensure)
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

loadCharacter();
