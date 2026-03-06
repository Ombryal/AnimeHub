/**
 * manga.js - Manga Discovery Logic
 * Populates: Trending Manga, Top Manhwa (KR), and Most Popular
 */

async function initMangaDiscovery() {
    // 1. Query Trending, Top Manhwa (using countryOfOrigin), and Popular
    const query = `query {
        Trending: Page(perPage: 12) { 
            media(sort: TRENDING_DESC, type: MANGA, isAdult: false) { 
                id title { romaji } coverImage { large } meanScore 
            } 
        }
        Manhwa: Page(perPage: 12) { 
            media(sort: SCORE_DESC, type: MANGA, countryOfOrigin: "KR", isAdult: false) { 
                id title { romaji } coverImage { large } meanScore 
            } 
        }
        Popular: Page(perPage: 12) { 
            media(sort: POPULARITY_DESC, type: MANGA, isAdult: false) { 
                id title { romaji } coverImage { large } meanScore 
            } 
        }
    }`;

    const data = await apiFetch(query);

    if (data) {
        // 2. Render each section using the shared logic in auth.js
        renderScrollerItems('trending-scroll', data.Trending.media, 'MANGA');
        renderScrollerItems('top-scroll', data.Manhwa.media, 'MANGA');
        renderScrollerItems('popular-scroll', data.Popular.media, 'MANGA');
    }

    // 3. Sync User Profile (Shared)
    await updateHeaderPFP();

    // 4. Reveal the Page
    hideLoader();
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initMangaDiscovery);
