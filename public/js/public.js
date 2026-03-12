// ── Mobile menu toggle ──
const mobileBtn  = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileBtn.classList.toggle('open', open);
    mobileBtn.setAttribute('aria-expanded', open);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!mobileBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      mobileBtn.classList.remove('open');
    }
  });

  // Close on nav link click
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      mobileBtn.classList.remove('open');
    });
  });
}

// ── Navbar scroll shadow ──
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 4px 20px rgba(0,0,0,0.3)'
      : 'none';
  }, { passive: true });
}
