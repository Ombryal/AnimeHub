<div align="right">
  <img src="https://komarev.com/ghpvc/?username=PotatoWithThoughts&label=Visitors&color=0e75b6&style=flat" alt="visitor badge" />
</div>

<p align="center">
  <img src="https://files.catbox.moe/your_banner.png" alt="AniStats Pro Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/PotatoWithThoughts/PotatoWithThoughts?style=for-the-badge&logo=github&label=Stars&color=0d1117&labelColor=38bdf8" />
  <img src="https://img.shields.io/github/forks/PotatoWithThoughts/PotatoWithThoughts?style=for-the-badge&logo=github&label=Forks&color=0d1117&labelColor=38bdf8" />
  <img src="https://img.shields.io/github/last-commit/PotatoWithThoughts/PotatoWithThoughts?style=for-the-badge&logo=git&label=Last%20Commit&color=0d1117&labelColor=38bdf8" />
</p>

# AniStats Pro

**AniStats Pro** is a sleek, modern web app that connects to your **AniList** account to track your anime and manga stats, discover new series, and manage your lists.  
Built with a glass‑morphism UI and fully responsive—perfect for both desktop and mobile.

> [!NOTE]
> This app is a **tracking and discovery tool** only. It does not host any content. All data comes directly from AniList via their official GraphQL API.

## ✨ Features

- 🔐 **AniList OAuth Login** – Securely log in with your AniList account.
- 📊 **Personal Dashboard** – See your episode/chapter counts, currently watching/reading, and personalized recommendations.
- 🔍 **Discovery Pages** – Browse trending, top‑rated, movies, and popular all‑time anime & manga.
- 📖 **Detailed Media View** – Get synopsis, stats, relations, characters, and recommendations for any title.
- 🌍 **Global Search** – Search anime, manga, characters, users, studios, and staff with filter chips.
- 👤 **User Profile** – View your stats, bio, and favourite anime/manga/characters (opens in a new tab).
- 🧩 **Clean Architecture** – Separated CSS and JS for easy maintenance.

## 🚀 Coming Soon

- **MyAnimeList (MAL) Integration** – Sync your MAL lists alongside AniList.
- **Advanced Filters** – Filter by genre, year, season, and more.
- **List Management** – Edit your anime/manga lists directly from the app.
- **Social Features** – Share your stats and recommendations with friends.

## 📁 Project Structure

```

PotatoWithThoughts/
├──css/
│├── global.css      (shared styles)
│├── details.css     (details page)
│└── profile.css     (profile page)
├──js/
│├── auth.js         (authentication, API, utilities)
│├── home.js         (dashboard)
│├── anime.js        (anime discovery)
│├── manga.js        (manga discovery)
│├── details.js      (media details)
│└── profile.js      (profile page)
├──index.html
├──anime.html
├──manga.html
├──details.html
├──profile.html
└──README.md

```

## 🛠️ Built With

- HTML5, CSS3, JavaScript (ES6)
- [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [Font Awesome](https://fontawesome.com/) icons
- Glass‑morphism design principles

## 📦 Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/PotatoWithThoughts/PotatoWithThoughts.git

1. Serve the files using any static server (e.g., Live Server extension in VS Code).
2. Open index.html and log in with your AniList account.
3. Start tracking and discovering!

## 🤝 Contributing

Contributions are welcome! If you have ideas or find bugs, please open an issue or submit a pull request.
For major changes, please discuss them in an issue first.

## 📄 License

This project is open‑source and available under the MIT License.

## 🌟 Show Your Support

If you like this project, please consider giving it a ⭐ on GitHub – it helps a lot

<p align="center">
  Made with ❤️ by <a href="https://github.com/Ombryal">Ombryal</a>
</p>
