import './blog.css'

// NAV SCROLL EFFECT
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav')
  if (window.scrollY > 60) {
    nav.classList.add('scrolled')
  } else {
    nav.classList.remove('scrolled')
  }
})

// MOBILE NAV TOGGLE
document.querySelector('.nav-toggle').addEventListener('click', () => {
  document.querySelector('.nav-center').classList.toggle('open')
})
