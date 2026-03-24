const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('mangaId');

let chapters = [];
let currentChapterIndex = 0;

async function loadChapters() {
    if (!mangaId) {
        document.getElementById('manga-title').innerText = 'Invalid manga';
        return;
    }

    try {
        const response = await fetch(`/api/get-chapters?mangaId=${mangaId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        chapters = data.chapters;
        if (!chapters.length) {
            document.getElementById('chapters-list').innerHTML = '<p>No chapters found.</p>';
            return;
        }

        // Group by 25
        const groups = {};
        chapters.forEach(ch => {
            const num = parseInt(ch.number);
            const group = Math.floor((num - 1) / 25) + 1;
            if (!groups[group]) groups[group] = [];
            groups[group].push(ch);
        });

        let html = '';
        for (let group in groups) {
            const start = (group - 1) * 25 + 1;
            const end = Math.min(group * 25, chapters.length);
            html += `<div class="chapter-group">
                <h3>Ch.${start} - Ch.${end}</h3>
                <div class="chapter-items">`;
            groups[group].forEach(ch => {
                html += `<div class="chapter-item" data-chapter="${ch.number}">
                    <div class="chapter-number">Chapter ${ch.number}</div>
                    <div class="chapter-date">${ch.date || ''}</div>
                </div>`;
            });
            html += `</div></div>`;
        }
        document.getElementById('chapters-list').innerHTML = html;

        document.querySelectorAll('.chapter-item').forEach(el => {
            el.addEventListener('click', () => loadChapter(el.dataset.chapter));
        });

        document.getElementById('manga-title').innerText = decodeURIComponent(mangaId);
    } catch (err) {
        console.error(err);
        document.getElementById('chapters-list').innerHTML = '<p>Failed to load chapters.</p>';
    }
}

async function loadChapter(chapterNum) {
    try {
        const response = await fetch(`/api/get-chapter-images?mangaId=${mangaId}&chapter=${chapterNum}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const images = data.images;
        if (!images.length) {
            document.getElementById('chapter-images').innerHTML = '<p>No images found.</p>';
            return;
        }

        let imagesHtml = '';
        images.forEach(img => {
            imagesHtml += `<img src="${img}" loading="lazy" alt="Page">`;
        });
        document.getElementById('chapter-images').innerHTML = imagesHtml;

        currentChapterIndex = chapters.findIndex(ch => ch.number == chapterNum);
        document.getElementById('chapter-number').innerText = `Chapter ${chapterNum}`;
        document.getElementById('prev-chapter').disabled = currentChapterIndex === 0;
        document.getElementById('next-chapter').disabled = currentChapterIndex === chapters.length - 1;

        document.getElementById('chapters-list').style.display = 'none';
        document.getElementById('reader-content').style.display = 'block';
    } catch (err) {
        console.error(err);
        alert('Failed to load chapter.');
    }
}

function prevChapter() {
    if (currentChapterIndex > 0) loadChapter(chapters[currentChapterIndex - 1].number);
}
function nextChapter() {
    if (currentChapterIndex < chapters.length - 1) loadChapter(chapters[currentChapterIndex + 1].number);
}
function showChaptersList() {
    document.getElementById('reader-content').style.display = 'none';
    document.getElementById('chapters-list').style.display = 'block';
}

document.getElementById('prev-chapter').addEventListener('click', prevChapter);
document.getElementById('next-chapter').addEventListener('click', nextChapter);
document.getElementById('back-to-list').addEventListener('click', showChaptersList);

loadChapters();
