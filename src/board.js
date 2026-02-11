import { createStatusBar, setTier, setBreadcrumbs, setLoading, setLatency } from './statusBar.js'

export function initBoardPage(container, initialArticle) {
  container.innerHTML = `
    <div class="board-page">
      <svg class="connections" id="connections"></svg>
      <div class="board-canvas" id="boardCanvas"></div>
    </div>
  `

  // Create status bar
  createStatusBar(container)
  
  // Initialize with first article title
  if (initialArticle && initialArticle.title) {
    setBreadcrumbs([initialArticle.title])
    setTier(1)
  }

  const boardCanvas = document.getElementById('boardCanvas')
  const connectionsEl = document.getElementById('connections')
  const boardPage = container.querySelector('.board-page')
  
  const articles = []
  const connections = []
  let scale = 1
  let depthLevel = 0 // Track how deep into the rabbit hole we've gone
  // Use a fixed large canvas size - the transform handles positioning
  const canvasSize = 100000
  const canvasCenter = canvasSize / 2
  // Center the large canvas in the viewport initially
  let translateX = window.innerWidth / 2 - canvasCenter
  let translateY = window.innerHeight / 2 - canvasCenter
  let isPanning = false
  let startX, startY
  const cardPositions = [] // Track occupied positions
  const autoExpandedCards = new Set() // Track which cards have auto-expanded
  const pendingExpansions = new Set() // Track cards currently being fetched
  
  // Spatial grid for fast collision detection
  const GRID_SIZE = 500 // Each grid cell is 500x500
  const spatialGrid = new Map() // key: "x,y" grid coords, value: array of cards
  const articleCache = new Map() // Cache fetched articles to avoid re-fetching
  
  // Update colors based on distance from origin card
  function updateDepthColors() {
    // Stay beige for first 4 generations, then transition to dark grey by generation 10
    // Generation 0-3 = beige, Generation 4-10 = beige to #252525 transition
    const startDepth = 4
    const maxDepth = 10
    
    let progress = 0
    if (depthLevel >= startDepth) {
      progress = Math.min((depthLevel - startDepth) / (maxDepth - startDepth), 1)
    }
    
    // Base color: #d9d3c7 (217, 211, 199)
    // Target dark color: #252525 (37, 37, 37)
    const baseR = 217, baseG = 211, baseB = 199
    const darkR = 37, darkG = 37, darkB = 37
    
    let bgColor, elementColor, useBlendMode
    
    // Tier 8 and 9 (depthLevel 7 and 8) have mid-grey backgrounds which cause poor contrast with blend mode
    // Use explicit colors without blend mode for these levels
    const tier = depthLevel + 1
    if (tier === 8) {
      bgColor = '#7F7C76'
      elementColor = '#EBEBEB'
      useBlendMode = false
    } else if (tier === 9) {
      bgColor = '#615F5B'
      elementColor = '#EBEBEB'
      useBlendMode = false
    } else {
      // Normal blend mode progression
      useBlendMode = true
      
      // Background transitions linearly from beige to dark grey
      const newR = Math.round(baseR + (darkR - baseR) * progress)
      const newG = Math.round(baseG + (darkG - baseG) * progress)
      const newB = Math.round(baseB + (darkB - baseB) * progress)
      bgColor = `rgb(${newR}, ${newG}, ${newB})`
      
      if (progress < 0.2) {
        // Light background: use original beige color
        elementColor = `rgb(${baseR}, ${baseG}, ${baseB})`
      } else {
        // Transition from light gray to pure white as background darkens
        const elementProgress = (progress - 0.2) / 0.8
        const minElement = 210
        const maxElement = 255
        const elementValue = Math.round(minElement + (maxElement - minElement) * elementProgress)
        elementColor = `rgb(${elementValue}, ${elementValue}, ${elementValue})`
      }
    }
    
    // Set blend mode
    boardPage.style.setProperty('--blend-mode', useBlendMode ? 'difference' : 'normal')
    
    // Background colors change with depth
    boardPage.style.setProperty('--board-bg', bgColor)
    boardPage.style.setProperty('--card-bg', bgColor)
    boardPage.style.setProperty('--connection-label-bg', bgColor)
    
    // Elements with difference blend mode: clamped to original or white
    boardPage.style.setProperty('--card-border', elementColor)
    boardPage.style.setProperty('--card-title-color', elementColor)
    boardPage.style.setProperty('--card-title-border', elementColor)
    boardPage.style.setProperty('--card-text-color', elementColor)
    boardPage.style.setProperty('--card-link-color', elementColor)
    boardPage.style.setProperty('--connection-line-color', elementColor)
    boardPage.style.setProperty('--connection-label-color', elementColor)
  }
  
  // Check if cards are drifting too far from center and re-center if needed
  // Returns the offset applied to all coordinates (0 if no re-centering)
  function checkAndExpandCanvas(cardX, cardY, cardWidth, cardHeight) {
    // If the card position is getting too close to edge of our coordinate space,
    // we re-center all cards back to the middle
    const safeZone = 10000 // Keep cards within this distance from edges
    const maxCoord = canvasSize - safeZone
    const minCoord = safeZone
    
    const needsRecenter = cardX < minCoord || cardY < minCoord || 
                          cardX + cardWidth > maxCoord || cardY + cardHeight > maxCoord
    
    if (needsRecenter && articles.length > 0) {
      // Calculate the center of all current cards
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      articles.forEach(article => {
        minX = Math.min(minX, article.x)
        minY = Math.min(minY, article.y)
        maxX = Math.max(maxX, article.x + article.width)
        maxY = Math.max(maxY, article.y + article.height)
      })
      
      // Also consider the new card position
      minX = Math.min(minX, cardX)
      minY = Math.min(minY, cardY)
      maxX = Math.max(maxX, cardX + cardWidth)
      maxY = Math.max(maxY, cardY + cardHeight)
      
      const currentCenterX = (minX + maxX) / 2
      const currentCenterY = (minY + maxY) / 2
      
      // Calculate offset to move everything back to canvas center
      const offsetX = canvasCenter - currentCenterX
      const offsetY = canvasCenter - currentCenterY
      
      // Move all existing cards
      articles.forEach(article => {
        article.x += offsetX
        article.y += offsetY
        article.element.style.left = `${article.x}px`
        article.element.style.top = `${article.y}px`
      })
      
      // Update all connections and their labels
      connections.forEach(conn => {
        const parentCenterX = conn.parent.x + 200
        const parentCenterY = conn.parent.y + conn.parent.height / 2
        const childCenterX = conn.child.x + 200
        const childCenterY = conn.child.y + conn.child.height / 2
        
        conn.line.setAttribute('x1', parentCenterX)
        conn.line.setAttribute('y1', parentCenterY)
        conn.line.setAttribute('x2', childCenterX)
        conn.line.setAttribute('y2', childCenterY)
        
        if (conn.label) {
          const midX = (parentCenterX + childCenterX) / 2
          const midY = (parentCenterY + childCenterY) / 2
          conn.label.style.left = `${midX}px`
          conn.label.style.top = `${midY}px`
        }
      })
      
      // Adjust translate to maintain view position
      translateX += offsetX
      translateY += offsetY
      updateTransform()
      
      // Clear and rebuild spatial grid
      spatialGrid.clear()
      cardPositions.forEach(pos => {
        pos.x += offsetX
        pos.y += offsetY
        addToGrid(pos)
      })
      
      // Return the offset so the new card position can be adjusted
      return { x: offsetX, y: offsetY }
    }
    
    return { x: 0, y: 0 }
  }
  
  // Check if a card is currently in the center region
  function isCardInCenter(cardData) {
    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2
    const centerRegionWidth = window.innerWidth * 0.5
    const centerRegionHeight = window.innerHeight * 0.3
    
    const cardCenterX = cardData.x * scale + translateX + 200 * scale
    const cardCenterY = (cardData.y + cardData.height / 2) * scale + translateY
    
    const isInCenterX = Math.abs(cardCenterX - viewportCenterX) < centerRegionWidth / 2
    const isInCenterY = Math.abs(cardCenterY - viewportCenterY) < centerRegionHeight / 2
    
    return isInCenterX && isInCenterY
  }
  
  // Check if any cards are in center and should auto-expand
  function checkCenterCards() {
    // Don't auto-expand when zoomed out too far
    if (scale < 0.7) return
    
    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2
    
    // Define center region as 50% horizontal, 30% vertical of viewport dimensions
    const centerRegionWidth = window.innerWidth * 0.5
    const centerRegionHeight = window.innerHeight * 0.3
    
    articles.forEach(cardData => {
      if (cardData.parent && !autoExpandedCards.has(cardData)) {
        // Get card position in viewport coordinates
        const cardCenterX = cardData.x * scale + translateX + 200 * scale
        const cardCenterY = (cardData.y + cardData.height / 2) * scale + translateY
        
        const isInCenterX = Math.abs(cardCenterX - viewportCenterX) < centerRegionWidth / 2
        const isInCenterY = Math.abs(cardCenterY - viewportCenterY) < centerRegionHeight / 2
        
        if (isInCenterX && isInCenterY) {
          autoExpandedCards.add(cardData)
          pendingExpansions.add(cardData)
          
          // Update breadcrumbs to show path to this card
          const path = []
          let current = cardData
          while (current) {
            path.unshift(current.data.title)
            current = current.parent
          }
          setBreadcrumbs(path)
          
          // Update depth based on the card's generation level, not individual cards
          if (cardData.generation > depthLevel) {
            depthLevel = cardData.generation
            updateDepthColors()
            setTier(depthLevel + 1) // Tier is 1-indexed
          }
          autoExpandCard(cardData)
        }
      }
    })
  }
  
  // Apply initial transform and set initial canvas size
  boardCanvas.style.width = `${canvasSize}px`
  boardCanvas.style.height = `${canvasSize}px`
  connectionsEl.setAttribute('width', canvasSize)
  connectionsEl.setAttribute('height', canvasSize)
  setTimeout(() => updateTransform(), 0)

  // Add zoom functionality
  boardPage.addEventListener('wheel', (e) => {
    e.preventDefault()
    
    // If panning, update startX/startY to prevent jump after zoom
    const wasPanning = isPanning
    
    const delta = e.deltaY * -0.001
    const newScale = Math.min(Math.max(0.3, scale + delta), 3)
    
    // Zoom towards cursor position
    const rect = boardPage.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate the point in canvas space before zoom
    const canvasX = (mouseX - translateX) / scale
    const canvasY = (mouseY - translateY) / scale
    
    // Update scale
    scale = newScale
    
    // Adjust translation so the point under cursor stays in place
    translateX = mouseX - canvasX * scale
    translateY = mouseY - canvasY * scale
    
    // If panning, recalculate startX/startY to match new translate values
    if (wasPanning) {
      startX = e.clientX - translateX
      startY = e.clientY - translateY
    }
    
    updateTransform()
    updateDepthColors() // Update colors based on distance from origin
    checkCenterCards() // Check for cards in center after zoom
  })

  // Debounce timer for checking cards while panning
  let panCheckTimer = null
  
  // Add panning with drag
  boardPage.addEventListener('mousedown', (e) => {
    // Only pan if clicking on the board itself, not on cards
    if (e.target === boardPage || e.target === boardCanvas) {
      isPanning = true
      startX = e.clientX - translateX
      startY = e.clientY - translateY
      boardPage.style.cursor = 'grabbing'
      boardPage.classList.add('is-panning') // Prevent text selection during pan
    }
  })

  boardPage.addEventListener('mousemove', (e) => {
    if (isPanning) {
      translateX = e.clientX - startX
      translateY = e.clientY - startY
      updateTransform()
      updateDepthColors() // Update colors as we pan
      
      // Debounced check: trigger after mouse stops moving for 300ms
      clearTimeout(panCheckTimer)
      panCheckTimer = setTimeout(() => {
        checkCenterCards()
      }, 300)
    }
  })

  boardPage.addEventListener('mouseup', () => {
    isPanning = false
    boardPage.style.cursor = 'grab'
    boardPage.classList.remove('is-panning') // Re-enable text selection
    clearTimeout(panCheckTimer) // Clear pending timer
    checkCenterCards() // Check for cards in center after pan
  })

  function updateTransform() {
    boardCanvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
    connectionsEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
  }
  
  // Spatial grid functions for O(1) collision detection
  function getGridKey(x, y) {
    const gridX = Math.floor(x / GRID_SIZE)
    const gridY = Math.floor(y / GRID_SIZE)
    return `${gridX},${gridY}`
  }
  
  function addToGrid(card) {
    // Add card to all grid cells it occupies
    const startGridX = Math.floor(card.x / GRID_SIZE)
    const startGridY = Math.floor(card.y / GRID_SIZE)
    const endGridX = Math.floor((card.x + card.width) / GRID_SIZE)
    const endGridY = Math.floor((card.y + card.height) / GRID_SIZE)
    
    for (let gx = startGridX; gx <= endGridX; gx++) {
      for (let gy = startGridY; gy <= endGridY; gy++) {
        const key = `${gx},${gy}`
        if (!spatialGrid.has(key)) {
          spatialGrid.set(key, [])
        }
        spatialGrid.get(key).push(card)
      }
    }
  }
  
  function getNearbyCarts(x, y, width, height) {
    const nearby = new Set()
    const startGridX = Math.floor(x / GRID_SIZE)
    const startGridY = Math.floor(y / GRID_SIZE)
    const endGridX = Math.floor((x + width) / GRID_SIZE)
    const endGridY = Math.floor((y + height) / GRID_SIZE)
    
    for (let gx = startGridX; gx <= endGridX; gx++) {
      for (let gy = startGridY; gy <= endGridY; gy++) {
        const key = `${gx},${gy}`
        const cards = spatialGrid.get(key)
        if (cards) {
          cards.forEach(card => nearby.add(card))
        }
      }
    }
    return Array.from(nearby)
  }

  // Check if a position overlaps with existing cards (using spatial grid)
  function hasOverlap(x, y, width = 450, height = 400) {
    const padding = 100 // Add extra padding between cards
    const nearbyCards = getNearbyCarts(x - padding, y - padding, width + padding * 2, height + padding * 2)
    
    return nearbyCards.some(pos => {
      return !(x + width + padding < pos.x || x > pos.x + pos.width + padding ||
               y + height + padding < pos.y || y > pos.y + pos.height + padding)
    })
  }

  // Find a non-overlapping position using radial expansion from parent
  function findNonOverlappingPosition(targetX, targetY, parentCard = null) {
    const width = 450
    const height = 400
    
    // Try the target position first
    if (!hasOverlap(targetX, targetY, width, height)) {
      // Check if we need to recenter canvas for this position
      const offset = checkAndExpandCanvas(targetX, targetY, width, height)
      return { x: targetX + offset.x, y: targetY + offset.y }
    }
    
    // Radial search: try increasingly distant positions in all directions
    const angleSteps = 16 // Check 16 angles per ring (every 22.5 degrees)
    const maxRings = 50 // Search up to 50 rings outward
    const ringSpacing = 600 // Distance between rings (card width + spacing)
    
    for (let ring = 1; ring <= maxRings; ring++) {
      const distance = ring * ringSpacing
      
      for (let i = 0; i < angleSteps; i++) {
        const angle = (i / angleSteps) * Math.PI * 2
        const x = targetX + Math.cos(angle) * distance
        const y = targetY + Math.sin(angle) * distance
        
        if (!hasOverlap(x, y, width, height)) {
          // Check if we need to recenter canvas for this position
          const offset = checkAndExpandCanvas(x, y, width, height)
          return { x: x + offset.x, y: y + offset.y }
        }
      }
    }
    
    // Fallback: position very far away in a grid pattern
    const fallbackX = targetX + (Math.floor(cardPositions.length / 10) * 600)
    const fallbackY = targetY + ((cardPositions.length % 10) * 600)
    // Check if we need to recenter canvas for this fallback position
    const offset = checkAndExpandCanvas(fallbackX, fallbackY, width, height)
    return { x: fallbackX + offset.x, y: fallbackY + offset.y }
  }

  // Add the initial article at center of virtual canvas
  if (initialArticle) {
    addArticle(initialArticle, canvasCenter - 200, canvasCenter - 150)
  }
  
  async function autoExpandCard(cardData) {
    // Calculate direction from parent to this card
    if (!cardData.parent) return
    
    setLoading(true)
    const startTime = performance.now()
    
    // Extract links from this card, skipping early links to avoid information loops
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = cardData.data.extract
    const links = tempDiv.querySelectorAll('a[href^="/wiki/"]')
    
    // First, collect all valid links
    const allValidLinks = []
    const parentTitle = cardData.parent?.data?.title
    for (let link of links) {
      const href = link.getAttribute('href')
      const articleTitle = decodeURIComponent(
        href.replace('/wiki/', '').replace(/_/g, ' ')
      )
      // Skip if: contains colon, already in list, or matches parent card
      if (!articleTitle.includes(':') && 
          !allValidLinks.includes(articleTitle) &&
          articleTitle !== parentTitle) {
        allValidLinks.push(articleTitle)
      }
    }
    
    // Calculate how many links to skip based on depth (only skip if we have more than 3 links)
    const skipCount = (depthLevel >= 3 && allValidLinks.length > 3) ? 3 : 0
    
    // Take up to 3 links after skipping
    const linkTitles = allValidLinks.slice(skipCount, skipCount + 3)
    
    if (linkTitles.length === 0) return
    
    // Precompute positions for all cards
    const parentCenterX = cardData.parent.x + 200
    const parentCenterY = cardData.parent.y + cardData.parent.height / 2
    const childCenterX = cardData.x + 200
    const childCenterY = cardData.y + cardData.height / 2
    
    const directionX = childCenterX - parentCenterX
    const directionY = childCenterY - parentCenterY
    const distance = Math.sqrt(directionX * directionX + directionY * directionY)
    const normalizedX = directionX / distance
    const normalizedY = directionY / distance
    
    const baseDistance = 900
    const positions = linkTitles.map((_, i) => {
      const spreadAngle = (i - 1) * 0.6
      const cos = Math.cos(spreadAngle)
      const sin = Math.sin(spreadAngle)
      const spreadX = normalizedX * cos - normalizedY * sin
      const spreadY = normalizedX * sin + normalizedY * cos
      const distanceVariation = baseDistance + (Math.random() * 200 - 100)
      return {
        x: childCenterX + spreadX * distanceVariation,
        y: childCenterY + spreadY * distanceVariation
      }
    })
    
    // Fetch all articles in parallel with caching
    const { getArticle } = await import('./wikipedia.js')
    
    const articlePromises = linkTitles.map(async (title) => {
      if (articleCache.has(title)) {
        return articleCache.get(title)
      }
      const article = await getArticle(title)
      if (article) {
        articleCache.set(title, article)
      }
      return article
    })
    
    const fetchedArticles = await Promise.all(articlePromises)
    
    // Check if card is still in center before rendering
    // If user panned away, cancel this expansion
    if (!isCardInCenter(cardData)) {
      pendingExpansions.delete(cardData)
      autoExpandedCards.delete(cardData) // Allow re-expansion if it comes back to center
      if (pendingExpansions.size === 0) setLoading(false)
      return
    }
    
    // Add all cards
    fetchedArticles.forEach((newArticle, i) => {
      if (newArticle && newArticle.extract) {
        addArticle(newArticle, positions[i].x, positions[i].y, cardData)
      }
    })
    
    pendingExpansions.delete(cardData)
    
    // Update latency after rendering
    const latency = Math.round(performance.now() - startTime)
    setLatency(latency)
    if (pendingExpansions.size === 0) setLoading(false)
  }

  function addArticle(articleData, targetX, targetY, parentCard = null) {
    // Calculate generation: root card is 0, children are parent's generation + 1
    const generation = parentCard ? parentCard.generation + 1 : 0
    
    const articleCard = document.createElement('div')
    articleCard.className = 'article-card'
    
    // Find non-overlapping position
    const position = findNonOverlappingPosition(targetX, targetY)
    articleCard.style.left = `${position.x}px`
    articleCard.style.top = `${position.y}px`
    
    // Parse Wikipedia HTML and extract internal links
    const html = articleData.extract || 'Loading...'
    const linkedText = parseWikipediaLinks(html)
    
    articleCard.innerHTML = `
      <div class="article-title">${articleData.title}</div>
      <div class="article-content">${linkedText}</div>
    `

    boardCanvas.appendChild(articleCard)
    
    // Track card position after it's added to DOM
    const rect = articleCard.getBoundingClientRect()
    const cardData = {
      element: articleCard,
      data: articleData,
      x: position.x,
      y: position.y,
      width: 450,
      height: Math.max(rect.height, 400),
      parent: parentCard,
      generation: generation
    }
    
    const positionData = {
      x: position.x,
      y: position.y,
      width: 450,
      height: Math.max(rect.height, 400)
    }
    
    cardPositions.push(positionData)
    addToGrid(positionData) // Add to spatial grid for fast lookups
    articles.push(cardData)
    
    // Draw connection to parent if exists
    if (parentCard) {
      drawConnection(parentCard, cardData)
    }
    
    // Handle link clicks
    articleCard.querySelectorAll('.article-link').forEach(linkEl => {
      linkEl.addEventListener('click', async (e) => {
        e.stopPropagation()
        const keyword = linkEl.dataset.keyword
        
        setLoading(true)
        const startTime = performance.now()
        const { getArticle } = await import('./wikipedia.js')
        const newArticle = await getArticle(keyword)
        
        if (newArticle && newArticle.extract) {
          // Build breadcrumb path from parent chain
          const path = []
          let current = cardData
          while (current) {
            path.unshift(current.data.title)
            current = current.parent
          }
          path.push(newArticle.title)
          setBreadcrumbs(path)
          
          // Position new card radially from parent card's center
          // Try first at 600px distance (card width + spacing) to the right
          const startDistance = 600
          const newX = position.x + startDistance
          const newY = position.y
          addArticle(newArticle, newX, newY, cardData)
          
          // Calculate latency after rendering is complete
          const latency = Math.round(performance.now() - startTime)
          setLatency(latency)
        }
        setLoading(false)
      })
    })
  }

  function drawConnection(parentCard, childCard) {
    // Calculate center points of each card
    const parentCenterX = parentCard.x + 200
    const parentCenterY = parentCard.y + parentCard.height / 2
    const childCenterX = childCard.x + 200
    const childCenterY = childCard.y + childCard.height / 2
    
    // Create SVG line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', parentCenterX)
    line.setAttribute('y1', parentCenterY)
    line.setAttribute('x2', childCenterX)
    line.setAttribute('y2', childCenterY)
    line.setAttribute('class', 'connection-line')
    
    connectionsEl.appendChild(line)
    
    // Create HTML label at midpoint (outside SVG so blend mode doesn't affect it)
    const midX = (parentCenterX + childCenterX) / 2
    const midY = (parentCenterY + childCenterY) / 2
    
    const label = document.createElement('div')
    label.className = 'connection-label'
    label.innerHTML = `<span>${childCard.data.title}</span>`
    label.style.left = `${midX}px`
    label.style.top = `${midY}px`
    
    boardCanvas.appendChild(label)
    
    connections.push({ line, label, parent: parentCard, child: childCard })
  }

  function parseWikipediaLinks(html) {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Find all links and convert Wikipedia internal links to our clickable spans
    const links = tempDiv.querySelectorAll('a')
    links.forEach(link => {
      const href = link.getAttribute('href')
      
      if (href && href.startsWith('/wiki/')) {
        // Extract article title from Wikipedia link format /wiki/Article_Name
        const articleTitle = decodeURIComponent(
          href.replace('/wiki/', '').replace(/_/g, ' ')
        )
        
        // Skip special Wikipedia pages (Help:, Wikipedia:, File:, etc.)
        if (!articleTitle.includes(':')) {
          const span = document.createElement('span')
          span.className = 'article-link'
          span.textContent = link.textContent
          span.dataset.keyword = articleTitle
          link.replaceWith(span)
        } else {
          // Keep text but remove link for special pages
          link.replaceWith(link.textContent)
        }
      } else {
        // Remove external links, keep just text
        link.replaceWith(link.textContent)
      }
    })
    
    // Clean up and return HTML
    return tempDiv.innerHTML
  }

  function makeDraggable(element) {
    let isDragging = false
    let currentX
    let currentY
    let initialX
    let initialY
    
    const titleBar = element.querySelector('.article-title')

    titleBar.addEventListener('mousedown', (e) => {
      isDragging = true
      initialX = e.clientX - element.offsetLeft
      initialY = e.clientY - element.offsetTop
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault()
        currentX = e.clientX - initialX
        currentY = e.clientY - initialY
        element.style.left = `${currentX}px`
        element.style.top = `${currentY}px`
        // TODO: Update connections
      }
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
    })
  }

  return {
    addArticle,
    articles,
    connections,
    loadRelatedArticles: async function(mainArticle, maxCards = 10) {
      // Get the main card (first article added)
      const mainCard = articles[0]
      
      // Extract links from the main article
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = mainArticle.extract
      const links = tempDiv.querySelectorAll('a[href^="/wiki/"]')
      
      const linkTitles = []
      for (let link of links) {
        if (linkTitles.length >= maxCards) break
        const href = link.getAttribute('href')
        const articleTitle = decodeURIComponent(
          href.replace('/wiki/', '').replace(/_/g, ' ')
        )
        // Skip special pages and duplicates
        if (!articleTitle.includes(':') && !linkTitles.includes(articleTitle)) {
          linkTitles.push(articleTitle)
        }
      }
      
      // Load and position related articles in a circle around main card
      const { getArticle } = await import('./wikipedia.js')
      const centerX = canvasCenter - 200
      const centerY = canvasCenter - 150
      const radius = 1000 // Distance from center - increased for more spacing
      
      for (let i = 0; i < linkTitles.length; i++) {
        const angle = (i / linkTitles.length) * Math.PI * 2
        // Add some randomness to spread them out more
        const randomOffset = (Math.random() - 0.5) * 300
        const actualRadius = radius + randomOffset
        const x = centerX + Math.cos(angle) * actualRadius
        const y = centerY + Math.sin(angle) * actualRadius
        
        const relatedArticle = await getArticle(linkTitles[i])
        if (relatedArticle && relatedArticle.extract) {
          addArticle(relatedArticle, x, y, mainCard)
        }
      }
    }
  }
}
