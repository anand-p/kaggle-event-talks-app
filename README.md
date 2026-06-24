# 📊 BigQuery Release Notes Monitor

A premium, interactive web application to track, search, filter, and share Google Cloud BigQuery product updates in real-time. Built using Python Flask, vanilla HTML5, custom glassmorphic CSS, and JavaScript.

---

## 🌟 Key Features

*   **⚡ Real-Time RSS Syncing & Cache**: Seamless integration with the official GCP BigQuery Atom release feed, optimized with a 5-minute server-side caching engine to prevent rate limiting.
*   **🧩 Smart Update Segmentation**: Daily release notes are parsed dynamically using client-side `DOMParser` and separated into individual, readable update cards (e.g. isolating one Feature from a Change).
*   **🏷️ Categorization Badges**: Updates are auto-classified into **Features**, **Changes & Fixes**, or **Deprecations** using stylized category indicators.
*   **🔍 Instant Search & Filters**: Zero-latency full-text keyword search and category tab filters.
*   **🐦 Interactive X (Twitter) Composer Modal**: 
    *   Draft and edit tweets directly on the platform.
    *   Live character countdown circle tracking the 280-character limit.
    *   Verified-style post preview showcasing how the tweet will look on X/Twitter before posting.
    *   Click-to-insert hashtag pills (`#BigQuery`, `#GoogleCloud`).
    *   Integration with official X/Twitter Web Intent sharing.
*   **🌌 Premium Design**: Responsive grid architecture, glassmorphic card overlays, backing ambient animations, and custom scrollbars optimized for dark mode.

---

## 🛠️ Technology Stack

*   **Backend**: Python Flask (v3.1.3)
*   **Feed Parser**: Native XML ElementTree Parser (`xml.etree.ElementTree`)
*   **Frontend**: Plain HTML5, custom CSS variables/animations, Vanilla JavaScript
*   **Fonts**: Outfit (headers), Inter (body), JetBrains Mono (code blocks)
*   **API Connection**: X/Twitter Web Intent API

---

## 📁 Project Structure

```
├── bq-releases-notes/
│   └── implementation_plan.md   # Architectural design details
├── templates/
│   └── index.html               # Main dashboard UI structure
├── static/
│   ├── css/
│   │   └── styles.css           # Glassmorphism dark-mode style sheets
│   └── js/
│       └── app.js               # Parser controller & live tweet logic
├── app.py                       # Flask server routing & caching utility
├── .gitignore                   # Standard python ignore rules
└── README.md                    # Project documentation (this file)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Python 3.8+ installed on your system.

### 2. Set Up Virtual Environment
```bash
# Clone the repository (or go to project folder)
cd kaggle-event-talks-app

# Create a virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
This project uses Flask. You can install it via pip:
```bash
pip install Flask
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```

Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to view the application.

---

## 📝 License
This project is open-source and available under the MIT License.
