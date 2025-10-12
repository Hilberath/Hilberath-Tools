// Hilberath Utilities - Main JavaScript
class UtilitiesApp {
  constructor() {
    this.tools = [];
    this.filteredTools = [];
    this.favorites = new Set();
    this.currentLanguage = "de";
    this.currentTheme = "dark";
    this.currentScreenshotIndex = 0;
    this.searchTimeout = null;

    this.init();
  }

  async init() {
    await this.loadData();
    this.loadSettings();
    this.setupEventListeners();
    this.setupFullscreenModal();
    this.setupLegendToggle();
    this.setupPrivacyModal();
    this.renderTools();
    await this.updateLanguage();
    this.updateTheme();
  }

  async loadData() {
    try {
      const response = await fetch("data/tools.json");
      const data = await response.json();
      this.tools = data.tools;
      this.filteredTools = [...this.tools];
      this.populateFilters();
    } catch (error) {
      console.error("Fehler beim Laden der Tools-Daten:", error);
      this.showError("Fehler beim Laden der Tools-Daten");
    }
  }

  loadSettings() {
    // Load theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }

    // Load language preference
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      this.currentLanguage = savedLanguage;
    }

    // Load favorites
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      this.favorites = new Set(JSON.parse(savedFavorites));
    }
  }

  saveSettings() {
    localStorage.setItem("theme", this.currentTheme);
    localStorage.setItem("language", this.currentLanguage);
    localStorage.setItem("favorites", JSON.stringify([...this.favorites]));
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }

    // Language selector
    const languageSelect = document.getElementById("languageSelect");
    if (languageSelect) {
      languageSelect.value = this.currentLanguage;
      languageSelect.addEventListener("change", (e) => this.changeLanguage(e.target.value));
    }

    // Search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
      searchInput.addEventListener("keydown", (e) => this.handleSearchKeydown(e));
    }

    // Filters
    const categoryFilter = document.getElementById("categoryFilter");
    const platformFilter = document.getElementById("platformFilter");
    const developerFilter = document.getElementById("developerFilter");

    if (categoryFilter) {
      categoryFilter.addEventListener("change", () => this.applyFilters());
    }
    if (platformFilter) {
      platformFilter.addEventListener("change", () => this.applyFilters());
    }
    if (developerFilter) {
      developerFilter.addEventListener("change", () => this.applyFilters());
    }

    // Favorites toggle
    const favoritesToggle = document.getElementById("favoritesToggle");
    if (favoritesToggle) {
      favoritesToggle.addEventListener("click", () => this.toggleFavorites());
    }

    // Modal close
    const modalClose = document.getElementById("modalClose");
    const modal = document.getElementById("toolModal");
    if (modalClose) {
      modalClose.addEventListener("click", () => this.closeModal());
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.classList.contains("modal-overlay")) {
          this.closeModal();
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
        this.hideSearchSuggestions();
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      const searchInput = document.getElementById("searchInput");
      const suggestionsContainer = document.getElementById("searchSuggestions");

      if (searchInput && suggestionsContainer && !searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        this.hideSearchSuggestions();
      }
    });
  }

  populateFilters() {
    const categories = [...new Set(this.tools.map((tool) => tool.category))].sort();
    const platforms = [...new Set(this.tools.flatMap((tool) => tool.platforms))].sort();
    const developers = [...new Set(this.tools.map((tool) => tool.developer))].sort();

    this.populateSelect("categoryFilter", categories);
    this.populateSelect("platformFilter", platforms);
    this.populateSelect("developerFilter", developers);
  }

  populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options except the first one
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      select.appendChild(optionElement);
    });
  }

  handleSearch(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.showSearchSuggestions(query);
      this.applyFilters();
    }, 300);
  }

  showSearchSuggestions(query) {
    const suggestionsContainer = document.getElementById("searchSuggestions");
    if (!suggestionsContainer) return;

    if (!query || query.length < 2) {
      suggestionsContainer.style.display = "none";
      return;
    }

    // Finde Tools, deren Namen den Suchbegriff enthalten
    const matchingTools = this.tools.filter((tool) => tool.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5); // Maximal 5 Vorschläge

    if (matchingTools.length === 0) {
      suggestionsContainer.style.display = "none";
      return;
    }

    // Erstelle Vorschläge
    suggestionsContainer.innerHTML = matchingTools.map((tool) => `<div class="suggestion-item" data-tool-name="${tool.name}">${tool.name}</div>`).join("");

    // Event Listener für Vorschläge hinzufügen
    suggestionsContainer.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        const toolName = item.getAttribute("data-tool-name");
        document.getElementById("searchInput").value = toolName;
        suggestionsContainer.style.display = "none";
        this.applyFilters();
      });
    });

    suggestionsContainer.style.display = "block";
  }

  hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById("searchSuggestions");
    if (suggestionsContainer) {
      suggestionsContainer.style.display = "none";
    }
  }

  handleSearchKeydown(e) {
    const suggestionsContainer = document.getElementById("searchSuggestions");
    if (!suggestionsContainer || suggestionsContainer.style.display === "none") {
      return;
    }

    const suggestions = suggestionsContainer.querySelectorAll(".suggestion-item");
    const currentActive = suggestionsContainer.querySelector(".suggestion-item.active");
    let activeIndex = -1;

    if (currentActive) {
      activeIndex = Array.from(suggestions).indexOf(currentActive);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
        this.setActiveSuggestion(suggestions, activeIndex);
        break;
      case "ArrowUp":
        e.preventDefault();
        activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
        this.setActiveSuggestion(suggestions, activeIndex);
        break;
      case "Enter":
        e.preventDefault();
        if (currentActive) {
          const toolName = currentActive.getAttribute("data-tool-name");
          document.getElementById("searchInput").value = toolName;
          this.hideSearchSuggestions();
          this.applyFilters();
        }
        break;
      case "Escape":
        this.hideSearchSuggestions();
        break;
    }
  }

  setActiveSuggestion(suggestions, index) {
    suggestions.forEach((suggestion) => suggestion.classList.remove("active"));
    if (suggestions[index]) {
      suggestions[index].classList.add("active");
    }
  }

  applyFilters() {
    const searchQuery = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const categoryFilter = document.getElementById("categoryFilter")?.value || "";
    const platformFilter = document.getElementById("platformFilter")?.value || "";
    const developerFilter = document.getElementById("developerFilter")?.value || "";
    const showFavorites = document.getElementById("favoritesToggle")?.classList.contains("active") || false;

    this.filteredTools = this.tools.filter((tool) => {
      // Search filter - nur auf Tool-Namen
      const matchesSearch = !searchQuery || tool.name.toLowerCase().includes(searchQuery);

      // Category filter
      const matchesCategory = !categoryFilter || tool.category === categoryFilter;

      // Platform filter
      const matchesPlatform = !platformFilter || tool.platforms.includes(platformFilter);

      // Developer filter
      const matchesDeveloper = !developerFilter || tool.developer === developerFilter;

      // Favorites filter
      const matchesFavorites = !showFavorites || this.favorites.has(tool.id);

      return matchesSearch && matchesCategory && matchesPlatform && matchesDeveloper && matchesFavorites;
    });

    this.renderTools();
  }

  toggleFavorites() {
    const favoritesToggle = document.getElementById("favoritesToggle");
    if (favoritesToggle) {
      favoritesToggle.classList.toggle("active");
      this.applyFilters();
    }
  }

  toggleFavorite(toolId) {
    if (this.favorites.has(toolId)) {
      this.favorites.delete(toolId);
    } else {
      this.favorites.add(toolId);
    }

    this.saveSettings();
    this.renderTools(); // Re-render to update favorite icons
  }

  renderTools() {
    const toolsGrid = document.getElementById("toolsGrid");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const noResults = document.getElementById("noResults");

    if (!toolsGrid) return;

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }

    // Clear existing tools
    toolsGrid.innerHTML = "";

    if (this.filteredTools.length === 0) {
      if (noResults) {
        // Check if favorites filter is active
        const showFavorites = document.getElementById("favoritesToggle")?.classList.contains("active") || false;

        if (showFavorites) {
          // Show favorites-specific message
          const titleElement = noResults.querySelector('[data-translate="no-results-title"]');
          const descElement = noResults.querySelector('[data-translate="no-results-desc"]');

          if (titleElement) {
            titleElement.setAttribute("data-translate", "no-favorites-title");
            titleElement.textContent = this.currentLanguage === "de" ? "Noch keine Favoriten" : "No favorites yet";
          }

          if (descElement) {
            descElement.setAttribute("data-translate", "no-favorites-desc");
            descElement.textContent = this.currentLanguage === "de" ? "Du hast noch kein Tool zu den Favoriten hinzugefügt. Klicke auf das Herz-Icon eines Tools, um es zu favorisieren." : "You haven't added any tools to favorites yet. Click on the heart icon of a tool to favorite it.";
          }
        } else {
          // Show regular no results message
          const titleElement = noResults.querySelector("[data-translate]");
          const descElement = noResults.querySelector('[data-translate="no-results-desc"]');

          if (titleElement && titleElement.getAttribute("data-translate").includes("favorites")) {
            titleElement.setAttribute("data-translate", "no-results-title");
            titleElement.textContent = this.currentLanguage === "de" ? "Keine Tools gefunden" : "No tools found";
          }

          if (descElement && descElement.getAttribute("data-translate").includes("favorites")) {
            descElement.setAttribute("data-translate", "no-results-desc");
            descElement.textContent = this.currentLanguage === "de" ? "Versuche andere Suchbegriffe oder Filter." : "Try different search terms or filters.";
          }
        }

        noResults.style.display = "block";
      }
      return;
    }

    if (noResults) {
      noResults.style.display = "none";
    }

    // Update tools counter
    this.updateToolsCounter();

    // Sort tools alphabetically
    const sortedTools = [...this.filteredTools].sort((a, b) => a.name.localeCompare(b.name));

    // Render tools with lazy loading
    sortedTools.forEach((tool, index) => {
      const toolCard = this.createToolCard(tool);
      toolCard.style.animationDelay = `${index * 0.1}s`;
      toolCard.classList.add("fade-in");
      toolsGrid.appendChild(toolCard);
    });
  }

  createToolCard(tool) {
    const card = document.createElement("div");
    const personalUsageClass = tool.personalUsage ? "personal-usage" : "";
    card.className = `tool-card ${personalUsageClass}`;
    card.addEventListener("click", () => this.openModal(tool));

    const isFavorite = this.favorites.has(tool.id);
    const favoriteClass = isFavorite ? "favorite" : "";

    card.innerHTML = `
            <div class="favorite-icon ${isFavorite ? "favorited" : ""}" title="${isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}" data-tool-id="${tool.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </div>
            <div class="tool-card-header">
                <img src="${tool.logo}" alt="${tool.name}" class="tool-logo" loading="lazy">
                <div class="tool-info">
                    <h3>${tool.name}</h3>
                    <span class="tool-category">${tool.category}</span>
                </div>
            </div>
            <p class="tool-description">${typeof tool.shortDescription === "object" ? tool.shortDescription[this.currentLanguage] || tool.shortDescription.de : tool.shortDescription}</p>
            <div class="tool-footer">
                <div class="tool-platforms">
                    ${tool.platforms.map((platform) => `<img src="assets/img/svg/${platform}.svg" alt="${platform}" class="platform-icon" title="${platform}">`).join("")}
                </div>
            </div>
        `;

    // Add event listener for favorite icon
    const favoriteIcon = card.querySelector(".favorite-icon");
    if (favoriteIcon) {
      favoriteIcon.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent opening modal
        this.toggleFavorite(tool.id);
      });
    }

    return card;
  }

  openModal(tool) {
    const modal = document.getElementById("toolModal");
    if (!modal) return;

    this.currentScreenshotIndex = 0;
    this.populateModal(tool);
    this.updateLanguage();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  populateModal(tool) {
    // Basic info
    document.getElementById("modalLogo").src = tool.logo;
    document.getElementById("modalLogo").alt = tool.name;
    document.getElementById("modalTitle").textContent = tool.name;
    document.getElementById("modalDeveloper").textContent = tool.developer;
    document.getElementById("modalCategory").textContent = tool.category;
    document.getElementById("modalReleaseDate").textContent = this.formatDate(tool.releaseDate);
    document.getElementById("modalLicense").textContent = tool.license;
    // Handle multilingual descriptions
    const description = typeof tool.description === "object" ? tool.description[this.currentLanguage] || tool.description.de : tool.description;
    document.getElementById("modalDescription").textContent = description;

    // Platforms
    const platformsContainer = document.getElementById("modalPlatforms");
    platformsContainer.innerHTML = tool.platforms
      .map(
        (platform) =>
          `<span class="platform-badge">
                <img src="assets/img/svg/${platform}.svg" alt="${platform}">
                ${platform}
            </span>`
      )
      .join("");

    // Pricing
    const pricingContainer = document.getElementById("modalPricing");
    const pricingTranslations = {
      Free: "free",
      Subscription: "subscription",
      "one-time-payment": "one-time-payment",
      Trial: "trial",
    };
    pricingContainer.innerHTML = tool.pricing
      .map((price) => {
        const translationKey = pricingTranslations[price] || price.toLowerCase().replace(/\s+/g, "-");
        const modifierClass = `pricing-badge--${translationKey}`;
        return `<span class="pricing-badge ${modifierClass}" data-translate="${translationKey}">${price}</span>`;
      })
      .join("");

    // Screenshots
    this.renderScreenshots(tool.screenshots);

    // Links
    this.renderLinks(tool.links);
  }

  renderScreenshots(screenshots) {
    const screenshotsContainer = document.getElementById("modalScreenshots");
    if (!screenshots || screenshots.length === 0) {
      screenshotsContainer.innerHTML = "";
      return;
    }

    screenshotsContainer.innerHTML = `
            <div class="screenshot-header">
                <h3 data-translate="screenshots">Screenshots</h3>
                <p class="screenshot-description" data-translate="screenshot-click-hint">Klicken Sie auf das Bild für Vollbild-Ansicht</p>
            </div>
            <div class="screenshot-slider">
                <img src="${screenshots[0]}" alt="Screenshot" id="screenshotImage" class="screenshot-clickable" style="cursor: pointer;" onclick="app.openFullscreenModal('${screenshots[0]}')">
                ${
                  screenshots.length > 1
                    ? `
                    <button class="screenshot-nav prev" onclick="app.previousScreenshot()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15,18 9,12 15,6"></polyline>
                        </svg>
                    </button>
                    <button class="screenshot-nav next" onclick="app.nextScreenshot()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                    </button>
                    `
                    : ""
                }
            </div>
        `;
  }

  renderLinks(links) {
    const linksContainer = document.getElementById("modalLinks");
    if (!links) {
      linksContainer.innerHTML = "";
      return;
    }

    const linkTypes = {
      website: { icon: "website.svg", label: "website" },
      github: { icon: "github.svg", label: "github" },
      documentation: { icon: "doku.svg", label: "documentation" },
      "app-store-ios": { icon: "apple.svg", label: "app-store-ios" },
      "app-store-android": { icon: "android.svg", label: "app-store-android" },
    };

    linksContainer.innerHTML = Object.entries(links)
      .filter(([key, url]) => url && linkTypes[key])
      .map(([key, url]) => {
        const linkType = linkTypes[key];
        return `
                    <a href="${url}" target="_blank" rel="noopener" class="link-item">
                        <img src="assets/img/svg/${linkType.icon}" alt="${linkType.label}">
                        <span data-translate="${linkType.label}">${linkType.label}</span>
                    </a>
                `;
      })
      .join("");
  }

  previousScreenshot() {
    const currentTool = this.getCurrentModalTool();
    if (!currentTool || !currentTool.screenshots) return;

    this.currentScreenshotIndex = (this.currentScreenshotIndex - 1 + currentTool.screenshots.length) % currentTool.screenshots.length;
    this.updateScreenshot();
  }

  nextScreenshot() {
    const currentTool = this.getCurrentModalTool();
    if (!currentTool || !currentTool.screenshots) return;

    this.currentScreenshotIndex = (this.currentScreenshotIndex + 1) % currentTool.screenshots.length;
    this.updateScreenshot();
  }

  updateScreenshot() {
    const screenshotImage = document.getElementById("screenshotImage");
    const currentTool = this.getCurrentModalTool();

    if (screenshotImage && currentTool && currentTool.screenshots) {
      const currentScreenshotSrc = currentTool.screenshots[this.currentScreenshotIndex];
      screenshotImage.src = currentScreenshotSrc;
      screenshotImage.onclick = () => this.openFullscreenModal(currentScreenshotSrc);
    }
  }

  getCurrentModalTool() {
    const modalTitle = document.getElementById("modalTitle");
    if (!modalTitle) return null;

    const toolName = modalTitle.textContent;
    return this.tools.find((tool) => tool.name === toolName);
  }

  closeModal() {
    const modal = document.getElementById("toolModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.updateTheme();
    this.saveSettings();
  }

  updateTheme() {
    document.documentElement.setAttribute("data-theme", this.currentTheme);

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) {
        if (this.currentTheme === "dark") {
          icon.innerHTML = `
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    `;
        } else {
          icon.innerHTML = `
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    `;
        }
      }
    }
  }

  changeLanguage(language) {
    this.currentLanguage = language;
    this.updateLanguage();
    this.saveSettings();
  }

  async updateLanguage() {
    try {
      const response = await fetch(`lang/${this.currentLanguage}.json`);
      const translations = await response.json();

      // Update all elements with data-translate attribute
      document.querySelectorAll("[data-translate]").forEach((element) => {
        const key = element.getAttribute("data-translate");
        if (translations[key]) {
          element.textContent = translations[key];
        }
      });

      // Update search placeholder
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.placeholder = translations.search || "Suche nach Tools...";
      }

      // Update tool descriptions in cards
      this.updateToolDescriptions();

      // Update filter options
      this.updateFilterOptions(translations);
    } catch (error) {
      console.error("Fehler beim Laden der Übersetzungen:", error);
    }
  }

  updateFilterOptions(translations) {
    const categoryFilter = document.getElementById("categoryFilter");
    const platformFilter = document.getElementById("platformFilter");
    const developerFilter = document.getElementById("developerFilter");

    if (categoryFilter && categoryFilter.firstElementChild) {
      categoryFilter.firstElementChild.textContent = translations["all-categories"] || "Alle Kategorien";
    }
    if (platformFilter && platformFilter.firstElementChild) {
      platformFilter.firstElementChild.textContent = translations["all-platforms"] || "Alle Plattformen";
    }
    if (developerFilter && developerFilter.firstElementChild) {
      developerFilter.firstElementChild.textContent = translations["all-developers"] || "Alle Entwickler";
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    if (this.currentLanguage === "de") {
      // DD.MM.YYYY format for German
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } else {
      // MM/DD/YYYY format for English
      return date.toLocaleDateString("en-US");
    }
  }

  showError(message) {
    console.error(message);
    // You could implement a toast notification here
  }

  updateToolsCounter() {
    const toolsCountElement = document.getElementById("toolsCount");
    if (toolsCountElement) {
      const count = this.filteredTools.length;
      toolsCountElement.textContent = `${count} Tools`;
    }
  }

  updateToolDescriptions() {
    // Update tool card descriptions
    document.querySelectorAll(".tool-card").forEach((card) => {
      const toolName = card.querySelector("h3").textContent;
      const tool = this.tools.find((t) => t.name === toolName);
      if (tool && tool.shortDescription) {
        const descriptionElement = card.querySelector(".tool-description");
        if (descriptionElement) {
          const description = typeof tool.shortDescription === "object" ? tool.shortDescription[this.currentLanguage] || tool.shortDescription.de : tool.shortDescription;
          descriptionElement.textContent = description;
        }
      }
    });

    // Update modal description if modal is open
    const modalDescription = document.getElementById("modalDescription");
    if (modalDescription && modalDescription.textContent) {
      const modalTitle = document.getElementById("modalTitle");
      if (modalTitle) {
        const currentTool = this.tools.find((tool) => tool.name === modalTitle.textContent);
        if (currentTool && currentTool.description) {
          const description = typeof currentTool.description === "object" ? currentTool.description[this.currentLanguage] || currentTool.description.de : currentTool.description;
          modalDescription.textContent = description;
        }
      }
    }
  }

  setupLegendToggle() {
    const legendToggle = document.getElementById("legendToggle");
    const legendPanel = document.getElementById("legendPanel");

    if (legendToggle && legendPanel) {
      legendToggle.addEventListener("click", () => {
        const isVisible = legendPanel.classList.contains("show");

        if (isVisible) {
          legendPanel.classList.remove("show");
          setTimeout(() => {
            legendPanel.style.display = "none";
          }, 400);
          const span = legendToggle.querySelector("span");
          if (span) {
            span.textContent = legendToggle.getAttribute("data-translate") === "legend" ? "Legende" : "Legend";
          }
        } else {
          legendPanel.style.display = "block";
          setTimeout(() => {
            legendPanel.classList.add("show");
          }, 10);
          const span = legendToggle.querySelector("span");
          if (span) {
            span.textContent = legendToggle.getAttribute("data-translate") === "legend" ? "Legende ausblenden" : "Hide Legend";
          }
        }
      });
    }
  }

  setupPrivacyModal() {
    const privacyModal = document.getElementById("privacyModal");
    const privacyModalClose = document.getElementById("privacyModalClose");

    // Close modal
    const closeModal = () => {
      if (privacyModal) {
        privacyModal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    };

    if (privacyModalClose) {
      privacyModalClose.addEventListener("click", closeModal);
    }

    // Close on overlay click
    if (privacyModal) {
      privacyModal.addEventListener("click", (e) => {
        if (e.target === privacyModal) {
          closeModal();
        }
      });
    }

    // Open modal when privacy link is clicked
    const privacyLink = document.querySelector('a[href="#privacy"]');
    console.log("Privacy link found:", !!privacyLink);
    if (privacyLink) {
      privacyLink.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Privacy link clicked, opening modal...");
        if (privacyModal) {
          privacyModal.style.display = "block";
          document.body.style.overflow = "hidden";
          console.log("Privacy modal should be visible now");
        } else {
          console.error("Privacy modal element not found!");
        }
      });
    } else {
      console.error("Privacy link not found!");
    }
  }

  // Fullscreen Modal Methods
  setupFullscreenModal() {
    // Fullscreen modal event listeners
    const fullscreenModal = document.getElementById("fullscreenModal");
    const fullscreenClose = document.getElementById("fullscreenClose");
    const fullscreenPrev = document.getElementById("fullscreenPrev");
    const fullscreenNext = document.getElementById("fullscreenNext");

    if (fullscreenClose) {
      fullscreenClose.addEventListener("click", () => this.closeFullscreenModal());
    }

    if (fullscreenPrev) {
      fullscreenPrev.addEventListener("click", () => this.previousFullscreenScreenshot());
    }

    if (fullscreenNext) {
      fullscreenNext.addEventListener("click", () => this.nextFullscreenScreenshot());
    }

    // Close on background click
    if (fullscreenModal) {
      fullscreenModal.addEventListener("click", (e) => {
        if (e.target === fullscreenModal) {
          this.closeFullscreenModal();
        }
      });
    }

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && fullscreenModal.classList.contains("active")) {
        this.closeFullscreenModal();
      }
    });
  }

  openFullscreenModal(imageSrc) {
    const fullscreenModal = document.getElementById("fullscreenModal");
    const fullscreenImage = document.getElementById("fullscreenImage");
    const fullscreenCounter = document.getElementById("fullscreenCounter");

    if (!fullscreenModal || !fullscreenImage) return;

    // Find current tool and screenshots
    const currentTool = this.tools.find((tool) => tool.screenshots && tool.screenshots.includes(imageSrc));

    if (!currentTool || !currentTool.screenshots) return;

    this.currentFullscreenScreenshots = currentTool.screenshots;
    this.currentFullscreenIndex = currentTool.screenshots.indexOf(imageSrc);

    // Set image and counter
    fullscreenImage.src = imageSrc;
    fullscreenCounter.textContent = `${this.currentFullscreenIndex + 1} / ${this.currentFullscreenScreenshots.length}`;

    // Show modal
    fullscreenModal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Update navigation buttons
    this.updateFullscreenNavigation();
  }

  closeFullscreenModal() {
    const fullscreenModal = document.getElementById("fullscreenModal");
    if (fullscreenModal) {
      fullscreenModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  previousFullscreenScreenshot() {
    if (this.currentFullscreenIndex > 0) {
      this.currentFullscreenIndex--;
      this.updateFullscreenImage();
    }
  }

  nextFullscreenScreenshot() {
    if (this.currentFullscreenIndex < this.currentFullscreenScreenshots.length - 1) {
      this.currentFullscreenIndex++;
      this.updateFullscreenImage();
    }
  }

  updateFullscreenImage() {
    const fullscreenImage = document.getElementById("fullscreenImage");
    const fullscreenCounter = document.getElementById("fullscreenCounter");

    if (fullscreenImage && this.currentFullscreenScreenshots) {
      fullscreenImage.src = this.currentFullscreenScreenshots[this.currentFullscreenIndex];
      fullscreenCounter.textContent = `${this.currentFullscreenIndex + 1} / ${this.currentFullscreenScreenshots.length}`;
      this.updateFullscreenNavigation();
    }
  }

  updateFullscreenNavigation() {
    const fullscreenPrev = document.getElementById("fullscreenPrev");
    const fullscreenNext = document.getElementById("fullscreenNext");

    if (fullscreenPrev && fullscreenNext && this.currentFullscreenScreenshots) {
      fullscreenPrev.disabled = this.currentFullscreenIndex === 0;
      fullscreenNext.disabled = this.currentFullscreenIndex === this.currentFullscreenScreenshots.length - 1;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new UtilitiesApp();
});

// Service Worker registration for PWA functionality (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}
