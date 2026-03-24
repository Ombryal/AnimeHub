const axios = require('axios');
const cheerio = require('cheerio');
const mapping = require('../manga-mapping.json');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { mangaId } = req.query;
    if (!mangaId) return res.status(400).json({ error: 'Missing mangaId' });

    const slug = mapping[mangaId];
    if (!slug) return res.status(404).json({ error: 'Manga not found in mapping' });

    const url = `https://asurascans.com/manga/${slug}/`;
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const chapters = [];
        $('.chapter-list a').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            const match = title.match(/\d+/);
            const number = match ? match[0] : i + 1;
            chapters.push({ number, title, url: href });
        });
        chapters.reverse();
        res.json({ chapters });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chapters' });
    }
};
