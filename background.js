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
    "theme",
    "pendingMedia",
    "styles",
    "activeStyleId"
  ], (result) => {
    const defaults = {};
    if (result.queue === undefined) defaults.queue = [];
    if (result.currentIndex === undefined) defaults.currentIndex = 0;
    if (result.status === undefined) defaults.status = "idle";
    if (result.characters === undefined) defaults.characters = [];
    if (result.activeCharacterId === undefined) defaults.activeCharacterId = "none";
    if (result.styles === undefined) {
      defaults.styles = [
        { id: "style_cyberpunk", name: "Cyberpunk Glow", promptText: "cyberpunk style, highly detailed, glowing neon lights, dark rainy streets, cinematic volumetric atmosphere, octane render, 8k" },
        { id: "style_pixar", name: "3D Pixar", promptText: "3d disney pixar style, cute animated character concept, highly detailed claymation texture, vibrant color palette, soft volumetric studio lighting, render" },
        { id: "style_photorealistic", name: "Photorealistic Cinema", promptText: "photorealistic, shot on 35mm camera, cinematic film aesthetic, highly detailed face textures, natural soft studio lighting, volumetric light, 8k resolution" },
        { id: "style_anime", name: "Vibrant Anime", promptText: "vibrant anime style illustration, detailed background landscape, colorful aesthetics, beautiful dramatic skies, studio ghibli inspired artwork, 4k" },
        { id: "style_horror", name: "Dark Horror", promptText: "dark horror theme, creepy eerie atmosphere, dim atmospheric lighting, heavy shadows, haunting mysterious vibes, highly detailed gothic design, suspenseful, 4k resolution" },
        { id: "style_2dpaint", name: "2D Animated Painting", promptText: "2d animated watercolor painting, beautiful artistic brush strokes, soft hand-drawn illustrations, colorful expressive paint drips, dreamy storybook aesthetic, fluid motion texture, whimsical 2d animation concept" },
        { id: "style_2d_horror_storybook", name: "2D Horror Storybook", promptText: "illustrated in a 2D horror storybook animation style, gritty watercolor and charcoal texture, rough expressive brushwork, imperfect sketch lines, dark fantasy nightmare aesthetic, dramatic high-contrast lighting, desaturated eerie tones, atmospheric cinematic depth, subtle animated fog drift, frame-by-frame tradigital feel, no 3D rendering, widescreen horror composition, avoiding: 3D, realistic CGI, glossy render, anime, bright colors, modern city, comedy tone, clean vector art, plastic texture, futuristic elements, over-smooth motion, photorealism" }
      ];
    } else {
      // Migrate/inject new default styles if not already present
      let styles = result.styles || [];
      let updated = false;
      const newDefaults = [
        { id: "style_horror", name: "Dark Horror", promptText: "dark horror theme, creepy eerie atmosphere, dim atmospheric lighting, heavy shadows, haunting mysterious vibes, highly detailed gothic design, suspenseful, 4k resolution" },
        { id: "style_2dpaint", name: "2D Animated Painting", promptText: "2d animated watercolor painting, beautiful artistic brush strokes, soft hand-drawn illustrations, colorful expressive paint drips, dreamy storybook aesthetic, fluid motion texture, whimsical 2d animation concept" },
        { id: "style_2d_horror_storybook", name: "2D Horror Storybook", promptText: "illustrated in a 2D horror storybook animation style, gritty watercolor and charcoal texture, rough expressive brushwork, imperfect sketch lines, dark fantasy nightmare aesthetic, dramatic high-contrast lighting, desaturated eerie tones, atmospheric cinematic depth, subtle animated fog drift, frame-by-frame tradigital feel, no 3D rendering, widescreen horror composition, avoiding: 3D, realistic CGI, glossy render, anime, bright colors, modern city, comedy tone, clean vector art, plastic texture, futuristic elements, over-smooth motion, photorealism" }
      ];
      newDefaults.forEach(ds => {
        if (!styles.some(s => s.id === ds.id)) {
          styles.push(ds);
          updated = true;
        }
      });
      if (updated) {
        defaults.styles = styles;
      }
    }
    if (result.activeStyleId === undefined) defaults.activeStyleId = "none";
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
        downloadDelay: 500,      // ms between individual file downloads
        aspectRatio: "9:16"      // "9:16", "16:9", "1:1"
      };
    }
    if (result.pendingMedia === undefined) defaults.pendingMedia = [];
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });
});

// Keep track of the active timeout for the queue delay
let queueTimeoutId = null;

// Keep track of communication retry attempts to prevent infinite stalling on connection drops
let commsRetryCount = 0;
let lastRetryIndex = -1;

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

  if (message.action === "DOWNLOAD_PENDING_SELECTED") {
    downloadPendingSelected(message.selectedItems, sendResponse);
    return true;
  }

  if (message.action === "CLEAR_PENDING_MEDIA") {
    chrome.storage.local.set({ pendingMedia: [] });
    sendResponse({ success: true });
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
  
  commsRetryCount = 0;
  lastRetryIndex = -1;
  
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
  chrome.storage.local.get(["queue", "currentIndex", "status", "settings", "characters", "activeCharacterId", "styles", "activeStyleId"], (data) => {
    if (data.status !== "running") return;
    
    const queue = data.queue || [];
    const index = data.currentIndex || 0;
    
    if (index >= queue.length) {
      console.log("Queue processing complete!");
      chrome.storage.local.set({ status: "idle", currentIndex: 0, statusMessage: "Queue complete!" });
      return;
    }
    
    if (index !== lastRetryIndex) {
      commsRetryCount = 0;
      lastRetryIndex = index;
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
    
    // Check if style consistency is enabled and active (appended to prompt)
    if (data.activeStyleId && data.activeStyleId !== "none") {
      const activeStyle = (data.styles || []).find(s => s.id === data.activeStyleId);
      if (activeStyle && activeStyle.promptText) {
        finalPrompt = `${finalPrompt}, ${activeStyle.promptText}`;
      }
    }
    
    // Append media type and aspect ratio instruction to prompt
    const settings = data.settings || {};
    const mediaType = settings.mediaType || "both";
    const aspectRatio = settings.aspectRatio || "9:16";
    
    const ratioLabels = {
      "9:16": "portrait 9:16",
      "16:9": "landscape 16:9",
      "1:1": "square 1:1"
    };
    const ratioLabel = ratioLabels[aspectRatio] || "portrait 9:16";
    
    // Choose correct media label based on user selection (image vs video)
    const mediaLabel = (mediaType === "videos" || mediaType === "both") ? "video" : "image";
    finalPrompt = `Imagine ${finalPrompt}, generate the ${mediaLabel} in ${ratioLabel} aspect ratio`;
    
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
          commsRetryCount++;
          if (commsRetryCount >= 3) {
            console.log("Max retries reached for index", index, ". Skipping...");
            commsRetryCount = 0;
            handlePromptFailed("Connection dropped. Skipped.", tab.id);
          } else {
            chrome.storage.local.set({ statusMessage: `Connection lost. Retrying (Attempt ${commsRetryCount}/3)...` });
            queueTimeoutId = setTimeout(() => processNextPrompt(tab.id), 3000);
          }
        } else {
          // Reset retry count on successful communication
          commsRetryCount = 0;
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

// Handle completion of a prompt — store in pendingMedia for user selection
function handlePromptCompleted(urls, prompt, tabId) {
  chrome.storage.local.get(["currentIndex", "settings", "queue", "pendingMedia"], (data) => {
    const index = data.currentIndex || 0;
    const settings = data.settings || {};
    const queue = data.queue || [];
    const pendingMedia = data.pendingMedia || [];
    
    // Update generated stats
    if (urls && urls.length > 0) {
      updateStats("generated");
    }
    
    // Store generated URLs in pendingMedia for user preview/selection
    if (urls && urls.length > 0) {
      pendingMedia.push({
        urls: urls,
        prompt: prompt || "",
        promptIndex: index + 1,
        timestamp: new Date().toISOString(),
        aspectRatio: settings.aspectRatio || "9:16"
      });
      
      chrome.storage.local.set({ pendingMedia: pendingMedia }, () => {
        advanceQueue(index, queue, settings, tabId);
      });
    } else {
      advanceQueue(index, queue, settings, tabId);
    }
  });
}

// Download only user-selected pending media items
function downloadPendingSelected(selectedItems, sendResponse) {
  // selectedItems = [{ url, prompt, groupIndex, imageIndex }]
  if (!selectedItems || selectedItems.length === 0) {
    sendResponse({ success: false, error: "No items selected" });
    return;
  }
  
  chrome.storage.local.get(["settings"], (data) => {
    const settings = data.settings || {};
    const folder = settings.folderName || "meta-ai-downloads";
    let completedCount = 0;
    let downloadIdx = 0;
    
    function downloadNext() {
      if (downloadIdx >= selectedItems.length) return;
      
      const item = selectedItems[downloadIdx];
      downloadIdx++;
      
      const fileExt = item.url.includes(".mp4") || item.url.includes("video") ? "mp4" : "png";
      
      if (settings.sequentialNaming !== false) {
        getSequentialFilename(folder, fileExt, (filename) => {
          handleDownload(item.url, filename, item.prompt || "");
          completedCount++;
          checkDone();
          setTimeout(downloadNext, settings.downloadDelay || 500);
        });
      } else {
        const cleanPrompt = (item.prompt || "").substring(0, 40).replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `${folder}/${item.groupIndex || 0}_${cleanPrompt}_${item.imageIndex || 0}.${fileExt}`;
        handleDownload(item.url, filename, item.prompt || "");
        completedCount++;
        checkDone();
        setTimeout(downloadNext, settings.downloadDelay || 500);
      }
    }
    
    function checkDone() {
      if (completedCount >= selectedItems.length) {
        sendResponse({ success: true, count: completedCount });
      }
    }
    
    downloadNext();
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

// Run a quick migration to append new default styles if missing on service worker startup
chrome.storage.local.get(["styles"], (result) => {
  if (result.styles) {
    let styles = result.styles;
    let updated = false;
    const newDefaults = [
      { id: "style_horror", name: "Dark Horror", promptText: "dark horror theme, creepy eerie atmosphere, dim atmospheric lighting, heavy shadows, haunting mysterious vibes, highly detailed gothic design, suspenseful, 4k resolution" },
      { id: "style_2dpaint", name: "2D Animated Painting", promptText: "2d animated watercolor painting, beautiful artistic brush strokes, soft hand-drawn illustrations, colorful expressive paint drips, dreamy storybook aesthetic, fluid motion texture, whimsical 2d animation concept" },
      { id: "style_2d_horror_storybook", name: "2D Horror Storybook", promptText: "illustrated in a 2D horror storybook animation style, gritty watercolor and charcoal texture, rough expressive brushwork, imperfect sketch lines, dark fantasy nightmare aesthetic, dramatic high-contrast lighting, desaturated eerie tones, atmospheric cinematic depth, subtle animated fog drift, frame-by-frame tradigital feel, no 3D rendering, widescreen horror composition, avoiding: 3D, realistic CGI, glossy render, anime, bright colors, modern city, comedy tone, clean vector art, plastic texture, futuristic elements, over-smooth motion, photorealism" }
    ];
    newDefaults.forEach(ds => {
      if (!styles.some(s => s.id === ds.id)) {
        styles.push(ds);
        updated = true;
      }
    });
    if (updated) {
      chrome.storage.local.set({ styles: styles });
    }
  }
});
