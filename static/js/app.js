// Global Application State
let allReleases = []; // Raw entries from RSS feed
let allParsedUpdates = []; // Normalized individual updates
let currentFilter = 'all';
let currentSearchQuery = '';

// DOM Elements
const skeletonLoader = document.getElementById('skeleton-loader');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('error-retry-btn');
const emptyContainer = document.getElementById('empty-container');
const timelineFlow = document.getElementById('timeline-flow');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterTabsContainer = document.getElementById('filter-tabs-container');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// Stats Counters
const statTotal = document.getElementById('stat-total-count');
const statFeatures = document.getElementById('stat-features-count');
const statChanges = document.getElementById('stat-changes-count');
const statDeprecations = document.getElementById('stat-deprecations-count');

// Tweet Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgress = document.getElementById('char-progress');
const charCountText = document.getElementById('char-count-text');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const toastWrapper = document.getElementById('toast-wrapper');
const toastText = document.getElementById('toast-text');

// Init Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    
    // Refresh handlers
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search handlers
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        handleSearch();
    });
    
    // Filter handlers
    filterTabsContainer.addEventListener('click', handleFilterClick);
    clearFiltersBtn.addEventListener('click', resetSearchAndFilters);
    
    // Modal handlers
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    tweetTextarea.addEventListener('input', updateTweetComposerState);
    publishTweetBtn.addEventListener('click', publishTweetToX);
    
    // Hashtags append
    document.querySelectorAll('.hashtag-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = e.target.getAttribute('data-tag');
            insertTextAtCursor(tweetTextarea, ' ' + tag);
            updateTweetComposerState();
        });
    });

    // Close modal on click outside container
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });
});

// Toast notification function
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

// Fetch Release Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading();
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
        refreshBtn.classList.add('refreshing');
        refreshBtn.setAttribute('disabled', 'true');
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allReleases = data.releases || [];
        processAndNormalizeUpdates(allReleases);
        
        // Update stats dashboard
        updateStats();
        
        // Render current view
        renderTimeline();
        
        // Update last refreshed label
        if (data.last_fetched) {
            const fetchDate = new Date(data.last_fetched);
            lastUpdatedText.textContent = `Sync: ${fetchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        if (forceRefresh) {
            showToast(data.warning ? "Data refreshed (offline mode)" : "Successfully synced release notes!");
        }
        
        showContent();
    } catch (error) {
        console.error("Error fetching release notes:", error);
        errorMessage.textContent = error.message || "Could not fetch release notes feed. Please verify your connection.";
        showError();
    } finally {
        refreshBtn.classList.remove('refreshing');
        refreshBtn.removeAttribute('disabled');
    }
}

// Parse feed entries into individual update blocks
function processAndNormalizeUpdates(entries) {
    allParsedUpdates = [];
    
    entries.forEach(entry => {
        const updates = parseEntryContent(entry.content, entry.title, entry.link);
        allParsedUpdates.push(...updates);
    });
}

// Parses HTML structure inside GCP feed contents into separate update chunks
function parseEntryContent(contentHtml, dateTitle, originalLink) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const updates = [];
    const children = Array.from(doc.body.children);
    
    let currentType = 'Other';
    let currentContentElements = [];
    
    function saveCurrentUpdate() {
        if (currentContentElements.length > 0) {
            // Create a temporary container
            const tempDiv = document.createElement('div');
            currentContentElements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
            
            // Clean up relative links
            tempDiv.querySelectorAll('a').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
                const href = a.getAttribute('href');
                if (href && href.startsWith('/')) {
                    a.setAttribute('href', 'https://cloud.google.com' + href);
                }
            });
            
            const htmlContent = tempDiv.innerHTML.trim();
            const textContent = tempDiv.innerText.trim();
            
            // Determine precise Category
            const typeLower = currentType.toLowerCase();
            let category = 'other';
            if (typeLower.includes('feature')) {
                category = 'feature';
            } else if (typeLower.includes('change') || typeLower.includes('update') || typeLower.includes('improv') || typeLower.includes('fix') || typeLower.includes('resolv')) {
                category = 'change';
            } else if (typeLower.includes('deprecat') || typeLower.includes('remov')) {
                category = 'deprecation';
            }
            
            updates.push({
                type: currentType,
                category: category,
                html: htmlContent,
                text: textContent,
                date: dateTitle,
                link: originalLink
            });
            currentContentElements = [];
        }
    }
    
    // Group elements by H3 header
    children.forEach(child => {
        if (child.tagName === 'H3') {
            saveCurrentUpdate();
            currentType = child.textContent.trim();
        } else {
            currentContentElements.push(child);
        }
    });
    
    // Save the last remaining block
    saveCurrentUpdate();
    
    // Fallback if no H3 headers found at all
    if (updates.length === 0 && contentHtml.trim().length > 0) {
        updates.push({
            type: 'General',
            category: 'other',
            html: contentHtml,
            text: doc.body.innerText.trim(),
            date: dateTitle,
            link: originalLink
        });
    }
    
    return updates;
}

// Update counts on the Stats dashboard
function updateStats() {
    statTotal.textContent = allParsedUpdates.length;
    
    const featureCount = allParsedUpdates.filter(u => u.category === 'feature').length;
    const changeCount = allParsedUpdates.filter(u => u.category === 'change').length;
    const deprecationCount = allParsedUpdates.filter(u => u.category === 'deprecation').length;
    
    statFeatures.textContent = featureCount;
    statChanges.textContent = changeCount;
    statDeprecations.textContent = deprecationCount;
    
    // Quick micro-animations for numbers
    animateValue(statTotal, 0, allParsedUpdates.length, 500);
    animateValue(statFeatures, 0, featureCount, 500);
    animateValue(statChanges, 0, changeCount, 500);
    animateValue(statDeprecations, 0, deprecationCount, 500);
}

// Simple counter animation for dashboard
function animateValue(obj, start, end, duration) {
    if (start === end) return;
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

// Handle Search Inputs
function handleSearch() {
    currentSearchQuery = searchInput.value.trim().toLowerCase();
    
    if (currentSearchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    renderTimeline();
}

// Handle Filter tab switches
function handleFilterClick(e) {
    if (!e.target.classList.contains('filter-tab')) return;
    
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    
    currentFilter = e.target.getAttribute('data-filter');
    renderTimeline();
}

// Reset filters to default
function resetSearchAndFilters() {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-filter') === 'all') {
            tab.classList.add('active');
        }
    });
    
    currentFilter = 'all';
    renderTimeline();
}

// Filter and Render updates timeline
function renderTimeline() {
    // 1. Filter updates
    const filteredUpdates = allParsedUpdates.filter(update => {
        // Filter by Category Tab
        if (currentFilter !== 'all' && update.category !== currentFilter) {
            return false;
        }
        
        // Filter by Search Query
        if (currentSearchQuery.length > 0) {
            const matchesText = update.text.toLowerCase().includes(currentSearchQuery);
            const matchesType = update.type.toLowerCase().includes(currentSearchQuery);
            const matchesDate = update.date.toLowerCase().includes(currentSearchQuery);
            return matchesText || matchesType || matchesDate;
        }
        
        return true;
    });
    
    // 2. Clear previous content
    timelineFlow.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        emptyContainer.style.display = 'flex';
        timelineFlow.style.display = 'none';
        return;
    }
    
    emptyContainer.style.display = 'none';
    timelineFlow.style.display = 'flex';
    
    // 3. Group by Date
    const groupsByDate = {};
    filteredUpdates.forEach(update => {
        if (!groupsByDate[update.date]) {
            groupsByDate[update.date] = [];
        }
        groupsByDate[update.date].push(update);
    });
    
    // 4. Generate elements
    Object.keys(groupsByDate).forEach(date => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'timeline-group';
        
        // Sticky Header for date
        const dateHeader = document.createElement('div');
        dateHeader.className = 'timeline-date-marker';
        dateHeader.innerHTML = `
            <div class="date-node"></div>
            <h2 class="date-title">${date}</h2>
        `;
        dateGroup.appendChild(dateHeader);
        
        // Cards grid
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';
        
        groupsByDate[date].forEach(update => {
            const card = document.createElement('article');
            card.className = `release-card category-${update.category}`;
            
            // Badge text & class
            let badgeClass = 'badge-other';
            if (update.category === 'feature') badgeClass = 'badge-feature';
            if (update.category === 'change') badgeClass = 'badge-change';
            if (update.category === 'deprecation') badgeClass = 'badge-deprecation';
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="category-badge ${badgeClass}">${update.type}</span>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
                <div class="card-actions">
                    <button class="action-btn action-btn-copy" aria-label="Copy update details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="action-btn action-btn-tweet" aria-label="Share update on Twitter">
                        <!-- Twitter/X logo icon -->
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Share
                    </button>
                </div>
            `;
            
            // Add listeners to actions
            card.querySelector('.action-btn-copy').addEventListener('click', () => copyUpdateText(update));
            card.querySelector('.action-btn-tweet').addEventListener('click', () => openTweetModal(update));
            
            cardsGrid.appendChild(card);
        });
        
        dateGroup.appendChild(cardsGrid);
        timelineFlow.appendChild(dateGroup);
    });
}

// Copy update contents to clipboard
function copyUpdateText(update) {
    const headerPrefix = `[BigQuery Update - ${update.date}]\nCategory: ${update.type}\n\n`;
    const fullTextToCopy = `${headerPrefix}${update.text}\n\nRead more: ${update.link}`;
    
    navigator.clipboard.writeText(fullTextToCopy).then(() => {
        showToast("Update copied to clipboard!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast("Failed to copy. Please copy manually.");
    });
}

/* ========================================================
   TWITTER / X COMPOSER LOGIC
======================================================== */
let activeUpdateForTweet = null;

// Opens the customized composer modal
function openTweetModal(update) {
    activeUpdateForTweet = update;
    
    // Auto-generate starter tweet content
    // Format: "💡 New #BigQuery Feature (June 23, 2026): [Description truncated] Link"
    const prefixEmoji = update.category === 'feature' ? '💡' : update.category === 'deprecation' ? '⚠️' : '⚙️';
    const tag = update.category === 'feature' ? '#BigQuery Feature' : update.category === 'deprecation' ? '#BigQuery Deprecation' : '#BigQuery Update';
    
    const starterPrefix = `${prefixEmoji} ${tag} (${update.date}): `;
    const starterSuffix = `\n\nRead more: ${update.link}`;
    
    // Max characters available for text body
    // 280 - (prefix length) - (suffix length)
    const reservedLength = starterPrefix.length + starterSuffix.length;
    const maxBodyLength = 280 - reservedLength - 3; // 3 chars for ellipsis '...'
    
    let textBody = update.text;
    if (textBody.length > maxBodyLength) {
        textBody = textBody.substring(0, maxBodyLength).trim() + '...';
    }
    
    tweetTextarea.value = `${starterPrefix}${textBody}${starterSuffix}`;
    tweetModal.style.display = 'flex';
    
    // Set focus
    setTimeout(() => tweetTextarea.focus(), 100);
    
    updateTweetComposerState();
}

function closeTweetModal() {
    tweetModal.style.display = 'none';
    activeUpdateForTweet = null;
}

// Recalculates remaining characters, highlights over-limits, updates mock live view
function updateTweetComposerState() {
    const text = tweetTextarea.value;
    const charCount = text.length;
    const remaining = 280 - charCount;
    
    // Counter text
    charCountText.textContent = `${charCount} / 280`;
    
    // Circular Progress render
    const percent = Math.min((charCount / 280) * 100, 100);
    let colorClass = '';
    
    if (remaining < 0) {
        colorClass = 'error';
        charCountText.style.color = '#ef4444';
        publishTweetBtn.setAttribute('disabled', 'true');
        publishTweetBtn.style.opacity = '0.5';
    } else if (remaining <= 20) {
        colorClass = 'warning';
        charCountText.style.color = '#eab308';
        publishTweetBtn.removeAttribute('disabled');
        publishTweetBtn.style.opacity = '1';
    } else {
        charCountText.style.color = 'var(--twitter-text-secondary)';
        publishTweetBtn.removeAttribute('disabled');
        publishTweetBtn.style.opacity = '1';
    }
    
    charProgress.className = `circular-progress ${colorClass}`;
    
    // Conic gradient mapping
    const progressColor = remaining < 0 ? '#ef4444' : remaining <= 20 ? '#eab308' : '#1d9bf0';
    charProgress.style.background = `
        radial-gradient(closest-side, #16181c 79%, transparent 80% 100%),
        conic-gradient(${progressColor} ${percent}%, rgba(255, 255, 255, 0.1) 0%)
    `;
    
    // Render Live Preview text (highlight hashtags in blue, etc.)
    renderMockTweetText(text);
}

// Highlight URLs and hashtags in the mock tweet layout for that premium feeling
function renderMockTweetText(rawText) {
    // Escape HTML tags to prevent XSS in mock preview
    let escaped = rawText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Match hashtags: #word
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: #1d9bf0; cursor: pointer;">$1</span>');
    
    // Match links: http/https
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #1d9bf0; cursor: pointer; text-decoration: none;">$1</span>');
    
    tweetPreviewText.innerHTML = escaped || '<span style="color: var(--text-muted);">Start drafting your update...</span>';
}

// Opens the X Tweet intent share page in a new window
function publishTweetToX() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        showToast("Tweet exceeds the 280-character limit!");
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
    
    closeTweetModal();
    showToast("Launching Twitter/X share window...");
}

// Helper to insert text at textarea cursor position
function insertTextAtCursor(textarea, textToInsert) {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const oldText = textarea.value;
    
    // Insert text
    textarea.value = oldText.substring(0, startPos) + textToInsert + oldText.substring(endPos, oldText.length);
    
    // Move cursor to end of inserted text
    textarea.selectionStart = textarea.selectionEnd = startPos + textToInsert.length;
    textarea.focus();
}

/* ========================================================
   VIEW TRANSITION STATES
======================================================== */
function showLoading() {
    skeletonLoader.style.display = 'block';
    errorContainer.style.display = 'none';
    emptyContainer.style.display = 'none';
    timelineFlow.style.display = 'none';
}

function showContent() {
    skeletonLoader.style.display = 'none';
    errorContainer.style.display = 'none';
}

function showError() {
    skeletonLoader.style.display = 'none';
    errorContainer.style.display = 'flex';
    emptyContainer.style.display = 'none';
    timelineFlow.style.display = 'none';
}
