// Meta AI Flow v2.0 — Background Service Worker

// Set up Side Panel to open on action click
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
  
  // Initialize default storage values if not present
  chrome.storage.local.get([
    "queue", 
    "currentIndex", 
    "status", 
    "settings", 
    "characters",
    "activeCharacterId",
    "downloadCounter",
    "downloadHistory",
    "stats",
    "theme"
  ], (result) => {
    const defaults = {};
    if (result.queue === undefined) defaults.queue = [];
    if (result.currentIndex === undefined) defaults.currentIndex = 0;
    if (result.status === undefined) defaults.status = "idle";
    if (result.characters === undefined) defaults.characters = [];
    if (result.activeCharacterId === undefined) defaults.activeCharacterId = "none";
    if (result.downloadCounter === undefined) defaults.downloadCounter = 0;
    if (result.downloadHistory === undefined) defaults.downloadHistory = [];
    if (result.theme === undefined) defaults.theme = "dark";
    if (result.stats === undefined) {
      defaults.stats = {
        totalGenerated: 0,
        totalDownloaded: 0,
        totalFailed: 0,
        sessionDownloaded: 0
      };
    }
    if (result.settings === undefined) {
      defaults.settings = {
        minDelay: 20,
        maxDelay: 30,
        folderName: "meta-ai-downloads",
        outputsPerPrompt: 1,
        autoRename: true,
        concurrentPrompts: 1,
        mediaType: "both",       // "images", "videos", "both"
        useCanvasDownload: true,  // HTML canvas download for images
        sequentialNaming: true,
        downloadDelay: 500       // ms between individual file downloads
      };
    }
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });
});

// Keep track of the active timeout for the queue delay
let queueTimeoutId = null;

// Listen for messages from content script or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "DOWNLOAD_MEDIA") {
    handleDownload(message.url, message.filename, message.prompt || "", sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === "DOWNLOAD_MEDIA_DATAURL") {
    handleDataUrlDownload(message.dataUrl, message.filename, message.prompt || "", sendResponse);
    return true;
  }

  if (message.action === "START_QUEUE") {
    startQueue(sender.tab ? sender.tab.id : null);
    sendResponse({ success: true, message: "Queue started" });
  }

  if (message.action === "PAUSE_QUEUE") {
    pauseQueue();
    sendResponse({ success: true, message: "Queue paused" });
  }

  if (message.action === "STOP_QUEUE") {
    stopQueue();
    sendResponse({ success: true, message: "Queue stopped" });
  }

  if (message.action === "PROMPT_COMPLETED") {
    handlePromptCompleted(message.urls, message.prompt, sender.tab ? sender.tab.id : null);
    sendResponse({ success: true });
  }

  if (message.action === "PROMPT_FAILED") {
    handlePromptFailed(message.error, sender.tab ? sender.tab.id : null);
    sendResponse({ success: true });
  }

  if (message.action === "RESET_DOWNLOAD_COUNTER") {
    chrome.storage.local.set({ downloadCounter: 0 });
    sendResponse({ success: true });
  }

  if (message.action === "GET_STATS") {
    chrome.storage.local.get(["stats", "downloadCounter", "downloadHistory"], (data) => {
      sendResponse({
        stats: data.stats || {},
        downloadCounter: data.downloadCounter || 0,
        historyCount: (data.downloadHistory || []).length
      });
    });
    return true;
  }

  if (message.action === "CLEAR_HISTORY") {
    chrome.storage.local.set({ downloadHistory: [] });
    sendResponse({ success: true });
  }

  if (message.action === "RETRY_DOWNLOAD") {
    retryDownload(message.historyIndex, sendResponse);
    return true;
  }
});

// ========================================
// Path & Filename Utilities
// ========================================

function sanitizePath(filePath) {
  let normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const cleanSegments = segments.map(segment => {
    return segment.replace(/[*?"<>|:]/g, '_').trim();
  }).filter(segment => segment.length > 0);
  return cleanSegments.join('/');
}

/**
 * Generate sequential filename: folder/1.png, folder/2.png, etc.
 */
function getSequentialFilename(folder, extension, callback) {
  chrome.storage.local.get(["downloadCounter"], (data) => {
    const counter = (data.downloadCounter || 0) + 1;
    const filename = `${folder}/${counter}.${extension}`;
    chrome.storage.local.set({ downloadCounter: counter }, () => {
      callback(sanitizePath(filename));
    });
  });
}

// ========================================
// Download Handlers
// ========================================

function handleDownload(url, filename, prompt, sendResponse) {
  const cleanFilename = sanitizePath(filename);
  console.log("Downloading:", cleanFilename);
  
  chrome.downloads.download({
    url: url,
    filename: cleanFilename,
    conflictAction: "uniquify",
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("Download failed:", chrome.runtime.lastError.message);
      logDownload(cleanFilename, prompt, "failed", chrome.runtime.lastError.message, url);
      updateStats("failed");
      if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log("Download started with ID:", downloadId);
      logDownload(cleanFilename, prompt, "completed", null, url);
      updateStats("downloaded");
      if (sendResponse) sendResponse({ success: true, downloadId });
    }
  });
}

function handleDataUrlDownload(dataUrl, filename, prompt, sendResponse) {
  const cleanFilename = sanitizePath(filename);
  console.log("Downloading from data URL:", cleanFilename);
  
  chrome.downloads.download({
    url: dataUrl,
    filename: cleanFilename,
    conflictAction: "uniquify",
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("Data URL download failed:", chrome.runtime.lastError.message);
      logDownload(cleanFilename, prompt, "failed", chrome.runtime.lastError.message, dataUrl.substring(0, 50));
      updateStats("failed");
      if (sendResponse) sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log("Data URL download started with ID:", downloadId);
      logDownload(cleanFilename, prompt, "completed", null, "canvas");
      updateStats("downloaded");
      if (sendResponse) sendResponse({ success: true, downloadId });
    }
  });
}

// ========================================
// Download History & Stats
// ========================================

function logDownload(filename, prompt, status, error, sourceUrl) {
  chrome.storage.local.get(["downloadHistory"], (data) => {
    const history = data.downloadHistory || [];
    history.unshift({
      filename: filename,
      prompt: prompt || "",
      status: status,
      error: error || null,
      sourceUrl: sourceUrl || "",
      timestamp: new Date().toISOString()
    });
    
    // Keep max 200 entries
    if (history.length > 200) history.length = 200;
    
    chrome.storage.local.set({ downloadHistory: history });
  });
}

function updateStats(type) {
  chrome.storage.local.get(["stats"], (data) => {
    const stats = data.stats || {
      totalGenerated: 0,
      totalDownloaded: 0,
      totalFailed: 0,
      sessionDownloaded: 0
    };
    
    if (type === "downloaded") {
      stats.totalDownloaded++;
      stats.sessionDownloaded++;
    } else if (type === "failed") {
      stats.totalFailed++;
    } else if (type === "generated") {
      stats.totalGenerated++;
    }
    
    chrome.storage.local.set({ stats: stats });
  });
}

function retryDownload(historyIndex, sendResponse) {
  chrome.storage.local.get(["downloadHistory"], (data) => {
    const history = data.downloadHistory || [];
    if (historyIndex < 0 || historyIndex >= history.length) {
      sendResponse({ success: false, error: "Invalid history index" });
      return;
    }
    
    const entry = history[historyIndex];
    if (entry.sourceUrl && entry.sourceUrl !== "canvas") {
      handleDownload(entry.sourceUrl, entry.filename, entry.prompt, (response) => {
        // Update history entry status
        if (response.success) {
          history[historyIndex].status = "completed";
          history[historyIndex].error = null;
          chrome.storage.local.set({ downloadHistory: history });
        }
        sendResponse(response);
      });
    } else {
      sendResponse({ success: false, error: "Cannot retry canvas downloads" });
    }
  });
}

// ========================================
// Queue Processing
// ========================================

function startQueue(senderTabId) {
  if (queueTimeoutId) {
    clearTimeout(queueTimeoutId);
    queueTimeoutId = null;
  }
  
  chrome.storage.local.set({ status: "running", statusMessage: "Starting queue..." }, () => {
    processNextPrompt(senderTabId);
  });
}

function pauseQueue() {
  if (queueTimeoutId) {
    clearTimeout(queueTimeoutId);
    queueTimeoutId = null;
  }
  chrome.storage.local.set({ status: "paused", statusMessage: "Queue paused" });
}

function stopQueue() {
  if (queueTimeoutId) {
    clearTimeout(queueTimeoutId);
    queueTimeoutId = null;
  }
  chrome.storage.local.set({ status: "idle", currentIndex: 0, statusMessage: "Queue cleared" });
}

// Send the next prompt in the queue to the Meta AI tab
function processNextPrompt(preferredTabId) {
  chrome.storage.local.get(["queue", "currentIndex", "status", "settings", "characters", "activeCharacterId"], (data) => {
    if (data.status !== "running") return;
    
    const queue = data.queue || [];
    const index = data.currentIndex || 0;
    
    if (index >= queue.length) {
      console.log("Queue processing complete!");
      chrome.storage.local.set({ status: "idle", currentIndex: 0, statusMessage: "Queue complete!" });
      return;
    }
    
    const rawPrompt = queue[index];
    let finalPrompt = rawPrompt;
    
    // Check if character consistency is enabled and active
    if (data.activeCharacterId && data.activeCharacterId !== "none") {
      const character = (data.characters || []).find(c => c.id === data.activeCharacterId);
      if (character && character.description) {
        finalPrompt = `${character.description}, ${rawPrompt}`;
      }
    }
    
    // Find a Meta AI tab to send the prompt to
    findMetaAITab(preferredTabId, (tab) => {
      if (!tab) {
        console.error("No open Meta AI tabs found. Please open meta.ai to run the queue.");
        chrome.storage.local.set({ status: "paused", statusMessage: "Error: No meta.ai tab open!" });
        return;
      }
      
      console.log(`Sending prompt ${index + 1}/${queue.length} to tab ${tab.id}: "${finalPrompt}"`);
      chrome.storage.local.set({ statusMessage: `Generating prompt ${index + 1}/${queue.length}...` });
      chrome.tabs.sendMessage(tab.id, {
        action: "EXECUTE_PROMPT",
        prompt: finalPrompt,
        rawPrompt: rawPrompt,
        index: index
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Error communicating with content script, retrying...", chrome.runtime.lastError.message);
          chrome.storage.local.set({ statusMessage: "Error: Please reload meta.ai page!" });
          queueTimeoutId = setTimeout(() => processNextPrompt(tab.id), 5000);
        }
      });
    });
  });
}

// Find an existing Meta AI tab or wait for the user to open one
function findMetaAITab(preferredTabId, callback) {
  if (preferredTabId) {
    chrome.tabs.get(preferredTabId, (tab) => {
      if (!chrome.runtime.lastError && tab && tab.url && tab.url.includes("meta.ai")) {
        callback(tab);
      } else {
        findAnyMetaAITab(callback);
      }
    });
  } else {
    findAnyMetaAITab(callback);
  }
}

function findAnyMetaAITab(callback) {
  chrome.tabs.query({ url: ["*://*.meta.ai/*", "*://meta.ai/*"] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs.find(t => t.active) || tabs[0];
      callback(activeTab);
    } else {
      callback(null);
    }
  });
}

// Handle completion of a prompt
function handlePromptCompleted(urls, prompt, tabId) {
  chrome.storage.local.get(["currentIndex", "settings", "queue"], (data) => {
    const index = data.currentIndex || 0;
    const settings = data.settings || {};
    const queue = data.queue || [];
    
    // Update generated stats
    if (urls && urls.length > 0) {
      updateStats("generated");
    }
    
    // Store files with sequential naming
    if (urls && urls.length > 0) {
      const folder = settings.folderName || "meta-ai-downloads";
      
      let downloadIndex = 0;
      const downloadNext = () => {
        if (downloadIndex >= urls.length) {
          // All downloads queued, proceed to next prompt
          advanceQueue(index, queue, settings, tabId);
          return;
        }
        
        const url = urls[downloadIndex];
        const fileExt = url.includes(".mp4") || url.includes("video") ? "mp4" : "png";
        
        if (settings.sequentialNaming !== false) {
          getSequentialFilename(folder, fileExt, (filename) => {
            handleDownload(url, filename, prompt);
            downloadIndex++;
            // Small delay between downloads
            setTimeout(downloadNext, settings.downloadDelay || 500);
          });
        } else {
          // Legacy naming
          const cleanPrompt = prompt.substring(0, 40).replace(/[^a-zA-Z0-9]/g, "_");
          let filename = `${folder}/${index + 1}_${cleanPrompt}`;
          if (urls.length > 1) filename += `_${downloadIndex + 1}`;
          filename += `.${fileExt}`;
          
          handleDownload(url, filename, prompt);
          downloadIndex++;
          setTimeout(downloadNext, settings.downloadDelay || 500);
        }
      };
      
      downloadNext();
    } else {
      advanceQueue(index, queue, settings, tabId);
    }
  });
}

function advanceQueue(index, queue, settings, tabId) {
  const nextIndex = index + 1;
  chrome.storage.local.set({ currentIndex: nextIndex }, () => {
    if (nextIndex >= queue.length) {
      console.log("Queue complete!");
      chrome.storage.local.set({ status: "idle", currentIndex: 0, statusMessage: "Queue complete!" });
    } else {
      const min = settings.minDelay || 20;
      const max = settings.maxDelay || 30;
      const delayMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
      const delaySec = delayMs / 1000;
      
      console.log(`Waiting for ${delaySec}s before next prompt...`);
      chrome.storage.local.set({ statusMessage: `Delaying for ${delaySec}s...` });
      queueTimeoutId = setTimeout(() => {
        processNextPrompt(tabId);
      }, delayMs);
    }
  });
}

// Handle failures
function handlePromptFailed(error, tabId) {
  console.error("Prompt failed:", error);
  chrome.storage.local.get(["currentIndex", "settings", "queue"], (data) => {
    const index = data.currentIndex || 0;
    const settings = data.settings || {};
    const queue = data.queue || [];
    const nextIndex = index + 1;
    
    updateStats("failed");
    
    chrome.storage.local.set({ currentIndex: nextIndex }, () => {
      if (nextIndex >= queue.length) {
        chrome.storage.local.set({ status: "idle", currentIndex: 0, statusMessage: "Queue complete with errors" });
      } else {
        const delayMs = 5000;
        console.log(`Waiting 5s after failure before next prompt...`);
        chrome.storage.local.set({ statusMessage: `Failed. Retrying next in 5s...` });
        queueTimeoutId = setTimeout(() => {
          processNextPrompt(tabId);
        }, delayMs);
      }
    });
  });
}
