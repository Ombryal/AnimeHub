const axios = require('axios');
const cheerio = require('cheerio');
const mapping = require('../manga-mapping.json');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { mangaId, chapter } = req.query;
    if (!mangaId || !chapter) return res.status(400).json({ error: 'Missing parameters' });

    const slug = mapping[mangaId];
    if (!slug) return res.status(404).json({ error: 'Manga not found' });

    const chapterUrl = `https://asurascans.com/manga/${slug}/chapter-${chapter}/`;
    try {
        const { data } = await axios.get(chapterUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const images = [];
        $('.reading-content img').each((i, img) => {
            images.push($(img).attr('src'));
        });
        res.json({ images });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chapter images' });
    }
};
