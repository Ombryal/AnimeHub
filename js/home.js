/**
 * home.js - Dashboard and home page data
 */

async function initHome() {
    console.log("Home script initializing...");

    try {
        // Wait for token
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        // Query: user info, current lists, and recommendations (both types)
        const query = `
        query {
            Viewer {
                name
                avatar { large }
                statistics {
                    anime { episodesWatched }
                    manga { chaptersRead }
                }
            }
            watching: Page(perPage: 12) {
                mediaList(status: CURRENT, type: ANIME) {
                    progress
                    media { id title { romaji } coverImage { large } meanScore episodes }
                }
            }
            reading: Page(perPage: 12) {
                mediaList(status: CURRENT, type: MANGA) {
                    progress
                    media { id title { romaji } coverImage { large } meanScore chapters }
                }
            }
            recAnime: Page(perPage: 6) {
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
            recManga: Page(perPage: 6) {
                media(sort: TRENDING_DESC, type: MANGA, isAdult: false) {
                    id
                    title { romaji }
                    coverImage { large }
                    meanScore
                    format
                }
            }
        }`;

        const data = await apiFetch(query);
        if (!data || !data.Viewer) {
            console.error("No data returned.");
            return;
        }

        // Populate dashboard
        const v = data.Viewer;
        document.getElementById('username-display').innerText = v.name;
        document.getElementById('header-avatar').src = v.avatar.large;
        document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched.toLocaleString();
        document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead.toLocaleString();

        // Render current lists (with progress badges)
        renderScrollerItems('anime-scroll', data.watching.mediaList, 'ANIME', true);
        renderScrollerItems('manga-scroll', data.reading.mediaList, 'MANGA', true);

        // Combine anime and manga recommendations
        const animeRecs = data.recAnime?.media || [];
        const mangaRecs = data.recManga?.media || [];

        // Assign a mediaType to each item so we know which detail page to use
        const combinedRecs = [
            ...animeRecs.map(item => ({ ...item, mediaType: 'ANIME' })),
            ...mangaRecs.map(item => ({ ...item, mediaType: 'MANGA' }))
        ];

        // Optional: shuffle to mix them
        for (let i = combinedRecs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combinedRecs[i], combinedRecs[j]] = [combinedRecs[j], combinedRecs[i]];
        }

        const recContainer = document.getElementById('rec-scroll');
        if (combinedRecs.length) {
            recContainer.innerHTML = combinedRecs.map(item => {
                const detailPage = item.mediaType === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';
                const score = item.meanScore ? (item.meanScore / 10).toFixed(1) + '★' : '??';
                return `
                    <div class="media-item" onclick="window.location.href='${detailPage}?id=${item.id}'">
                        <div class="img-box">
                            <img src="${item.coverImage.large}" loading="lazy">
                            <div class="purple-badge">${score}</div>
                        </div>
                        <div class="media-title">${item.title.romaji}</div>
                    </div>
                `;
            }).join('');
        } else {
            recContainer.innerHTML = '<p class="empty-message">No recommendations available.</p>';
        }

    } catch (err) {
        console.error("Home Error:", err);
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', initHome);
