import { searchWikipedia } from './wikipedia.js'

export function initSearchPage(container, onArticleSelect) {
  container.innerHTML = `
    <div class="search-page">
      <h1>Go down the rabbit hole</h1>
      <div class="search-container">
        <div class="search-input-wrapper">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search anything"
            id="searchInput"
            autocomplete="off"
          />
          <div class="search-gif-container">
            <img src="/bunny-terraria.png" alt="" class="search-gif search-gif-static" />
            <img src="/bunny-terraria.gif" alt="" class="search-gif search-gif-animated" />
          </div>
        </div>
        <ul class="suggestions" id="autocomplete"></ul>
      </div>
      <ul class="suggestions" id="staticSuggestions">
        <li class="suggestion-item" data-title="Shuji Nakamura">
          <span>Try Shuji Nakamura</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" class="arrow">
            <path d="M14.3535 0.5C10.6301 0.5 3.18339 0.5 3.18339 0.5M14.3535 0.5V12.0043M14.3535 0.5L0.353516 14.5" stroke="black"/>
          </svg>
        </li>
        <li class="suggestion-item" data-title="Ender's Game">
          <span>Try Ender's Game</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" class="arrow">
            <path d="M14.3535 0.5C10.6301 0.5 3.18339 0.5 3.18339 0.5M14.3535 0.5V12.0043M14.3535 0.5L0.353516 14.5" stroke="black"/>
          </svg>
        </li>
        <li class="suggestion-item" data-title="R2-D2">
          <span>Try R2D2</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" class="arrow">
            <path d="M14.3535 0.5C10.6301 0.5 3.18339 0.5 3.18339 0.5M14.3535 0.5V12.0043M14.3535 0.5L0.353516 14.5" stroke="black"/>
          </svg>
        </li>
      </ul>
    </div>
  `

  const searchInput = document.getElementById('searchInput')
  const autocompleteEl = document.getElementById('autocomplete')
  const staticSuggestionsEl = document.getElementById('staticSuggestions')
  
  let currentHighlight = -1
  let currentSuggestions = []
  let searchTimeout

  // Handle static suggestions click
  staticSuggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const title = item.dataset.title
      onArticleSelect(title)
    })
  })

  // Handle typing - fetch Wikipedia autocomplete
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim()
    
    if (query.length === 0) {
      autocompleteEl.innerHTML = ''
      currentSuggestions = []
      currentHighlight = -1
      return
    }

    // Debounce API calls
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      const suggestions = await searchWikipedia(query)
      currentSuggestions = suggestions
      currentHighlight = -1
      showAutocomplete(suggestions)
    }, 300)
  })

  // Handle arrow keys and enter
  searchInput.addEventListener('keydown', (e) => {
    if (currentSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      currentHighlight = Math.min(currentHighlight + 1, currentSuggestions.length - 1)
      updateHighlight()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      currentHighlight = Math.max(currentHighlight - 1, -1)
      updateHighlight()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (currentHighlight >= 0) {
        const selectedTitle = currentSuggestions[currentHighlight]
        onArticleSelect(selectedTitle)
      }
    } else if (e.key === 'Escape') {
      autocompleteEl.innerHTML = ''
      currentSuggestions = []
      currentHighlight = -1
    }
  })

  // Handle blur (clicking out of input)
  searchInput.addEventListener('blur', (e) => {
    // Small delay to allow clicks on autocomplete items to register
    setTimeout(() => {
      autocompleteEl.innerHTML = ''
      currentSuggestions = []
      currentHighlight = -1
    }, 150)
  })

  function showAutocomplete(suggestions) {
    if (suggestions.length === 0) {
      autocompleteEl.innerHTML = `
        <li class="suggestion-item no-results">
          <img src="/error-bunny.gif" alt="" class="error-bunny" />
          <span class="no-results-text">We're not so sure about this :(</span>
        </li>
      `
      return
    }

    autocompleteEl.innerHTML = suggestions.map((suggestion, index) => `
      <li class="suggestion-item autocomplete-item" data-index="${index}" data-title="${suggestion}">
        <span>${suggestion}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" class="arrow">
          <path d="M14.3535 0.5C10.6301 0.5 3.18339 0.5 3.18339 0.5M14.3535 0.5V12.0043M14.3535 0.5L0.353516 14.5" stroke="black"/>
        </svg>
      </li>
    `).join('')

    // Use mousedown instead of click - fires before blur event
    autocompleteEl.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault() // Prevent input from losing focus
        const title = item.dataset.title
        onArticleSelect(title)
      })
    })
  }

  function updateHighlight() {
    const items = autocompleteEl.querySelectorAll('.autocomplete-item')
    items.forEach((item, index) => {
      if (index === currentHighlight) {
        item.classList.add('highlighted')
      } else {
        item.classList.remove('highlighted')
      }
    })
  }
}
