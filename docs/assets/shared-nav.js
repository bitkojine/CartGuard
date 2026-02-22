(function () {
  const navs = document.querySelectorAll('[data-shared-nav]');
  if (!navs.length) return;

  const links = [
    { href: './index.html', label: 'Home', key: 'index' },
    { href: './beachhead.html', label: 'Beachhead', key: 'beachhead' },
    { href: './paid-pilots.html', label: 'Paid Pilots', key: 'paid-pilots' },
    { href: './roadmap.html', label: 'Roadmap', key: 'roadmap' },
    { href: './research.html', label: 'Research', key: 'research' },
    { href: './technical.html', label: 'Technical', key: 'technical' }
  ];

  for (const nav of navs) {
    const current = String(nav.getAttribute('data-current') || '').toLowerCase();
    const linkMarkup = links
      .map((item) => {
        const active = item.key === current ? ' aria-current="page"' : '';
        return `<a href="${item.href}"${active}>${item.label}</a>`;
      })
      .join('');

    nav.className = 'top-nav';
    nav.setAttribute('aria-label', 'Primary');
    nav.innerHTML = `
      <a href="./index.html" class="nav-brand">CartGuard</a>
      <div class="nav-links">${linkMarkup}</div>
    `;
  }
})();
