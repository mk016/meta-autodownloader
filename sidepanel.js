document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  
  // Navigation
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Queue
  const textareaPrompts = document.getElementById("queue-prompts");
  const txtUpload = document.getElementById("txt-upload");
  const csvUpload = document.getElementById("csv-upload");
  const concurrentPrompts = document.getElementById("concurrent-prompts");
  const minDelay = document.getElementById("min-delay");
  const maxDelay = document.getElementById("max-delay");
  const activeCharSelect = document.getElementById("active-character-select");
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnClear = document.getElementById("btn-clear");
  const queueCounter = document.getElementById("queue-counter");
  const queueProgressBar = document.getElementById("queue-progress-bar");
  const queueListContainer = document.getElementById("queue-list-container");
  const globalStatusBadge = document.getElementById("global-status-badge");
  const globalStatusText = document.getElementById("global-status-text");

  // Media Type Pills
  const mediaTypePills = document.querySelectorAll("#media-type-pills .pill-btn");

  // Scraper
  const btnScan = document.getElementById("btn-scan");
  const btnAutoScrollScan = document.getElementById("btn-auto-scroll-scan");
  const btnDownloadSelected = document.getElementById("btn-download-selected");
  const btnDownloadAll = document.getElementById("btn-download-all");
  const selectAllMedia = document.getElementById("select-all-media");
  const foundMediaCount = document.getElementById("found-media-count");
  const selectedCountSpan = document.getElementById("selected-count");
  const totalScrapedCountSpan = document.getElementById("total-scraped-count");
  const scraperGallery = document.getElementById("scraper-gallery-grid");
  const toggleCanvasDownload = document.getElementById("toggle-canvas-download");
  const scraperFilterPills = document.querySelectorAll("#scraper-filter-pills .pill-btn");

  // History
  const historyListContainer = document.getElementById("history-list-container");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnResetCounter = document.getElementById("btn-reset-counter");

  // Characters
  const charNameInput = document.getElementById("char-name");
  const charDescInput = document.getElementById("char-desc");
  const btnAddCharacter = document.getElementById("btn-add-character");
  const charactersListContainer = document.getElementById("characters-list-container");

  // Settings
  const settingsFolder = document.getElementById("settings-folder");
  const settingsAutoRename = document.getElementById("settings-auto-rename");
  const settingsSequentialNaming = document.getElementById("settings-sequential-naming");
  const settingsCanvasDownload = document.getElementById("settings-canvas-download");
  const settingsDownloadDelay = document.getElementById("settings-download-delay");
  const btnExportData = document.getElementById("btn-export-data");
  const btnImportData = document.getElementById("btn-import-data");
  const btnResetSettings = document.getElementById("btn-reset-settings");

  // Theme
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  const themeIconDark = document.getElementById("theme-icon-dark");
  const themeIconLight = document.getElementById("theme-icon-light");

  // Stats
  const statGenerated = document.getElementById("stat-generated");
  const statDownloaded = document.getElementById("stat-downloaded");
  const statFailed = document.getElementById("stat-failed");
  const statCounter = document.getElementById("stat-counter");

  // Preview Modal
  const previewModal = document.getElementById("preview-modal");
  const previewCloseBtn = document.getElementById("preview-close-btn");
  const previewMediaContainer = document.getElementById("preview-media-container");
  const previewPrompt = document.getElementById("preview-prompt");
  const previewMeta = document.getElementById("preview-meta");
  const previewDownloadBtn = document.getElementById("preview-download-btn");

  // Drag & Drop
  const promptDropZone = document.getElementById("prompt-drop-zone");
  const dropOverlay = document.getElementById("drop-overlay");

  // Toast
  const toastContainer = document.getElementById("toast-container");

  // Template Chips
  const templateChips = document.querySelectorAll(".template-chip");

  // ==========================================
  // STATE
  // ==========================================
  let scrapedMediaList = [];
  let currentFilter = "all";
  let currentPreviewItem = null;
  let currentPreviewIndex = -1;

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));
      
      btn.classList.add("active");
      document.getElementById(tabId).classList.add("active");

      // Auto-scan if switching to Scraper tab
      if (tabId === "tab-scraper") {
        scanActivePageMedia();
      }
      // Load history if switching to History tab
      if (tabId === "tab-history") {
        renderHistory();
      }
    });
  });

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = "info") {
    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️"
    };
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ️"}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add("toast-dismiss");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // THEME TOGGLE
  // ==========================================
  function initTheme() {
    chrome.storage.local.get(["theme"], (data) => {
      const theme = data.theme || "dark";
      applyTheme(theme);
    });
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("theme-light");
      themeIconDark.classList.add("hidden");
      themeIconLight.classList.remove("hidden");
    } else {
      document.body.classList.remove("theme-light");
      themeIconDark.classList.remove("hidden");
      themeIconLight.classList.add("hidden");
    }
  }

  btnThemeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("theme-light");
    const newTheme = isLight ? "dark" : "light";
    applyTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
    showToast(`Switched to ${newTheme} mode`, "info");
  });

  initTheme();

  // ==========================================
  // STATS DASHBOARD
  // ==========================================
  function updateStatsUI() {
    chrome.storage.local.get(["stats", "downloadCounter"], (data) => {
      const stats = data.stats || {};
      statGenerated.textContent = stats.totalGenerated || 0;
      statDownloaded.textContent = stats.totalDownloaded || 0;
      statFailed.textContent = stats.totalFailed || 0;
      statCounter.textContent = data.downloadCounter || 0;
    });
  }

  // ==========================================
  // STORAGE AND STATE MANAGEMENT
  // ==========================================
  function updateUIFromStorage() {
    chrome.storage.local.get([
      "queue", 
      "currentIndex", 
      "status", 
      "settings", 
      "characters", 
      "activeCharacterId",
      "statusMessage"
    ], (data) => {
      const queue = data.queue || [];
      const currentIndex = data.currentIndex || 0;
      const status = data.status || "idle";
      const settings = data.settings || {};
      const characters = data.characters || [];
      const activeCharacterId = data.activeCharacterId || "none";
      const statusMessage = data.statusMessage || "";

      // 1. Update Settings
      if (settings.folderName) settingsFolder.value = settings.folderName;
      if (settings.autoRename !== undefined) settingsAutoRename.checked = settings.autoRename;
      if (settings.minDelay) minDelay.value = settings.minDelay;
      if (settings.maxDelay) maxDelay.value = settings.maxDelay;
      if (settings.concurrentPrompts) concurrentPrompts.value = settings.concurrentPrompts;
      if (settings.sequentialNaming !== undefined) settingsSequentialNaming.checked = settings.sequentialNaming;
      if (settings.useCanvasDownload !== undefined) {
        settingsCanvasDownload.checked = settings.useCanvasDownload;
        toggleCanvasDownload.checked = settings.useCanvasDownload;
      }
      if (settings.downloadDelay) settingsDownloadDelay.value = settings.downloadDelay;

      // Update media type pills
      if (settings.mediaType) {
        mediaTypePills.forEach(pill => {
          pill.classList.toggle("active", pill.getAttribute("data-type") === settings.mediaType);
        });
      }

      // 2. Update Character Dropdowns & List
      populateCharacterSelects(characters, activeCharacterId);
      renderCharactersList(characters, activeCharacterId);

      // 3. Update Global Status Badges
      updateStatusBadge(status, statusMessage);

      // 4. Update Queue Textarea if Idle
      if (status === "idle" && textareaPrompts.value === "" && queue.length > 0) {
        textareaPrompts.value = queue.join("\n\n");
      }

      // 5. Update Progress Bar and Counter
      const total = queue.length;
      queueCounter.textContent = `${total - currentIndex} pending • ${total} total`;
      
      const percent = total > 0 ? (currentIndex / total) * 100 : 0;
      queueProgressBar.style.width = `${percent}%`;

      // 6. Update Queue Control Buttons
      if (status === "running") {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnStart.innerHTML = `<svg class="btn-icon spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8z"/></svg> Processing...`;
        btnStart.classList.remove("btn-pulse");
      } else {
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnStart.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Start Queue`;
        if (queue.length > 0) {
          btnStart.classList.add("btn-pulse");
        } else {
          btnStart.classList.remove("btn-pulse");
        }
        
        if (status === "paused") {
          btnStart.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Resume Queue`;
        }
      }

      // 7. Render the Queue Checklist
      renderQueueList(queue, currentIndex);
    });

    // Update stats
    updateStatsUI();
  }

  // Monitor storage changes in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      updateUIFromStorage();
    }
  });

  // Initial load
  updateUIFromStorage();

  // Helper: Update badge visually
  function updateStatusBadge(status, statusMessage) {
    globalStatusBadge.className = "status-badge " + status;
    globalStatusText.textContent = statusMessage || (status.charAt(0).toUpperCase() + status.slice(1));
  }

  // Helper: Render the visual prompt queue checklist
  function renderQueueList(queue, currentIndex) {
    queueListContainer.innerHTML = "";
    if (queue.length === 0) {
      queueListContainer.innerHTML = `<div class="empty-state">Queue is empty. Enter or upload prompts above.</div>`;
      return;
    }

    queue.forEach((prompt, idx) => {
      const item = document.createElement("div");
      item.className = "queue-item";
      
      let statusClass = "pending";
      let statusText = "Pending";
      
      if (idx < currentIndex) {
        statusClass = "completed";
        statusText = "✓ Done";
        item.classList.add("completed");
      } else if (idx === currentIndex) {
        chrome.storage.local.get(["status"], (data) => {
          if (data.status === "running") {
            item.classList.add("active");
            const statusEl = item.querySelector(".queue-item-status");
            if (statusEl) {
              statusEl.textContent = "⌛ Generating...";
              statusEl.className = "queue-item-status active";
            }
          } else if (data.status === "paused") {
            const statusEl = item.querySelector(".queue-item-status");
            if (statusEl) {
              statusEl.textContent = "⏸ Paused";
              statusEl.className = "queue-item-status paused";
            }
          }
        });
      }
      
      item.innerHTML = `
        <span class="queue-item-text" title="${prompt}">${idx + 1}. ${prompt}</span>
        <span class="queue-item-status ${statusClass}">${statusText}</span>
      `;
      
      queueListContainer.appendChild(item);
      
      if (idx === currentIndex) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  // ==========================================
  // MEDIA TYPE SELECTOR
  // ==========================================
  mediaTypePills.forEach(pill => {
    pill.addEventListener("click", () => {
      mediaTypePills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      
      const selectedType = pill.getAttribute("data-type");
      chrome.storage.local.get(["settings"], (data) => {
        const settings = data.settings || {};
        settings.mediaType = selectedType;
        chrome.storage.local.set({ settings });
      });
      
      showToast(`Media type: ${selectedType}`, "info");
    });
  });

  // ==========================================
  // QUICK TEMPLATES
  // ==========================================
  templateChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const template = chip.getAttribute("data-template");
      const current = textareaPrompts.value.trim();
      if (current.length > 0) {
        textareaPrompts.value = current + "\n\n" + template;
      } else {
        textareaPrompts.value = template;
      }
      showToast("Template added!", "success");
    });
  });

  // ==========================================
  // BULK QUEUE ACTIONS
  // ==========================================
  
  function getPromptsFromInput() {
    return textareaPrompts.value
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  btnStart.addEventListener("click", () => {
    const prompts = getPromptsFromInput();
    if (prompts.length === 0) {
      showToast("Please enter at least one prompt!", "warning");
      return;
    }

    const newSettings = {
      folderName: settingsFolder.value.trim() || "meta-ai-downloads",
      autoRename: settingsAutoRename.checked,
      sequentialNaming: settingsSequentialNaming.checked,
      useCanvasDownload: settingsCanvasDownload.checked,
      downloadDelay: parseInt(settingsDownloadDelay.value) || 500,
      minDelay: parseInt(minDelay.value) || 20,
      maxDelay: parseInt(maxDelay.value) || 30,
      concurrentPrompts: parseInt(concurrentPrompts.value) || 1
    };

    // Get current media type
    const activeMediaPill = document.querySelector("#media-type-pills .pill-btn.active");
    newSettings.mediaType = activeMediaPill ? activeMediaPill.getAttribute("data-type") : "both";

    chrome.storage.local.get(["status", "currentIndex"], (current) => {
      let nextIndex = current.currentIndex || 0;
      if (current.status === "idle" || nextIndex >= prompts.length) {
        nextIndex = 0;
      }

      chrome.storage.local.set({
        queue: prompts,
        currentIndex: nextIndex,
        settings: newSettings
      }, () => {
        chrome.runtime.sendMessage({ action: "START_QUEUE" });
        showToast(`Queue started with ${prompts.length} prompts!`, "success");
      });
    });
  });

  btnPause.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "PAUSE_QUEUE" });
    showToast("Queue paused", "warning");
  });

  btnClear.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the queue and reset?")) {
      textareaPrompts.value = "";
      chrome.storage.local.set({
        queue: [],
        currentIndex: 0,
        status: "idle"
      }, () => {
        chrome.runtime.sendMessage({ action: "STOP_QUEUE" });
        showToast("Queue cleared", "info");
      });
    }
  });

  // Prompt Textarea Auto-save on blur
  textareaPrompts.addEventListener("blur", () => {
    const prompts = getPromptsFromInput();
    chrome.storage.local.get(["status"], (data) => {
      if (data.status === "idle") {
        chrome.storage.local.set({ queue: prompts });
      }
    });
  });

  // ==========================================
  // DRAG & DROP PROMPT IMPORT
  // ==========================================
  promptDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropOverlay.classList.add("visible");
  });

  promptDropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropOverlay.classList.remove("visible");
  });

  promptDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropOverlay.classList.remove("visible");
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".csv")) {
      showToast("Only .txt and .csv files supported!", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      
      if (file.name.endsWith(".csv")) {
        const rows = content.split(/\r?\n/);
        const prompts = [];
        rows.forEach(row => {
          let cell = row.trim();
          if (cell.startsWith('"') && cell.endsWith('"')) {
            cell = cell.slice(1, -1);
          } else if (cell.includes(",")) {
            const match = cell.match(/(\".*?\"|[^,]+)/);
            cell = match ? match[0].replace(/"/g, '').trim() : cell;
          }
          if (cell.length > 0) prompts.push(cell);
        });
        textareaPrompts.value = prompts.join("\n\n");
      } else {
        textareaPrompts.value = content;
      }
      
      const prompts = getPromptsFromInput();
      chrome.storage.local.set({ queue: prompts });
      showToast(`Loaded ${prompts.length} prompts from ${file.name}`, "success");
    };
    reader.readAsText(file);
  });

  // ==========================================
  // FILE IMPORT CONTROLLERS (TXT / CSV)
  // ==========================================
  txtUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      textareaPrompts.value = evt.target.result;
      const prompts = getPromptsFromInput();
      chrome.storage.local.set({ queue: prompts });
      showToast(`Loaded ${prompts.length} prompts from .txt`, "success");
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset
  });

  csvUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      const rows = content.split(/\r?\n/);
      const prompts = [];
      
      rows.forEach(row => {
        let cell = row.trim();
        if (cell.startsWith('"') && cell.endsWith('"')) {
          cell = cell.slice(1, -1);
        } else if (cell.includes(",")) {
          const match = cell.match(/(\".*?\"|[^,]+)/);
          cell = match ? match[0].replace(/"/g, '').trim() : cell;
        }
        if (cell.length > 0) prompts.push(cell);
      });
      
      textareaPrompts.value = prompts.join("\n\n");
      chrome.storage.local.set({ queue: prompts });
      showToast(`Loaded ${prompts.length} prompts from .csv`, "success");
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ==========================================
  // MEDIA SCRAPER GALLERY
  // ==========================================
  btnScan.addEventListener("click", () => {
    scanActivePageMedia();
  });

  btnAutoScrollScan.addEventListener("click", () => {
    autoScrollScan();
  });

  function scanActivePageMedia() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url || !activeTab.url.includes("meta.ai")) {
        scraperGallery.innerHTML = `<div class="empty-state">Please open <a href="https://www.meta.ai" target="_blank" style="color:var(--neon-blue);">meta.ai</a> to scan.</div>`;
        foundMediaCount.textContent = "0 found";
        return;
      }

      btnScan.innerHTML = `<svg class="btn-icon spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8z"/></svg> Scanning...`;

      chrome.tabs.sendMessage(activeTab.id, { action: "SCRAPE_PAGE" }, (response) => {
        btnScan.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> Scan Page`;
        
        if (chrome.runtime.lastError || !response || !response.media) {
          console.error("Scraping error:", chrome.runtime.lastError);
          scraperGallery.innerHTML = `<div class="empty-state">Failed to scan. Ensure you are on meta.ai and reload the page.</div>`;
          showToast("Scan failed. Reload meta.ai page.", "error");
          return;
        }

        scrapedMediaList = response.media;
        renderScraperGallery(scrapedMediaList);
        showToast(`Found ${scrapedMediaList.length} media items`, "success");
      });
    });
  }

  function autoScrollScan() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url || !activeTab.url.includes("meta.ai")) {
        showToast("Please open meta.ai first!", "error");
        return;
      }

      btnAutoScrollScan.innerHTML = `<svg class="btn-icon spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8z"/></svg> Scrolling...`;
      btnAutoScrollScan.disabled = true;

      chrome.tabs.sendMessage(activeTab.id, { action: "AUTO_SCROLL_SCRAPE" }, (response) => {
        btnAutoScrollScan.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg> Auto-Scroll`;
        btnAutoScrollScan.disabled = false;

        if (chrome.runtime.lastError || !response || !response.media) {
          showToast("Auto-scroll scan failed", "error");
          return;
        }

        scrapedMediaList = response.media;
        renderScraperGallery(scrapedMediaList);
        showToast(`Auto-scroll found ${scrapedMediaList.length} items!`, "success");
      });
    });
  }

  // ==========================================
  // SCRAPER FILTER PILLS
  // ==========================================
  scraperFilterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      scraperFilterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-filter");
      applyGalleryFilter();
    });
  });

  function applyGalleryFilter() {
    const items = scraperGallery.querySelectorAll(".gallery-item");
    let visibleCount = 0;
    
    items.forEach(item => {
      const type = item.getAttribute("data-type");
      if (currentFilter === "all" || type === currentFilter) {
        item.classList.remove("hidden-filter");
        visibleCount++;
      } else {
        item.classList.add("hidden-filter");
      }
    });
    
    foundMediaCount.textContent = `${visibleCount} shown`;
  }

  // ==========================================
  // RENDER SCRAPER GALLERY
  // ==========================================
  function renderScraperGallery(media) {
    scraperGallery.innerHTML = "";
    selectAllMedia.checked = false;
    selectedCountSpan.textContent = "0";
    totalScrapedCountSpan.textContent = media.length;
    btnDownloadSelected.disabled = true;
    btnDownloadAll.disabled = media.length === 0;

    if (media.length === 0) {
      scraperGallery.innerHTML = `<div class="empty-state">No generated images or videos found. Try prompting Meta AI first!</div>`;
      foundMediaCount.textContent = "0 found";
      return;
    }

    foundMediaCount.textContent = `${media.length} found`;

    media.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "gallery-item";
      card.setAttribute("data-index", index);
      card.setAttribute("data-type", item.type);

      const isVideo = item.type === "video";
      
      let thumbnailMarkup = "";
      if (isVideo) {
        thumbnailMarkup = `
          <video class="gallery-thumb" muted preload="metadata">
            <source src="${item.url}" type="video/mp4">
          </video>
          <div class="video-badge">VIDEO</div>
        `;
      } else {
        thumbnailMarkup = `<img src="${item.url}" class="gallery-thumb" loading="lazy" alt="${item.prompt}" crossorigin="anonymous">`;
      }

      const dimText = item.width && item.height ? `${item.width}×${item.height}` : "";

      card.innerHTML = `
        <label class="checkbox-container gallery-checkbox" onclick="event.stopPropagation();">
          <input type="checkbox" class="media-select-checkbox" data-index="${index}">
          <span class="checkmark"></span>
        </label>
        ${thumbnailMarkup}
        <div class="gallery-caption" title="${item.prompt}">${item.prompt || "Generated media"}</div>
        ${dimText ? `<div class="gallery-dimensions">${dimText}</div>` : ""}
      `;

      // Click to preview (not on checkbox)
      card.addEventListener("click", (e) => {
        if (e.target.closest(".gallery-checkbox")) return;
        openPreview(item, index);
      });

      scraperGallery.appendChild(card);
      
      // Auto hover video play logic
      if (isVideo) {
        const vid = card.querySelector("video");
        card.addEventListener("mouseenter", () => vid.play().catch(() => {}));
        card.addEventListener("mouseleave", () => {
          vid.pause();
          vid.currentTime = 0;
        });
      }
    });

    // Wire checkbox selection listeners
    const checkboxes = document.querySelectorAll(".media-select-checkbox");
    checkboxes.forEach(cb => {
      cb.addEventListener("change", () => {
        updateSelectedCounter();
      });
    });

    // Apply current filter
    applyGalleryFilter();
  }

  // Select all functionality
  selectAllMedia.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll(".media-select-checkbox");
    checkboxes.forEach(cb => {
      // Only select visible items
      const galleryItem = cb.closest(".gallery-item");
      if (!galleryItem.classList.contains("hidden-filter")) {
        cb.checked = isChecked;
      }
    });
    updateSelectedCounter();
  });

  function updateSelectedCounter() {
    const checkedBoxes = document.querySelectorAll(".media-select-checkbox:checked");
    const count = checkedBoxes.length;
    selectedCountSpan.textContent = count;
    btnDownloadSelected.disabled = count === 0;
  }

  // ==========================================
  // DOWNLOAD FUNCTIONS
  // ==========================================
  
  function getActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      callback(tabs[0] || null);
    });
  }

  function downloadMediaItem(item, index, callback) {
    const useCanvas = toggleCanvasDownload.checked && item.type === "image";
    
    chrome.storage.local.get(["settings"], (data) => {
      const settings = data.settings || {};
      const folder = settings.folderName || "meta-ai-downloads";
      const fileExt = item.type === "video" ? "mp4" : "png";

      if (useCanvas) {
        // Canvas-based download (no watermark)
        getActiveTab((tab) => {
          if (!tab) {
            // Fallback to direct download
            directDownload(item, folder, fileExt, index, callback);
            return;
          }

          chrome.tabs.sendMessage(tab.id, {
            action: "DOWNLOAD_VIA_HTML",
            selector: item.selector,
            url: item.url,
            mediaType: item.type
          }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              console.warn("Canvas download failed, falling back to direct:", chrome.runtime.lastError);
              directDownload(item, folder, fileExt, index, callback);
              return;
            }

            // Download the data URL
            getSequentialOrIndexFilename(folder, fileExt, index, (filename) => {
              chrome.runtime.sendMessage({
                action: "DOWNLOAD_MEDIA_DATAURL",
                dataUrl: response.dataUrl,
                filename: filename,
                prompt: item.prompt || ""
              }, callback);
            });
          });
        });
      } else if (item.type === "video") {
        // Video download via blob
        getActiveTab((tab) => {
          if (!tab) {
            directDownload(item, folder, fileExt, index, callback);
            return;
          }
          
          chrome.tabs.sendMessage(tab.id, {
            action: "DOWNLOAD_VIDEO_HTML",
            url: item.url
          }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              directDownload(item, folder, fileExt, index, callback);
              return;
            }

            getSequentialOrIndexFilename(folder, fileExt, index, (filename) => {
              chrome.runtime.sendMessage({
                action: "DOWNLOAD_MEDIA_DATAURL",
                dataUrl: response.dataUrl,
                filename: filename,
                prompt: item.prompt || ""
              }, callback);
            });
          });
        });
      } else {
        directDownload(item, folder, fileExt, index, callback);
      }
    });
  }

  function directDownload(item, folder, fileExt, index, callback) {
    getSequentialOrIndexFilename(folder, fileExt, index, (filename) => {
      chrome.runtime.sendMessage({
        action: "DOWNLOAD_MEDIA",
        url: item.url,
        filename: filename,
        prompt: item.prompt || ""
      }, callback);
    });
  }

  function getSequentialOrIndexFilename(folder, fileExt, fallbackIndex, callback) {
    chrome.storage.local.get(["settings", "downloadCounter"], (data) => {
      const settings = data.settings || {};
      
      if (settings.sequentialNaming !== false) {
        // Sequential: 1.png, 2.png, ...
        const counter = (data.downloadCounter || 0) + 1;
        const filename = `${folder}/${counter}.${fileExt}`;
        chrome.storage.local.set({ downloadCounter: counter }, () => {
          callback(filename);
        });
      } else {
        // Fallback index naming
        const filename = `${folder}/media_${fallbackIndex + 1}.${fileExt}`;
        callback(filename);
      }
    });
  }

  // Download Selected
  btnDownloadSelected.addEventListener("click", () => {
    const checkedBoxes = document.querySelectorAll(".media-select-checkbox:checked");
    if (checkedBoxes.length === 0) return;

    btnDownloadSelected.disabled = true;
    btnDownloadAll.disabled = true;
    btnDownloadSelected.textContent = `Downloading...`;

    const indices = Array.from(checkedBoxes).map(cb => parseInt(cb.getAttribute("data-index")));
    let completedCount = 0;
    let downloadIndex = 0;

    function downloadNext() {
      if (downloadIndex >= indices.length) return;

      const idx = indices[downloadIndex];
      const item = scrapedMediaList[idx];
      downloadIndex++;

      if (!item) {
        completedCount++;
        checkComplete();
        downloadNext();
        return;
      }

      downloadMediaItem(item, idx, (response) => {
        completedCount++;
        if (response && response.success) {
          showToast(`Downloaded ${completedCount}/${indices.length}`, "success");
        }
        checkComplete();
        
        // Delay between downloads
        chrome.storage.local.get(["settings"], (data) => {
          const delay = (data.settings || {}).downloadDelay || 500;
          setTimeout(downloadNext, delay);
        });
      });
    }

    function checkComplete() {
      if (completedCount >= indices.length) {
        btnDownloadSelected.disabled = false;
        btnDownloadAll.disabled = false;
        btnDownloadSelected.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Selected (<span id="selected-count">${indices.length}</span>)`;
        checkboxesUncheck();
        showToast(`All ${indices.length} downloads complete!`, "success");
      }
    }

    downloadNext();
  });

  // Download All
  btnDownloadAll.addEventListener("click", () => {
    const visibleItems = getVisibleMediaItems();
    if (visibleItems.length === 0) return;

    btnDownloadAll.disabled = true;
    btnDownloadSelected.disabled = true;
    btnDownloadAll.textContent = `Downloading...`;

    let completedCount = 0;
    let downloadIndex = 0;

    function downloadNext() {
      if (downloadIndex >= visibleItems.length) return;

      const { item, index } = visibleItems[downloadIndex];
      downloadIndex++;

      downloadMediaItem(item, index, (response) => {
        completedCount++;
        if (response && response.success) {
          showToast(`Downloaded ${completedCount}/${visibleItems.length}`, "success");
        }
        checkComplete();

        chrome.storage.local.get(["settings"], (data) => {
          const delay = (data.settings || {}).downloadDelay || 500;
          setTimeout(downloadNext, delay);
        });
      });
    }

    function checkComplete() {
      if (completedCount >= visibleItems.length) {
        btnDownloadSelected.disabled = false;
        btnDownloadAll.disabled = false;
        btnDownloadAll.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> All (<span id="total-scraped-count">${scrapedMediaList.length}</span>)`;
        checkboxesUncheck();
        showToast(`All ${visibleItems.length} downloads complete!`, "success");
      }
    }

    downloadNext();
  });

  function getVisibleMediaItems() {
    const items = [];
    const galleryItems = scraperGallery.querySelectorAll(".gallery-item:not(.hidden-filter)");
    galleryItems.forEach(gi => {
      const index = parseInt(gi.getAttribute("data-index"));
      if (scrapedMediaList[index]) {
        items.push({ item: scrapedMediaList[index], index });
      }
    });
    return items;
  }

  function checkboxesUncheck() {
    selectAllMedia.checked = false;
    document.querySelectorAll(".media-select-checkbox").forEach(cb => cb.checked = false);
    updateSelectedCounter();
  }

  // Canvas toggle sync
  toggleCanvasDownload.addEventListener("change", (e) => {
    chrome.storage.local.get(["settings"], (data) => {
      const settings = data.settings || {};
      settings.useCanvasDownload = e.target.checked;
      chrome.storage.local.set({ settings });
      settingsCanvasDownload.checked = e.target.checked;
    });
    showToast(e.target.checked ? "Canvas download enabled (no watermark)" : "Direct URL download", "info");
  });

  // ==========================================
  // IMAGE PREVIEW MODAL
  // ==========================================
  function openPreview(item, index) {
    currentPreviewItem = item;
    currentPreviewIndex = index;
    
    previewMediaContainer.innerHTML = "";
    
    if (item.type === "video") {
      previewMediaContainer.innerHTML = `<video src="${item.url}" controls autoplay style="max-width:100%;max-height:70vh;"></video>`;
    } else {
      previewMediaContainer.innerHTML = `<img src="${item.url}" alt="${item.prompt}" style="max-width:100%;max-height:70vh;">`;
    }
    
    previewPrompt.textContent = item.prompt || "No prompt info";
    previewMeta.textContent = item.width && item.height ? `${item.width} × ${item.height} • ${item.type.toUpperCase()}` : item.type.toUpperCase();
    
    previewModal.style.display = "flex";
  }

  function closePreview() {
    previewModal.style.display = "none";
    currentPreviewItem = null;
    currentPreviewIndex = -1;
  }

  previewCloseBtn.addEventListener("click", closePreview);
  
  previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) closePreview();
  });

  previewDownloadBtn.addEventListener("click", () => {
    if (!currentPreviewItem) return;
    
    previewDownloadBtn.textContent = "Downloading...";
    previewDownloadBtn.disabled = true;
    
    downloadMediaItem(currentPreviewItem, currentPreviewIndex, (response) => {
      previewDownloadBtn.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Download This`;
      previewDownloadBtn.disabled = false;
      
      if (response && response.success) {
        showToast("Downloaded successfully!", "success");
      } else {
        showToast("Download failed", "error");
      }
    });
  });

  // ==========================================
  // DOWNLOAD HISTORY
  // ==========================================
  function renderHistory() {
    chrome.storage.local.get(["downloadHistory"], (data) => {
      const history = data.downloadHistory || [];
      historyListContainer.innerHTML = "";
      
      if (history.length === 0) {
        historyListContainer.innerHTML = `<div class="empty-state">No downloads yet. Generate or scrape media to see history here.</div>`;
        return;
      }

      history.forEach((entry, index) => {
        const item = document.createElement("div");
        item.className = "history-item";
        
        const time = new Date(entry.timestamp);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const shortFilename = entry.filename.split('/').pop();
        
        item.innerHTML = `
          <div class="history-status-dot ${entry.status}"></div>
          <div class="history-info">
            <div class="history-filename" title="${entry.filename}">${shortFilename}</div>
            <div class="history-time">${dateStr} ${timeStr}${entry.error ? ' • ' + entry.error : ''}</div>
          </div>
          ${entry.status === "failed" ? `<button class="history-retry-btn" data-index="${index}">Retry</button>` : ''}
        `;
        
        historyListContainer.appendChild(item);
      });

      // Wire retry buttons
      document.querySelectorAll(".history-retry-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-index"));
          btn.textContent = "...";
          
          chrome.runtime.sendMessage({
            action: "RETRY_DOWNLOAD",
            historyIndex: idx
          }, (response) => {
            if (response && response.success) {
              showToast("Retry successful!", "success");
              renderHistory();
            } else {
              showToast("Retry failed: " + (response?.error || "unknown"), "error");
              btn.textContent = "Retry";
            }
          });
        });
      });
    });
  }

  btnClearHistory.addEventListener("click", () => {
    if (confirm("Clear all download history?")) {
      chrome.runtime.sendMessage({ action: "CLEAR_HISTORY" }, () => {
        renderHistory();
        showToast("History cleared", "info");
      });
    }
  });

  btnResetCounter.addEventListener("click", () => {
    if (confirm("Reset download counter to 0? Next download will start from 1.png again.")) {
      chrome.runtime.sendMessage({ action: "RESET_DOWNLOAD_COUNTER" }, () => {
        updateStatsUI();
        showToast("Counter reset to 0", "info");
      });
    }
  });

  // ==========================================
  // CHARACTER CONSISTENCY PROFILES
  // ==========================================
  btnAddCharacter.addEventListener("click", () => {
    const name = charNameInput.value.trim();
    const desc = charDescInput.value.trim();

    if (!name || !desc) {
      showToast("Please fill both Name and Description!", "warning");
      return;
    }

    chrome.storage.local.get(["characters"], (data) => {
      const characters = data.characters || [];
      const newChar = {
        id: "char_" + Date.now(),
        name: name,
        description: desc
      };
      
      characters.push(newChar);
      chrome.storage.local.set({ characters: characters }, () => {
        charNameInput.value = "";
        charDescInput.value = "";
        showToast(`Character "${name}" saved!`, "success");
      });
    });
  });

  function populateCharacterSelects(characters, activeId) {
    activeCharSelect.innerHTML = `<option value="none">Disabled</option>`;
    
    characters.forEach(char => {
      const opt = document.createElement("option");
      opt.value = char.id;
      opt.textContent = char.name;
      if (char.id === activeId) opt.selected = true;
      activeCharSelect.appendChild(opt);
    });
  }

  activeCharSelect.addEventListener("change", (e) => {
    chrome.storage.local.set({ activeCharacterId: e.target.value });
  });

  function renderCharactersList(characters, activeId) {
    charactersListContainer.innerHTML = "";
    if (characters.length === 0) {
      charactersListContainer.innerHTML = `<div class="empty-state">No character profiles saved yet. Add one above!</div>`;
      return;
    }

    characters.forEach(char => {
      const item = document.createElement("div");
      item.className = `character-item ${char.id === activeId ? "active" : ""}`;
      
      item.innerHTML = `
        <div class="char-card-info">
          <span class="char-card-name">${char.name}</span>
          <span class="char-card-desc" title="${char.description}">${char.description}</span>
        </div>
        <div class="char-card-actions">
          <button class="btn-char-delete" data-id="${char.id}" title="Delete character">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      
      item.querySelector(".char-card-info").addEventListener("click", () => {
        const nextActiveId = char.id === activeId ? "none" : char.id;
        chrome.storage.local.set({ activeCharacterId: nextActiveId });
      });

      item.querySelector(".btn-char-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${char.name}"?`)) {
          deleteCharacter(char.id);
        }
      });

      charactersListContainer.appendChild(item);
    });
  }

  function deleteCharacter(id) {
    chrome.storage.local.get(["characters", "activeCharacterId"], (data) => {
      let characters = data.characters || [];
      let activeId = data.activeCharacterId;
      
      characters = characters.filter(c => c.id !== id);
      if (activeId === id) activeId = "none";

      chrome.storage.local.set({ 
        characters: characters,
        activeCharacterId: activeId
      });
      showToast("Character deleted", "info");
    });
  }

  // ==========================================
  // SETTINGS PANEL
  // ==========================================
  function saveSettingsField(key, value) {
    chrome.storage.local.get(["settings"], (data) => {
      const settings = data.settings || {};
      settings[key] = value;
      chrome.storage.local.set({ settings });
    });
  }

  settingsFolder.addEventListener("change", (e) => {
    saveSettingsField("folderName", e.target.value.trim() || "meta-ai-downloads");
  });

  settingsAutoRename.addEventListener("change", (e) => {
    saveSettingsField("autoRename", e.target.checked);
  });

  settingsSequentialNaming.addEventListener("change", (e) => {
    saveSettingsField("sequentialNaming", e.target.checked);
  });

  settingsCanvasDownload.addEventListener("change", (e) => {
    saveSettingsField("useCanvasDownload", e.target.checked);
    toggleCanvasDownload.checked = e.target.checked;
  });

  settingsDownloadDelay.addEventListener("change", (e) => {
    saveSettingsField("downloadDelay", parseInt(e.target.value) || 500);
  });

  const syncDelays = () => {
    chrome.storage.local.get(["settings"], (data) => {
      const settings = data.settings || {};
      settings.minDelay = parseInt(minDelay.value) || 20;
      settings.maxDelay = parseInt(maxDelay.value) || 30;
      chrome.storage.local.set({ settings });
    });
  };

  minDelay.addEventListener("change", syncDelays);
  maxDelay.addEventListener("change", syncDelays);
  concurrentPrompts.addEventListener("change", (e) => {
    saveSettingsField("concurrentPrompts", parseInt(e.target.value) || 1);
  });

  // Export Data
  btnExportData.addEventListener("click", () => {
    chrome.storage.local.get(null, (allData) => {
      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `meta-ai-flow-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data exported!", "success");
    });
  });

  // Import Data
  btnImportData.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.settings || parsed.characters) {
            chrome.storage.local.clear(() => {
              chrome.storage.local.set(parsed, () => {
                showToast("Data imported successfully!", "success");
                updateUIFromStorage();
              });
            });
          } else {
            showToast("Invalid backup file structure", "error");
          }
        } catch (err) {
          showToast("Error parsing file: " + err.message, "error");
        }
      };
      reader.readAsText(file);
    });

    input.click();
  });

  // Reset Settings
  btnResetSettings.addEventListener("click", () => {
    if (confirm("Reset ALL data (including characters, history, and queue)?")) {
      chrome.storage.local.clear(() => {
        chrome.runtime.reload();
      });
    }
  });

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  document.addEventListener("keydown", (e) => {
    // Ctrl+D = Download All
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      if (!btnDownloadAll.disabled) {
        btnDownloadAll.click();
      }
    }
    
    // Ctrl+S = Scan Page
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      btnScan.click();
    }
    
    // Ctrl+Enter = Start Queue
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      if (!btnStart.disabled) {
        btnStart.click();
      }
    }
    
    // Esc = Close Preview
    if (e.key === "Escape") {
      closePreview();
    }
  });
});
