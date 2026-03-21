/**
 * manga.js - Final Depth Version with Custom Sections
 */

async function initMangaDiscovery() {
    try {
        let attempts = 0;
        while (!localStorage.getItem('anilist_token') && attempts < 25) {
            await new Promise(r => setTimeout(r, 150)); 
            attempts++;
        }

        const query = `query {
            Hero: Page(perPage: 10) { 
                media(sort: TRENDING_DESC, type: MANGA, isAdult: false) { 
                    id title { romaji } coverImage { extraLarge } meanScore
                } 
            }
            TrendingManga: Page(perPage: 15) { 
                media(sort: TRENDING_DESC, type: MANGA, format: MANGA) { id title { romaji } coverImage { large } meanScore } 
            }
            TrendingManhwa: Page(perPage: 15) { 
                media(sort: TRENDING_DESC, type: MANGA, countryOfOrigin: "KR") { id title { romaji } coverImage { large } meanScore } 
            }
            TrendingNovel: Page(perPage: 15) { 
                media(sort: TRENDING_DESC, type: MANGA, format: NOVEL) { id title { romaji } coverImage { large } meanScore } 
            }
            TopRated: Page(perPage: 15) { 
                media(sort: SCORE_DESC, type: MANGA) { id title { romaji } coverImage { large } meanScore } 
            }
            MostFavorite: Page(perPage: 15) { 
                media(sort: FAVOURITES_DESC, type: MANGA) { id title { romaji } coverImage { large } meanScore } 
            }
            AllTimePopular: Page(perPage: 30) { 
                media(sort: POPULARITY_DESC, type: MANGA) { 
                    id title { romaji } bannerImage coverImage { large } meanScore chapters 
                } 
            }
        }`;

        const data = await apiFetch(query);

        if (data) {
            renderHero(data.Hero?.media);
            renderScrollerItems('trending-manga', data.TrendingManga?.media, 'MANGA');
            renderScrollerItems('trending-manhwa', data.TrendingManhwa?.media, 'MANGA');
            renderScrollerItems('trending-novel', data.TrendingNovel?.media, 'MANGA');
            renderScrollerItems('top-rated', data.TopRated?.media, 'MANGA');
            renderScrollerItems('most-favorite', data.MostFavorite?.media, 'MANGA');
            renderVerticalPopularList('popular-vertical-list', data.AllTimePopular?.media);
            
            startHeroAutoScroll();
        }
    } catch (error) {
        console.error("Manga Discovery Error:", error);
    } finally {
        hideLoader();
    }
}

function renderHero(items) {
    const container = document.getElementById('hero-carousel');
    if (!container || !items) return;

    container.innerHTML = items.map(m => `
        <div class="hero-card" onclick="window.location.href='details.html?id=${m.id}&type=MANGA'">
            <img src="${m.coverImage.extraLarge}" class="hero-img" loading="lazy">
            <div class="hero-info-pill">
                <div class="play-btn"><i class="fas fa-book-open"></i></div>
                <div class="hero-text">
                    <h2>${m.title.romaji}</h2>
                    <div class="hero-meta">
                        <span>⭐ ${(m.meanScore/10).toFixed(1)}</span>
                        <span>•</span>
                        <span style="color:#fda4af;">Info</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    updateActiveDepth(container);
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
    }, 4500); 
}

function updateActiveDepth(slider) {
    const cards = slider.querySelectorAll('.hero-card');
    const sliderCenter = slider.scrollLeft + (slider.offsetWidth / 2);

    cards.forEach(card => {
        const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
        const distance = Math.abs(sliderCenter - cardCenter);
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
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "?.?";
        const chapters = m.chapters ? `${m.chapters} Ch.` : "Ongoing";

        return `
            <div class="landscape-card" onclick="window.location.href='details.html?id=${m.id}&type=MANGA'">
                <div class="card-banner" style="background-image: url('${banner}')"></div>
                <div class="card-content">
                    <img src="${m.coverImage.large}" class="mini-poster" loading="lazy">
                    <div class="card-info">
                        <h4>${title}</h4>
                        <p>${chapters} • ⭐ ${score}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initMangaDiscovery);
