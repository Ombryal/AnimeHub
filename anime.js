/**
 * anime.js - Step-by-Step Robust Version
 */

async function initAnimeDiscovery() {
    console.log("Anime discovery starting...");

    try {
        // 1. THE WAIT LOOP: Wait up to 3 seconds for the token to be ready
        let waitAttempts = 0;
        while (!localStorage.getItem('anilist_token') && waitAttempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            waitAttempts++;
        }

        // 2. The Multi-Section Query
        const query = `query {
            Trending: Page(perPage: 12) { 
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            TopRated: Page(perPage: 12) { 
                media(sort: SCORE_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            Movies: Page(perPage: 12) { 
                media(sort: POPULARITY_DESC, type: ANIME, format: MOVIE, isAdult: false) { 
                    id title { romaji } coverImage { large } meanScore 
                } 
            }
            AllTimePopular: Page(perPage: 10) { 
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } bannerImage coverImage { large } meanScore episodes 
                } 
            }
        }`;

        const data = await apiFetch(query);

        if (data) {
            // 3. Render horizontal scrollers (Helper in auth.js)
            renderScrollerItems('trending-scroll', data.Trending?.media, 'ANIME');
            renderScrollerItems('top-scroll', data.TopRated?.media, 'ANIME');
            renderScrollerItems('popular-scroll', data.Movies?.media, 'ANIME');
            
            // 4. Render your custom landscape list
            renderVerticalPopularList('popular-vertical-list', data.AllTimePopular?.media);
        } else {
            console.error("No data returned from API.");
        }
    } catch (error) {
        console.error("Initialization failed:", error);
    } finally {
        // 5. Hide the loader NO MATTER WHAT
        if (typeof hideLoader === 'function') hideLoader();
    }
}

/**
 * Landscape Card Renderer
 */
function renderVerticalPopularList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        const title = m.title?.romaji || "Unknown Title";
        const banner = m.bannerImage || m.coverImage?.large;
        const poster = m.coverImage?.large || "";
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";
        const eps = m.episodes ? `${m.episodes} Episodes` : "TV Series";

        return `
            <div class="landscape-card" onclick="window.location.href='details.html?id=${m.id}&type=ANIME'">
                <div class="card-banner" style="background-image: url('${banner}')"></div>
                <div class="card-overlay"></div>
                <div class="card-content">
                    <img src="${poster}" class="mini-poster" alt="${title}" loading="lazy">
                    <div class="card-info">
                        <h4>${title}</h4>
                        <p>${eps}</p>
                        <div class="purple-badge" style="position:static; display:inline-block; margin-top:8px;">
                            ${score} ★
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initAnimeDiscovery);
