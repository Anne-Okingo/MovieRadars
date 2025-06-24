const API_BASE = 'http://localhost:8080/api';

// Elements
const trendingList = document.getElementById('trending-list');
const resultsSection = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const paginationDiv = document.getElementById('pagination');

// Modal elements
let detailModal = document.getElementById('detail-modal');
if (!detailModal) {
  detailModal = document.createElement('div');
  detailModal.id = 'detail-modal';
  detailModal.innerHTML = '<div class="modal-content" id="modal-content"></div>';
  document.body.appendChild(detailModal);
}
const modalContent = document.getElementById('modal-content');

detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) detailModal.style.display = 'none';
});

// Debounce helper
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

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

function toggleWatched(item) {
  let list = getWatchlist();
  list = list.map(x => {
    if (x.id === item.id && (x.media_type || (x.title ? 'movie' : 'tv')) === (item.media_type || (item.title ? 'movie' : 'tv'))) {
      return {...x, watched: !x.watched};
    }
    return x;
  });
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

// Fetch search results
async function fetchSearch(query, page = 1) {
  resultsList.innerHTML = '<div class="loading">Searching...</div>';
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    const tmdbResults = (data.tmdb && data.tmdb.results) || [];
    renderCards(resultsList, tmdbResults);
    // Pagination (if available)
    renderPagination(data.tmdb, query);
    resultsSection.style.display = 'block';
  } catch (err) {
    resultsList.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

// Render cards
function renderCards(container, items) {
  if (!items.length) {
    container.innerHTML = '<div class="empty">No results found.</div>';
    return;
  }
  container.innerHTML = items.map(item => {
    const title = item.title || item.name || 'Untitled';
    const img = item.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
      : 'https://via.placeholder.com/160x240?text=No+Image';
    const inList = isInWatchlist(item);
    return `<div class="card">
      <img src="${img}" alt="${title}">
      <h3>${title}</h3>
      <p>${item.release_date || item.first_air_date || ''}</p>
      <button class="watchlist-btn" style="background:${inList ? '#2ecc40' : '#e50914'}">${inList ? 'Remove from Watchlist' : 'Add to Watchlist'}</button>
    </div>`;
  }).join('');
  addCardClickHandlers(container, items);
  // Add watchlist button handlers
  Array.from(container.getElementsByClassName('watchlist-btn')).forEach((btn, i) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const item = items[i];
      if (isInWatchlist(item)) {
        removeFromWatchlist(item);
        btn.textContent = 'Add to Watchlist';
        btn.style.background = '#e50914';
      } else {
        addToWatchlist(item);
        btn.textContent = 'Remove from Watchlist';
        btn.style.background = '#2ecc40';
      }
    };
  });
}

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

// Debounced search handler
const debouncedSearch = debounce((query) => {
  if (query.trim()) {
    fetchSearch(query);
  } else {
    resultsSection.style.display = 'none';
  }
}, 400);

// Search form event
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  debouncedSearch(searchInput.value);
});

// Real-time search
searchInput.addEventListener('input', e => {
  debouncedSearch(e.target.value);
});

// Initial trending fetch
fetchTrending();

// Show details in modal
async function showDetails(item) {
  modalContent.innerHTML = '<div class="loading">Loading details...</div>';
  detailModal.style.display = 'flex';
  try {
    // Fetch details from backend (by TMDB id and type)
    const type = item.media_type || (item.title ? 'movie' : 'tv');
    const res = await fetch(`${API_BASE}/details?type=${type}&id=${item.id}`);
    if (!res.ok) throw new Error('Failed to fetch details');
    const data = await res.json();
    renderDetails(data);
  } catch (err) {
    modalContent.innerHTML = `<div class="error">${err.message}</div>`;
  }
}

function renderDetails(data) {
  const tmdb = data.tmdb || {};
  const omdb = data.omdb || {};
  const title = tmdb.title || tmdb.name || omdb.Title || 'Untitled';
  const img = tmdb.poster_path
    ? `https://image.tmdb.org/t/p/w300${tmdb.poster_path}`
    : (omdb.Poster && omdb.Poster !== 'N/A' ? omdb.Poster : 'https://via.placeholder.com/160x240?text=No+Image');
  const plot = tmdb.overview || omdb.Plot || 'No plot available.';
  const cast = tmdb.credits && tmdb.credits.cast ? tmdb.credits.cast.slice(0, 5).map(c => c.name).join(', ') : (omdb.Actors || '');
  const ratings = [
    tmdb.vote_average ? `TMDB: ${tmdb.vote_average}` : '',
    omdb.imdbRating ? `IMDB: ${omdb.imdbRating}` : '',
    (omdb.Ratings || []).find(r => r.Source === 'Rotten Tomatoes') ? `Rotten Tomatoes: ${(omdb.Ratings || []).find(r => r.Source === 'Rotten Tomatoes').Value}` : ''
  ].filter(Boolean).join(' | ');
  const release = tmdb.release_date || tmdb.first_air_date || omdb.Released || '';
  modalContent.innerHTML = `
    <button class="close-btn" onclick="document.getElementById('detail-modal').style.display='none'">&times;</button>
    <img src="${img}" alt="${title}" style="width:160px;height:240px;float:left;margin-right:1rem;">
    <h2>${title}</h2>
    <p><strong>Release:</strong> ${release}</p>
    <p><strong>Cast:</strong> ${cast}</p>
    <p><strong>Ratings:</strong> ${ratings}</p>
    <p><strong>Plot:</strong> ${plot}</p>
  `;
}

// Card click handler
function addCardClickHandlers(container, items) {
  Array.from(container.getElementsByClassName('card')).forEach((card, i) => {
    card.onclick = () => showDetails(items[i]);
  });
}

// On load, render watchlist
renderWatchlist(); 