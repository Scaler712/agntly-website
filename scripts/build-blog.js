import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { marked } from 'marked'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const POSTS_DIR = path.join(ROOT, 'blog', 'posts')
const OUT_DIR = path.join(ROOT, 'blog')
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'blog', '_post-template.html'), 'utf-8')
const INDEX_TEMPLATE = fs.readFileSync(path.join(ROOT, 'blog', '_index-template.html'), 'utf-8')
const SITE = 'https://agntly.io'

// Configure marked for clean output
marked.setOptions({
  gfm: true,
  breaks: false,
})

// Custom renderer for code blocks with language labels
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
  return `<div class="blog-code-block">${langLabel}<pre><code class="${lang ? `language-${lang}` : ''}">${text}</code></pre></div>`
}
marked.use({ renderer })

// Read all .md files
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))

if (files.length === 0) {
  console.log('  No blog posts found, creating empty index.')
}

const posts = files.map(file => {
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const { data, content } = matter(raw)
  const slug = data.slug || file.replace(/\.md$/, '')
  const html = marked(content)

  // Estimate read time
  const words = content.split(/\s+/).length
  const readTime = Math.max(1, Math.round(words / 230))

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date ? new Date(data.date) : new Date(),
    dateStr: data.date || new Date().toISOString().split('T')[0],
    tags: data.tags || [],
    image: data.image || null,
    author: data.author || 'Agntly',
    html,
    readTime,
  }
}).sort((a, b) => b.date - a.date) // newest first

// Generate individual post pages
for (const post of posts) {
  const postDir = path.join(OUT_DIR, post.slug)
  fs.mkdirSync(postDir, { recursive: true })

  const tagsHtml = post.tags.map(t => `<span class="blog-tag">${t}</span>`).join('')
  const dateFormatted = post.date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  let page = TEMPLATE
    .replaceAll('{{title}}', post.title)
    .replaceAll('{{description}}', post.description)
    .replaceAll('{{slug}}', post.slug)
    .replaceAll('{{date}}', post.dateStr)
    .replaceAll('{{date_formatted}}', dateFormatted)
    .replaceAll('{{author}}', post.author)
    .replaceAll('{{read_time}}', post.readTime)
    .replaceAll('{{tags}}', tagsHtml)
    .replaceAll('{{content}}', post.html)
    .replaceAll('{{site}}', SITE)
    .replaceAll('{{image}}', post.image || `${SITE}/og-image.png`)

  fs.writeFileSync(path.join(postDir, 'index.html'), page)
  console.log(`  ✓ blog/${post.slug}/`)
}

// Generate blog index page
const postCards = posts.map(post => {
  const dateFormatted = post.date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const tagsHtml = post.tags.map(t => `<span class="blog-tag">${t}</span>`).join('')
  const imageHtml = post.image
    ? `<div class="blog-card-image"><img src="${post.image}" alt="${post.title}" loading="lazy"></div>`
    : ''

  return `
    <a href="/blog/${post.slug}/" class="blog-card">
      ${imageHtml}
      <div class="blog-card-body">
        <div class="blog-card-meta">
          <time datetime="${post.dateStr}">${dateFormatted}</time>
          <span class="blog-card-dot">&middot;</span>
          <span>${post.readTime} min read</span>
        </div>
        <h2>${post.title}</h2>
        <p>${post.description}</p>
        <div class="blog-card-tags">${tagsHtml}</div>
      </div>
    </a>`
}).join('\n')

const indexPage = INDEX_TEMPLATE.replaceAll('{{posts}}', postCards || '<p class="blog-empty">No posts yet. Check back soon.</p>')
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage)
console.log(`  ✓ blog/ index (${posts.length} posts)`)
