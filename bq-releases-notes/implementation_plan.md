# Implementation Plan: Moneycontrol Feed Hub Web Application

This document outlines the architecture, design decisions, and system components of the **Moneycontrol Feed Hub**, a real-time financial news dashboard that aggregates, formats, and bookmarks news feeds.

---

## 1. System Overview & Architecture

The application is built on a standard Client-Server separation where Flask behaves as a secure parser/proxy, and the client handles filtering, state persistence, and counter tracking.

```mermaid
graph TD
    User([User's Browser]) -->|Loads Page| WebServer[Flask Web Server]
    User -->|Manual Sync| APIEndpoint[/api/feeds?refresh=true]
    APIEndpoint -->|Fetches XML Feed| MoneycontrolFeed[Moneycontrol Top News RSS Feed]
    APIEndpoint -->|Checks Cache| InMemoryCache[(In-Memory Cache)]
    
    subgraph Client-Side Architecture [Browser Engine]
        JSController[App JS Controller] -->|Fetch JSON| APIEndpoint
        JSController -->|Search / Tags Filters| FilterEngine[Filter Engine]
        FilterEngine -->|Renders UI Cards| DOM[HTML DOM]
        
        DOM -->|Click Bookmark| LocalStorageManager[Local Storage Manager]
        LocalStorageManager -->|Reads/Writes saved feeds| LocalStorage[(LocalStorage)]
        LocalStorageManager -->|Updates Tab Counters| DashboardStats[Dashboard Stats Counter]
    end
```

### Component Details
*   **Flask Aggregator (`app.py`)**: Hosts the server on port `5000`, routing the root index and fetching the XML RSS feed.
*   **RSS Parser Engine**: Moneycontrol uses HTML tags (like images) embedded inside the RSS `<description>` element. The server extracts the `src` attribute from the `<img>` tag and strips all remaining HTML markups to isolate the raw text description.
*   **5-Minute Feed Cache**: Caches parsed articles to prevent flooding Moneycontrol's servers. Force-refresh is initiated on demand by passing a query parameter `?refresh=true`.
*   **LocalStorage Persistence**: Bookmark state is stored in the user's browser. Articles added to "My Feeds" are saved as structured objects in `localStorage`.
*   **Responsive grid display**: Cards containing full-coverage links, publication metadata, category markers, and star icons.

---

## 2. Technical Stack

| Layer | Technology | Usage |
| :--- | :--- | :--- |
| **Backend Framework** | Python Flask (v3.1.3) | Routing, CORS proxying, caching |
| **Parser Utilities** | `xml.etree.ElementTree` & `re` (Regex) | XML tree traversal and HTML extraction |
| **Frontend Foundation** | HTML5, Vanilla JavaScript | Client-side search, bookmarks logic, DOM bindings |
| **Design System** | Custom CSS3 variables & Flexbox/Grid | Dark financial palette, ambient glows, shimmers |
| **Persistent Storage** | HTML5 Web Storage (localStorage) | Client-side persistence for bookmarked feeds |

---

## 3. Financial Feed Design System

The styling is themed around bullish trading markets, incorporating vibrant green elements, high-tech dark overlays, and modern typography.

### CSS Custom Tokens
```css
:root {
    --bg-dark: #07090e;                      /* Obsidian Black */
    --bg-surface: rgba(13, 18, 30, 0.7);     /* Glassmorphism slate */
    --border-color: rgba(255, 255, 255, 0.07);
    
    /* Bully Green accents */
    --primary-emerald: #10b981;
    --primary-grad: linear-gradient(135deg, #10b981 0%, #059669 50%, #3b82f6 100%);
    
    /* Bookmark colors */
    --color-gold: #f59e0b;
    --color-saved-bg: rgba(245, 158, 11, 0.12);
}
```

### Interactive Micro-Animations
*   **Conic Shimmers**: Shimmering card outlines while loading.
*   **Bookmark Bounce**: A cubic-bezier scale animation (`transform: scale(1.18)`) when saving an article.
*   **Dynamic Stats Counters**: Stats values count upwards from `0` to target figures on load via `requestAnimationFrame`.

---

## 4. Key Implementation Flows

### A. Raw XML Regex Parsing
Moneycontrol feed items contain escaped HTML inside descriptions. The server uses regular expressions to extract image resources and strip tags:
```python
# Extract the thumbnail image
img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw_desc)
if img_match:
    image_url = img_match.group(1)

# Remove HTML wrappers and unescape entities
clean_desc = re.sub(r'<[^>]+>', '', raw_desc).strip()
clean_desc = html.unescape(clean_desc)
```

### B. Persistent LocalStorage Syncer
Bookmarks are managed client-side without databases. The script keeps full items in `localStorage` so they display even if the server-side caches expire:
```javascript
// Load bookmarked feeds
function getBookmarkedFeeds() {
    return JSON.parse(localStorage.getItem('mc_saved_feeds')) || [];
}

// Add/Remove and update UI
function toggleBookmark(feedItem, cardElement) {
    const list = getBookmarkedFeeds();
    const index = list.findIndex(f => f.guid === feedItem.guid);
    if (index > -1) {
        list.splice(index, 1); // remove
    } else {
        list.push(feedItem); // save
    }
    localStorage.setItem('mc_saved_feeds', JSON.stringify(list));
    renderFeeds();
}
```
---

## 5. Development Setup
To test locally:
```bash
# Activate virtual environment
venv\Scripts\activate

# Install Flask dependencies
pip install Flask

# Run server
python app.py
```
Open **http://127.0.0.1:5000** to run the app.
