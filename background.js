// background service worker for Deep Work Blocker

let isDeepWorkActive = false;
let sessionStartTime = null;
let blockedSites = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  await initializeStorage();
});

async function initializeStorage() {
  const result = await chrome.storage.local.get(['blockedSites', 'isDeepWorkActive', 'sessionStartTime']);
  
  if (!result.blockedSites) {
    await chrome.storage.local.set({ 
      blockedSites: [
        'instagram.com',
        'youtube.com',
        'tiktok.com'
      ] 
    });
  }
  
  blockedSites = result.blockedSites || [];
  isDeepWorkActive = result.isDeepWorkActive || false;
  sessionStartTime = result.sessionStartTime || null;
  
  if (isDeepWorkActive) {
    await updateBlockingRules();
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue;
    if (isDeepWorkActive) {
      await updateBlockingRules();
    }
  }
  
  if (changes.isDeepWorkActive) {
    isDeepWorkActive = changes.isDeepWorkActive.newValue;
    if (isDeepWorkActive) {
      await updateBlockingRules();
    } else {
      await clearBlockingRules();
    }
  }
  
  if (changes.sessionStartTime) {
    sessionStartTime = changes.sessionStartTime.newValue;
  }
});

async function updateBlockingRules() {
  if (!isDeepWorkActive || blockedSites.length === 0) {
    await clearBlockingRules();
    return;
  }

  const rules = [];
  let ruleId = 1;

  blockedSites.forEach(site => {
    // Create multiple rules to catch all variations of the domain
    const patterns = [
      `*://*${site}/*`,           // Standard: https://x.com/anything
      `*://${site}/*`,            // Direct: https://x.com/anything
      `*://www.${site}/*`,        // With www: https://www.x.com/anything
      `*://*.${site}/*`,          // Subdomains: https://subdomain.x.com/anything
      `*://*${site}`,             // No trailing slash: https://x.com
      `*://${site}`,              // Direct no slash: https://x.com
      `*://www.${site}`,          // www no slash: https://www.x.com
      `*://*.${site}`             // Subdomain no slash: https://sub.x.com
    ];

    patterns.forEach(pattern => {
      rules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            url: chrome.runtime.getURL("blocked.html")
          }
        },
        condition: {
          urlFilter: pattern,
          resourceTypes: ["main_frame"]
        }
      });
    });
  });

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1), // Increased to handle more rules
      addRules: rules
    });
    console.log(`Updated blocking rules for ${blockedSites.length} sites with ${rules.length} total patterns`);
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

async function clearBlockingRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1) // Increased to match updateBlockingRules
    });
  } catch (error) {
    console.error('Error clearing blocking rules:', error);
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.action) {
    case 'startDeepWork':
      isDeepWorkActive = true;
      sessionStartTime = Date.now();
      await chrome.storage.local.set({ 
        isDeepWorkActive: true,
        sessionStartTime: sessionStartTime
      });
      await updateBlockingRules();
      sendResponse({ success: true });
      break;
      
    case 'stopDeepWork':
      isDeepWorkActive = false;
      sessionStartTime = null;
      await chrome.storage.local.set({ 
        isDeepWorkActive: false,
        sessionStartTime: null
      });
      await clearBlockingRules();
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      sendResponse({
        isActive: isDeepWorkActive,
        startTime: sessionStartTime,
        blockedSites: blockedSites
      });
      break;
      
    case 'addSite':
      if (request.site && !blockedSites.includes(request.site)) {
        blockedSites.push(request.site);
        await chrome.storage.local.set({ blockedSites });
        if (isDeepWorkActive) {
          await updateBlockingRules();
        }
      }
      sendResponse({ success: true });
      break;
      
    case 'removeSite':
      blockedSites = blockedSites.filter(site => site !== request.site);
      await chrome.storage.local.set({ blockedSites });
      if (isDeepWorkActive) {
        await updateBlockingRules();
      }
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(async () => {
  await clearBlockingRules();
}); 