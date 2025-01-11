document.addEventListener("DOMContentLoaded", () => {
    const searchHistory = document.getElementById("searchHistory");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const resetButton = document.getElementById("resetButton");
    const loader = document.getElementById("loader");
    const responseContainer = document.getElementById("response");
    const queueContainer = document.querySelector(".queue-container");


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

    // Formate Date
    function formatDate(timeStamp) {
        const date = new Date(timeStamp * 1000);
        return date.toLocaleDateString();
    }

    // Show loading animation
    function showLoader() {
        loader.style.display = "flex";
        responseContainer.style.display = "none";
    }

    // Hide loading animation
    function hideLoader() {
        loader.style.display = "none";
        responseContainer.style.display = "flex";
        responseContainer.scrollTo({
            top: 0
        });
    }

    // Handle fallback image
    function handleFallbackImage(img) {
        const fallbackImage = "./favicon.png";
        img.src = fallbackImage;
        return img;
    }

    // Set up to load podcast/episode images
    function handleImageLoad(limit) {
        const images = responseContainer.getElementsByTagName("img");
        let imagesToLoad = Math.min(images.length, limit);
        const fallbackImage = "./favicon.png";

        if(imagesToLoad === 0) {
            hideLoader();
            return;
        }

        Array.from(images).slice(0, limit).forEach(img => {
            img.onload = img.onerror = () => {
                imagesToLoad--;
                if (img.complete && !img.naturalWidth){
                    img = handleFallbackImage(img);
                }

                if (imagesToLoad === 0) {
                    hideLoader();
                    lazyLoadRemainingImages(limit);
                }
            }
        });
    }

    // Lazy load images after initialization
    function lazyLoadRemainingImages(start) {
        const remainingImages = Array.from(responseContainer.getElementsByTagName('img')).slice(start);
        
        const lazyLoadObserver = new IntersectionObserver(entities => {
            entities.forEach(entity => {
                if (entity.isIntersecting) {
                    let img = entity.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.onload = img.onerror = () => {
                            if(img.complete && !img.naturalWidth){
                                img = handleFallbackImage(img);
                            }
                            lazyLoadObserver.unobserve(img);
                        }
                    } else {
                        img = handleFallbackImage(img);
                        lazyLoadObserver.unobserve(img);
                    }
                }
            })
        });

        remainingImages.forEach(img => {
            lazyLoadObserver.observe(img);
        });
    }

    // Search Podcasts
    async function searchPodcast() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            console.log('Searched: ', searchTerm);
            saveSearchHistory(searchTerm);
            loadSearchHistory();
        } else {
            responseContainer.innerText = "Please enter a podcast title.";
            return; //why?
        }

        showLoader();  //for recap

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            console.log(response);
            console.log(data);

            responseContainer.textContent = " ";

            const titles = new Set();

            if (data.feeds && data.feeds.length > 0) {
                console.log('Results: ', data.feeds);
                data.feeds.forEach((podcast, index) => {
                    if (podcast.episodeCount > 0 && !titles.has(podcast.title)) {
                        titles.add(podcast.title);
                        const card = createCard(podcast);
                        responseContainer.appendChild(card);

                        if (index >= 25) {
                            card.querySelector('img').dataset.src = card.querySelector('img').src;    
                            card.querySelector('img').src = '';
                        }
                    }
                });

            } else {
                responseContainer.innerText = "There are no results!";
            }

            handleImageLoad(25);

        } catch (error) {
            responseContainer.innerText = `Error: ${error.message}`;
        }

       // remove
       // hideLoader(); //for recap
    }

    // Create Podcast Card
    function createCard(podcast) {
        const card = document.createElement("div");
        card.className = "card pointer";

        const img = document.createElement("img");
        img.src = podcast.image || "./favicon.png";
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
        pubDate.className = "pub-date";
        pubDate.innerText = `Newest Episode: ${podcast.newestItemPubdate ? formatDate(podcast.newestItemPubdate) : "N/A"}`;

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(episodeCount);
        content.appendChild(pubDate);

        card.appendChild(img);
        card.appendChild(content);

        card.addEventListener("click", () => loadEpisodes(podcast.itunesId, podcast.episodeCount));
       
        return card;
    }

    // Load Episodes
    async function loadEpisodes(feedId, count) {
        if (!feedId) return;
    
        showLoader();  //for recap
    
        try {
            const response = await fetch(`/api/episodes?feedId=${encodeURIComponent(feedId)}&max=${count}`);
            const data = await response.json();
            console.log(response);
            console.log(data);
    
            responseContainer.textContent = " ";
    
            if (data.items && data.items.length > 0) {
                console.log('Episodes: ', data.items);
                data.items.forEach((episode, index) => {
                    const card = createEpisodeCard(episode);
                    responseContainer.appendChild(card);

                    if (index >= 25) {
                        card.querySelector('img').dataset.src = card.querySelector('img').src;    
                        card.querySelector('img').src = '';
                    }
                });

            } else {
                responseContainer.innerText = "Oops! There are no results!";
            }

            handleImageLoad(25);

        } catch (error) {
            responseContainer.innerText = `Error: ${error.message}`;
        }
    
        // hideLoader(); //for recap
    }

    // Create Episode Card
    function createEpisodeCard(episode) {
        const card = document.createElement("div");
        card.className = "card pointer";
    
        const img = document.createElement("img");
        img.src = episode.image || episode.feedImage || "./favicon.png";
        img.alt = episode.title;
    
        const content = document.createElement("div");
        content.className = "card-content";
    
        const title = document.createElement("h3");
        title.innerText = episode.title;

        const iconContainer = document.createElement("div");
        iconContainer.className = "icon-container";

        const playBtnIcon = document.createElement("i");
        playBtnIcon.className = "fas fa-play-circle mr-10";
        playBtnIcon.title = "Play Podcast";
        playBtnIcon.addEventListener("click", () => {
            console.log("D2:Episode played", episode);
            loadPodcast(episode);
        });

        const queueBtnIcon = document.createElement("i");
        queueBtnIcon.className = "fas fa-list";
        queueBtnIcon.title = "Add to Queue";
        queueBtnIcon.addEventListener("click", () => {
            console.log("Try to Add Episode to queue", episode);
            addToQueue(episode);
        });
    
        const description = document.createElement("p");
        description.innerHTML = episode.description;
    
        const pubDate = document.createElement("p");
        pubDate.className = "pub-date-alt";
        pubDate.innerText = `Newest Episode: ${episode.newestItemPubdate ? formatDate(episode.newestItemPubdate) : "N/A"}`;

        iconContainer.appendChild(playBtnIcon);
        iconContainer.appendChild(queueBtnIcon);
        iconContainer.appendChild(pubDate);

        content.appendChild(title);
        content.appendChild(iconContainer);
        content.appendChild(description);
    
        card.appendChild(img);
        card.appendChild(content);
               
        return card;
    }

    // Set Queue Array
    let queueItems = [];


    // Add item to queue
    function addToQueue(episode) {
        const card = document.createElement("div");
        card.className = "queue-item";

        const img = document.createElement("img");
        img.src = episode.image || episode.feedImage || "./favicon.png";
        img.alt = episode.title;

        const content = document.createElement("div");
        content.className = "queue-content";

        const title = document.createElement("h3");
        title.innerText = episode.title;

        const iconContainer = document.createElement("div");
        iconContainer.className = "icon-container";

        const playBtnIcon = document.createElement("i");
        playBtnIcon.className = "fas fa-play-circle";
        playBtnIcon.title = "Play Podcast";
        playBtnIcon.addEventListener("click", () => {
            console.log("D2:Episode played", episode);
            loadPodcast(episode);
        });

        const removeBtnIcon = document.createElement("i");
        removeBtnIcon.className = "fas fa-trash-alt";
        removeBtnIcon.title = "Remove from Queue";
        removeBtnIcon.addEventListener("click", () => {
            console.log("Episode removed", episode);
            removeFromQueue(episode);
        });

        iconContainer.appendChild(playBtnIcon);
        iconContainer.appendChild(removeBtnIcon);

        content.appendChild(title);
        content.appendChild(iconContainer);

        card.appendChild(img);
        card.appendChild(content);
        
        queueContainer.appendChild(card);
        saveQueueItems(episode);
    }

    // Remove item from queue
    function removeFromQueue(episode) {
        queueItems = queueItems.filter(item => item.title !== episode.title);
        localStorage.setItem("queue", JSON.stringify(queueItems));

        const queueElements = document.querySelectorAll(".queue-item");
        queueElements.forEach(item => {
            const title = item.querySelector("h3").innerText;
            if (title === episode.title) item.remove();
        });
    }

    // Save items to queue
    function saveQueueItems(episode) {
        queueItems.push(episode);
        localStorage.setItem("queue", JSON.stringify(queueItems));
    }

    // Load saved queue UI
    function loadQueueItems() {
        const savedQueue = JSON.parse(localStorage.getItem("queue"));
        if (savedQueue) {
            savedQueue.forEach(episode => addToQueue(episode));
        }
    }


    //navigation
    const searchLink = document.getElementById("searchLink");
    const listenLink = document.getElementById("listenLink");
    const searchContainer = document.querySelector(".search-container");
    const mainContainer = document.querySelector(".main-container");
    const playerContainer = document.querySelector(".player-container");
    
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

    //Player
    const image = document.getElementById("image");
    const title = document.getElementById("title");
    const datePublished = document.getElementById("datePublished");
    const player = document.getElementById("player");
    const currentTimeEl = document.getElementById("current-time");
    const durationEl = document.getElementById("duration");
    const progress = document.getElementById("progress");
    const progressContainer = document.querySelector(".progress-container");
    const playBtn = document.getElementById("play");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");

    let isPlaying = false;

    // Play
    function playPodcast() {
        isPlaying = true;
        playBtn.classList.replace("fa-play", "fa-pause");
        playBtn.setAttribute("title", "Pause");
        player.play();
    }

    // Pause
    function pausePodcast() {
        isPlaying = false;
        playBtn.classList.replace("fa-pause", "fa-play"); 
        playBtn.setAttribute("title", "Play");
        player.pause();  
    }

    // Play or Pause Event Listener
    playBtn.addEventListener("click", () => (isPlaying ? pausePodcast() : playPodcast()));

    // Update Podcast container
    function loadPodcast(episode) {
        currentTimeEl.style.display = "none";
        durationEl.style.display = "none";
        title.textContent = episode.title;
        datePublished.textContent = `Published: ${episode.datePublished ? formatDate(episode.datePublished) : "N/A"}`;
        player.src = episode.enclosureUrl;
        image.src = episode.image || episode.feedImage || "./favicon.png";

        // Reset player
        player.currentTime = 0;
        progress.classList.add("loading");
        currentTimeEl.textContent = "00:00";

        player.addEventListener("loadedmetadata", () => {
            const duration = player.duration;
            currentTimeEl.style.display = "block";
            durationEl.style.display = "block";
            console.log('D1: Metadata loaded, duration:', duration);
            formatTime(duration, durationEl);
            progress.classList.remove("loading");
            playPodcast();
        })
    }

    // previous song
    // function prevSong() {
    //     songIndex--;
    //     if(songIndex < 0) {
    //         songIndex = songs.length - 1;
    //     }
    //     loadSong(songs[songIndex]);
    //     playSong();
    // }

    // previous song
    // function nextSong() {
    //     songIndex++;
    //     if(songIndex > songs.length - 1) {
    //         songIndex = 0;
    //     }
    //     loadSong(songs[songIndex]);
    //     playSong();
    // }

    // Load the first song
    // loadSong(songs[songIndex]);

    // Format Time
    function formatTime(time, element) {
        // calculate specific times
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600)/60);
        let seconds = Math.floor(time % 60);

        // format seconds time
        if(seconds < 10) seconds = `0${seconds}`;

        // format minutes time
        const formattedMinutes = hours > 0 && minutes < 10 ? `0${minutes}` : minutes;

        // Display time in horurs:minutes:seconds format
        if (time) {
            element.textContent = hours > 0
                ? `${hours}:${formattedMinutes}:${seconds}`
                : `${minutes}:${seconds}`;
        }
    }

    // Skip forward/backward 15 seconds
    function skipTime(amount) {
        player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + amount));
    }

    // Update Progress Bar & Time
    function updateProgressBar(e) {
        // if (isPlaying) {
            const { duration, currentTime } = e.srcElement;
            // Update progress bar width
            const progressPercent = (currentTime / duration) * 100;
            progress.style.width = `${progressPercent}%`;

            // Format time
            formatTime(duration, durationEl);
            formatTime(currentTime, currentTimeEl);
            // const durationMinutes = Math.floor(duration / 60);
            // let durationSeconds = Math.floor(duration % 60);
            // if (durationSeconds < 10) {
            //     durationSeconds = `0${durationSeconds}`;
            // }
            // // Delay switching duration Element to avoid NaN
            // if (durationSeconds) {
            //     durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
            // }
            // const currentMinutes = Math.floor(currentTime / 60);
            // let currentSeconds = Math.floor(currentTime % 60);
            // if (currentSeconds < 10) {
            //     currentSeconds = `0${currentSeconds}`;
            // }
            // currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
        // }
    }

    // Set Progress Bar
    function setProgressBar(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const { duration } = player;
        player.currentTime = (clickX / width) * duration;
    }

    // Event Listeners
    player.addEventListener("timeupdate", updateProgressBar);
    progressContainer.addEventListener("click", setProgressBar);
    prevBtn.addEventListener("click", () => skipTime(-15));
    nextBtn.addEventListener("click", () => skipTime(15));

    // Check if screen width is less than 767px
    function isMobileDevice() {
        return window.innerWidth < 767;
    }

    // Save the player state to local storage every 5 seconds
    setInterval(() => {
        if(isPlaying){
            const playerState = {
                title: title.textContent,
                datePublished: datePublished.textContent,
                currentTime: player.currentTime,
                duration: player.duration,
                image: image.src,
                src: player.src
            }
            localStorage.setItem("playerState", JSON.stringify(playerState));
        }
    }, 5000);

    // Load the player state from local storage
    function loadPlayerState() {
        const savedState = JSON.parse(localStorage.getItem("playerState"));
        if (savedState) {
            title.textContent = savedState.title;
            datePublished.textContent = savedState.datePublished;
            player.src = savedState.src;
            image.src = savedState.image;
            player.currentTime = savedState.currentTime;
            formatTime(savedState.currentTime, currentTimeEl);
            player.duration = savedState.duration;
            formatTime(savedState.duration, durationEl);
            progress.style.width = `${(savedState.currentTime / savedState.duration) * 100}%`;      
           
            if (isMobileDevice()) navigateToPlayer();
        }
    }

    // On Startup
    loadPlayerState();
    loadQueueItems();
});


// Helper functions : player JS part 3
    // Check if screen width is less than 767px
    // function isMobileDevice() {
    //     return window.innerWidth < 767;
    // }

//~ Mobile UI container */