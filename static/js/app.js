// Application State
let allFeeds = []; // Cached feeds from API
let currentTab = 'all'; // 'all' (Top News) or 'saved' (My Feeds)
let currentSearchQuery = '';

// DOM Elements
const skeletonLoader = document.getElementById('skeleton-loader');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('error-retry-btn');
const emptyContainer = document.getElementById('empty-container');
const emptyTitle = document.getElementById('empty-title');
const emptyMessage = document.getElementById('empty-message');
const emptyActionBtn = document.getElementById('empty-action-btn');
const feedsGrid = document.getElementById('feeds-grid-container');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const feedTabsSelector = document.getElementById('feed-tabs-selector');
const tabActionsArea = document.getElementById('tab-actions-area');
const clearMyFeedsBtn = document.getElementById('clear-my-feeds-btn');
const savedCounterBadge = document.getElementById('saved-counter-badge');

// Stats Counters
const statTotal = document.getElementById('stat-total-count');
const statSaved = document.getElementById('stat-saved-count');
const statMarket = document.getElementById('stat-market-count');
const statExclusive = document.getElementById('stat-exclusive-count');

// Toast Elements
const toastWrapper = document.getElementById('toast-wrapper');
const toastText = document.getElementById('toast-text');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load feeds
    fetchFeeds(false);
    
    // Core event handlers
    refreshBtn.addEventListener('click', () => fetchFeeds(true));
    retryBtn.addEventListener('click', () => fetchFeeds(true));
    
    // Search handlers
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        handleSearch();
    });
    
    // Quick Keyword tags
    document.querySelectorAll('.tag-pill').forEach(tag => {
        tag.addEventListener('click', (e) => {
            const keyword = e.target.getAttribute('data-keyword');
            
            // Toggle active tag styling
            if (e.target.classList.contains('active')) {
                e.target.classList.remove('active');
                searchInput.value = '';
            } else {
                document.querySelectorAll('.tag-pill').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                searchInput.value = keyword;
            }
            handleSearch();
        });
    });
    
    // Tab switching
    feedTabsSelector.addEventListener('click', (e) => {
        const button = e.target.closest('.feed-tab');
        if (!button) return;
        
        document.querySelectorAll('.feed-tab').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        currentTab = button.getAttribute('data-tab');
        
        // Show/hide clear bookmarks action
        if (currentTab === 'saved') {
            tabActionsArea.style.display = 'block';
        } else {
            tabActionsArea.style.display = 'none';
        }
        
        renderFeeds();
    });
    
    // Clear all saved feeds
    clearMyFeedsBtn.addEventListener('click', clearAllBookmarks);
    emptyActionBtn.addEventListener('click', resetSearchAndFilters);
});

// Toast notification helper
function showToast(message) {
    toastText.textContent = message;
    toastWrapper.style.display = 'block';
    toastWrapper.style.opacity = '1';
    
    setTimeout(() => {
        toastWrapper.style.opacity = '0';
        setTimeout(() => {
            toastWrapper.style.display = 'none';
        }, 300);
    }, 2500);
}

// Fetch Feeds from Flask server API
async function fetchFeeds(forceRefresh = false) {
    showLoading();
    
    let url = '/api/feeds';
    if (forceRefresh) {
        url += '?refresh=true';
        refreshBtn.classList.add('refreshing');
        refreshBtn.setAttribute('disabled', 'true');
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned error status ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allFeeds = data.feeds || [];
        
        // Sync counters
        updateStats();
        
        // Render feeds grid
        renderFeeds();
        
        // Update updated label
        if (data.last_fetched) {
            const fetchTime = new Date(data.last_fetched);
            lastUpdatedText.textContent = `Sync: ${fetchTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        if (forceRefresh) {
            showToast(data.warning ? "Data loaded (cached version)" : "Successfully fetched latest Moneycontrol feeds!");
        }
        
        showContent();
    } catch (error) {
        console.error("Error loading feeds:", error);
        errorMessage.textContent = error.message || "Failed to load feed from Moneycontrol.";
        showError();
    } finally {
        refreshBtn.classList.remove('refreshing');
        refreshBtn.removeAttribute('disabled');
    }
}

// Local Storage Bookmark Book-keeping
function getBookmarkedFeeds() {
    return JSON.parse(localStorage.getItem('mc_saved_feeds')) || [];
}

function saveBookmarkedFeeds(feeds) {
    localStorage.setItem('mc_saved_feeds', JSON.stringify(feeds));
    updateStats();
}

// Add or Remove bookmark from storage
function toggleBookmark(feedItem, cardElement) {
    const savedList = getBookmarkedFeeds();
    const index = savedList.findIndex(f => f.guid === feedItem.guid);
    
    if (index > -1) {
        // Remove
        savedList.splice(index, 1);
        saveBookmarkedFeeds(savedList);
        showToast("Removed from Saved Feeds");
        
        if (currentTab === 'saved') {
            // Smoothly collapse and remove the card in my feeds tab
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8) translateY(20px)';
            setTimeout(() => {
                renderFeeds();
            }, 300);
        } else {
            // Toggle bookmark icon class locally
            const btn = cardElement.querySelector('.btn-bookmark');
            btn.classList.remove('saved');
        }
    } else {
        // Add
        savedList.push(feedItem);
        saveBookmarkedFeeds(savedList);
        
        // Micro-animation popup effect
        const btn = cardElement.querySelector('.btn-bookmark');
        btn.classList.add('saved');
        
        cardElement.classList.add('save-pop-animation');
        setTimeout(() => {
            cardElement.classList.remove('save-pop-animation');
        }, 300);
        
        showToast("Added to Saved Feeds!");
    }
}

// Clear all bookmarks
function clearAllBookmarks() {
    if (confirm("Are you sure you want to clear all saved feeds?")) {
        saveBookmarkedFeeds([]);
        showToast("Cleared all bookmarked feeds");
        renderFeeds();
    }
}

// Calculate and animate stats dashboard counters
function updateStats() {
    const savedList = getBookmarkedFeeds();
    savedCounterBadge.textContent = savedList.length;
    
    // Core numbers
    const totalCount = allFeeds.length;
    const savedCount = savedList.length;
    
    // Simple keywords profiling to count Market & Exclusives
    const marketCount = allFeeds.filter(f => {
        const terms = ['sensex', 'nifty', 'market', 'stock', 'indices', 'bse', 'nse', 'hind zinc', 'sbi', 'gainer', 'loser'];
        const titleLower = f.title.toLowerCase();
        const descLower = f.description.toLowerCase();
        return terms.some(t => titleLower.includes(t) || descLower.includes(t));
    }).length;
    
    const exclusiveCount = allFeeds.filter(f => {
        const terms = ['exclusive', 'special', 'moneycontrol exclusive', 'mc exclusive'];
        const titleLower = f.title.toLowerCase();
        return terms.some(t => titleLower.includes(t));
    }).length;
    
    // Animate values
    animateValue(statTotal, 0, totalCount, 400);
    animateValue(statSaved, 0, savedCount, 400);
    animateValue(statMarket, 0, marketCount, 400);
    animateValue(statExclusive, 0, exclusiveCount, 400);
}

// Value counters animator
function animateValue(obj, start, end, duration) {
    if (!obj || start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Perform text filter matching
function handleSearch() {
    currentSearchQuery = searchInput.value.trim().toLowerCase();
    
    // Toggle active state for tag pills based on search queries
    document.querySelectorAll('.tag-pill').forEach(pill => {
        const keyword = pill.getAttribute('data-keyword').toLowerCase();
        if (currentSearchQuery.includes(keyword)) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    if (currentSearchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    renderFeeds();
}

function resetSearchAndFilters() {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    document.querySelectorAll('.tag-pill').forEach(pill => pill.classList.remove('active'));
    renderFeeds();
}

// Renders the feeds grid items
function renderFeeds() {
    feedsGrid.innerHTML = '';
    
    // 1. Determine active list
    let targetList = (currentTab === 'all') ? allFeeds : getBookmarkedFeeds();
    
    // 2. Filter by search query
    if (currentSearchQuery.length > 0) {
        targetList = targetList.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(currentSearchQuery);
            const descMatch = item.description.toLowerCase().includes(currentSearchQuery);
            return titleMatch || descMatch;
        });
    }
    
    // 3. Render Empty States if empty list
    if (targetList.length === 0) {
        feedsGrid.style.display = 'none';
        emptyContainer.style.display = 'flex';
        
        if (currentTab === 'saved') {
            emptyTitle.textContent = "Your Feeds list is empty";
            emptyMessage.textContent = "Tap the bookmark star icon on any news card in 'Top News' tab to save them here.";
            emptyActionBtn.style.display = 'none';
        } else {
            emptyTitle.textContent = "No matching feeds found";
            emptyMessage.textContent = "Refine your search parameters or select a trending keyword.";
            emptyActionBtn.style.display = 'inline-flex';
        }
        return;
    }
    
    emptyContainer.style.display = 'none';
    feedsGrid.style.display = 'grid';
    
    // Get saved GUIDs list for matching bookmark star highlight styling
    const savedGuids = getBookmarkedFeeds().map(f => f.guid);
    
    // 4. Create cards
    targetList.forEach(item => {
        const isSaved = savedGuids.includes(item.guid);
        const card = document.createElement('article');
        card.className = 'feed-card';
        
        // Exclusives tag marker
        const isExclusive = item.title.toLowerCase().includes('exclusive') || item.title.toLowerCase().includes('special');
        const badgeHTML = isExclusive ? `<span class="exclusive-badge">Exclusive</span>` : '';
        
        // Image render (or graphic gradient)
        let imgHTML = '';
        if (item.image_url) {
            imgHTML = `
                <div class="card-image-box">
                    ${badgeHTML}
                    <img class="card-image" src="${item.image_url}" alt="${item.title}" loading="lazy">
                </div>
            `;
        } else {
            imgHTML = `
                <div class="card-image-box">
                    ${badgeHTML}
                    <div class="card-image-placeholder">
                        <div class="placeholder-chart-bg"></div>
                        <!-- Chart Arrow Up Icon -->
                        <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                        </svg>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${imgHTML}
            <div class="card-details">
                <div class="card-meta">
                    <!-- Clock/Time Icon -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>${item.pub_date}</span>
                </div>
                <h2 class="card-title" title="${item.title}">${item.title}</h2>
                <p class="card-description">${item.description}</p>
                
                <div class="card-footer">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-read">
                        Read Story
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="12 5 19 12 12 19"/>
                        </svg>
                    </a>
                    <button class="btn-bookmark ${isSaved ? 'saved' : ''}" aria-label="Bookmark this article">
                        <!-- Bookmark Star icon -->
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Add toggle bookmark click event
        card.querySelector('.btn-bookmark').addEventListener('click', () => toggleBookmark(item, card));
        
        feedsGrid.appendChild(card);
    });
}

/* ========================================================
   VIEW STATE TRANSITIONS
======================================================== */
function showLoading() {
    skeletonLoader.style.display = 'block';
    errorContainer.style.display = 'none';
    emptyContainer.style.display = 'none';
    feedsGrid.style.display = 'none';
}

function showContent() {
    skeletonLoader.style.display = 'none';
    errorContainer.style.display = 'none';
}

function showError() {
    skeletonLoader.style.display = 'none';
    errorContainer.style.display = 'flex';
    emptyContainer.style.display = 'none';
    feedsGrid.style.display = 'none';
}
