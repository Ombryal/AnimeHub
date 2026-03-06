const CONFIG = {
    CLIENT_ID: '22649',
    API_URL: 'https://graphql.anilist.co'
};

// 1. Emergency Kill-Switch: If stuck for 5 seconds, hide loader no matter what
setTimeout(() => hideLoader(), 5000);

// 2. Token Logic
const hashParams = new URLSearchParams(window.location.hash.substring(1));
let token = hashParams.get('access_token') || localStorage.getItem('anilist_token');

if (token) {
    localStorage.setItem('anilist_token', token);
    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
} else {
    // If no token, redirect to AniList login
    if (!localStorage.getItem('anilist_token')) {
        window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token`;
    }
}

// 3. API Fetcher
async function apiFetch(query, variables = {}) {
    const activeToken = localStorage.getItem('anilist_token');
    if (!activeToken) return null;

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + activeToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        return json.data;
    } catch (err) {
        console.error("API Fetch Error:", err);
        return null;
    }
}

// 4. Loader Control
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}
