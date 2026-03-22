/**
 * user-detail.js - Handles user detail page (profile view)
 */

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) {
    window.location.href = 'index.html';
}

const query = `
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
      anime(perPage: 12) {
        nodes {
          id
          title { userPreferred }
          coverImage { large }
          averageScore
        }
      }
      manga(perPage: 12) {
        nodes {
          id
          title { userPreferred }
          coverImage { large }
          averageScore
        }
      }
      characters(perPage: 12) {
        nodes {
          id
          name { userPreferred }
          image { large }
        }
      }
    }
  }
}`;

async function loadUser() {
    const data = await apiFetch(query, { id: parseInt(id) });
    if (data && data.User) {
        renderUserDetails(data.User);
    } else {
        showError("User not found");
    }
}

function renderUserDetails(user) {
    // Banner and avatar
    document.getElementById('det-banner').style.backgroundImage = `url('${user.avatar?.large || ''}')`;
    document.getElementById('det-cover').src = user.avatar?.large || '';
    document.getElementById('det-title').innerText = user.name;
    
    // About (formatted)
    document.getElementById('det-desc').innerHTML = formatAnilistText(user.about);
    
    // Hide romaji/synonyms card
    const romajiCard = document.getElementById('romaji-synonyms-card');
    if (romajiCard) romajiCard.style.display = 'none';
    
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

    // Favourites
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
                        <div class="media-item" onclick="window.location.href='anime-detail.html?id=${anime.id}'">
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
                        <div class="media-item" onclick="window.location.href='manga-detail.html?id=${manga.id}'">
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
                        <div class="character-item" onclick="window.location.href='character-detail.html?id=${char.id}'">
                            <img src="${char.image?.large || 'placeholder.jpg'}">
                            <div class="title">${char.name.userPreferred}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        favouritesHtml += `</div>`;
    }

    const favContainer = document.getElementById('favourites-section');
    if (favContainer) favContainer.innerHTML = favouritesHtml;

    // External link to AniList
    const externalDiv = document.getElementById('external-link-container');
    externalDiv.innerHTML = `
        <a href="https://anilist.co/user/${user.name}" target="_blank" style="display: inline-block; padding: 12px 24px; background: var(--accent); color: var(--bg-base); border-radius: 25px; text-decoration: none; font-weight: bold;">
            View full profile on AniList <i class="fas fa-external-link-alt"></i>
        </a>
    `;

    // Hide recommendations section
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

loadUser();
