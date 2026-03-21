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

async function fetchFollowerCounts(userId) {
    const query = `
    query ($userId: Int) {
        User(id: $userId) {
            followers(page: 1, perPage: 1) { pageInfo { total } }
            following(page: 1, perPage: 1) { pageInfo { total } }
        }
    }`;
    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ query, variables: { userId } })
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        return data.User;
    } catch (error) {
        console.error('Error fetching follower counts:', error);
        return { followers: null, following: null };
    }
}

function updateProfileUI(user, followerData = null) {
    // Avatar & Name
    document.getElementById('profile-avatar').src = user.avatar?.large || 'default-avatar.png';
    document.getElementById('profile-name').textContent = user.name;
    
    // Banner
    const bannerDiv = document.getElementById('profile-banner');
    if (user.bannerImage) {
        bannerDiv.style.backgroundImage = `url(${user.bannerImage})`;
        bannerDiv.style.backgroundSize = 'cover';
        bannerDiv.style.backgroundPosition = 'center';
    } else {
        // fallback gradient
        bannerDiv.style.backgroundImage = 'linear-gradient(135deg, #2c3e50, #3498db)';
    }
    
    // Stats
    const animeStats = user.statistics.anime;
    const mangaStats = user.statistics.manga;
    const daysWatched = Math.floor(animeStats.minutesWatched / (60 * 24));
    
    // Use follower data if available
    const followersCount = followerData?.followers?.pageInfo?.total || 0;
    const followingCount = followerData?.following?.pageInfo?.total || 0;
    
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
        aboutDiv.innerHTML = user.about; // allows HTML formatting
    } else {
        aboutDiv.innerHTML = '<p>No bio yet.</p>';
    }
    
    // Favourite Anime - render as horizontal scroller with media-item style
    const favAnime = user.favourites.anime.nodes;
    const animeContainer = document.getElementById('favourite-anime');
    if (favAnime.length) {
        animeContainer.innerHTML = favAnime.map(anime => `
            <div class="media-item" onclick="window.location.href='details.html?id=${anime.id}&type=ANIME'">
                <div class="img-box">
                    <img src="${anime.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                    <div class="purple-badge">${anime.averageScore ? (anime.averageScore / 10).toFixed(1) + '★' : '??'}</div>
                </div>
                <div class="media-title">${anime.title.userPreferred}</div>
            </div>
        `).join('');
    } else {
        animeContainer.innerHTML = '<p class="empty-message">No favourite anime added yet.</p>';
    }
    
    // Favourite Manga
    const favManga = user.favourites.manga.nodes;
    const mangaContainer = document.getElementById('favourite-manga');
    if (favManga.length) {
        mangaContainer.innerHTML = favManga.map(manga => `
            <div class="media-item" onclick="window.location.href='details.html?id=${manga.id}&type=MANGA'">
                <div class="img-box">
                    <img src="${manga.coverImage?.large || 'placeholder.jpg'}" loading="lazy">
                    <div class="purple-badge">${manga.averageScore ? (manga.averageScore / 10).toFixed(1) + '★' : '??'}</div>
                </div>
                <div class="media-title">${manga.title.userPreferred}</div>
            </div>
        `).join('');
    } else {
        mangaContainer.innerHTML = '<p class="empty-message">No favourite manga added yet.</p>';
    }
    
    // Favourite Characters - use custom class for circular style
    const favChars = user.favourites.characters.nodes;
    const charContainer = document.getElementById('favourite-characters');
    if (favChars.length) {
        charContainer.classList.add('characters-scroller');
        charContainer.innerHTML = favChars.map(char => `
            <div class="character-item" onclick="window.location.href='details.html?id=${char.id}&type=CHARACTER'">
                <img src="${char.image?.large || 'placeholder.jpg'}" alt="${char.name.userPreferred}">
                <div class="title">${char.name.userPreferred}</div>
            </div>
        `).join('');
    } else {
        charContainer.innerHTML = '<p class="empty-message">No favourite characters added yet.</p>';
    }
}

function showError(message) {
    const loadingDiv = document.getElementById('profile-loading');
    if (loadingDiv) loadingDiv.style.display = 'none';
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
        
        // Fetch follower/following counts separately
        fetchFollowerCounts(userData.id).then(followerData => {
            if (followerData) {
                updateProfileUI(userData, followerData);
            }
        }).catch(err => console.warn('Could not load follower counts:', err));
        
        // Update header avatar if present
        const headerAvatar = document.getElementById('user-avatar');
        if (headerAvatar && userData.avatar?.large) {
            headerAvatar.src = userData.avatar.large;
        }
    } catch (error) {
        showError('Failed to load profile: ' + error.message);
    }
}

initProfile();
