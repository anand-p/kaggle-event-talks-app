# 💸 Moneycontrol Feed Hub

A premium, real‑time financial news dashboard that aggregates, formats, and bookmarks news feeds from Moneycontrol and other sources. Built with Python Flask, vanilla HTML5, custom glassmorphic CSS, and JavaScript, it provides a sleek, dark‑mode experience for traders and finance enthusiasts.

---

## 🌟 Key Features

- **⚡ Real‑Time RSS Sync & Caching**: Pulls the latest Moneycontrol news feeds every 5 minutes with server‑side caching to avoid rate limits.
- **🗂️ News Categorization**: Automatically groups articles into **Markets**, **Earnings**, **Analyst Ratings**, and **Macro** with colorful badges.
- **🔖 Bookmarking**: Save favorite articles to a personal list for later review.
- **🔍 Instant Search & Filters**: Full‑text keyword search and category tabs for zero‑latency filtering.
- **🐦 Share to X (Twitter) Modal**: Draft, preview, and post tweets directly from the dashboard, with live character‑count and hashtag suggestions.
- **🌌 Premium Design**: Glassmorphic card overlays, ambient animations, custom scrollbars, and responsive dark‑mode UI.

---

## 🛠️ Technology Stack

- **Backend**: Python Flask (v3.x)
- **Feed Parser**: `feedparser` library for RSS/Atom parsing
- **Frontend**: Plain HTML5, custom CSS variables/animations, Vanilla JavaScript
- **Fonts**: Outfit (headers), Inter (body), JetBrains Mono (code snippets)
- **Sharing API**: X/Twitter Web Intent

---

## 📁 Project Structure

```
├── feeds/                     # RSS/Atom feed URLs and fetch scripts
├── templates/                # Jinja2 HTML templates
│   └── index.html            # Main dashboard UI
├── static/                   # Static assets
│   ├── css/
│   │   └── styles.css        # Glassmorphism dark‑mode stylesheet
│   └── js/
│       └── app.js            # Feed controller, bookmarking, tweet modal
├── app.py                    # Flask server routes & caching logic
├── .gitignore                # Standard Python ignore rules
└── README.md                 # Project documentation (this file)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Python 3.8+ installed.

### 2. Set Up Virtual Environment
```bash
# Navigate to the project folder
cd Moneycontrol-Feed-Hub

# Create a virtual environment
python -m venv venv

# Activate on Windows
venv\\Scripts\\activate

# Activate on macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install Flask feedparser
```

### 4. Run the Server
```bash
python app.py
```
Visit **http://127.0.0.1:5000** in your browser to view the dashboard.

---

## 🛠️ Development

### Commit Guidelines
When contributing, ensure your git commit messages follow the **Conventional Commits** specification. For example:
```
feat: add new market news aggregation module
fix(parser): handle malformed RSS entries
chore: update dependencies
```
This aids automated changelog generation.

---

## 📝 License
This project is open‑source and available under the MIT License.


A premium, interactive web application to track, search, filter, and share Google Cloud BigQuery product updates in real-time. Built using Python Flask, vanilla HTML5, custom glassmorphic CSS, and JavaScript.

---
