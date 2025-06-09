let timerInterval;
let startTime;

const timer = document.getElementById('timer');
const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const siteList = document.getElementById('siteList');
const newSiteInput = document.getElementById('newSite');
const addSiteBtn = document.getElementById('addSiteBtn');

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadBlockedSites();
  setupEventListeners();
});

function setupEventListeners() {
  startBtn.addEventListener('click', startDeepWork);
  stopBtn.addEventListener('click', stopDeepWork);
  addSiteBtn.addEventListener('click', addSite);
  newSiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addSite();
    }
  });
}

async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    if (response.isActive) {
      startTime = response.startTime;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      status.textContent = 'Deep work session active';
      startTimer();
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      status.textContent = 'Ready for deep work';
      timer.textContent = '00:00:00';
    }
  } catch (error) {
    console.error('Error loading status:', error);
  }
}

async function loadBlockedSites() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    const sites = response.blockedSites || [];
    
    siteList.innerHTML = '';
    
    if (sites.length === 0) {
      siteList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 10px;">No sites blocked yet</div>';
      return;
    }
    
    sites.forEach(site => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      siteItem.innerHTML = `
        <span>${site}</span>
        <button class="remove-btn" data-site="${site}">Remove</button>
      `;
      
      siteItem.querySelector('.remove-btn').addEventListener('click', () => removeSite(site));
      siteList.appendChild(siteItem);
    });
  } catch (error) {
    console.error('Error loading blocked sites:', error);
  }
}

async function startDeepWork() {
  try {
    await chrome.runtime.sendMessage({ action: 'startDeepWork' });
    startTime = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.textContent = 'Deep work session active';
    startTimer();
  } catch (error) {
    console.error('Error starting deep work:', error);
  }
}

async function stopDeepWork() {
  try {
    await chrome.runtime.sendMessage({ action: 'stopDeepWork' });
    startBtn.disabled = false;
    stopBtn.disabled = true;
    status.textContent = 'Session completed!';
    stopTimer();
    
    // Show completion message briefly
    setTimeout(() => {
      status.textContent = 'Ready for deep work';
    }, 2000);
  } catch (error) {
    console.error('Error stopping deep work:', error);
  }
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer(); // Update immediately
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timer.textContent = '00:00:00';
}

function updateTimer() {
  if (!startTime) return;
  
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  
  timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function addSite() {
  const site = newSiteInput.value.trim();
  
  if (!site) {
    return;
  }
  
  // Remove protocol and www if present
  
  const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '');
  
  if (!isValidDomain(cleanSite)) {
    alert('Please enter a valid domain');
    return;
  } 
  
  try {
    await chrome.runtime.sendMessage({ action: 'addSite', site: cleanSite });
    newSiteInput.value = '';
    await loadBlockedSites();
  } catch (error) {
    console.error('Error adding site:', error);
  }
}

async function removeSite(site) {
  try {
    await chrome.runtime.sendMessage({ action: 'removeSite', site });
    await loadBlockedSites();
  } catch (error) {
    console.error('Error removing site:', error);
  }
}

function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

// Clean up interval when popup closes
window.addEventListener('beforeunload', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
}); 