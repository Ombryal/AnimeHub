/**
 * anime-detail.js - Handles anime detail page with user list status, characters, staff, and list editor
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

let mediaData = null;
let listEntry = null;
let userId = null;

// Media query with start/end dates
const mediaQuery = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id type title { romaji english native }
    synonyms coverImage { extraLarge } bannerImage
    description format status episodes averageScore
    season seasonYear genres popularity duration
    startDate { year month day }
    endDate { year month day }
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
    id
    status
    progress
    score
    repeat
    startedAt { year month day }
    completedAt { year month day }
    notes
    private
  }
}`;

async function getUserId() {
    const viewerQuery = `query { Viewer { id } }`;
    const data = await apiFetch(viewerQuery);
    if (data && data.Viewer) return data.Viewer.id;
    return null;
}

async function loadAnime() {
    const mediaDataRes = await apiFetch(mediaQuery, { id: parseInt(id) });
    if (!mediaDataRes || !mediaDataRes.Media) {
        showError("Anime not found");
        return;
    }
    mediaData = mediaDataRes.Media;

    userId = await getUserId();
    if (userId) {
        const listData = await apiFetch(listQuery, { userId: userId, mediaId: parseInt(id) });
        if (listData && listData.MediaList) listEntry = listData.MediaList;
    }

    renderMediaDetails(mediaData, listEntry);
    initEditor(); // set up modal event listeners after DOM is ready
}

function renderMediaDetails(m, list) {
    // Banner (smaller, faded)
    const banner = m.bannerImage || m.coverImage.extraLarge;
    const bannerDiv = document.getElementById('det-banner');
    bannerDiv.style.backgroundImage = `url('${banner}')`;
    bannerDiv.classList.add('detail-banner');

    // Cover
    document.getElementById('det-cover').src = m.coverImage.extraLarge;

    // Title
    document.getElementById('det-title').innerText = m.title.english || m.title.romaji;

    // Status badge (media status)
    const statusBadge = document.getElementById('det-status-badge');
    statusBadge.innerText = m.status;

    // List button
    const listBtn = document.getElementById('list-action-btn');
    if (list && list.status) {
        let btnText = '';
        switch (list.status) {
            case 'CURRENT': btnText = 'WATCHING'; break;
            case 'PLANNING': btnText = 'PLANNING'; break;
            case 'COMPLETED': btnText = 'COMPLETED'; break;
            case 'DROPPED': btnText = 'DROPPED'; break;
            case 'PAUSED': btnText = 'PAUSED'; break;
            default: btnText = 'ADD TO LIST';
        }
        listBtn.innerText = btnText;
        listBtn.classList.add('updated');
    } else {
        listBtn.innerText = 'ADD TO LIST';
        listBtn.classList.remove('updated');
    }

    // Statistics grid (modified to match new design)
    const statsGrid = document.getElementById('det-stats-grid');
    const rating = m.averageScore ? (m.averageScore / 10).toFixed(1) + '/10' : '??';
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
    statsGrid.innerHTML = `
        ${renderStat('fa-star', 'Mean Score', rating)}
        ${renderStat('fa-info-circle', 'Status', m.status)}
        ${renderStat('fa-film', 'Total Episodes', m.episodes || '??')}
        ${renderStat('fa-clock', 'Average Duration', displayDuration)}
        ${renderStat('fa-tv', 'Format', m.format)}
        ${renderStat('fa-book-open', 'Source', m.studios.nodes[0]?.name || 'N/A')}
        ${renderStat('fa-calendar-alt', 'Season', m.season || 'N/A')}
        ${renderStat('fa-calendar-check', 'Start Date', formatDate(m.startDate))}
        ${renderStat('fa-calendar-check', 'End Date', formatDate(m.endDate))}
        ${renderStat('fa-chart-line', 'Popularity', m.popularity?.toLocaleString() || '?')}
    `;

    // Synopsis
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

    // Characters
    const charactersSection = document.getElementById('characters-section');
    if (m.characters.edges.length > 0) {
        charactersSection.innerHTML = `
            <h3 class="section-title">Characters & Cast</h3>
            <div class="scroller">
                ${m.characters.edges.map(edge => {
                    const char = edge.node;
                    const va = edge.voiceActors[0];
                    return `
                        <div class="character-card" onclick="window.location.href='character-detail.html?id=${char.id}'">
                            <div class="character-image"><img src="${char.image.large}" loading="lazy"></div>
                            <div class="character-name">${char.name.full}</div>
                            <div class="character-role">${edge.role}</div>
                            ${va ? `<div class="voice-actor" onclick="event.stopPropagation(); window.location.href='staff-detail.html?id=${va.id}'">🎙️ ${va.name.full}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        charactersSection.innerHTML = '';
    }

    // Staff
    const staffSection = document.getElementById('staff-section');
    if (m.staff?.edges?.length > 0) {
        staffSection.innerHTML = `
            <h3 class="section-title">Staff</h3>
            <div class="scroller">
                ${m.staff.edges.map(edge => {
                    const staff = edge.node;
                    return `
                        <div class="staff-card" onclick="window.location.href='staff-detail.html?id=${staff.id}'">
                            <div class="staff-image"><img src="${staff.image?.large || 'placeholder.jpg'}" loading="lazy"></div>
                            <div class="staff-name">${staff.name.full}</div>
                            <div class="staff-role">${edge.role}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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

function formatDate(dateObj) {
    if (!dateObj || (!dateObj.year && !dateObj.month && !dateObj.day)) return 'N/A';
    return `${dateObj.year || '?'}-${dateObj.month || '?'}-${dateObj.day || '?'}`;
}

// ---- List Editor Bottom Sheet ----
function openListEditor() {
    const sheet = document.getElementById('list-editor-sheet');
    sheet.classList.add('active');
    document.body.classList.add('filter-sheet-open');

    // Populate form with existing list data
    const statusSelect = document.getElementById('list-status-select');
    const progressInput = document.getElementById('list-progress');
    const scoreSelect = document.getElementById('list-score');
    const startDate = document.getElementById('list-start-date');
    const endDate = document.getElementById('list-completed-date');
    const notesText = document.getElementById('list-notes');
    const privateCheck = document.getElementById('list-private');
    const repeatInput = document.getElementById('list-repeat');
    const totalEpSpan = document.getElementById('total-episodes');

    totalEpSpan.innerText = ` / ${mediaData.episodes || '?'}`;

    if (listEntry) {
        statusSelect.value = listEntry.status || 'PLANNING';
        progressInput.value = listEntry.progress || 0;
        scoreSelect.value = listEntry.score || 0;
        if (listEntry.startedAt?.year) {
            startDate.value = `${listEntry.startedAt.year}-${(listEntry.startedAt.month || 1).toString().padStart(2,'0')}-${(listEntry.startedAt.day || 1).toString().padStart(2,'0')}`;
        } else {
            startDate.value = '';
        }
        if (listEntry.completedAt?.year) {
            endDate.value = `${listEntry.completedAt.year}-${(listEntry.completedAt.month || 1).toString().padStart(2,'0')}-${(listEntry.completedAt.day || 1).toString().padStart(2,'0')}`;
        } else {
            endDate.value = '';
        }
        notesText.value = listEntry.notes || '';
        privateCheck.checked = listEntry.private || false;
        repeatInput.value = listEntry.repeat || 0;
    } else {
        statusSelect.value = 'PLANNING';
        progressInput.value = 0;
        scoreSelect.value = 0;
        startDate.value = '';
        endDate.value = '';
        notesText.value = '';
        privateCheck.checked = false;
        repeatInput.value = 0;
    }
}

function closeListEditor() {
    const sheet = document.getElementById('list-editor-sheet');
    sheet.classList.remove('active');
    document.body.classList.remove('filter-sheet-open');
}

async function saveListEntry() {
    const status = document.getElementById('list-status-select').value;
    let progress = parseInt(document.getElementById('list-progress').value) || 0;
    const score = parseInt(document.getElementById('list-score').value);
    const startDateStr = document.getElementById('list-start-date').value;
    const endDateStr = document.getElementById('list-completed-date').value;
    const notes = document.getElementById('list-notes').value;
    const privateFlag = document.getElementById('list-private').checked;
    const repeat = parseInt(document.getElementById('list-repeat').value) || 0;

    if (mediaData.episodes && progress > mediaData.episodes) progress = mediaData.episodes;

    const startedAt = startDateStr ? {
        year: parseInt(startDateStr.split('-')[0]),
        month: parseInt(startDateStr.split('-')[1]),
        day: parseInt(startDateStr.split('-')[2])
    } : null;
    const completedAt = endDateStr ? {
        year: parseInt(endDateStr.split('-')[0]),
        month: parseInt(endDateStr.split('-')[1]),
        day: parseInt(endDateStr.split('-')[2])
    } : null;

    const mutation = `
    mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Int, $startedAt: FuzzyDateInput, $completedAt: FuzzyDateInput, $notes: String, $private: Boolean, $repeat: Int) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score, startedAt: $startedAt, completedAt: $completedAt, notes: $notes, private: $private, repeat: $repeat) {
            id
            status
            progress
            score
            startedAt { year month day }
            completedAt { year month day }
            notes
            private
            repeat
        }
    }`;
    const variables = {
        mediaId: parseInt(id),
        status,
        progress,
        score,
        startedAt,
        completedAt,
        notes,
        private: privateFlag,
        repeat
    };

    try {
        const result = await apiFetch(mutation, variables);
        if (result?.SaveMediaListEntry) {
            listEntry = result.SaveMediaListEntry;
            // Update button text
            const listBtn = document.getElementById('list-action-btn');
            let btnText = '';
            switch (status) {
                case 'CURRENT': btnText = 'WATCHING'; break;
                case 'PLANNING': btnText = 'PLANNING'; break;
                case 'COMPLETED': btnText = 'COMPLETED'; break;
                case 'DROPPED': btnText = 'DROPPED'; break;
                case 'PAUSED': btnText = 'PAUSED'; break;
            }
            listBtn.innerText = btnText;
            listBtn.classList.add('updated');
            closeListEditor();
        } else {
            console.error('Save failed, response:', result);
            alert('Failed to save list entry. Check console for details.');
        }
    } catch (error) {
        console.error('API error:', error);
        alert('API error: ' + error.message);
    }
}

async function deleteListEntry() {
    if (!listEntry) return;
    const mutation = `mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }`;
    try {
        const result = await apiFetch(mutation, { id: listEntry.id });
        if (result?.DeleteMediaListEntry?.deleted) {
            listEntry = null;
            const listBtn = document.getElementById('list-action-btn');
            listBtn.innerText = 'ADD TO LIST';
            listBtn.classList.remove('updated');
            closeListEditor();
        } else {
            alert('Failed to delete list entry.');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('API error: ' + error.message);
    }
}

function initEditor() {
    const btn = document.getElementById('list-action-btn');
    if (btn) btn.onclick = openListEditor;
    const saveBtn = document.getElementById('save-list-entry');
    const deleteBtn = document.getElementById('delete-list-entry');
    const closeOverlay = document.getElementById('close-list-editor');
    if (saveBtn) saveBtn.addEventListener('click', saveListEntry);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteListEntry);
    if (closeOverlay) closeOverlay.addEventListener('click', closeListEditor);
    // Progress buttons
    const progressInput = document.getElementById('list-progress');
    const minus = document.getElementById('progress-minus');
    const plus = document.getElementById('progress-plus');
    if (minus) minus.onclick = () => {
        let val = parseInt(progressInput.value) || 0;
        if (val > 0) progressInput.value = val - 1;
    };
    if (plus) plus.onclick = () => {
        let val = parseInt(progressInput.value) || 0;
        if (mediaData.episodes && val < mediaData.episodes) progressInput.value = val + 1;
        else if (!mediaData.episodes) progressInput.value = val + 1;
    };
}

function showError(message) {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('det-title').innerText = 'Error';
    document.getElementById('det-desc').innerHTML = message;
}

loadAnime();
