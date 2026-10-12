// ---- Mobile nav ----
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle.addEventListener('click', () => links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// ---- Load projects from the API ----
async function loadProjects() {
  const grid = document.getElementById('projectGrid');
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Request failed');
    const { projects } = await res.json();

    grid.innerHTML = projects.map(p => `
      <div class="project-card">
        <div class="project-titlebar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="project-body">
          <div class="project-name">${escapeHtml(p.name)}</div>
          <div class="project-desc">${escapeHtml(p.description)}</div>
          <div class="tag-row">${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          <div class="project-links">
            ${p.liveUrl ? `<a href="${p.liveUrl}">Live site</a>` : ''}
            ${p.sourceUrl ? `<a href="${p.sourceUrl}">Source</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p class="state-msg">Couldn't load projects right now — try refreshing.</p>`;
  }
}

// ---- Load experience from the API ----
async function loadExperience() {
  const timeline = document.getElementById('timeline');
  try {
    const res = await fetch('/api/experience');
    if (!res.ok) throw new Error('Request failed');
    const { experience } = await res.json();

    timeline.innerHTML = experience.map(e => `
      <div class="tl-item">
        <div class="tl-date">${escapeHtml(e.dateRange)}</div>
        <div class="tl-role">${escapeHtml(e.role)}</div>
        <div class="tl-org">${escapeHtml(e.org)}</div>
        <div class="tl-desc">${escapeHtml(e.description)}</div>
      </div>
    `).join('');
  } catch (err) {
    timeline.innerHTML = `<p class="state-msg">Couldn't load experience right now — try refreshing.</p>`;
  }
}

// ---- Load uploaded profile assets ----
async function loadProfileAssets() {
  try {
    const res = await fetch('/api/profile-assets');
    if (!res.ok) throw new Error('Request failed');
    const { profileAssets } = await res.json();

    if (profileAssets.photoUrl) {
      const image = document.createElement('img');
      image.src = profileAssets.photoUrl;
      image.alt = 'Profile photo';
      const avatar = document.getElementById('profilePhoto');
      avatar.replaceChildren(image);
      avatar.classList.add('has-image');
    }

    if (profileAssets.resumeUrl) {
      const resumeLink = document.getElementById('resumeLink');
      resumeLink.href = profileAssets.resumeUrl;
      resumeLink.target = '_blank';
      resumeLink.rel = 'noopener noreferrer';
      resumeLink.hidden = false;
    }
  } catch (err) {
    // Keep the existing placeholders if profile assets are unavailable.
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Contact form ----
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('cf-status');
const submitBtn = document.getElementById('cf-submit');

function clearErrors() {
  form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  statusEl.textContent = '';
  statusEl.className = 'form-status';

  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    message: form.message.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.errors) {
        Object.entries(data.errors).forEach(([field, msg]) => {
          const target = form.querySelector(`[data-error-for="${field}"]`);
          if (target) target.textContent = msg;
        });
      }
      statusEl.textContent = 'Please fix the highlighted fields.';
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = 'Message sent — thanks for reaching out!';
    statusEl.classList.add('success');
    form.reset();
  } catch (err) {
    statusEl.textContent = 'Something went wrong. Please try again.';
    statusEl.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send message';
  }
});

loadProjects();
loadExperience();
loadProfileAssets();
