/**
 * staff-detail.js - Handles staff detail page
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

const query = `
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

async function loadStaff() {
    const data = await apiFetch(query, { id: parseInt(id) });
    if (data && data.Staff) {
        renderStaffDetails(data.Staff);
    } else {
        showError("Staff not found");
    }
}

function renderStaffDetails(staff) {
    const banner = staff.image?.large || '';
    document.getElementById('det-banner').style.backgroundImage = `url('${banner}')`;
    document.getElementById('det-cover').src = staff.image?.large || '';
    document.getElementById('det-title').innerText = staff.name.full;
    document.getElementById('det-desc').innerHTML = staff.description || 'No description available.';
    document.getElementById('romaji-title').innerText = staff.name.native || 'N/A';
    document.getElementById('synonyms-list').innerHTML = staff.primaryOccupations?.join(', ') || '—';
    
    // Hide the romaji/synonyms card because it's not relevant for staff
    const romajiCard = document.getElementById('romaji-synonyms-card');
    if (romajiCard) romajiCard.style.display = 'none';

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
                ${staff.staffMedia.edges.map(edge => {
                    const detailPage = edge.node.type === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
                    return `
                        <div class="relation-card" onclick="window.location.href='${detailPage}?id=${edge.node.id}'">
                            <img src="${edge.node.coverImage.large}">
                            <div class="relation-name">${edge.node.title.romaji}</div>
                            <div class="relation-badge">${edge.staffRole}</div>
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

loadStaff();
