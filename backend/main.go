package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	tmdbAPIKey = os.Getenv("TMDB_API_KEY")
	omdbAPIKey = os.Getenv("OMDB_API_KEY")
)

func main() {
	if tmdbAPIKey == "" || omdbAPIKey == "" {
		log.Fatal("API keys not set in environment variables")
	}

	http.HandleFunc("/api/search", handleSearch)
	http.HandleFunc("/api/trending", handleTrending)
	http.HandleFunc("/api/details", handleDetails)

	// Serve static files from ../frontend at root
	fs := http.FileServer(http.Dir("../frontend"))
	http.Handle("/", fs)

	fmt.Println("Backend running on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	page := r.URL.Query().Get("page")
	if query == "" {
		http.Error(w, "Missing search query", http.StatusBadRequest)
		return
	}
	if page == "" {
		page = "1"
	}

	// TMDB search with pagination
	tmdbURL := fmt.Sprintf("https://api.themoviedb.org/3/search/multi?api_key=%s&query=%s&page=%s", tmdbAPIKey, query, page)
	tmdbResp, err := http.Get(tmdbURL)
	if err != nil {
		http.Error(w, "TMDB request failed", http.StatusBadGateway)
		return
	}
	defer tmdbResp.Body.Close()

	if tmdbResp.StatusCode != 200 {
		http.Error(w, "TMDB error", tmdbResp.StatusCode)
		return
	}

	var tmdbData map[string]interface{}
	if err := json.NewDecoder(tmdbResp.Body).Decode(&tmdbData); err != nil {
		http.Error(w, "Failed to decode TMDB response", http.StatusInternalServerError)
		return
	}

	// Optionally, fetch OMDB data for the first result (for demo)
	omdbData := map[string]interface{}{}
	if results, ok := tmdbData["results"].([]interface{}); ok && len(results) > 0 {
		first := results[0].(map[string]interface{})
		title := first["title"]
		if title == nil {
			title = first["name"]
		}
		if titleStr, ok := title.(string); ok {
			omdbURL := fmt.Sprintf("https://www.omdbapi.com/?apikey=%s&t=%s", omdbAPIKey, titleStr)
			omdbResp, err := http.Get(omdbURL)
			if err == nil && omdbResp.StatusCode == 200 {
				defer omdbResp.Body.Close()
				json.NewDecoder(omdbResp.Body).Decode(&omdbData)
			}
		}
	}

	resp := map[string]interface{}{
		"tmdb": tmdbData,
		"omdb": omdbData,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleTrending(w http.ResponseWriter, r *http.Request) {
	mediaType := r.URL.Query().Get("type")
	if mediaType != "movie" && mediaType != "tv" {
		mediaType = "all"
	}
	tmdbURL := fmt.Sprintf("https://api.themoviedb.org/3/trending/%s/week?api_key=%s", mediaType, tmdbAPIKey)
	client := &http.Client{Timeout: 10 * time.Second}
	tmdbResp, err := client.Get(tmdbURL)
	if err != nil {
		http.Error(w, "TMDB trending request failed", http.StatusBadGateway)
		return
	}
	defer tmdbResp.Body.Close()

	if tmdbResp.StatusCode != 200 {
		http.Error(w, "TMDB trending error", tmdbResp.StatusCode)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, tmdbResp.Body)
}

func handleDetails(w http.ResponseWriter, r *http.Request) {
	type_ := r.URL.Query().Get("type")
	id := r.URL.Query().Get("id")
	if type_ == "" || id == "" {
		http.Error(w, "Missing type or id", http.StatusBadRequest)
		return
	}

	// TMDB details with credits
	tmdbURL := fmt.Sprintf("https://api.themoviedb.org/3/%s/%s?api_key=%s&append_to_response=credits", type_, id, tmdbAPIKey)
	tmdbResp, err := http.Get(tmdbURL)
	if err != nil {
		http.Error(w, "TMDB details request failed", http.StatusBadGateway)
		return
	}
	defer tmdbResp.Body.Close()
	if tmdbResp.StatusCode != 200 {
		http.Error(w, "TMDB details error", tmdbResp.StatusCode)
		return
	}
	var tmdbData map[string]interface{}
	if err := json.NewDecoder(tmdbResp.Body).Decode(&tmdbData); err != nil {
		http.Error(w, "Failed to decode TMDB details", http.StatusInternalServerError)
		return
	}

	// OMDB details by title and year if available
	omdbData := map[string]interface{}{}
	title, _ := tmdbData["title"].(string)
	if title == "" {
		title, _ = tmdbData["name"].(string)
	}
	year := ""
	if y, ok := tmdbData["release_date"].(string); ok && len(y) >= 4 {
		year = y[:4]
	} else if y, ok := tmdbData["first_air_date"].(string); ok && len(y) >= 4 {
		year = y[:4]
	}
	if title != "" {
		omdbURL := fmt.Sprintf("https://www.omdbapi.com/?apikey=%s&t=%s&y=%s", omdbAPIKey, title, year)
		omdbResp, err := http.Get(omdbURL)
		if err == nil && omdbResp.StatusCode == 200 {
			defer omdbResp.Body.Close()
			json.NewDecoder(omdbResp.Body).Decode(&omdbData)
		}
	}

	resp := map[string]interface{}{
		"tmdb": tmdbData,
		"omdb": omdbData,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
