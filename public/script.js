document.addEventListener("DOMContentLoaded", () => {
    const searchHistory = document.getElementById("searchHistory");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const resetButton = document.getElementById("resetButton");
    const responseContainer = document.getElementById("response");

    // Reset search history
    function resetHistory() {
        searchHistory.innerHTML = "";
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Select a Previous Search";
        searchHistory.appendChild(option);
    }

    // Load the search history from local storage
    function loadSearchHistory() {
        const savedSearches = JSON.parse(localStorage.getItem("searchHistory")) || [];
        resetHistory();
        savedSearches.forEach(searchTerm => {
            const option = document.createElement("option");
            option.value = searchTerm;
            option.textContent = searchTerm;
            searchHistory.appendChild(option);
        })
    }

    // Save the search history to local storage : only for new items
    function saveSearchHistory(searchTerm) {
        let savedSearches = JSON.parse(localStorage.getItem("searchHistory")) || [];
        // savedSearches.push(searchTerm);
        // localStorage.setItem("searchHistory", JSON.stringify(savedSearches));
        if (!savedSearches.includes(searchTerm)) {
            savedSearches.push(searchTerm);
            localStorage.setItem("searchHistory", JSON.stringify(savedSearches));
        }
    }

    // Event listener for dropdown change
    searchHistory.addEventListener("change", () => {
        const selectedSearch = searchHistory.value;
        if (selectedSearch) {
            searchInput.value = selectedSearch;
            searchPodcast();
        }
    })

    // Event listener for search button, input
    searchButton.addEventListener("click", searchPodcast);
    searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            searchPodcast();
        }
    });

    // Event listener to reset search input
    searchInput.addEventListener('focus', () => {
        searchInput.value = '';
    })

    // Event listener for reset button
    resetButton.addEventListener("click", () => {
        localStorage.removeItem("searchHistory");
        resetHistory();
        searchInput.value = '';
    })

    // Load search history on page loads
    loadSearchHistory();

    // Search Podcasts
    async function searchPodcast() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            console.log('Searched: ', searchTerm);
            saveSearchHistory(searchTerm);
            loadSearchHistory();
        } else {
            responseContainer.innerText = "Pease enter a podcast title.";
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            console.log(response);
            console.log(data);

            responseContainer.textContent = "";

            if (data.feeds && data.feeds.length > 0) {
                console.log('Results: ', data);
            } else {
                responseContainer.innerText = "There are no results!";
            }
        } catch (error) {
            responseContainer.innerText = `Error: ${error.message}`;
        }
    }

    //navigation
    const searchLink = document.getElementById("searchLink");
    const listenLink = document.getElementById("listenLink");
    const searchContainer = document.querySelector(".search-container");
    const mainContainer = document.querySelector(".main-container");
    const playerContainer = document.querySelector(".player-container");
    const queueContainer = document.querySelector(".queue-container");

    searchLink.addEventListener("click", navigateToSearch());
    listenLink.addEventListener("click", navigateToPlayer());

    function navigateToSearch() {
        // searchContainer.style.display = "flex";
        // mainContainer.style.display = "flex";
        // playerContainer.style.display = "none";
        // queueContainer.style.display = "none";
        // searchLink.classList.add("selected");
        // listenLink.classList.remove("selected");
    }

    function navigateToPlayer() {
        // searchContainer.style.display = "none";
        // mainContainer.style.display = "none";
        // playerContainer.style.display = "flex";
        // queueContainer.style.display = "flex";
        // searchLink.classList.remove("selected");
        // listenLink.classList.add("selected");
    }

    // Create Podcast Card
    function createCard(podcast) {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = podcast.image || "./default-podcast.png";
        img.alt = podcast.title;

        const content = document.createElement("div");
        content.className = "card-content";

        const title = document.createElement("h3");
        title.innerText = podcast.title;

        const description = document.createElement("p");
        description.innerText = podcast.description;

        const episodeCount = document.createElement("p");
        episodeCount.className = "episode-count";
        episodeCount.innerText = `Episode ${podcast.episodeCount}`;

        const pubDate = document.createElement("p");
        
    }
});