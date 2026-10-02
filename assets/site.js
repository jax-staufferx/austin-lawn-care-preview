/* Starter site script (shared by every page).
   Rules this file follows:
   - Every feature checks its elements exist first, so a page without them is unaffected.
   - Anything added at runtime uses a "js-" class, so it can't collide with component classes.
   - Motion respects prefers-reduced-motion. The saved theme is applied before paint by an inline
     script in <head> (see build.py), so there is no light/dark flash.
   - Site-specific values come from data attributes the build writes (no client text hard-coded here). */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;
  var BASE = root.getAttribute('data-base') || '';           /* "" on the live site, "/repo" on a preview */
  var THEME_KEY = root.getAttribute('data-theme-key') || 'site-theme';

  /* ---- Theme toggle (follows the device until the visitor chooses) ---- */
  var tb = $('theme-btn'), dark = mm('(prefers-color-scheme: dark)');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : dark.matches; }
  function syncTheme() {
    if (!tb) return;
    var d = isDark(), label = tb.querySelector('.tl');
    tb.setAttribute('aria-pressed', String(d));
    if (label) label.textContent = d ? 'Light mode' : 'Dark mode';
    tb.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
  }
  if (tb) {
    syncTheme();
    tb.addEventListener('click', function () {
      var n = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', n);
      try { localStorage.setItem(THEME_KEY, n); } catch (e) {}
      syncTheme();
    });
    if (dark.addEventListener) dark.addEventListener('change', syncTheme);
  }

  /* ---- "Next <event>" line: <p class="next" data-weekday="0" data-time="09:30" data-label="9:30 a.m." data-prefix="Next service"> ---- */
  document.querySelectorAll('.next[data-weekday]').forEach(function (el) {
    var wd = +el.getAttribute('data-weekday'), hm = (el.getAttribute('data-time') || '00:00').split(':');
    var now = new Date(), d = new Date(now), mins = now.getHours() * 60 + now.getMinutes(), at = (+hm[0]) * 60 + (+hm[1] || 0);
    var add = (wd - now.getDay() + 7) % 7; if (add === 0 && mins >= at) add = 7;
    d.setDate(now.getDate() + add);
    var when = add === 0 ? 'today' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    el.textContent = (el.getAttribute('data-prefix') || 'Next') + ': ' + when + ' at ' + (el.getAttribute('data-label') || '');
  });

  /* ---- Mobile menu ---- */
  var mnav = $('mnav'), mbtn = $('menu-btn');
  function openMenu() { mnav.hidden = false; mbtn.setAttribute('aria-expanded', 'true'); mbtn.textContent = 'Close'; var a = mnav.querySelector('a'); if (a) a.focus(); }
  function closeMenu(ret) { if (!mnav || mnav.hidden) return; mnav.hidden = true; mbtn.setAttribute('aria-expanded', 'false'); mbtn.textContent = 'Menu'; if (ret) mbtn.focus(); }
  if (mnav && mbtn) {
    mbtn.addEventListener('click', function () { mnav.hidden ? openMenu() : closeMenu(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeMenu(false); });
  }

  /* ---- Same-page jumps: smooth scroll, keep the #fragment, move keyboard focus ---- */
  function jumpTo(t, id) {
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (t.tagName === 'DETAILS') { t.open = true; t = t.querySelector('summary') || t; }
    else if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(t.tagName)) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
    if (id && history.replaceState) history.replaceState(null, '', '#' + id);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1), t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault(); closeMenu(false); jumpTo(t, id === 'main' ? null : id);
  });

  /* ---- FAQ deep links: /faq/#faq-3 opens and focuses that answer ---- */
  function openFaq() {
    var m = /^#(faq-\d+)$/.exec(location.hash), el = m && $(m[1]);
    if (!el) return;
    el.open = true;
    requestAnimationFrame(function () { el.scrollIntoView({ block: 'start' }); var s = el.querySelector('summary'); if (s) s.focus({ preventScroll: true }); });
  }
  openFaq(); window.addEventListener('hashchange', openFaq);

  /* ---- Copy buttons: <button data-copy="text" data-target="id-of-text"> and FAQ "copy link" ---- */
  function selectEl(el) { try { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
  function flash(btn, txt) { var o = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', o); btn.textContent = txt; setTimeout(function () { btn.textContent = o; }, 2200); }
  function copy(text, btn, fallbackEl) {
    var fail = function () { if (fallbackEl) selectEl(fallbackEl); flash(btn, 'Selected, press Ctrl+C'); };
    try { navigator.clipboard.writeText(text).then(function () { flash(btn, 'Copied'); }, fail); } catch (e) { fail(); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) { copy(b.getAttribute('data-copy'), b, $(b.getAttribute('data-target'))); return; }
    var f = e.target.closest('[data-faqlink]');
    if (f) {
      var url = location.origin + BASE + '/faq/#faq-' + f.getAttribute('data-faqlink'), live = f.nextElementSibling;
      var tmp = document.createElement('span'); tmp.textContent = url; tmp.className = 'sr-only'; f.parentNode.appendChild(tmp);
      copy(url, f, tmp); setTimeout(function () { tmp.remove(); }, 4000);
      if (live) live.textContent = 'Link copied';
    }
  });

  /* ---- Reveal-on-click notes (e.g. "card giving coming soon") ---- */
  document.querySelectorAll('[data-reveal]').forEach(function (b) {
    var n = $(b.getAttribute('data-reveal'));
    if (n) b.addEventListener('click', function () { n.hidden = false; b.setAttribute('aria-expanded', 'true'); });
  });

  /* ---- Contact form: validation, spam trap, sending (Web3Forms when data-key is set) ----
     Bots tick the hidden "botcheck" box and submit instantly; people do neither. A trapped submission
     looks successful to the bot and is dropped. */
  var form = $('contact-form'), note = $('form-note'), started = Date.now();
  if (form && note) {
    var sending = false, fallback = form.getAttribute('data-fallback') || '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var fn = $('f-first'), em = $('f-email'), hp = $('f-botcheck'), miss = [];
      if (!fn.value.trim()) miss.push('your first name');
      if (!em.value.trim() || !em.checkValidity()) miss.push('an email address we can reply to');
      fn.setAttribute('aria-invalid', String(!fn.value.trim()));
      em.setAttribute('aria-invalid', String(!em.value.trim() || !em.checkValidity()));
      note.hidden = false;
      if (miss.length) { note.textContent = 'Please add ' + miss.join(' and ') + '.'; (miss[0].indexOf('first') > -1 ? fn : em).focus(); return; }
      var thanks = 'Thank you. Your message was sent, and we will reply by email.';
      if ((hp && hp.checked) || Date.now() - started < 3000) { note.textContent = thanks; form.reset(); return; }
      var key = form.getAttribute('data-key');
      if (!key) { note.textContent = 'Preview only. This form isn’t connected yet.'; return; }
      var v = function (id) { var x = $(id); return x ? x.value.trim() : ''; }, btn = form.querySelector('button[type="submit"]');
      sending = true; if (btn) btn.disabled = true; note.textContent = 'Sending…';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: key, subject: 'Website message from ' + (v('f-first') + ' ' + v('f-last')).trim(), from_name: document.title,
          name: (v('f-first') + ' ' + v('f-last')).trim(), email: v('f-email'), phone: v('f-phone'), message: v('f-msg'), botcheck: false })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.success) throw new Error('not sent');
        note.textContent = thanks; form.reset();
      }).catch(function () {
        note.textContent = 'Sorry, your message didn’t send.' + (fallback ? ' ' + fallback : '');
      }).then(function () { sending = false; if (btn) btn.disabled = false; });
    });
  }

  /* ---- Rail: prev/next buttons for a horizontal scroller ---- */
  document.querySelectorAll('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail'), prev = wrap.querySelector('[data-dir="prev"]'), next = wrap.querySelector('[data-dir="next"]');
    if (!rail || !prev || !next) return;
    var step = function () { var it = rail.querySelector('.rail-item'); return it ? it.getBoundingClientRect().width + 56 : 400; };
    var st = function () { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', st, { passive: true }); window.addEventListener('resize', st); st();
  });

  /* ---- Depth sheets slide out from behind photos on first view (content is always visible) ---- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove('js-pre'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.depth').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) { el.classList.add('js-pre'); io.observe(el); }
    });
  }

  /* ---- Scroll reveals: tag top-level content; CSS scroll-driven animation does the rest ---- */
  var main = document.querySelector('main');
  if (main) {
    var SKIP = '.hero,.phero,.page-head,nav,header,dialog,footer,.rail,.fan';
    main.querySelectorAll('h2,h3,p,figure,li,blockquote,details,dl,form,.btn,.step-big,.depth,.stack,.paper').forEach(function (el) {
      if (el.closest(SKIP) || (el.parentElement && el.parentElement.closest('.js-reveal'))) return;
      el.classList.add('js-reveal');
    });
  }

  /* ---- Header shadow once scrolled ---- */
  var head = document.querySelector('.head');
  if (head) { var onScroll = function () { head.classList.toggle('js-scrolled', window.scrollY > 4); }; window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---- Print: expand collapsed sections (directions, FAQ answers) so they print ---- */
  var closed = [];
  window.addEventListener('beforeprint', function () { closed = [].slice.call(document.querySelectorAll('details:not([open])')); closed.forEach(function (x) { x.open = true; }); });
  window.addEventListener('afterprint', function () { closed.forEach(function (x) { x.open = false; }); closed = []; });

  /* ---- Cursor glow (fine pointers, motion allowed) ---- */
  if (main && !reduce && mm('(pointer:fine)').matches) {
    var g = document.createElement('div'); g.className = 'js-glow'; g.setAttribute('aria-hidden', 'true'); main.prepend(g);
    var tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, raf = 0;
    var tick = function () { x += (tx - x) * 0.12; y += (ty - y) * 0.12; g.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) ? requestAnimationFrame(tick) : 0; };
    document.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; g.classList.add('on'); if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    root.addEventListener('pointerleave', function () { g.classList.remove('on'); });
  }
})();

/* ===== Austin Lawn Care additions (same rules: check elements exist, js- classes, reduced motion) ===== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---- SERVICES menu in the header: a disclosure (click, Escape, click outside) ---- */
  var sb = $('svc-btn'), sm = $('svc-menu');
  if (sb && sm) {
    var close = function (ret) { if (sm.hidden) return; sm.hidden = true; sb.setAttribute('aria-expanded', 'false'); if (ret) sb.focus(); };
    sb.addEventListener('click', function () { var o = sm.hidden; sm.hidden = !o; sb.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(sm.contains(document.activeElement)); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.has-sub')) close(false); });
    sm.addEventListener('focusout', function (e) { if (!e.relatedTarget || !e.relatedTarget.closest('.has-sub')) close(false); });
    if (sm.querySelector('[aria-current]')) sb.parentNode.classList.add('js-here');
  }

  /* ---- Reviews: the rest of the reviews behind one button ---- */
  var rb = $('rv-all');
  if (rb) rb.addEventListener('click', function () {
    var first = null;
    var shown = [].slice.call(document.querySelectorAll('.review')).filter(function (r) { return !r.hidden && r.offsetParent; }).length;
    document.querySelectorAll('.review').forEach(function (r, i) { if (i === shown) first = r; r.hidden = false; });
    rb.hidden = true;
    var wall = document.querySelector('.reviews'); if (wall) wall.classList.add('js-all');
    if (first) { first.setAttribute('tabindex', '-1'); first.focus(); }
  });

  /* ---- Estimate form: required fields, a spam trap, and ONE endpoint from site.config.json (D-8) ---- */
  var form = $('estimate-form'), note = $('est-note'), started = Date.now();
  if (form && note) {
    var sending = false, fallback = form.getAttribute('data-fallback') || '', thanks = form.getAttribute('data-thanks') || '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var miss = [];
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = !f.value.trim() || !f.checkValidity();
        f.setAttribute('aria-invalid', String(bad));
        if (bad) miss.push(f);
      });
      note.hidden = false;
      if (miss.length) {
        note.textContent = 'Please fill in: ' + miss.map(function (f) { return form.querySelector('label[for="' + f.id + '"]').getAttribute('data-name'); }).join(', ') + '.';
        miss[0].focus(); return;
      }
      var hp = $('e-botcheck');
      if ((hp && hp.checked) || Date.now() - started < 3000) { note.textContent = thanks; form.reset(); return; }
      var url = form.getAttribute('data-endpoint');
      if (!url) { note.textContent = 'This form isn’t connected yet. ' + fallback; return; }
      var btn = form.querySelector('button[type="submit"]');
      sending = true; if (btn) btn.disabled = true; note.textContent = 'Sending…';
      fetch(url, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
        .then(function (r) { if (!r.ok) throw new Error('not sent'); note.textContent = thanks; form.reset(); })
        .catch(function () { note.textContent = 'Sorry, your request didn’t send. ' + fallback; })
        .then(function () { sending = false; if (btn) btn.disabled = false; });
    });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim() && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false'); });
  }

  /* ---- Gallery viewer: a <dialog>; arrows, Escape, focus returns to the photo ---- */
  var lb = $('lb'), wall = document.querySelector('.wall');
  if (lb && wall && lb.showModal) {
    var btns = [].slice.call(wall.querySelectorAll('button')), img = document.createElement('img'), ct = lb.querySelector('.ct'), at = 0, from = null;
    var show = function (i) {
      if (!img.parentNode) lb.querySelector('.lb-img').appendChild(img);
      at = (i + btns.length) % btns.length;
      var src = btns[at].querySelector('img');
      img.src = src.getAttribute('src'); img.alt = src.alt;
      ct.textContent = (at + 1) + ' / ' + btns.length;
    };
    btns.forEach(function (b, i) { b.addEventListener('click', function () { from = b; show(i); lb.showModal(); lb.querySelector('.x').focus(); }); });
    lb.querySelector('.pv').addEventListener('click', function () { show(at - 1); });
    lb.querySelector('.nx').addEventListener('click', function () { show(at + 1); });
    lb.querySelector('.x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { if (from) from.focus(); });
  }
})();
