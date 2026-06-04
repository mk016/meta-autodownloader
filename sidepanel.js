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

  // Aspect Ratio Pills
  const aspectRatioPills = document.querySelectorAll("#aspect-ratio-pills .pill-btn");

  // Generated Gallery
  const generatedGalleryPanel = document.getElementById("generated-gallery-panel");
  const generatedGalleryGrid = document.getElementById("generated-gallery-grid");
  const generatedGalleryCount = document.getElementById("generated-gallery-count");
  const generatedSelectedCount = document.getElementById("generated-selected-count");
  const btnDownloadGeneratedSelected = document.getElementById("btn-download-generated-selected");
  const btnClearGenerated = document.getElementById("btn-clear-generated");

  // Scraper & On-Page Select
  const btnScan = document.getElementById("btn-scan");
  const btnSelectOnPage = document.getElementById("btn-select-on-page");
  const btnSelectOnPageQueue = document.getElementById("btn-select-on-page-queue");
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

  // Styles
  const activeStyleSelect = document.getElementById("active-style-select");
  const styleNameInput = document.getElementById("style-name");
  const stylePromptInput = document.getElementById("style-prompt");
  const btnAddStyle = document.getElementById("btn-add-style");
  const stylesListContainer = document.getElementById("styles-list-container");

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

  // Utility: Escape HTML to prevent injection in innerHTML
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Template Chips
  const templateChips = document.querySelectorAll(".template-chip");

  // ==========================================
  // STATE
  // ==========================================
  let scrapedMediaList = [];
  let currentFilter = "all";
  let currentPreviewItem = null;
  let currentPreviewIndex = -1;
  let selectedGeneratedUrls = new Set(); // Tracks selected URLs in generated gallery
  let onPageSelectionActive = false;

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
    toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ️"}</span><span>${escapeHtml(message)}</span>`;
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
      "statusMessage",
      "styles",
      "activeStyleId"
    ], (data) => {
      const queue = data.queue || [];
      const currentIndex = data.currentIndex || 0;
      const status = data.status || "idle";
      const settings = data.settings || {};
      const characters = data.characters || [];
      const activeCharacterId = data.activeCharacterId || "none";
      const statusMessage = data.statusMessage || "";
      const styles = data.styles || [];
      const activeStyleId = data.activeStyleId || "none";

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

      // Update aspect ratio pills
      if (settings.aspectRatio) {
        aspectRatioPills.forEach(pill => {
          pill.classList.toggle("active", pill.getAttribute("data-ratio") === settings.aspectRatio);
        });
      }

      // 2. Update Character Dropdowns & List
      populateCharacterSelects(characters, activeCharacterId);
      renderCharactersList(characters, activeCharacterId);

      // 2.5. Update Style Dropdowns & List
      populateStyleSelects(styles, activeStyleId);
      renderStylesList(styles, activeStyleId);

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

    // Update generated gallery
    renderGeneratedGallery();
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
        <span class="queue-item-text" title="${escapeHtml(prompt)}">${idx + 1}. ${escapeHtml(prompt)}</span>
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
  // ASPECT RATIO SELECTOR
  // ==========================================
  aspectRatioPills.forEach(pill => {
    pill.addEventListener("click", () => {
      aspectRatioPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      
      const selectedRatio = pill.getAttribute("data-ratio");
      chrome.storage.local.get(["settings"], (data) => {
        const settings = data.settings || {};
        settings.aspectRatio = selectedRatio;
        chrome.storage.local.set({ settings });
      });
      
      showToast(`Aspect ratio: ${selectedRatio}`, "info");
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

    // Get current aspect ratio
    const activeRatioPill = document.querySelector("#aspect-ratio-pills .pill-btn.active");
    newSettings.aspectRatio = activeRatioPill ? activeRatioPill.getAttribute("data-ratio") : "9:16";

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
  // GENERATED IMAGES GALLERY (Preview Before Download)
  // ==========================================

  function renderGeneratedGallery() {
    chrome.storage.local.get(["pendingMedia"], (data) => {
      const pendingMedia = data.pendingMedia || [];
      generatedGalleryGrid.innerHTML = "";
      
      // Count total images
      let totalImages = 0;
      pendingMedia.forEach(group => {
        totalImages += (group.urls || []).length;
      });
      
      generatedGalleryCount.textContent = `${totalImages} image${totalImages !== 1 ? 's' : ''}`;
      btnClearGenerated.disabled = pendingMedia.length === 0;
      
      if (pendingMedia.length === 0) {
        generatedGalleryGrid.innerHTML = `<div class="empty-state">Generated images will appear here. Select the ones you want to download.</div>`;
        btnDownloadGeneratedSelected.disabled = true;
        generatedSelectedCount.textContent = "0";
        return;
      }
      
      pendingMedia.forEach((group, groupIdx) => {
        const groupEl = document.createElement("div");
        groupEl.className = "generated-prompt-group";
        
        // Prompt label
        const labelEl = document.createElement("div");
        labelEl.className = "generated-prompt-label";
        labelEl.innerHTML = `<span class="prompt-index">#${group.promptIndex || groupIdx + 1}</span> ${escapeHtml(group.prompt || 'Generated media')}`;
        labelEl.title = escapeHtml(group.prompt || '');
        groupEl.appendChild(labelEl);
        
        // Images grid
        const rowEl = document.createElement("div");
        rowEl.className = "generated-images-row";
        
        (group.urls || []).forEach((url, imgIdx) => {
          const card = document.createElement("div");
          card.className = "generated-image-card";
          
          // Unique key for selection tracking
          const selectionKey = `${groupIdx}_${imgIdx}_${url}`;
          
          if (selectedGeneratedUrls.has(selectionKey)) {
            card.classList.add("selected");
          }
          
          const img = document.createElement("img");
          img.src = url;
          img.alt = group.prompt || 'Generated image';
          img.loading = "lazy";
          card.appendChild(img);
          
          // Overlay with size info
          const overlay = document.createElement("div");
          overlay.className = "generated-image-overlay";
          overlay.innerHTML = `<div class="generated-image-size">${group.aspectRatio || '9:16'}</div>`;
          card.appendChild(overlay);
          
          // Click to toggle selection
          card.addEventListener("click", () => {
            if (selectedGeneratedUrls.has(selectionKey)) {
              selectedGeneratedUrls.delete(selectionKey);
              card.classList.remove("selected");
            } else {
              selectedGeneratedUrls.add(selectionKey);
              card.classList.add("selected");
            }
            updateGeneratedSelectedCount();
          });
          
          rowEl.appendChild(card);
        });
        
        groupEl.appendChild(rowEl);
        generatedGalleryGrid.appendChild(groupEl);
      });
      
      updateGeneratedSelectedCount();
    });
  }
  
  function updateGeneratedSelectedCount() {
    const count = selectedGeneratedUrls.size;
    generatedSelectedCount.textContent = count;
    btnDownloadGeneratedSelected.disabled = count === 0;
  }
  
  // Download Selected from generated gallery
  btnDownloadGeneratedSelected.addEventListener("click", () => {
    if (selectedGeneratedUrls.size === 0) return;
    
    chrome.storage.local.get(["pendingMedia"], (data) => {
      const pendingMedia = data.pendingMedia || [];
      const selectedItems = [];
      
      selectedGeneratedUrls.forEach(key => {
        const parts = key.split('_');
        const groupIdx = parseInt(parts[0]);
        const imgIdx = parseInt(parts[1]);
        const url = parts.slice(2).join('_');
        
        if (pendingMedia[groupIdx]) {
          selectedItems.push({
            url: url,
            prompt: pendingMedia[groupIdx].prompt || "",
            groupIndex: pendingMedia[groupIdx].promptIndex || groupIdx + 1,
            imageIndex: imgIdx + 1
          });
        }
      });
      
      if (selectedItems.length === 0) return;
      
      btnDownloadGeneratedSelected.disabled = true;
      btnDownloadGeneratedSelected.innerHTML = `<svg class="btn-icon spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8z"/></svg> Downloading...`;
      
      chrome.runtime.sendMessage({
        action: "DOWNLOAD_PENDING_SELECTED",
        selectedItems: selectedItems
      }, (response) => {
        btnDownloadGeneratedSelected.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Download Selected (<span id="generated-selected-count">${selectedGeneratedUrls.size}</span>)`;
        btnDownloadGeneratedSelected.disabled = false;
        
        if (response && response.success) {
          showToast(`Downloaded ${response.count} images!`, "success");
          // Clear selection after download
          selectedGeneratedUrls.clear();
          renderGeneratedGallery();
        } else {
          showToast("Download failed: " + (response?.error || "unknown"), "error");
        }
      });
    });
  });
  
  // Clear all pending generated media
  btnClearGenerated.addEventListener("click", () => {
    if (confirm("Clear all generated images? They won't be downloaded.")) {
      chrome.runtime.sendMessage({ action: "CLEAR_PENDING_MEDIA" }, () => {
        selectedGeneratedUrls.clear();
        renderGeneratedGallery();
        showToast("Generated images cleared", "info");
      });
    }
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

  btnSelectOnPage.addEventListener("click", () => {
    toggleOnPageSelectionMode();
  });

  btnSelectOnPageQueue.addEventListener("click", () => {
    toggleOnPageSelectionMode();
  });

  btnAutoScrollScan.addEventListener("click", () => {
    autoScrollScan();
  });

  function scanActivePageMedia(bypassEnsure = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url || !activeTab.url.includes("meta.ai")) {
        scraperGallery.innerHTML = `<div class="empty-state">Please open <a href="https://www.meta.ai" target="_blank" style="color:var(--neon-blue);">meta.ai</a> to scan.</div>`;
        foundMediaCount.textContent = "0 found";
        return;
      }

      btnScan.innerHTML = `<svg class="btn-icon spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8z"/></svg> Scanning...`;

      const executeScrape = () => {
        chrome.tabs.sendMessage(activeTab.id, { action: "SCRAPE_PAGE" }, (response) => {
          btnScan.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> Scan Page`;
          
          if (chrome.runtime.lastError || !response || !response.media) {
            console.error("Scraping error:", chrome.runtime.lastError ? chrome.runtime.lastError.message : "No response from script");
            scraperGallery.innerHTML = `<div class="empty-state">Failed to scan. Ensure you are on meta.ai and reload the page.</div>`;
            showToast("Scan failed. Reload meta.ai page.", "error");
            return;
          }

          scrapedMediaList = response.media;
          renderScraperGallery(scrapedMediaList);
          showToast(`Found ${scrapedMediaList.length} media items`, "success");
        });
      };

      if (bypassEnsure) {
        executeScrape();
      } else {
        ensureContentScriptActive(activeTab.id, (isActive) => {
          if (!isActive) {
            btnScan.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> Scan Page`;
            showToast("Failed to initialize scanner. Reload meta.ai page.", "error");
            return;
          }
          executeScrape();
        });
      }
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

      ensureContentScriptActive(activeTab.id, (isActive) => {
        if (!isActive) {
          btnAutoScrollScan.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg> Auto-Scroll`;
          btnAutoScrollScan.disabled = false;
          showToast("Failed to initialize auto-scroll. Reload meta.ai page.", "error");
          return;
        }

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
            <source src="${escapeHtml(item.url)}" type="video/mp4">
          </video>
          <div class="video-badge">VIDEO</div>
        `;
      } else {
        thumbnailMarkup = `<img src="${escapeHtml(item.url)}" class="gallery-thumb" loading="lazy" alt="${escapeHtml(item.prompt)}" crossorigin="anonymous">`;
      }

      const dimText = item.width && item.height ? `${item.width}×${item.height}` : "";

      card.innerHTML = `
        <label class="checkbox-container gallery-checkbox" onclick="event.stopPropagation();">
          <input type="checkbox" class="media-select-checkbox" data-index="${index}">
          <span class="checkmark"></span>
        </label>
        ${thumbnailMarkup}
        <div class="gallery-caption" title="${escapeHtml(item.prompt)}">${escapeHtml(item.prompt || "Generated media")}</div>
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
    
    // Sync selection back to the page if select mode is active
    syncSelectionToPage();
  }

  // ==========================================
  // DOWNLOAD FUNCTIONS
  // ==========================================
  
  function getActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      callback(tabs[0] || null);
    });
  }

  function ensureContentScriptActive(tabId, callback) {
    chrome.tabs.sendMessage(tabId, { action: "PING" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.log("Content script not active on tab", tabId, ". Injecting dynamically...");
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Failed to inject content script dynamically:", chrome.runtime.lastError.message || chrome.runtime.lastError);
            callback(false);
          } else {
            console.log("Content script injected successfully!");
            setTimeout(() => callback(true), 250); // increased delay to guarantee message listener initialization
          }
        });
      } else {
        callback(true);
      }
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

          ensureContentScriptActive(tab.id, (isActive) => {
            if (!isActive) {
              console.warn("Content script not active for canvas download, falling back to direct");
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
        });
      } else if (item.type === "video") {
        // Video download via blob
        getActiveTab((tab) => {
          if (!tab) {
            directDownload(item, folder, fileExt, index, callback);
            return;
          }
          
          ensureContentScriptActive(tab.id, (isActive) => {
            if (!isActive) {
              console.warn("Content script not active for video download, falling back to direct");
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
      previewMediaContainer.innerHTML = `<video src="${escapeHtml(item.url)}" controls autoplay style="max-width:100%;max-height:70vh;"></video>`;
    } else {
      previewMediaContainer.innerHTML = `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.prompt)}" style="max-width:100%;max-height:70vh;">`;
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
            <div class="history-filename" title="${escapeHtml(entry.filename)}">${escapeHtml(shortFilename)}</div>
            <div class="history-time">${dateStr} ${timeStr}${entry.error ? ' • ' + escapeHtml(entry.error) : ''}</div>
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
          <span class="char-card-name">${escapeHtml(char.name)}</span>
          <span class="char-card-desc" title="${escapeHtml(char.description)}">${escapeHtml(char.description)}</span>
        </div>
        <div class="char-card-actions">
          <button class="btn-char-delete" data-id="${escapeHtml(char.id)}" title="Delete character">
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
        if (confirm("Delete \"" + char.name + "\"?")) {
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
  // STYLE CONSISTENCY PROFILES
  // ==========================================
  if (btnAddStyle) {
    btnAddStyle.addEventListener("click", () => {
      const name = styleNameInput.value.trim();
      const prompt = stylePromptInput.value.trim();

      if (!name || !prompt) {
        showToast("Please fill both Style Name and Prompts!", "warning");
        return;
      }

      chrome.storage.local.get(["styles"], (data) => {
        const styles = data.styles || [];
        const newStyle = {
          id: "style_" + Date.now(),
          name: name,
          promptText: prompt
        };
        
        styles.push(newStyle);
        chrome.storage.local.set({ styles: styles }, () => {
          styleNameInput.value = "";
          stylePromptInput.value = "";
          showToast(`Style Profile "${name}" saved!`, "success");
        });
      });
    });
  }

  function populateStyleSelects(styles, activeId) {
    if (!activeStyleSelect) return;
    activeStyleSelect.innerHTML = `<option value="none">Disabled</option>`;
    
    styles.forEach(style => {
      const opt = document.createElement("option");
      opt.value = style.id;
      opt.textContent = style.name;
      if (style.id === activeId) opt.selected = true;
      activeStyleSelect.appendChild(opt);
    });
  }

  if (activeStyleSelect) {
    activeStyleSelect.addEventListener("change", (e) => {
      chrome.storage.local.set({ activeStyleId: e.target.value });
    });
  }

  function renderStylesList(styles, activeId) {
    if (!stylesListContainer) return;
    stylesListContainer.innerHTML = "";
    if (styles.length === 0) {
      stylesListContainer.innerHTML = `<div class="empty-state">No style profiles saved yet. Add one above!</div>`;
      return;
    }

    styles.forEach(style => {
      const item = document.createElement("div");
      item.className = `character-item ${style.id === activeId ? "active" : ""}`;
      
      item.innerHTML = `
        <div class="char-card-info">
          <span class="char-card-name">${escapeHtml(style.name)}</span>
          <span class="char-card-desc" title="${escapeHtml(style.promptText)}">${escapeHtml(style.promptText)}</span>
        </div>
        <div class="char-card-actions">
          <button class="btn-style-delete" data-id="${escapeHtml(style.id)}" title="Delete style profile">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      
      item.querySelector(".char-card-info").addEventListener("click", () => {
        const nextActiveId = style.id === activeId ? "none" : style.id;
        chrome.storage.local.set({ activeStyleId: nextActiveId });
      });

      item.querySelector(".btn-style-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete \"" + style.name + "\" style profile?")) {
          deleteStyle(style.id);
        }
      });

      stylesListContainer.appendChild(item);
    });
  }

  function deleteStyle(id) {
    chrome.storage.local.get(["styles", "activeStyleId"], (data) => {
      let styles = data.styles || [];
      let activeId = data.activeStyleId;
      
      styles = styles.filter(s => s.id !== id);
      if (activeId === id) activeId = "none";

      chrome.storage.local.set({ 
        styles: styles,
        activeStyleId: activeId
      });
      showToast("Style Profile deleted", "info");
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

  // ==========================================
  // ON-PAGE SELECTION & SIDEPANEL SYNC IMPLEMENTATION
  // ==========================================

  function toggleOnPageSelectionMode() {
    getActiveTab((tab) => {
      if (!tab || !tab.url || !tab.url.includes("meta.ai")) {
        showToast("Please open meta.ai to select images on page!", "error");
        return;
      }

      ensureContentScriptActive(tab.id, (isActive) => {
        if (!isActive) {
          showToast("Failed to initialize selection mode. Reload meta.ai page.", "error");
          return;
        }

        if (!onPageSelectionActive) {
          // 1. Auto-scan first to populate sidepanel Scraper gallery (Bypassing redundant script checks to avoid race conditions)
          scanActivePageMedia(true);

          // 2. Start selection mode on the meta.ai webpage
          chrome.tabs.sendMessage(tab.id, { action: "START_SELECTION_MODE" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error activating on-page selection:", chrome.runtime.lastError.message || chrome.runtime.lastError);
              showToast("Failed to start select. Try reloading meta.ai page.", "error");
              return;
            }
            
            onPageSelectionActive = true;
            
            btnSelectOnPage.classList.add("active-select");
            btnSelectOnPage.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4h-2V7h2v6h-2z"/></svg> Stop Select`;
            
            btnSelectOnPageQueue.classList.add("active-select");
            btnSelectOnPageQueue.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4h-2V7h2v6h-2z"/></svg> Stop Select`;
            
            showToast("On-page selection active! Click images/videos on meta.ai", "success");
          });
        } else {
          // Stop selection mode
          chrome.tabs.sendMessage(tab.id, { action: "STOP_SELECTION_MODE" }, (response) => {
            onPageSelectionActive = false;
            
            btnSelectOnPage.classList.remove("active-select");
            btnSelectOnPage.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg> Start Select`;
            
            btnSelectOnPageQueue.classList.remove("active-select");
            btnSelectOnPageQueue.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg> Start Select`;
            
            showToast("On-page selection stopped", "info");
          });
        }
      });
    });
  }

  function syncSelectionToGallery(selectedUrls) {
    const checkedUrlsSet = new Set(selectedUrls);
    
    // Check/uncheck sidepanel checkboxes to match page selection
    const checkboxes = document.querySelectorAll(".media-select-checkbox");
    checkboxes.forEach(cb => {
      const idx = parseInt(cb.getAttribute("data-index"));
      const item = scrapedMediaList[idx];
      if (item) {
        cb.checked = checkedUrlsSet.has(item.url);
      }
    });

    // Update selected counter UI
    const count = checkedUrlsSet.size;
    selectedCountSpan.textContent = count;
    btnDownloadSelected.disabled = count === 0;
  }

  function syncSelectionToPage() {
    if (!onPageSelectionActive) return;

    const selectedUrls = [];
    const checkedBoxes = document.querySelectorAll(".media-select-checkbox:checked");
    checkedBoxes.forEach(cb => {
      const idx = parseInt(cb.getAttribute("data-index"));
      const item = scrapedMediaList[idx];
      if (item) {
        selectedUrls.push(item.url);
      }
    });

    getActiveTab((tab) => {
      if (tab && tab.url && tab.url.includes("meta.ai")) {
        ensureContentScriptActive(tab.id, (isActive) => {
          if (!isActive) return;
          chrome.tabs.sendMessage(tab.id, {
            action: "SYNC_SELECTION_FROM_SIDEPANEL",
            selectedUrls: selectedUrls
          });
        });
      }
    });
  }

  function downloadOnPageSelectedList(items) {
    if (!items || items.length === 0) return;
    
    showToast(`Downloading ${items.length} items from page selection...`, "info");
    
    // Process sequential downloads with custom delay from settings
    let completedCount = 0;
    let downloadIdx = 0;
    
    function downloadNext() {
      if (downloadIdx >= items.length) return;
      
      const item = items[downloadIdx];
      const originalIndex = downloadIdx;
      downloadIdx++;
      
      downloadMediaItem(item, originalIndex, (response) => {
        completedCount++;
        if (response && response.success) {
          showToast(`Downloaded ${completedCount}/${items.length}`, "success");
        }
        
        if (completedCount >= items.length) {
          showToast(`All ${items.length} page downloads completed successfully!`, "success");
          checkboxesUncheck(); // Reset sidepanel checkboxes
        } else {
          chrome.storage.local.get(["settings"], (data) => {
            const delay = (data.settings || {}).downloadDelay || 500;
            setTimeout(downloadNext, delay);
          });
        }
      });
    }
    
    downloadNext();
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ON_PAGE_SELECTION_CHANGED") {
      syncSelectionToGallery(message.selectedUrls);
      sendResponse({ success: true });
    }

    if (message.action === "ON_PAGE_SELECTION_STOPPED") {
      onPageSelectionActive = false;
      
      btnSelectOnPage.classList.remove("active-select");
      btnSelectOnPage.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg> Start Select`;
      
      btnSelectOnPageQueue.classList.remove("active-select");
      btnSelectOnPageQueue.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg> Start Select`;
      
      sendResponse({ success: true });
    }

    if (message.action === "DOWNLOAD_ON_PAGE_ITEMS") {
      downloadOnPageSelectedList(message.items);
      sendResponse({ success: true });
    }
  });
});
