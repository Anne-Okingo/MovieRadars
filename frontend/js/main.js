// Elements
const trendingList = document.getElementById('trending-list');
const resultsSection = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

// API config
const API_BASE = 'http://localhost:8080/api';

// Debounce helper
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Fetch search results
async function fetchSearch(query, page = 1) {
  resultsList.innerHTML = '<div class="loading">Searching...</div>';
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    const tmdbResults = (data.tmdb && data.tmdb.results) || [];
    renderCards(resultsList, tmdbResults);
    resultsSection.style.display = 'block';
  } catch (err) {
    resultsList.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

// Search form event
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  debouncedSearch(searchInput.value);
});

// Real-time search
searchInput.addEventListener('input', e => {
  debouncedSearch(e.target.value);
});

const debouncedSearch = debounce((query) => {
  if (query.trim()) {
    fetchSearch(query);
  } else {
    resultsSection.style.display = 'none';
  }
}, 400);

// Fetch trending content
async function fetchTrending() {
  trendingList.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const res = await fetch(`${API_BASE}/trending`);
    if (!res.ok) throw new Error('Failed to fetch trending');
    const data = await res.json();
    renderCards(trendingList, data.results || []);
  } catch (err) {
    trendingList.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

// Initial trending fetch
fetchTrending();

// Watchlist management
const WATCHLIST_KEY = 'movieradars_watchlist';
const watchlistSection = document.getElementById('watchlist-section');
const watchlistList = document.getElementById('watchlist-list');

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function isInWatchlist(item) {
  return getWatchlist().some(x => x.id === item.id && (x.media_type || (x.title ? 'movie' : 'tv')) === (item.media_type || (item.title ? 'movie' : 'tv')));
}

function addToWatchlist(item) {
  const list = getWatchlist();
  if (!isInWatchlist(item)) {
    list.push({...item, watched: false});
    saveWatchlist(list);
    renderWatchlist();
  }
}

function removeFromWatchlist(item) {
  let list = getWatchlist();
  list = list.filter(x => !(x.id === item.id && (x.media_type || (x.title ? 'movie' : 'tv')) === (item.media_type || (item.title ? 'movie' : 'tv'))));
  saveWatchlist(list);
  renderWatchlist();
}

function renderWatchlist() {
  const list = getWatchlist();
  if (!list.length) {
    watchlistList.innerHTML = '<div class="empty">Your watchlist is empty.</div>';
    return;
  }
  watchlistList.innerHTML = list.map(item => {
    const title = item.title || item.name || 'Untitled';
    const img = item.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
      : 'https://via.placeholder.com/160x240?text=No+Image';
    return `<div class="card">
      <img src="${img}" alt="${title}">
      <h3>${title}</h3>
      <p>${item.release_date || item.first_air_date || ''}</p>
      <button class="remove-btn">Remove</button>
      <button class="watched-btn" style="background:${item.watched ? '#2ecc40' : '#e50914'}">${item.watched ? 'Watched' : 'Mark as Watched'}</button>
    </div>`;
  }).join('');
  
  // Add handlers
  Array.from(watchlistList.getElementsByClassName('remove-btn')).forEach((btn, i) => {
    btn.onclick = () => removeFromWatchlist(list[i]);
  });
  Array.from(watchlistList.getElementsByClassName('watched-btn')).forEach((btn, i) => {
    btn.onclick = () => toggleWatched(list[i]);
  });
}

// On load, render watchlist
renderWatchlist();

// Elements
const paginationDiv = document.getElementById('pagination');

// Render pagination
function renderPagination(tmdbData, query) {
  paginationDiv.innerHTML = '';
  if (!tmdbData || !tmdbData.total_pages || tmdbData.total_pages <= 1) return;
  const page = tmdbData.page || 1;
  const total = Math.min(tmdbData.total_pages, 10); // Limit to 10 pages for demo
  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === page) btn.disabled = true;
    btn.onclick = () => fetchSearch(query, i);
    paginationDiv.appendChild(btn);
  }
}

// Modify fetchSearch to include pagination
async function fetchSearch(query, page = 1) {
  // ... existing code ...
  renderPagination(data.tmdb, query);
}