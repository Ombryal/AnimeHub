/**
 * anime.js - Final Depth Version
 */

async function initAnimeDiscovery() {
    try {
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 25) {
            await new Promise(r => setTimeout(r, 150)); 
            attempts++;
        }

        const query = `query {
            Hero: Page(perPage: 10) { 
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } coverImage { extraLarge } meanScore
                } 
            }
            Trending: Page(perPage: 15) { media(sort: TRENDING_DESC, type: ANIME) { id title { romaji } coverImage { large } meanScore } }
            TopRated: Page(perPage: 15) { media(sort: SCORE_DESC, type: ANIME) { id title { romaji } coverImage { large } meanScore } }
            Movies: Page(perPage: 15) { media(sort: POPULARITY_DESC, type: ANIME, format: MOVIE) { id title { romaji } coverImage { large } meanScore } }
            AllTimePopular: Page(perPage: 30) { 
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { 
                    id title { romaji } bannerImage coverImage { large } meanScore episodes 
                } 
            }
        }`;

        const data = await apiFetch(query);

        if (data) {
            renderHero(data.Hero?.media);
            renderScrollerItems('trending-scroll', data.Trending?.media, 'ANIME');
            renderScrollerItems('top-scroll', data.TopRated?.media, 'ANIME');
            renderScrollerItems('movies-scroll', data.Movies?.media, 'ANIME');
            renderVerticalPopularList('popular-vertical-list', data.AllTimePopular?.media);
            
            // Start Auto-Scroll and Depth Logic
            startHeroAutoScroll();
        }
    } catch (error) {
        console.error("Discovery Error:", error);
    } finally {
        hideLoader();
    }
}

function renderHero(items) {
    const container = document.getElementById('hero-carousel');
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        const title = m.title?.romaji || "Unknown";
        const img = m.coverImage?.extraLarge || "";
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "?.?";

        return `
            <div class="hero-card" onclick="window.location.href='details.html?id=${m.id}&type=ANIME'">
                <img src="${img}" class="hero-img" loading="lazy">
                <div class="hero-info-pill">
                    <div class="play-btn"><i class="fas fa-play"></i></div>
                    <div class="hero-text">
                        <h2>${title}</h2>
                        <div class="hero-meta">
                            <span>⭐ ${score}</span>
                            <span>•</span>
                            <span style="color:#fda4af;">Info</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Initial check for depth
    updateActiveDepth(container);
    
    // Listen for manual swipes to update depth
    container.addEventListener('scroll', () => updateActiveDepth(container));
}

function startHeroAutoScroll() {
    const slider = document.getElementById('hero-carousel');
    if (!slider) return;

    setInterval(() => {
        const firstCard = slider.querySelector('.hero-card');
        if (!firstCard) return;
        
        const scrollAmount = firstCard.offsetWidth + 12; 
        
        if (slider.scrollLeft + slider.offsetWidth >= slider.scrollWidth - 20) {
            slider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, 4000); 
}

/**
 * Depth Engine: Makes the middle card pop and fades side cards
 */
function updateActiveDepth(slider) {
    const cards = slider.querySelectorAll('.hero-card');
    const sliderCenter = slider.scrollLeft + (slider.offsetWidth / 2);

    cards.forEach(card => {
        const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
        const distance = Math.abs(sliderCenter - cardCenter);
        
        // If card is within the center focus area
        if (distance < card.offsetWidth / 2) {
            card.classList.add('active-depth');
        } else {
            card.classList.remove('active-depth');
        }
    });
}

function renderVerticalPopularList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items) return;

    container.innerHTML = items.map(m => {
        const title = m.title?.romaji || "Unknown";
        const banner = m.bannerImage || m.coverImage?.large;
        const poster = m.coverImage?.large || "";
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "?.?";
        const eps = m.episodes ? `${m.episodes} EP` : "TV";

        return `
            <div class="landscape-card" onclick="window.location.href='details.html?id=${m.id}&type=ANIME'">
                <div class="card-banner" style="background-image: url('${banner}')"></div>
                <div class="card-content">
                    <img src="${poster}" class="mini-poster" loading="lazy">
                    <div class="card-info">
                        <h4>${title}</h4>
                        <p>${eps} • ⭐ ${score}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initAnimeDiscovery);
