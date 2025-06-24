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
	if query == "" {
		http.Error(w, "Missing search query", http.StatusBadRequest)
		return
	}

	// TMDB search
	tmdbURL := fmt.Sprintf("https://api.themoviedb.org/3/search/multi?api_key=%s&query=%s", tmdbAPIKey, query)
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

