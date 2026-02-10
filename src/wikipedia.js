const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'

export async function searchWikipedia(query) {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: 5,
    namespace: 0,
    format: 'json',
    origin: '*'
  })

  try {
    const response = await fetch(`${WIKIPEDIA_API}?${params}`)
    const data = await response.json()
    return data[1] // Returns array of titles
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

export async function getArticle(title) {
  // Use Parse API to get HTML with links, with redirects enabled
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'text',
    formatversion: 2,
    redirects: true, // Follow redirects automatically
    format: 'json',
    origin: '*'
  })

  try {
    const response = await fetch(`${WIKIPEDIA_API}?${params}`)
    const data = await response.json()
    
    // If article not found or error, search for closest match
    if (data.error || !data.parse) {
      console.log(`Article "${title}" not found, searching for closest match...`)
      const searchResults = await searchWikipedia(title)
      if (searchResults.length > 0 && searchResults[0] !== title) {
        console.log(`Found closest match: "${searchResults[0]}"`)
        return getArticle(searchResults[0])
      }
      console.log('No matches found')
      return null
    }
    
    // Extract text - keep it concise so cards fit in viewport
    const fullHtml = data.parse.text
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = fullHtml
    
    // Remove unwanted elements
    tempDiv.querySelectorAll('.mw-editsection, .reference, .reflist, .navbox, .sistersitebox, .mbox-small, .noprint, .infobox, .sidebar, .toc, style, script').forEach(el => el.remove())
    
    // Get paragraphs and lists (for disambiguation pages)
    const contentElements = tempDiv.querySelectorAll('p, ul, ol, h2, h3')
    let extractedHtml = ''
    let charCount = 0
    let hasContent = false
    
    for (let el of contentElements) {
      if (charCount >= 400) break
      // Skip empty paragraphs
      if (el.tagName === 'P' && el.textContent.trim().length < 10) continue
      // Stop at "See also" or "References" sections
      if ((el.tagName === 'H2' || el.tagName === 'H3') && 
          /^(See also|References|External links|Notes|Further reading)$/i.test(el.textContent.trim())) break
      
      // For lists, limit to first 3 items to keep cards compact
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const items = el.querySelectorAll('li')
        if (items.length > 3) {
          const clonedList = el.cloneNode(false)
          for (let i = 0; i < 3; i++) {
            clonedList.appendChild(items[i].cloneNode(true))
          }
          extractedHtml += clonedList.outerHTML
          charCount += clonedList.textContent.length
          hasContent = true
          continue
        }
      }
      
      extractedHtml += el.outerHTML
      charCount += el.textContent.length
      hasContent = true
    }
    
    // If no content was found, try to get any text content
    if (!hasContent) {
      const firstP = tempDiv.querySelector('p')
      if (firstP) {
        extractedHtml = firstP.outerHTML
      }
    }
    
    return {
      title: data.parse.title, // This will be the redirected title
      extract: extractedHtml || '<p>No content available</p>',
      links: []
    }
  } catch (error) {
    console.error('Article fetch error:', error)
    return null
  }
}
