import './style.css'

// HERO CANVAS — network/node animation
;(function () {
  const canvas = document.getElementById('heroCanvas')
  const ctx = canvas.getContext('2d')
  let w = 0,
    h = 0,
    nodes = [],
    running = false,
    mouse = { x: -1000, y: -1000 }
  const NODE_COUNT = 50
  const CONNECT_DIST = 180
  const DPR = Math.min(window.devicePixelRatio || 1, 2)

  function resize(newW, newH) {
    const prevW = w, prevH = h
    w = newW
    h = newH
    canvas.width = w * DPR
    canvas.height = h * DPR
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    if (prevW > 0 && prevH > 0) {
      for (const n of nodes) {
        n.x = (n.x / prevW) * w
        n.y = (n.y / prevH) * h
      }
    }
  }

  function scatter() {
    nodes = []
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
      })
    }
  }

  function draw() {
    if (w === 0 || h === 0) { requestAnimationFrame(draw); return }
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.12
          ctx.strokeStyle = `rgba(62,207,142,${alpha})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }
    }
    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy
      if (n.x < 0 || n.x > w) n.vx *= -1
      if (n.y < 0 || n.y > h) n.vy *= -1
      const dx = n.x - mouse.x
      const dy = n.y - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 150) {
        n.x += dx * 0.01
        n.y += dy * 0.01
      }
      ctx.fillStyle = `rgba(62,207,142,0.4)`
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fill()
    }
    requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect
      if (cr.width === 0 || cr.height === 0) continue
      const needsScatter = w === 0
      resize(cr.width, cr.height)
      if (needsScatter) scatter()
      if (!running) { running = true; draw() }
    }
  })
  ro.observe(canvas)

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  })
  canvas.addEventListener('mouseleave', () => {
    mouse.x = -1000
    mouse.y = -1000
  })
})()

// SCROLL REVEAL
const reveals = document.querySelectorAll('.reveal')
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
)
reveals.forEach((el) => observer.observe(el))

// NAV SCROLL EFFECT
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav')
  const scroll = window.scrollY
  if (scroll > 60) {
    nav.classList.add('scrolled')
  } else {
    nav.classList.remove('scrolled')
  }
})

// MOBILE NAV TOGGLE
document.querySelector('.nav-toggle').addEventListener('click', () => {
  document.querySelector('.nav-center').classList.toggle('open')
})

// Close mobile nav on link click
document.querySelectorAll('.nav-center a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-center').classList.remove('open')
  })
})
