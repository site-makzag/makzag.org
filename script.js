const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-menu');
const header = document.querySelector('.site-header');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sectionIds = ['services', 'about', 'contact'];
let scrollFrame = null;
let activeFrame = null;

function closeMobileMenu() {
  if (!toggle || !navigation) return;
  navigation.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
}

if (toggle && navigation) {
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    navigation.classList.toggle('open', !isOpen);
  });
}

function updateActiveNavigation() {
  activeFrame = null;
  const offset = (header?.offsetHeight || 0) + Math.min(window.innerHeight * 0.27, 170);
  let activeId = null;
  for (const id of sectionIds) {
    const section = document.getElementById(id);
    if (section && section.getBoundingClientRect().top <= offset) activeId = id;
  }
  document.querySelectorAll('#site-menu a[href^="#"]').forEach(link => {
    const isActive = activeId !== null && link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('is-active', isActive);
    if (isActive && !link.classList.contains('nav-cta')) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function scheduleActiveNavigation() {
  if (activeFrame === null) activeFrame = requestAnimationFrame(updateActiveNavigation);
}

function cancelAnimatedScroll() {
  if (scrollFrame !== null) {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
  }
}

function goToSection(section, hash) {
  cancelAnimatedScroll();
  const offset = section.id === 'top' ? 0 : (header?.offsetHeight || 0) + 18;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetY = Math.min(maxScroll, Math.max(0, window.scrollY + section.getBoundingClientRect().top - offset));
  const startY = window.scrollY;
  const distance = targetY - startY;

  // Keep usable links, browser history, and keyboard/screen-reader navigation.
  if (location.hash !== hash) history.pushState(null, '', hash);
  closeMobileMenu();

  const finish = () => {
    scrollFrame = null;
    const focusTarget = section.querySelector('h1, h2') || section;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    scheduleActiveNavigation();
  };

  if (reduceMotion.matches || Math.abs(distance) < 2) {
    window.scrollTo({ top: targetY, behavior: 'instant' });
    finish();
    return;
  }

  // Deliberately slow, easy-to-notice section scrolling.
  // At least 3.4 seconds from the first to the last frame, even over short distances.
  // Longer journeys are allowed extra time so they do not feel like a jump.
  const duration = Math.min(4800, Math.max(3400, Math.abs(distance) * 1.35));
  const started = performance.now();
  const animate = time => {
    const progress = Math.min(1, (time - started) / duration);
    const eased = (1 - Math.cos(Math.PI * progress)) / 2;
    window.scrollTo({ top: startY + distance * eased, behavior: 'instant' });
    if (progress < 1) scrollFrame = requestAnimationFrame(animate);
    else finish();
  };
  scrollFrame = requestAnimationFrame(animate);
}

// All internal links are handled, including the logo, primary menu and CTA buttons.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const hash = link.getAttribute('href');
  if (!hash || hash === '#' || link.classList.contains('skip-link')) return;
  const section = document.getElementById(hash.slice(1));
  if (!section) return;
  event.preventDefault();
  goToSection(section, hash);
});

// Allow mouse wheel, touch and keyboard input to interrupt an ongoing animation.
window.addEventListener('wheel', cancelAnimatedScroll, { passive: true });
window.addEventListener('touchstart', cancelAnimatedScroll, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelAnimatedScroll();
});
window.addEventListener('scroll', scheduleActiveNavigation, { passive: true });
window.addEventListener('resize', scheduleActiveNavigation);
window.addEventListener('load', scheduleActiveNavigation);
scheduleActiveNavigation();

const year = document.getElementById('current-year');
if (year) year.textContent = new Date().getFullYear();

const form = document.getElementById('contact-form');
const formNote = document.getElementById('form-note');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  formNote.className = 'form-note';
  if (!form.reportValidity()) return;
  const submit = form.querySelector('button[type=submit]');
  const data = Object.fromEntries(new FormData(form).entries());
  submit.disabled = true;
  formNote.textContent = 'Sending your inquiry...';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Your message could not be sent. Please try again later.');
    formNote.textContent = 'Thanks! Your message has been sent.';
    formNote.classList.add('success');
    form.reset();
  } catch (error) {
    formNote.textContent = error.message || 'Could not send your message. Please try again.';
    formNote.classList.add('error');
  } finally {
    submit.disabled = false;
  }
});
