// profile.js - Fetch and display user profile data

const accessToken = localStorage.getItem('anilist_token');

async function fetchUserProfile() {
    const query = `
    query {
        Viewer {
            id
            name
            avatar { large }
            bannerImage
            about
            statistics {
                anime {
                    count
                    episodesWatched
                    minutesWatched
                    meanScore
                }
                manga {
                    count
                    chaptersRead
                    volumesRead
                    meanScore
                }
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

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ query })
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        return data.Viewer;
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
}

function updateProfileUI(user) {
    // Avatar & Name
    document.getElementById('profile-avatar').src = user.avatar?.large || 'default-avatar.png';
    document.getElementById('profile-name').textContent = user.name;
    
    // Banner
    const bannerDiv = document.getElementById('profile-banner');
    if (user.bannerImage) {
        bannerDiv.style.backgroundImage = `url(${user.bannerImage})`;
        bannerDiv.style.backgroundSize = 'cover';
        bannerDiv.style.backgroundPosition = 'center';
    }
    
    // Stats
    const animeStats = user.statistics.anime;
    const mangaStats = user.statistics.manga;
    const daysWatched = Math.floor(animeStats.minutesWatched / (60 * 24));
    const episodes = animeStats.episodesWatched || 0;
    const chapters = mangaStats.chaptersRead || 0;
    const totalActivity = episodes + chapters;
    const level = Math.floor(totalActivity / 1000);
    const nextLevelXP = (level + 1) * 1000;
    const currentXP = totalActivity;
    const xpNeeded = nextLevelXP - currentXP;
    const xpPercent = (currentXP % 1000) / 1000 * 100; // progress within current level

    // Determine badge based on level (you can adjust thresholds)
    let badge = 'BRONZE';
    if (level >= 50) badge = 'PLATINUM';
    else if (level >= 30) badge = 'GOLD';
    else if (level >= 15) badge = 'SILVER';
    else if (level >= 5) badge = 'BRONZE';
    else badge = 'IRON';
    document.getElementById('profile-badge').textContent = badge;

    // Populate modern stats grid
    document.getElementById('followers-modern').textContent = '?';
    document.getElementById('following-modern').textContent = '?';
    document.getElementById('series-completed').textContent = '?'; // not provided
    document.getElementById('anime-count-modern').textContent = animeStats.count || 0;
    document.getElementById('manga-count-modern').textContent = mangaStats.count || 0;
    document.getElementById('watchpower-modern').textContent = episodes.toLocaleString();
    document.getElementById('days-watched-modern').textContent = daysWatched;
    document.getElementById('chapters-read-modern').textContent = chapters.toLocaleString();
    document.getElementById('volumes-read-modern').textContent = mangaStats.volumesRead || 0;
    document.getElementById('anime-mean-score-modern').textContent = animeStats.meanScore ? (animeStats.meanScore / 10).toFixed(1) + '★' : 'N/A';
    document.getElementById('manga-mean-score-modern').textContent = mangaStats.meanScore ? (mangaStats.meanScore / 10).toFixed(1) + '★' : 'N/A';

    // Level & XP
    document.getElementById('user-level-modern').textContent = level;
    document.getElementById('xp-bar').style.width = xpPercent + '%';
    document.getElementById('next-rank-xp-modern').textContent = `${xpNeeded} XP to next rank`;

    // About
    const aboutDiv = document.getElementById('about-text');
    if (user.about) {
        aboutDiv.innerHTML = user.about;
    } else {
        aboutDiv.innerHTML = '<p>No bio yet.</p>';
    }

    // Favourites (unchanged)
    function createMediaItem(item, type) {
        let title = '', img = '', score = '', detailPage = '';
        if (type === 'ANIME') {
            title = item.title.userPreferred;
            img = item.coverImage?.large;
            score = item.averageScore ? (item.averageScore / 10).toFixed(1) + '★' : '??';
            detailPage = `anime-detail.html?id=${item.id}`;
        } else if (type === 'MANGA') {
            title = item.title.userPreferred;
            img = item.coverImage?.large;
            score = item.averageScore ? (item.averageScore / 10).toFixed(1) + '★' : '??';
            detailPage = `manga-detail.html?id=${item.id}`;
        } else if (type === 'CHARACTER') {
            title = item.name.userPreferred;
            img = item.image?.large;
            score = '';
            detailPage = `character-detail.html?id=${item.id}`;
        }
        return `
            <div class="media-item" onclick="window.location.href='${detailPage}'">
                <div class="img-box">
                    <img src="${img || 'placeholder.jpg'}" loading="lazy">
                    ${score ? `<div class="purple-badge">${score}</div>` : ''}
                </div>
                <div class="media-title">${title}</div>
            </div>
        `;
    }

    const favAnime = user.favourites.anime.nodes;
    const animeContainer = document.getElementById('favourite-anime');
    animeContainer.innerHTML = favAnime.length ? favAnime.map(item => createMediaItem(item, 'ANIME')).join('') : '<p class="empty-message">No favourite anime added yet.</p>';

    const favManga = user.favourites.manga.nodes;
    const mangaContainer = document.getElementById('favourite-manga');
    mangaContainer.innerHTML = favManga.length ? favManga.map(item => createMediaItem(item, 'MANGA')).join('') : '<p class="empty-message">No favourite manga added yet.</p>';

    const favChars = user.favourites.characters.nodes;
    const charContainer = document.getElementById('favourite-characters');
    charContainer.innerHTML = favChars.length ? favChars.map(item => createMediaItem(item, 'CHARACTER')).join('') : '<p class="empty-message">No favourite characters added yet.</p>';
}

function showError(message) {
    document.getElementById('profile-loading').style.display = 'none';
    const errorDiv = document.getElementById('profile-error');
    errorDiv.innerHTML = message;
    errorDiv.style.display = 'block';
}

async function initProfile() {
    if (!accessToken) {
        showError('Please log in to view your profile. <a href="index.html">Go to login</a>');
        return;
    }
    try {
        const userData = await fetchUserProfile();
        document.getElementById('profile-loading').style.display = 'none';
        document.getElementById('profile-content').style.display = 'block';
        updateProfileUI(userData);
        const headerAvatar = document.getElementById('user-avatar');
        if (headerAvatar && userData.avatar?.large) {
            headerAvatar.src = userData.avatar.large;
        }
    } catch (error) {
        showError('Failed to load profile: ' + error.message);
    }
}

initProfile();
