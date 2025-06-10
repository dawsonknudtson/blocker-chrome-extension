// background service worker for Deep Work Blocker

let isDeepWorkActive = false;
let sessionStartTime = null;
let blockedSites = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated - initializing storage...');
  await initializeStorage();
});

// Also initialize when service worker starts up
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension service worker starting up - reloading data...');
  await initializeStorage();
});

// Initialize immediately when service worker loads
(async () => {
  console.log('⚡ Service worker loaded - initializing...');
  await initializeStorage();
})();

// Listen for when blocking rules are triggered
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  console.log(' BLOCKED:', details.request.url);
  console.log('Rule that matched:', details.rule);
});

async function initializeStorage() {
  const result = await chrome.storage.local.get(['blockedSites', 'isDeepWorkActive', 'sessionStartTime']);
  
  // Default blocked sites - only set if no blocked sites exist at all
  if (!result.blockedSites || result.blockedSites.length === 0) {
    const defaultSites = [
      'instagram.com',
      'youtube.com',
      'tiktok.com'
    ];
    
    // Only set defaults if this is truly a fresh install (no blockedSites key exists)
    if (result.blockedSites === undefined) {
      await chrome.storage.local.set({ 
        blockedSites: defaultSites
      });
      blockedSites = defaultSites;
    } else {
      // If blockedSites exists but is empty array, keep it empty (user cleared all sites)
      blockedSites = [];
    }
  } else {
    blockedSites = result.blockedSites;
  }
  
  isDeepWorkActive = result.isDeepWorkActive || false;
  sessionStartTime = result.sessionStartTime || null;
  
  console.log('🔧 Extension initialized with blocked sites:', blockedSites);
  
  if (isDeepWorkActive) {
    await updateBlockingRules();
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue || [];
    console.log('📝 Blocked sites updated:', blockedSites);
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
    // Clean the site domain (remove any protocols, www, etc.)
    const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    console.log(`Creating rules for domain: ${cleanSite}`);
    
    // Create VERY comprehensive rules to catch ALL variations
    const patterns = [
      // Exact domain matches
      `*://${cleanSite}`,
      `*://${cleanSite}/`,
      `*://${cleanSite}/*`,
      `*://www.${cleanSite}`,
      `*://www.${cleanSite}/`,
      `*://www.${cleanSite}/*`,
      
      // HTTP specifically
      `http://${cleanSite}`,
      `http://${cleanSite}/`,
      `http://${cleanSite}/*`,
      `http://www.${cleanSite}`,
      `http://www.${cleanSite}/`,
      `http://www.${cleanSite}/*`,
      
      // HTTPS specifically  
      `https://${cleanSite}`,
      `https://${cleanSite}/`,
      `https://${cleanSite}/*`,
      `https://www.${cleanSite}`,
      `https://www.${cleanSite}/`,
      `https://www.${cleanSite}/*`,
      
      // Wildcard patterns for subdomains
      `*://*.${cleanSite}`,
      `*://*.${cleanSite}/`,
      `*://*.${cleanSite}/*`,
      
      // Catch any URL containing the domain
      `*://*${cleanSite}*`,
      `http://*${cleanSite}*`,
      `https://*${cleanSite}*`
    ];

    patterns.forEach((pattern, index) => {
      if (ruleId <= 1000) { // Chrome has a limit on dynamic rules
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
        
        if (index < 5) { // Log first few patterns for debugging
          console.log(`  Pattern ${index + 1}: ${pattern}`);
        }
      }
    });
    
    console.log(`  Created ${Math.min(patterns.length, 1000 - (ruleId - patterns.length))} rules for ${cleanSite}`);
  });

  try {
    // First clear all existing rules
    console.log('Clearing existing blocking rules...');
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 1000 }, (_, i) => i + 1)
    });
    
    // Then add new rules
    console.log(`Adding ${rules.length} new blocking rules...`);
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
    
    console.log(`✅ Successfully updated blocking rules!`);
    console.log(`📋 Blocked sites: ${blockedSites.join(', ')}`);
    console.log(`🔢 Total rules created: ${rules.length}`);
    
    // Test a few specific patterns
    const testSite = blockedSites[0];
    if (testSite) {
      console.log(`🧪 Test URLs that should be blocked for "${testSite}":`);
      console.log(`   - https://${testSite}`);
      console.log(`   - https://${testSite}/home`);
      console.log(`   - http://${testSite}/anything`);
      console.log(`   - https://www.${testSite}/page`);
    }
    
  } catch (error) {
    console.error('❌ Error updating blocking rules:', error);
    console.error('Failed rules:', rules.slice(0, 3));
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
      console.log('Starting deep work session...');
      isDeepWorkActive = true;
      sessionStartTime = Date.now();
      await chrome.storage.local.set({ 
        isDeepWorkActive: true,
        sessionStartTime: sessionStartTime
      });
      console.log('Applying blocking rules...');
      await updateBlockingRules();
      console.log('Deep work session started successfully');
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
        console.log(' Added site:', request.site, 'Total sites:', blockedSites.length);
        if (isDeepWorkActive) {
          await updateBlockingRules();
        }
      }
      sendResponse({ success: true });
      break;
      
    case 'removeSite':
      blockedSites = blockedSites.filter(site => site !== request.site);
      await chrome.storage.local.set({ blockedSites });
      console.log(' Removed site:', request.site, 'Remaining sites:', blockedSites.length);
      if (isDeepWorkActive) {
        await updateBlockingRules();
      }
      sendResponse({ success: true });
      break;
      
    case 'getStorageInfo':
      // Diagnostic function to check storage state
      const storageData = await chrome.storage.local.get(null);
      console.log('Full storage contents:', storageData);
      sendResponse({ 
        success: true, 
        storage: storageData,
        memoryState: {
          blockedSites,
          isDeepWorkActive,
          sessionStartTime
        }
      });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(async () => {
  await clearBlockingRules();
}); 