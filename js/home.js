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

        // Step 1: Get user ID
        const viewerQuery = `query { Viewer { id } }`;
        const viewerData = await apiFetch(viewerQuery);
        const userId = viewerData?.Viewer?.id;
        if (!userId) {
            console.error("Could not get user ID");
            return;
        }

        // Step 2: Fetch all needed data with userId
        const query = `
        query ($userId: Int) {
            Viewer {
                name
                avatar { large }
                statistics {
                    anime { episodesWatched }
                    manga { chaptersRead }
                }
            }
            animeList: MediaListCollection(userId: $userId, type: ANIME, status: CURRENT) {
                lists {
                    entries {
                        progress
                        media {
                            id
                            title { romaji }
                            coverImage { large }
                            meanScore
                            episodes
                        }
                    }
                }
            }
            mangaList: MediaListCollection(userId: $userId, type: MANGA, status: CURRENT) {
                lists {
                    entries {
                        progress
                        media {
                            id
                            title { romaji }
                            coverImage { large }
                            meanScore
                            chapters
                        }
                    }
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

        const data = await apiFetch(query, { userId });
        if (!data || !data.Viewer) {
            console.error("No data returned from API.");
            return;
        }

        // Populate dashboard
        const v = data.Viewer;
        document.getElementById('username-display').innerText = v.name;
        document.getElementById('header-avatar').src = v.avatar.large;
        document.getElementById('ep-stat').innerText = v.statistics.anime.episodesWatched.toLocaleString();
        document.getElementById('ch-stat').innerText = v.statistics.manga.chaptersRead.toLocaleString();

        // Extract current anime list entries
        let animeEntries = [];
        if (data.animeList?.lists) {
            for (const list of data.animeList.lists) {
                if (list.entries) animeEntries.push(...list.entries);
            }
        }
        console.log("Currently watching:", animeEntries);

        // Extract current manga list entries
        let mangaEntries = [];
        if (data.mangaList?.lists) {
            for (const list of data.mangaList.lists) {
                if (list.entries) mangaEntries.push(...list.entries);
            }
        }
        console.log("Currently reading:", mangaEntries);

        // Render current lists (with progress badges)
        if (animeEntries.length) {
            renderScrollerItems('anime-scroll', animeEntries, 'ANIME', true);
        } else {
            document.getElementById('anime-scroll').innerHTML = '<p style="color:var(--text-dim); padding:20px;">No currently watching anime.</p>';
        }

        if (mangaEntries.length) {
            renderScrollerItems('manga-scroll', mangaEntries, 'MANGA', true);
        } else {
            document.getElementById('manga-scroll').innerHTML = '<p style="color:var(--text-dim); padding:20px;">No currently reading manga.</p>';
        }

        // Combine recommendations
        const animeRecs = data.recAnime?.media || [];
        const mangaRecs = data.recManga?.media || [];
        const combinedRecs = [
            ...animeRecs.map(item => ({ ...item, mediaType: 'ANIME' })),
            ...mangaRecs.map(item => ({ ...item, mediaType: 'MANGA' }))
        ];

        // Shuffle to mix
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
