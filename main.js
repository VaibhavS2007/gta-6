/**
 * GTA VI — VICE CITY FAN EXPERIENCE
 * Main site JS: preloader, cursor, animations, particles
 */

// =============================================
// CUSTOM CURSOR
// =============================================
const cursorDot = document.createElement('div');
cursorDot.className = 'cursor-dot';
const cursorRing = document.createElement('div');
cursorRing.className = 'cursor-ring';
document.body.appendChild(cursorDot);
document.body.appendChild(cursorRing);

let mouseX = 0, mouseY = 0;
let ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top = mouseY + 'px';
});

function animateCursor() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top = ringY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, .char-card, .gallery-item, .world-feat, .platform-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorRing.style.width = '56px';
    cursorRing.style.height = '56px';
    cursorRing.style.borderColor = 'rgba(255,45,107,0.9)';
  });
  el.addEventListener('mouseleave', () => {
    cursorRing.style.width = '36px';
    cursorRing.style.height = '36px';
    cursorRing.style.borderColor = 'rgba(255,45,107,0.5)';
  });
});

// =============================================
// NEON GRID BACKGROUND
// =============================================
const neonGrid = document.createElement('div');
neonGrid.className = 'neon-grid';
document.body.prepend(neonGrid);

// =============================================
// PRELOADER
// =============================================
const preloader = document.getElementById('preloader');
const loadingBar = document.getElementById('loadingBar');
const loadingText = document.getElementById('loadingText');

const loadMessages = [
  'LOADING VICE CITY...',
  'INITIALIZING POLICE AI...',
  'SPAWNING VEHICLES...',
  'PLACING CASH BAGS...',
  'LOADING NEON LIGHTS...',
  'WELCOME TO VICE CITY',
];

let loadProgress = 0;
let msgIdx = 0;

const loadInterval = setInterval(() => {
  loadProgress += Math.random() * 8 + 3;
  if (loadProgress > 100) loadProgress = 100;
  loadingBar.style.width = loadProgress + '%';

  if (loadProgress > msgIdx * 20 && msgIdx < loadMessages.length) {
    loadingText.textContent = loadMessages[msgIdx];
    msgIdx++;
  }

  if (loadProgress >= 100) {
    clearInterval(loadInterval);
    setTimeout(() => {
      preloader.classList.add('hidden');
      startSiteAnimations();
    }, 600);
  }
}, 80);

// =============================================
// HERO PARTICLES
// =============================================
function createHeroParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 60; i++) {
    const dot = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const isNeon = Math.random() > 0.6;
    dot.style.cssText = `
      position: absolute;
      width: ${size}px; height: ${size}px;
      border-radius: 50%;
      background: ${isNeon ? (Math.random() > 0.5 ? '#ff2d6b' : '#00d4ff') : 'rgba(255,255,255,0.6)'};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      box-shadow: 0 0 ${size * 4}px ${isNeon ? (Math.random() > 0.5 ? '#ff2d6b' : '#00d4ff') : 'rgba(255,255,255,0.3)'};
      animation: floatParticle ${4 + Math.random() * 8}s ease-in-out ${Math.random() * -8}s infinite;
      opacity: ${0.3 + Math.random() * 0.7};
    `;
    container.appendChild(dot);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatParticle {
      0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
      25% { transform: translateY(-${20 + Math.random() * 30}px) translateX(${10 - Math.random() * 20}px); }
      50% { transform: translateY(-${10 + Math.random() * 20}px) translateX(${20 - Math.random() * 40}px); opacity: 1; }
      75% { transform: translateY(-${30 + Math.random() * 20}px) translateX(${5 - Math.random() * 10}px); }
    }
  `;
  document.head.appendChild(style);
}

// =============================================
// NAVBAR SCROLL
// =============================================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Smooth active link tracking
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active-nav'));
      const link = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (link) link.classList.add('active-nav');
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => sectionObserver.observe(s));

// =============================================
// SCROLL REVEAL
// =============================================
function setupReveal() {
  // Add reveal classes
  document.querySelectorAll('.story-text').forEach(el => el.classList.add('reveal-left'));
  document.querySelectorAll('.story-visual').forEach(el => el.classList.add('reveal-right'));
  document.querySelectorAll('.char-card').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.15) + 's';
  });
  document.querySelectorAll('.world-feat').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.08) + 's';
  });
  document.querySelectorAll('.gallery-item').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.12) + 's';
  });
  document.querySelectorAll('.platform-card').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.12) + 's';
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
  });
}

// =============================================
// ANIMATED STAT COUNTERS
// =============================================
function animateCounters() {
  const statNums = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const duration = 2000;
        const start = performance.now();
        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString();
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => counterObserver.observe(el));
}

// =============================================
// PARALLAX
// =============================================
function setupParallax() {
  const heroBg = document.getElementById('heroBgImg');
  if (!heroBg) return;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      heroBg.style.transform = `scale(1.12) translateY(${scrollY * 0.25}px)`;
    }
  });
}

// =============================================
// TRAILER MODAL
// =============================================
window.playTrailer = function() {
  document.getElementById('trailerModal').classList.add('active');
};
window.closeTrailer = function() {
  document.getElementById('trailerModal').classList.remove('active');
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTrailer();
  }
});

// =============================================
// PLATFORM BUTTON FEEDBACK
// =============================================
document.querySelectorAll('.platform-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const orig = this.textContent;
    this.textContent = 'ADDED! ✓';
    this.style.borderColor = '#00d4ff';
    this.style.color = '#00d4ff';
    setTimeout(() => {
      this.textContent = orig;
      this.style.borderColor = '';
      this.style.color = '';
    }, 2000);
  });
});

// =============================================
// GALLERY LIGHTBOX
// =============================================
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.style.cssText = `
  position: fixed; inset: 0; z-index: 8000;
  background: rgba(0,0,0,0.95);
  display: none; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px);
`;
lightbox.innerHTML = `
  <button id="lightboxClose" style="position:absolute;top:24px;right:32px;background:none;border:none;color:white;font-size:32px;cursor:pointer;font-family:Orbitron,monospace;">✕</button>
  <img id="lightboxImg" src="" alt="" style="max-width:90%;max-height:90vh;object-fit:contain;border:1px solid rgba(255,45,107,0.3);box-shadow:0 0 60px rgba(255,45,107,0.2);" />
`;
document.body.appendChild(lightbox);

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const img = item.querySelector('img');
    document.getElementById('lightboxImg').src = img.src;
    document.getElementById('lightboxImg').alt = img.alt;
    lightbox.style.display = 'flex';
  });
});
lightbox.addEventListener('click', e => {
  if (e.target === lightbox || e.target.id === 'lightboxClose') {
    lightbox.style.display = 'none';
  }
});

// =============================================
// MOUSE TILT ON CHAR CARDS
// =============================================
document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    card.style.transform = `translateY(-8px) rotateY(${dx * 10}deg) rotateX(${-dy * 8}deg)`;
    card.style.transition = 'transform 0.1s';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s';
  });
});

// =============================================
// WORLD FEATS HOVER GLOW
// =============================================
const glowColors = ['#ff2d6b', '#00d4ff', '#ffd700', '#a855f7', '#22c55e', '#f97316'];
document.querySelectorAll('.world-feat').forEach((feat, i) => {
  feat.addEventListener('mouseenter', () => {
    feat.style.setProperty('--glow', glowColors[i % glowColors.length]);
    feat.querySelector('.feat-icon').style.filter = `drop-shadow(0 0 12px ${glowColors[i % glowColors.length]})`;
    feat.querySelector('.feat-icon').style.transform = 'scale(1.2)';
    feat.querySelector('.feat-icon').style.transition = 'all 0.3s';
  });
  feat.addEventListener('mouseleave', () => {
    feat.querySelector('.feat-icon').style.filter = '';
    feat.querySelector('.feat-icon').style.transform = '';
  });
});

// =============================================
// ACTIVE NAV STYLE
// =============================================
const activeStyle = document.createElement('style');
activeStyle.textContent = `.active-nav { color: white !important; } .active-nav::after { width: 100% !important; }`;
document.head.appendChild(activeStyle);

// =============================================
// GLITCH EFFECT ON GTA VI TITLE
// =============================================
function addGlitchEffect() {
  const heroTitle = document.querySelector('.hero-title');
  if (!heroTitle) return;

  setInterval(() => {
    if (Math.random() > 0.92) {
      heroTitle.style.filter = 'blur(1px) brightness(1.5)';
      heroTitle.style.transform = `translateX(${(Math.random() - 0.5) * 6}px)`;
      setTimeout(() => {
        heroTitle.style.filter = '';
        heroTitle.style.transform = '';
      }, 80 + Math.random() * 80);
    }
  }, 2000);
}

// =============================================
// INIT
// =============================================
function startSiteAnimations() {
  createHeroParticles();
  setupReveal();
  animateCounters();
  setupParallax();
  addGlitchEffect();
}

// Game overlay is controlled entirely by game.js via style.display
// No class-based toggling needed here

console.log(
  '%c GTA VI — VICE CITY FAN EXPERIENCE ',
  'background: linear-gradient(135deg, #ff2d6b, #00d4ff); color: white; font-size: 16px; font-weight: bold; padding: 12px 24px; border-radius: 4px;'
);
