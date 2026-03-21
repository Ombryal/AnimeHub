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
                anime(perPage: 6) {
                    nodes {
                        id
                        title { userPreferred }
                        coverImage { large }
                        averageScore
                    }
                }
                manga(perPage: 6) {
                    nodes {
                        id
                        title { userPreferred }
                        coverImage { large }
                        averageScore
                    }
                }
                characters(perPage: 6) {
                    nodes {
                        id
                        name { userPreferred }
                        image { large }
                    }
                }
            }
            followers {
                pageInfo { total }
            }
            following {
                pageInfo { total }
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
    
    // Get follower/following counts from connections
    const followersCount = user.followers?.pageInfo?.total || 0;
    const followingCount = user.following?.pageInfo?.total || 0;
    
    document.getElementById('followers').textContent = followersCount;
    document.getElementById('following').textContent = followingCount;
    document.getElementById('anime-count').textContent = animeStats.count || 0;
    document.getElementById('manga-count').textContent = mangaStats.count || 0;
    document.getElementById('episodes-watched').textContent = animeStats.episodesWatched || 0;
    document.getElementById('days-watched').textContent = daysWatched;
    document.getElementById('anime-mean-score').textContent = animeStats.meanScore ? (animeStats.meanScore / 10).toFixed(1) + '★' : 'N/A';
    document.getElementById('chapters-read').textContent = mangaStats.chaptersRead || 0;
    document.getElementById('volumes-read').textContent = mangaStats.volumesRead || 0;
    document.getElementById('manga-mean-score').textContent = mangaStats.meanScore ? (mangaStats.meanScore / 10).toFixed(1) + '★' : 'N/A';
    
    // About
    const aboutDiv = document.getElementById('about-text');
    if (user.about) {
        aboutDiv.innerHTML = user.about;
    } else {
        aboutDiv.innerHTML = '<p>No bio yet.</p>';
    }
    
    // Favourite Anime
    const favAnime = user.favourites.anime.nodes;
    const animeContainer = document.getElementById('favourite-anime');
    if (favAnime.length) {
        animeContainer.innerHTML = favAnime.map(anime => `
            <div class="favourite-item" onclick="window.location.href='details.html?id=${anime.id}&type=ANIME'">
                <img src="${anime.coverImage?.large || 'placeholder.jpg'}" alt="${anime.title.userPreferred}">
                <div class="title">${anime.title.userPreferred}</div>
                <div class="score">${anime.averageScore ? (anime.averageScore / 10).toFixed(1) + '★' : 'N/A'}</div>
            </div>
        `).join('');
    } else {
        animeContainer.innerHTML = '<p>No favourite anime added yet.</p>';
    }
    
    // Favourite Manga
    const favManga = user.favourites.manga.nodes;
    const mangaContainer = document.getElementById('favourite-manga');
    if (favManga.length) {
        mangaContainer.innerHTML = favManga.map(manga => `
            <div class="favourite-item" onclick="window.location.href='details.html?id=${manga.id}&type=MANGA'">
                <img src="${manga.coverImage?.large || 'placeholder.jpg'}" alt="${manga.title.userPreferred}">
                <div class="title">${manga.title.userPreferred}</div>
                <div class="score">${manga.averageScore ? (manga.averageScore / 10).toFixed(1) + '★' : 'N/A'}</div>
            </div>
        `).join('');
    } else {
        mangaContainer.innerHTML = '<p>No favourite manga added yet.</p>';
    }
    
    // Favourite Characters
    const favChars = user.favourites.characters.nodes;
    const charContainer = document.getElementById('favourite-characters');
    if (favChars.length) {
        charContainer.innerHTML = favChars.map(char => `
            <div class="favourite-item" onclick="window.location.href='details.html?id=${char.id}&type=CHARACTER'">
                <img src="${char.image?.large || 'placeholder.jpg'}" alt="${char.name.userPreferred}">
                <div class="title">${char.name.userPreferred}</div>
            </div>
        `).join('');
    } else {
        charContainer.innerHTML = '<p>No favourite characters added yet.</p>';
    }
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
        
        // Optionally update header avatar if present
        const headerAvatar = document.getElementById('user-avatar');
        if (headerAvatar && userData.avatar?.large) {
            headerAvatar.src = userData.avatar.large;
        }
    } catch (error) {
        showError('Failed to load profile: ' + error.message);
    }
}

initProfile();
