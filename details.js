/**
 * details.js - Robust Simplified Version
 * Handles Banner, Title, Cover, and Synopsis only.
 */

async function initDetails() {
    // 1. Safety Loop: Wait for auth.js to confirm token is in storage
    let attempts = 0;
    while (!localStorage.getItem('anilist_token') && attempts < 20) {
        await new Promise(r => setTimeout(r, 100)); 
        attempts++;
    }

    // 2. Extract Media ID from URL
    const params = new URLSearchParams(window.location.search);
    const mediaId = parseInt(params.get('id'));
    const mediaType = params.get('type') || 'ANIME';

    if (isNaN(mediaId)) {
        console.error("Invalid Media ID");
        if (typeof hideLoader === 'function') hideLoader();
        return;
    }

    // 3. Simplified Query (Only fetch what you are showing)
    const query = `query ($id: Int, $type: MediaType) {
        Media(id: $id, type: $type) {
            title { romaji }
            bannerImage
            coverImage { extraLarge }
            description
        }
    }`;

    try {
        const data = await apiFetch(query, { id: mediaId, type: mediaType });
        
        if (!data || !data.Media) {
            document.getElementById('det-title').innerText = "Media Not Found";
            return;
        }

        const m = data.Media;

        // 4. Populate UI
        // Banner
        const banner = document.getElementById('det-banner');
        if (m.bannerImage) {
            banner.style.backgroundImage = `url('${m.bannerImage}')`;
        } else {
            banner.style.backgroundImage = `url('${m.coverImage.extraLarge}')`;
            banner.style.filter = "blur(10px) brightness(0.5)"; // Blur cover if no banner exists
        }

        // Cover & Title
        document.getElementById('det-cover').src = m.coverImage.extraLarge;
        document.getElementById('det-title').innerText = m.title.romaji;

        // Synopsis (AniList returns HTML like <br>, so we use innerHTML)
        const descEl = document.getElementById('det-desc');
        descEl.innerHTML = m.description || "No synopsis available for this entry.";

    } catch (err) {
        console.error("Critical Load Error:", err);
        document.getElementById('det-title').innerText = "Error Loading Data";
    } finally {
        // 5. Always hide the loader, even if it fails
        if (typeof hideLoader === 'function') hideLoader();
    }
}

// Start the process
document.addEventListener('DOMContentLoaded', initDetails);
