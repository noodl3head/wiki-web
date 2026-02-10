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

const treeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="13" viewBox="0 0 16 13" fill="none">
  <rect x="10.3662" width="5.12071" height="1.66979" fill="currentColor"/>
  <rect x="10.3662" y="5.45148" width="5.12071" height="1.66979" fill="currentColor"/>
  <rect x="10.3662" y="10.9031" width="5.12071" height="1.66979" fill="currentColor"/>
  <path d="M5.23462 6.34902C5.23462 6.34902 6.58084 6.34902 7.35106 6.34902M10.9394 6.34902C10.9394 6.34902 8.57956 6.34902 7.35106 6.34902M7.35106 6.34902C7.35106 4.32527 7.32482 2.51359 8.96712 1.3888C9.45193 1.05677 10.06 0.844276 10.646 0.802063M7.35106 6.34902C7.35106 8.47581 7.41399 10.0803 8.96712 11.1663C9.494 11.5347 9.84401 11.7031 10.646 11.753" stroke="currentColor" stroke-width="0.678206"/>
  <rect y="5.32587" width="5.89152" height="1.92114" fill="currentColor"/>
</svg>`

export function createStatusBar(container) {
  statusBarEl = document.createElement('div')
  statusBarEl.className = 'status-bar'
  statusBarEl.innerHTML = `
    <div class="status-bar-left">
      <div class="tier-number">
        <span class="tier-value">01</span>
      </div>
      <button class="get-tree-btn">
        ${treeIcon}
        <span>Get Tree</span>
      </button>
      <div class="breadcrumbs">
        <span class="breadcrumb-prev"></span>
        <span class="breadcrumb-current">Start</span>
      </div>
    </div>
    <div class="status-bar-right">
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
  
  const closeBtn = treeModalEl.querySelector('.tree-modal-close')
  closeBtn.addEventListener('click', hideTreeModal)
  
  treeModalEl.addEventListener('click', (e) => {
    if (e.target === treeModalEl) hideTreeModal()
  })
  
  return statusBarEl
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
    const latencyEl = statusBarEl.querySelector('.latency-value')
    latencyEl.textContent = state.latency > 0 ? `${state.latency} ms` : '-- ms'
    
    // Update dot color based on latency
    const dotEl = statusBarEl.querySelector('.latency-dot')
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
    const bunnyStatic = statusBarEl.querySelector('.bunny-static')
    const bunnyAnimated = statusBarEl.querySelector('.bunny-animated')
    if (state.isLoading) {
      bunnyStatic.style.opacity = '0'
      bunnyAnimated.style.opacity = '1'
    } else {
      bunnyStatic.style.opacity = '1'
      bunnyAnimated.style.opacity = '0'
    }
  }
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
