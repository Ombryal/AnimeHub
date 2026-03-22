/**
 * auth.js - Authentication, API, and shared utilities
 */

const CONFIG = {
    CLIENT_ID: '22649',
    REDIRECT_URI: window.location.origin + window.location.pathname,
    API_URL: 'https://graphql.anilist.co'
};

const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
} else if (!localStorage.getItem('anilist_token')) {
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
}

async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    if (!activeToken) return null;

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        });

        const json = await response.json();

        if (json.errors) {
            console.error('AniList GraphQL errors:', json.errors);
            return null;
        }

        return json.data || null;
    } catch (err) {
        console.error('API fetch error:', err);
        return null;
    }
}

function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

function renderScrollerItems(id, entries, type, isUserList = false) {
    const container = document.getElementById(id);
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML = `<p style="color:var(--text-dim); padding:20px; font-size:0.8rem;">No entries found.</p>`;
        return;
    }

    const detailPage = type === 'ANIME' ? 'anime-detail.html' : 'manga-detail.html';

    container.innerHTML = entries.map(e => {
        const m = e.media || e;
        const score = m.meanScore ? (m.meanScore / 10).toFixed(1) : "??";

        let progressBadge = '';
        if (isUserList) {
            const currentProgress = e.progress || 0;
            const total = (type === 'ANIME' ? m.episodes : m.chapters) || '~';

            progressBadge = `
                <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; color: white; border: 1px solid rgba(255,255,255,0.15); z-index: 2;">
                    ${currentProgress} <span style="color: var(--accent); margin: 0 2px;">|</span> ${total}
                </div>`;
        }

        return `
            <div class="media-item" onclick="window.location.href='${detailPage}?id=${m.id}'">
                <div class="img-box">
                    ${progressBadge}
                    <img src="${m.coverImage?.large || 'placeholder.jpg'}" loading="lazy" alt="${m.title?.romaji || 'Media cover'}">
                    <div class="purple-badge">${score}</div>
                </div>
                <div class="media-title">${m.title?.romaji || 'Unknown'}</div>
            </div>`;
    }).join('');
}

/**
 * Convert AniList markdown to HTML
 * Supports: bold, italic, underline, strikethrough, links, spoilers, images,
 *           headers, horizontal rules, lists, blockquotes, code, center alignment,
 *           YouTube and WebM embeds.
 * Converts newlines to <br> and collapses multiple newlines to a single <br><br>.
 */
function formatAnilistText(text) {
    if (!text) return '';

    let formatted = String(text);

    // AniList-specific embeds
    formatted = formatted.replace(
        /youtube\(([a-zA-Z0-9_-]+)\)/g,
        '<div class="video-embed"><iframe width="100%" height="315" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>'
    );

    formatted = formatted.replace(
        /webm\(([^)]+)\)/g,
        '<div class="video-embed"><video controls autoplay loop muted><source src="$1" type="video/webm"></video></div>'
    );

    formatted = formatted.replace(/img(\d+%?)?\(([^)]+)\)/g, function (match, size, url) {
        const width = size ? size : 'auto';
        return `<img src="${url}" style="max-width:100%; width:${width}; height:auto;" alt="image">`;
    });

    // Standard markdown features
    formatted = formatted.replace(/~!([\s\S]*?)!~/g, '<span class="spoiler">$1</span>');

    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    formatted = formatted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; height:auto;">');

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    formatted = formatted.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_\n]+?)_/g, '<em>$1</em>');

    formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');

    formatted = formatted.replace(/^(#{1,5})\s+(.*)$/gm, function (match, hashes, content) {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
    });

    formatted = formatted.replace(/^(.*?)\n={2,}$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^(.*?)\n-{2,}$/gm, '<h2>$1</h2>');

    formatted = formatted.replace(/^(\-{3,}|\*{3,})$/gm, '<hr>');

    formatted = formatted.replace(/^>+\s+(.*)$/gm, function (match, content) {
        const level = (match.match(/^>/g) || []).length;
        return `<blockquote><p>${content}</p></blockquote>`.repeat(level);
    });

    formatted = formatted.replace(/^(\s*)([-*+])\s+(.*)$/gm, function (match, indent, bullet, content) {
        const margin = indent.length ? ' style="margin-left:20px"' : '';
        return `<ul${margin}><li>${content}</li></ul>`;
    });

    formatted = formatted.replace(/^(\s*)(\d+)\.\s+(.*)$/gm, function (match, indent, num, content) {
        const margin = indent.length ? ' style="margin-left:20px"' : '';
        return `<ol${margin}><li>${content}</li></ol>`;
    });

    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    formatted = formatted.replace(/^ {4}(.*)$/gm, '<pre><code>$1</code></pre>');

    formatted = formatted.replace(/~~~([\s\S]*?)~~~/g, '<div class="center-align">$1</div>');
    formatted = formatted.replace(/<center>(.*?)<\/center>/gi, '<div class="center-align">$1</div>');

    formatted = formatted.replace(/\n\n+/g, '[PARAGRAPH_BREAK]');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\[PARAGRAPH_BREAK\]/g, '<br><br>');

    formatted = formatted.replace(/<(h[1-6]|p|blockquote|pre)>(.*?)<\/\1>/g, function (match, tag, content) {
        content = content.replace(/<br\s*\/?>/g, ' ');
        return `<${tag}>${content}</${tag}>`;
    });

    return formatted;
}

// ------------------------------
// Search for anime & manga pages (floating results)
// ------------------------------
let activeSearchType = 'ANIME';

async function handleSearch(input, containerId, forcedType = null) {
    const queryStr = input.value.trim();
    const container = document.getElementById(containerId);
    if (!container) return;

    if (queryStr.length < 3) {
        container.innerHTML = '';
        container.classList.remove('active');
        return;
    }

    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--accent);"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;
    container.classList.add('active');

    const mode = forcedType || activeSearchType;
    let query = '';
    const variables = { search: queryStr };

    if (mode === 'ANIME') {
        query = `
            query ($search: String) {
                Page(perPage: 15) {
                    media(search: $search, type: ANIME) {
                        id
                        title { romaji }
                        coverImage { large }
                        meanScore
                        format
                    }
                }
            }`;
    } else if (mode === 'MANGA') {
        query = `
            query ($search: String) {
                Page(perPage: 15) {
                    media(search: $search, type: MANGA) {
                        id
                        title { romaji }
                        coverImage { large }
                        meanScore
                        format
                    }
                }
            }`;
    } else {
        return;
    }

    const data = await apiFetch(query, variables);

    if (!data || !data.Page) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-dim);">No results found.</div>`;
        return;
    }

    const items = data.Page.media;
    if (!items || items.length === 0) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-dim);">No results found.</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const title = item.title?.romaji || 'Unknown';
        const img = item.coverImage?.large;
        const sub = item.format || mode;
        const redirectUrl = mode === 'ANIME'
            ? `anime-detail.html?id=${item.id}`
            : `manga-detail.html?id=${item.id}`;

        return `
            <div class="search-item-row" onclick="window.location.href='${redirectUrl}'" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">
                <img src="${img || 'placeholder.jpg'}" style="width:45px; height:60px; border-radius:8px; object-fit:cover; flex-shrink:0;" alt="${title}">
                <div style="flex:1; overflow:hidden;">
                    <h4 style="font-size:0.85rem; margin:0; color:white; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${title}</h4>
                    <p style="font-size:0.7rem; margin:4px 0 0; color:var(--accent); font-weight:600;">${sub}</p>
                </div>
            </div>`;
    }).join('');
}

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const openSearch = document.getElementById('open-search');
    const closeSearch = document.getElementById('close-search');
    const searchSheet = document.getElementById('search-sheet');

    if (openSearch && closeSearch && searchSheet) {
        openSearch.onclick = () => searchSheet.classList.add('active');
        closeSearch.onclick = () => searchSheet.classList.remove('active');
    }

    const animeInput = document.getElementById('anime-search-input');
    if (animeInput) {
        const debouncedAnimeSearch = debounce(() => {
            handleSearch(animeInput, 'anime-search-results', 'ANIME');
        }, 300);

        animeInput.addEventListener('input', debouncedAnimeSearch);

        document.addEventListener('click', (e) => {
            const results = document.getElementById('anime-search-results');
            if (!animeInput.contains(e.target) && !(results && results.contains(e.target))) {
                if (results) {
                    results.innerHTML = '';
                    results.classList.remove('active');
                }
            }
        });
    }

    const mangaInput = document.getElementById('manga-search-input');
    if (mangaInput) {
        const debouncedMangaSearch = debounce(() => {
            handleSearch(mangaInput, 'manga-search-results', 'MANGA');
        }, 300);

        mangaInput.addEventListener('input', debouncedMangaSearch);

        document.addEventListener('click', (e) => {
            const results = document.getElementById('manga-search-results');
            if (!mangaInput.contains(e.target) && !(results && results.contains(e.target))) {
                if (results) {
                    results.innerHTML = '';
                    results.classList.remove('active');
                }
            }
        });
    }
});
