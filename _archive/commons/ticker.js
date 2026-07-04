/**
 * Global Recess — Shared Discovery Ticker
 * Drop <div id="global-ticker"></div> on any page and this builds it.
 * Requires data/people.js to be loaded first.
 */
(function () {
  const MOMENT_TYPES = [
    { key:'status',         label:'Right now',     emoji:'●'  },
    { key:'song',           label:'In my head',    emoji:'🎵' },
    { key:'hyperfixation',  label:'Obsessed with', emoji:'🔮' },
    { key:'book',           label:'Reading',       emoji:'📖' },
    { key:'show',           label:'Watching',      emoji:'📺' },
  ];

  function initials(n) {
    return (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  }

  function build() {
    const root = document.getElementById('global-ticker');
    if (!root || typeof PEOPLE === 'undefined') return;

    const pool = PEOPLE
      .map(p => {
        const mt  = MOMENT_TYPES[Math.floor(Math.random() * MOMENT_TYPES.length)];
        const val = p[mt.key];
        return val ? { person:p, label:mt.label, emoji:mt.emoji, val } : null;
      })
      .filter(Boolean)
      .sort(() => Math.random() - 0.5);

    const item = m => `
      <a class="gr-ticker-item" href="profile.html?id=${m.person.id}">
        <div class="gr-ticker-avatar" style="background:${m.person.avatar_color}">${initials(m.person.name)}</div>
        <span class="gr-ticker-label">${m.emoji} ${m.label}</span>
        <span class="gr-ticker-name">${m.person.name.split(' ')[0]}</span>
        <span class="gr-ticker-text">${m.val}</span>
      </a>`;

    // Render pool twice for seamless loop
    const track = document.createElement('div');
    track.className = 'gr-ticker-track';
    track.innerHTML = pool.map(item).join('') + pool.map(item).join('');
    root.appendChild(track);
  }

  // Build after DOM + people.js are ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
