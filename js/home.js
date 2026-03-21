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

        // Query: user info, current lists, and recommendations
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
            recAnime: Page(perPage: 10) {
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    id title { romaji } coverImage { large } meanScore
                }
            }
            recManga: Page(perPage: 10) {
                media(sort: TRENDING_DESC, type: MANGA, isAdult: false) {
                    id title { romaji } coverImage { large } meanScore
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

        // Render recommendations (without progress badges)
        renderScrollerItems('rec-anime-scroll', data.recAnime.media, 'ANIME', false);
        renderScrollerItems('rec-manga-scroll', data.recManga.media, 'MANGA', false);

    } catch (err) {
        console.error("Home Error:", err);
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', initHome);
