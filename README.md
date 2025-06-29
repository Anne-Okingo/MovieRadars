# MovieRadars

A comprehensive Movie/TV Show Discovery Web App built with Go, JavaScript, HTML, and CSS.

## Overview
MovieRadars lets you search for movies and TV shows, view detailed information, manage your personal watchlist, and discover trending content. It integrates with TMDB and OMDB APIs for rich data and ratings.

## Features
- Real-time search for movies and TV shows (with debouncing)
- Detailed view: title, plot, cast, ratings (TMDB, IMDB, Rotten Tomatoes), release date, poster
- Personal watchlist: add/remove, mark as watched (stored in localStorage)
- Trending dashboard: popular movies and shows
- Genre-based filtering and category browsing (extensible)
- User ratings from multiple sources
- Recommendation engine (basic: based on watchlist genres)
- Responsive design for mobile and desktop
- Pagination for search results
- API error handling, loading states, and graceful fallbacks
- Secure API key management via environment variables

## Tech Stack
- **Backend:** Go (Golang) — API proxy, static file server, secure key management
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **APIs:** TMDB (The Movie Database), OMDB (Open Movie Database)

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Anne-Okingo/MovieRadars.git
cd MovieRadars
```

### 2. Get API Keys
Get your API keys from [TMDB](https://www.themoviedb.org/) and [OMDB](https://www.omdbapi.com/apikey.aspx).

### 3. Set API Keys as Environment Variables
**Important:** The backend reads API keys from environment variables. You must export them in your shell before running the backend. You can do this directly, or by using a `.env` file and loading it manually.

#### Option A: Export directly in your shell
```bash
export TMDB_API_KEY=your_tmdb_api_key
export OMDB_API_KEY=your_omdb_api_key
```

#### Option B: Use a `.env` file (optional, requires manual loading)
Create a file named `.env` in the `backend` directory with the following content (no `export` keyword):
```
TMDB_API_KEY=your_tmdb_api_key
OMDB_API_KEY=your_omdb_api_key
```
Then, load it in your shell before running the backend:
```bash
export $(grep -v '^#' .env | xargs)
```

### 4. Start the Backend (serves API and frontend)
```bash
cd backend
go run .
```
You should see: `Backend running on :8080...`

### 5. Open the App
Go to [http://localhost:8080](http://localhost:8080) in your browser.

## API Endpoints
- `/api/search?q=QUERY&page=PAGE` — Search for movies/TV shows
- `/api/trending?type=movie|tv|all` — Get trending content
- `/api/details?type=movie|tv&id=TMDB_ID` — Get detailed info (with ratings)

## Project Structure
```
MovieRadars/
  backend/         # Go backend (API + static file server)
  frontend/        # HTML, CSS, JS
    css/
    js/
```


## License
MIT
