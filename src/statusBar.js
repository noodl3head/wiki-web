// Status Bar - Vanilla JS implementation
// Displays: Tier number, Breadcrumbs, Latency, Loading state

let statusBarEl = null
let treeModalEl = null
let state = {
  tier: 1,
  breadcrumbs: [],
  latency: 0,
  isLoading: false
}

const tunnelIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="none">
  <ellipse cx="32" cy="29.1118" rx="25.3594" ry="6.21545" fill="currentColor"/>
  <path d="M60.9514 30.0757C60.9514 34.5812 47.9894 38.2336 32 38.2336C16.0106 38.2336 3.04858 34.5812 3.04858 30.0757" stroke="currentColor"/>
</svg>`

const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M13 13L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`

const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M3 10L10 3L17 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M5 8V17H15V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`

export function createStatusBar(container) {
  statusBarEl = document.createElement('div')
  statusBarEl.className = 'status-bar'
  statusBarEl.innerHTML = `
    <div class="status-bar-ghost">
      <div class="latency-indicator">
        <span class="latency-dot"></span>
        <span class="latency-value">-- ms</span>
      </div>
      <div class="bunny-container">
        <img src="/bunny-terraria.png" class="bunny bunny-static" alt="" />
        <img src="/bunny-terraria.gif" class="bunny bunny-animated" alt="" />
      </div>
    </div>
    <div class="status-bar-center">
      <div class="tunnel-info-container">
        <div class="tunnel-info-left">
          <div class="tier-number">
            <span class="tier-value">01</span>
          </div>
          <div class="breadcrumbs">
            <span class="breadcrumb-prev"></span>
            <span class="breadcrumb-current">Start</span>
          </div>
        </div>
        <button class="get-tree-btn">
          ${tunnelIcon}
          <span>See Tunnel</span>
        </button>
      </div>
      <div class="action-bar-container">
        <button class="action-btn search-btn">
          ${searchIcon}
        </button>
        <button class="action-btn home-btn">
          ${homeIcon}
        </button>
      </div>
    </div>
    <div class="latency-load-pill">
      <div class="latency-indicator">
        <span class="latency-dot"></span>
        <span class="latency-value">-- ms</span>
      </div>
      <div class="bunny-container">
        <img src="/bunny-terraria.png" class="bunny bunny-static" alt="" />
        <img src="/bunny-terraria.gif" class="bunny bunny-animated" alt="" />
      </div>
    </div>
  `
  
  // Create tree modal
  treeModalEl = document.createElement('div')
  treeModalEl.className = 'tree-modal hidden'
  treeModalEl.innerHTML = `
    <div class="tree-modal-content">
      <div class="tree-modal-header">
        <span>Your Tunnel</span>
        <button class="tree-modal-close">&times;</button>
      </div>
      <div class="tree-modal-body"></div>
    </div>
  `
  
  container.appendChild(statusBarEl)
  container.appendChild(treeModalEl)
  
  // Add event listeners
  const getTreeBtn = statusBarEl.querySelector('.get-tree-btn')
  getTreeBtn.addEventListener('click', showTreeModal)
  
  const searchBtn = statusBarEl.querySelector('.search-btn')
  searchBtn.addEventListener('click', () => {
    // TODO: Implement search functionality
    console.log('Search clicked')
  })
  
  const homeBtn = statusBarEl.querySelector('.home-btn')
  homeBtn.addEventListener('click', () => {
    // TODO: Implement home functionality
    console.log('Home clicked')
  })
  
  const closeBtn = treeModalEl.querySelector('.tree-modal-close')
  closeBtn.addEventListener('click', hideTreeModal)
  
  treeModalEl.addEventListener('click', (e) => {
    if (e.target === treeModalEl) hideTreeModal()
  })
  
  // Sync ghost container width with latency pill after render
  requestAnimationFrame(() => {
    syncGhostWidth()
  })
  
  return statusBarEl
}

function syncGhostWidth() {
  if (!statusBarEl) return
  const latencyPill = statusBarEl.querySelector('.latency-load-pill')
  const ghost = statusBarEl.querySelector('.status-bar-ghost')
  if (latencyPill && ghost) {
    const width = latencyPill.offsetWidth
    ghost.style.width = `${width}px`
  }
}

function showTreeModal() {
  const body = treeModalEl.querySelector('.tree-modal-body')
  
  if (state.breadcrumbs.length === 0) {
    body.innerHTML = '<p class="tree-empty">No path yet. Start exploring!</p>'
  } else {
    body.innerHTML = state.breadcrumbs.map((title, i) => `
      <div class="tree-item">
        <span class="tree-level">${String(i + 1).padStart(2, '0')}</span>
        <span class="tree-title">${title}</span>
      </div>
    `).join('')
  }
  
  treeModalEl.classList.remove('hidden')
}

function hideTreeModal() {
  treeModalEl.classList.add('hidden')
}

export function updateStatusBar(updates) {
  if (!statusBarEl) return
  
  if (updates.tier !== undefined) {
    state.tier = updates.tier
    const tierEl = statusBarEl.querySelector('.tier-value')
    tierEl.textContent = String(state.tier).padStart(2, '0')
  }
  
  if (updates.breadcrumbs !== undefined) {
    state.breadcrumbs = updates.breadcrumbs
    const prevEl = statusBarEl.querySelector('.breadcrumb-prev')
    const currEl = statusBarEl.querySelector('.breadcrumb-current')
    
    if (state.breadcrumbs.length === 0) {
      prevEl.textContent = ''
      currEl.textContent = 'Start'
    } else if (state.breadcrumbs.length === 1) {
      prevEl.textContent = ''
      currEl.textContent = state.breadcrumbs[0]
    } else {
      // Show last two items in the path
      const prev = state.breadcrumbs[state.breadcrumbs.length - 2]
      const curr = state.breadcrumbs[state.breadcrumbs.length - 1]
      prevEl.textContent = `${prev} >`
      currEl.textContent = curr
    }
  }
  
  if (updates.latency !== undefined) {
    state.latency = updates.latency
    const latencyEl = statusBarEl.querySelector('.latency-load-pill .latency-value')
    latencyEl.textContent = state.latency > 0 ? `${state.latency} ms` : '-- ms'
    
    // Update dot color based on latency
    const dotEl = statusBarEl.querySelector('.latency-load-pill .latency-dot')
    if (state.latency === 0) {
      dotEl.style.backgroundColor = '#888'
    } else if (state.latency < 300) {
      dotEl.style.backgroundColor = '#22c55e' // Green - fast
    } else if (state.latency < 800) {
      dotEl.style.backgroundColor = '#eab308' // Yellow - medium
    } else {
      dotEl.style.backgroundColor = '#ef4444' // Red - slow
    }
  }
  
  if (updates.isLoading !== undefined) {
    state.isLoading = updates.isLoading
    const bunnyStatic = statusBarEl.querySelector('.latency-load-pill .bunny-static')
    const bunnyAnimated = statusBarEl.querySelector('.latency-load-pill .bunny-animated')
    if (state.isLoading) {
      bunnyStatic.style.opacity = '0'
      bunnyAnimated.style.opacity = '1'
    } else {
      bunnyStatic.style.opacity = '1'
      bunnyAnimated.style.opacity = '0'
    }
  }
  
  // Sync ghost width after any update that might change pill width
  requestAnimationFrame(() => {
    syncGhostWidth()
  })
}

export function setLoading(isLoading) {
  updateStatusBar({ isLoading })
}

export function setLatency(ms) {
  updateStatusBar({ latency: ms })
}

export function setTier(tier) {
  updateStatusBar({ tier })
}

export function setBreadcrumbs(breadcrumbs) {
  updateStatusBar({ breadcrumbs })
}

export function addBreadcrumb(title) {
  const newBreadcrumbs = [...state.breadcrumbs, title]
  updateStatusBar({ breadcrumbs: newBreadcrumbs })
}
