import './style.css'
import { initSearchPage } from './search.js'
import { initBoardPage } from './board.js'
import { getArticle } from './wikipedia.js'

const app = document.querySelector('#app')

// App state
let currentPage = 'search'

// Initialize with search page
showSearchPage()

function showSearchPage() {
  currentPage = 'search'
  initSearchPage(app, handleArticleSelect)
}

async function handleArticleSelect(title) {
  currentPage = 'board'
  
  // Show loading state
  app.innerHTML = '<div class="search-page"><h1>Loading...</h1></div>'
  
  // Fetch the article
  const { getArticle } = await import('./wikipedia.js')
  const article = await getArticle(title)
  
  if (article) {
    const { initBoardPage } = await import('./board.js')
    const board = initBoardPage(app, article)
    
    // Extract and load related articles
    await board.loadRelatedArticles(article, 10)
  } else {
    app.innerHTML = '<div class="search-page"><h1>Failed to load article</h1></div>'
  }
}
