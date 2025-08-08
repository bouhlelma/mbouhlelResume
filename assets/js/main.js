/* Main JS for dynamic resume site
 - Fetches README.md and renders as HTML with Marked
 - Sanitizes with DOMPurify
 - Generates Table of Contents
 - Theme toggle (system + persistent)
 - Print to PDF
*/
(function(){
  const contentEl = document.getElementById('resume-content');
  const tocNav = document.getElementById('tocNav');
  const printBtn = document.getElementById('printBtn');
  const themeToggle = document.getElementById('themeToggle');
  const yearEl = document.getElementById('year');

  yearEl && (yearEl.textContent = new Date().getFullYear());

  // Theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('theme');
  const applyTheme = (mode)=>{
    if(mode === 'light'){ document.documentElement.classList.add('light'); }
    else { document.documentElement.classList.remove('light'); }
    localStorage.setItem('theme', mode);
  };
  if(savedTheme){ applyTheme(savedTheme); }
  else { applyTheme(prefersDark.matches ? 'dark' : 'light'); }
  prefersDark.addEventListener('change', e => {
    const persisted = localStorage.getItem('theme');
    if(!persisted){ applyTheme(e.matches ? 'dark' : 'light'); }
  });
  themeToggle?.addEventListener('click', ()=>{
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  // Fetch update_resume.md and render
  async function loadResume(){
    try{
      const res = await fetch('update_resume.md', { cache: 'no-cache' });
      if(!res.ok) throw new Error('Failed to fetch resume');
      const md = await res.text();

      // Preprocess: turn lines starting with the bullet character into Markdown lists
      // and promote common section titles to level-2 headings for better structure/TOC.
      const preprocessed = md
        .replace(/^\s*•\s/gm, '- ') // bullets to markdown lists
        .replace(/^\s*(Summary|Projects|Professional Experience|Education|Skills)\s*$/gmi, '## $1');

      // Configure Marked
      marked.setOptions({
        breaks: true,
        headerIds: true,
        mangle: false
      });

      const rawHtml = marked.parse(preprocessed);
      const safeHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
      contentEl.innerHTML = safeHtml;
      contentEl.setAttribute('aria-busy','false');

      buildTOC();
      observeHeadings();
      decorateLinks();
    }catch(err){
      console.error(err);
      contentEl.innerHTML = '<p>Could not load resume. <a href="update_resume.md">Open update_resume.md</a></p>';
    }
  }

  // Build table of contents from h1/h2 elements
  function buildTOC(){
    if(!tocNav) return;
    const headings = contentEl.querySelectorAll('h1, h2');
    const frag = document.createDocumentFragment();
    headings.forEach(h => {
      const id = h.id || h.textContent.trim().toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-');
      if(!h.id) h.id = id;
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = h.textContent;
      a.dataset.level = h.tagName.toLowerCase();
      a.style.marginLeft = h.tagName === 'H2' ? '0.6rem' : '0';
      frag.appendChild(a);
    });
    tocNav.innerHTML = '';
    tocNav.appendChild(frag);
  }

  // Highlight active heading on scroll
  function observeHeadings(){
    const links = [...tocNav.querySelectorAll('a')];
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = map.get(id);
        if(entry.isIntersecting){
          links.forEach(l => l.classList.remove('active'));
          link?.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0.01 });

    contentEl.querySelectorAll('h1, h2').forEach(h => observer.observe(h));
  }

  // External links behavior
  function decorateLinks(){
    contentEl.querySelectorAll('a[href^="http"]').forEach(a => {
      a.target = '_blank'; a.rel = 'noopener';
    });
  }

  // Print to PDF
  printBtn?.addEventListener('click', ()=> window.print());

  loadResume();
})();
