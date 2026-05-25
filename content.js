console.log("Meta AI Flow v2.0 Content Script loaded!");

// Listen for messages from background script or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "EXECUTE_PROMPT") {
    executePromptAutomation(message.prompt, message.index)
      .then((urls) => {
        chrome.runtime.sendMessage({
          action: "PROMPT_COMPLETED",
          urls: urls,
          prompt: message.rawPrompt
        });
      })
      .catch((err) => {
        chrome.runtime.sendMessage({
          action: "PROMPT_FAILED",
          error: err.message || err
        });
      });
    sendResponse({ status: "started" });
  }

  if (message.action === "SCRAPE_PAGE") {
    const mediaItems = scrapePageMedia();
    sendResponse({ media: mediaItems });
  }

  if (message.action === "AUTO_SCROLL_SCRAPE") {
    autoScrollAndScrape()
      .then((mediaItems) => {
        sendResponse({ media: mediaItems });
      })
      .catch((err) => {
        sendResponse({ media: [], error: err.message });
      });
    return true; // Keep channel open for async
  }

  if (message.action === "DOWNLOAD_VIA_HTML") {
    downloadViaCanvas(message.selector, message.url, message.mediaType)
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async
  }

  if (message.action === "DOWNLOAD_VIDEO_HTML") {
    downloadVideoViaBlob(message.url)
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  return true; // Keep message channel open
});

// ========================================
// HTML Canvas-based Image Download (No Watermark)
// ========================================

/**
 * Downloads an image by drawing it on a hidden canvas element.
 * This extracts the rendered pixel data from the HTML page itself,
 * avoiding any server-side watermarks that might be in the URL response.
 */
async function downloadViaCanvas(selector, fallbackUrl, mediaType) {
  let imgElement = null;

  // Try to find the image element by selector
  if (selector) {
    try {
      imgElement = document.querySelector(selector);
    } catch (e) {
      console.warn("Selector lookup failed:", e);
    }
  }

  // Fallback: find by src URL
  if (!imgElement && fallbackUrl) {
    const allImgs = document.querySelectorAll('img');
    for (const img of allImgs) {
      if (img.src === fallbackUrl || img.getAttribute('src') === fallbackUrl) {
        imgElement = img;
        break;
      }
    }
  }

  if (!imgElement) {
    throw new Error("Image element not found on page. Falling back to direct URL.");
  }

  // Wait for the image to fully load
  if (!imgElement.complete) {
    await new Promise((resolve, reject) => {
      imgElement.onload = resolve;
      imgElement.onerror = reject;
      setTimeout(reject, 10000); // 10s timeout
    });
  }

  // Create a canvas and draw the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Use natural dimensions for highest quality
  canvas.width = imgElement.naturalWidth || imgElement.width;
  canvas.height = imgElement.naturalHeight || imgElement.height;

  // Draw the image from the HTML element
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

  // Convert to data URL (PNG for lossless quality)
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  // Cleanup
  canvas.remove();

  return dataUrl;
}

/**
 * Downloads a video via fetch → blob → data URL.
 * Videos can't be drawn to canvas for full extraction,
 * so we fetch the blob directly.
 */
async function downloadVideoViaBlob(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    throw new Error("Video fetch failed: " + e.message);
  }
}

// ========================================
// Auto-Scroll and Scrape
// ========================================

async function autoScrollAndScrape() {
  const chatContainer = findChatContainer();
  if (!chatContainer) {
    // Fallback: scroll the document body
    return await scrollAndScrape(document.documentElement);
  }
  return await scrollAndScrape(chatContainer);
}

function findChatContainer() {
  const selectors = [
    '[role="main"]',
    '[class*="chat"]',
    '[class*="conversation"]',
    '[class*="messages"]',
    'main',
    '.overflow-y-auto'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.scrollHeight > el.clientHeight) {
      return el;
    }
  }
  return null;
}

async function scrollAndScrape(container) {
  const scrollStep = 500;
  const maxScrolls = 50;
  let scrollCount = 0;

  // Scroll to top first
  container.scrollTop = 0;
  await delay(500);

  // Scroll down incrementally
  while (scrollCount < maxScrolls) {
    const prevScrollTop = container.scrollTop;
    container.scrollTop += scrollStep;
    await delay(300);

    // If we didn't scroll, we've reached the bottom
    if (container.scrollTop === prevScrollTop) break;
    scrollCount++;
  }

  // Wait for any lazy-loaded images
  await delay(1000);

  // Now scrape everything
  return scrapePageMedia();
}

// ========================================
// Input Automation
// ========================================

// Helper: Find the Meta AI input element
function findInputElement() {
  const selectors = [
    'div[role="textbox"]',
    'textarea[placeholder*="Meta AI"]',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// Helper: Find the Send/Submit button
function findSendButton(inputEl) {
  const selectors = [
    'button[aria-label*="Send"]',
    'button[aria-label*="Message"]',
    'button[aria-label*="Submit"]',
    '[role="button"][aria-label*="Send"]',
    '[role="button"][aria-label*="Message"]',
    '[role="button"][aria-label*="Submit"]',
    'button[type="submit"]',
    'button:has(svg)',
    '[aria-label*="Send"]',
    '[aria-label*="Message"]'
  ];

  // Try global selectors first
  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }
  
  // Try to find relative to input element parent container
  let container = inputEl ? inputEl.parentElement : document;
  while (container && container !== document.body && !container.querySelector('button') && !container.querySelector('[role="button"]')) {
    container = container.parentElement;
  }
  
  if (container && container !== document.body) {
    // Return last button or clickable element in container
    const clickables = container.querySelectorAll('button, [role="button"]');
    if (clickables.length > 0) {
      return clickables[clickables.length - 1];
    }
  }

  return null;
}

// Helper: Simulate typing behavior
function simulateTyping(element, text) {
  element.focus();
  
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    try {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      ).set;
      nativeValueSetter.call(element, text);
    } catch (e) {
      element.value = text;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Contenteditable div (React / standard web editors)
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.addRange(range);
    }
    
    // Clear and insert text using execCommand which updates React's internal state
    element.innerHTML = "";
    try {
      document.execCommand('insertText', false, text);
    } catch (e) {
      console.warn("execCommand failed, falling back to innerText setter:", e);
      element.innerText = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// Helper: Simulate Enter keypress
function pressEnter(element) {
  const events = ['keydown', 'keypress', 'keyup'];
  events.forEach(eventName => {
    const ev = new KeyboardEvent(eventName, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(ev);
  });
}

// Main function: Executes the prompt submission and waits for media generation
async function executePromptAutomation(prompt, index) {
  const inputEl = findInputElement();
  if (!inputEl) {
    throw new Error("Could not find Meta AI input text area. Make sure you are logged in and on the correct page.");
  }

  // 1. Snapshot the page's current images and videos to identify new generations
  const existingMedia = getPageMediaUrls();
  console.log(`Initial media count: ${existingMedia.size}`);

  // 2. Input the prompt
  simulateTyping(inputEl, prompt);
  await delay(1000); // Wait a full second for input processing

  // 3. Find and click Send
  const sendBtn = findSendButton(inputEl);
  if (sendBtn) {
    console.log("Clicking send button...");
    sendBtn.click();
  } else {
    console.log("Send button not found. Simulating Enter key series...");
    pressEnter(inputEl);
  }

  // 4. Wait for generation to start and then complete
  console.log("Waiting for generation...");
  return await waitForNewMedia(existingMedia);
}

// ========================================
// Media Detection & Scraping
// ========================================

// Get set of all currently loaded media URLs
function getPageMediaUrls() {
  const urls = new Set();
  
  // Fetch images
  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('src');
    if (src && isAIResource(src)) {
      urls.add(src);
    }
  });

  // Fetch videos
  document.querySelectorAll('video').forEach(vid => {
    const src = vid.src || vid.currentSrc || vid.querySelector('source')?.src;
    if (src) {
      urls.add(src);
    }
  });

  return urls;
}

// Check if a URL looks like an AI-generated resource from Meta's CDN
function isAIResource(url) {
  // Meta AI CDN resources usually include fbcdn.net, scontent, or blob:
  const isCdn = url.includes("fbcdn.net") || url.includes("scontent") || url.includes("cdninstagram.com");
  // Exclude tiny icons, avatars, profile pics (typically small sizes like 40x40, 32x32, or containing avatar/profile in url)
  const isProfile = url.includes("profile") || url.includes("avatar") || url.includes("emoji");
  return isCdn && !isProfile;
}

// Generate a unique CSS selector path for an element
function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  
  const path = [];
  let current = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    // Add nth-child if needed
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

// Watch for new media to appear on the page
function waitForNewMedia(existingMedia, timeoutSeconds = 90) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Polling function to check for new images/videos
    const checkInterval = setInterval(() => {
      const currentMediaUrls = getPageMediaUrls();
      const newUrls = [];
      
      for (const url of currentMediaUrls) {
        if (!existingMedia.has(url)) {
          newUrls.push(url);
        }
      }
      
      // If we found new media
      if (newUrls.length > 0) {
        // Meta AI might render a video or low-res image first.
        // Let's verify if the generating indicators are gone, or wait a short moment for final assets.
        const isGenerating = document.querySelector('[role="progressbar"], .generating, [class*="loading"], [class*="spinner"]') !== null;
        
        if (!isGenerating) {
          clearInterval(checkInterval);
          console.log("New media generated successfully:", newUrls);
          resolve(newUrls);
        }
      }
      
      // Timeout guard
      if (Date.now() - startTime > timeoutSeconds * 1000) {
        clearInterval(checkInterval);
        
        // If we found some new URLs but they were marked as generating, let's return them anyway as fallback
        if (newUrls.length > 0) {
          console.log("Timeout reached, returning found media anyway:", newUrls);
          resolve(newUrls);
        } else {
          reject(new Error("Generation timed out. No new images/videos detected."));
        }
      }
    }, 1500);
  });
}

// Scrape page media for bulk downloader gallery
function scrapePageMedia() {
  const items = [];
  const processedUrls = new Set();
  
  // Find all generated images
  document.querySelectorAll('img').forEach(img => {
    const src = img.src || img.getAttribute('src');
    if (src && isAIResource(src) && !processedUrls.has(src)) {
      // Avoid small icons
      if (img.naturalWidth > 150 || img.width > 150 || !img.naturalWidth) {
        processedUrls.add(src);
        
        // Try to find the prompt
        let promptText = img.alt || img.getAttribute('aria-label') || "";
        if (!promptText) {
          let parentBubble = img.closest('[role="article"]') || img.closest('.chat-message') || img.parentElement;
          if (parentBubble) {
            promptText = parentBubble.innerText?.substring(0, 100) || "";
          }
        }
        
        // Get CSS selector for HTML canvas download
        const selector = getUniqueSelector(img);
        
        items.push({
          type: "image",
          url: src,
          prompt: promptText.trim(),
          selector: selector,
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0
        });
      }
    }
  });

  // Find all generated videos
  document.querySelectorAll('video').forEach(video => {
    const src = video.src || video.currentSrc || video.querySelector('source')?.src;
    if (src && !processedUrls.has(src)) {
      processedUrls.add(src);
      
      let promptText = "";
      let parentBubble = video.closest('[role="article"]') || video.closest('.chat-message') || video.parentElement;
      if (parentBubble) {
        const imgSibling = parentBubble.querySelector('img');
        promptText = imgSibling?.alt || parentBubble.innerText?.substring(0, 100) || "";
      }
      
      const selector = getUniqueSelector(video);
      
      items.push({
        type: "video",
        url: src,
        prompt: promptText.trim(),
        selector: selector,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0
      });
    }
  });

  return items;
}

// Utility: simple promise-based delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
