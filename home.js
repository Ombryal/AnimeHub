/**
 * home.js - Optimized for Dashboard & Scrollers
 */
async function initHome() {
    console.log("Home script initializing...");

    try {
        // 1. Wait for token
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 30) {
            await new Promise(r => setTimeout(r, 100)); 
            attempts++;
        }

        // 2. Query User Data + Lists (Status: CURRENT)
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
            animeList: Page(perPage: 12) {
                mediaList(status: CURRENT, type: ANIME) {
                    media { id title { romaji } coverImage { large } meanScore }
                }
            }
            mangaList: Page(perPage: 12) {
                mediaList(status: CURRENT, type: MANGA) {
                    media { id title { romaji } coverImage { large } meanScore }
                }
            }
        }`;

        const data = await apiFetch(query);

        if (!data || !data.Viewer) {
            console.error("No data returned.");
            return;
        }

        // 3. Populate Dashboard (Matching index.html IDs)
        const v = data.Viewer;
        if(document.getElementById('username-display')) document.getElementById('username-display').innerText = v.name;
        if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = v.avatar.large;
        if(document.getElementById('ep-stat')) document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched.toLocaleString();
        if(document.getElementById('ch-stat')) document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead.toLocaleString();

        // 4. Render Horizontal Scrollers
        renderScrollerItems('anime-scroll', data.animeList.mediaList, 'ANIME');
        renderScrollerItems('manga-scroll', data.mangaList.mediaList, 'MANGA');

    } catch (err) {
        console.error("Home Error:", err);
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', initHome);
