(function () {
  'use strict';

  const C = window.SL_CONTENT;
  const TYPES = window.SL_TYPES;
  const PRODUCTS = window.SL_PRODUCTS;
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const LEVELS = C.levels;
  const levelById = Object.fromEntries(LEVELS.map(l => [l.id, l]));

  const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined
    ? window.Telegram.WebApp : null;
  const inTelegram = !!(tg && tg.platform && tg.platform !== 'unknown');

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const siteUrl = u => /^https?:/.test(u) ? u : C.site + u;
  const money = n => n > 0 ? n.toLocaleString('ru-RU') + ' ₽' : 'Бесплатно';
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
  const patterns = n => `${n} ${plural(n, 'выкройка', 'выкройки', 'выкроек')}`;

  const ICON = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    bag: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1.2 12.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6 7Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    ext: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6"/></svg>',
    mail: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    tg: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 4.5 3.8 11c-.8.3-.8 1.4 0 1.7l4.2 1.4 1.6 5c.2.7 1.1.9 1.6.4l2.4-2.2 4.3 3.2c.6.4 1.4.1 1.6-.6l2.6-13.4c.2-.8-.6-1.4-1.6-1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m8.2 14 9-6.3-6.8 7.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    phone: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h3l1.5 4-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 5 5.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    check: '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    doc: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M14 3.5V8h4M9.5 12h6M9.5 15h6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  };

  // ---------- Telegram ----------
  function haptic(kind = 'light') {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (kind === 'success' || kind === 'error' || kind === 'warning') tg.HapticFeedback.notificationOccurred(kind);
      else if (kind === 'select') tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.impactOccurred(kind);
    } catch (e) { /* старые клиенты */ }
  }
  function initTelegram() {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#fff9f2');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#fff9f2');
      if (tg.setBottomBarColor) tg.setBottomBarColor('#fff9f2');
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      if (tg.BackButton) tg.BackButton.onClick(() => history.back());
    } catch (e) { /* noop */ }
    if (inTelegram && tg.BackButton && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) document.documentElement.classList.add('tg');
  }

  function openLink(url) {
    url = siteUrl(url);
    haptic();
    if (inTelegram && tg.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener');
  }
  function openTelegram() {
    const url = 'https://t.me/' + C.telegram;
    haptic();
    if (inTelegram && tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener');
  }
  // Копирование. Сначала синхронно через execCommand — пока жив жест пользователя:
  // в Telegram Desktop (WebView2) асинхронный clipboard API без жеста молча не срабатывает.
  // Возвращает Promise<boolean> с реальным результатом — тост пишем только по нему.
  function copy(text) {
    if (execCopy(text)) return Promise.resolve(true);
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => false);
    return Promise.resolve(false);
  }
  function execCopy(text) {
    const active = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (active && active.focus) active.focus({ preventScroll: true });
    return ok;
  }
  function copyWithToast(text, okText) {
    return copy(text).then(ok => { toast(ok ? okText : 'Не удалось скопировать: ' + text); return ok; });
  }
  function openHref(href) {
    const a = document.createElement('a'); a.href = href; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function openMail(subject = '', body = '') {
    haptic();
    // копируем до перехода по mailto: на ПК почтовый клиент может не открыться, а адрес останется в буфере
    if (inTelegram && !body) copyWithToast(C.email, 'Адрес ' + C.email + ' скопирован');
    openHref(`mailto:${C.email}` + (subject || body ? `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : ''));
  }
  function openPhone() {
    haptic();
    if (inTelegram) copyWithToast(C.phoneView, 'Номер ' + C.phoneView + ' скопирован');
    openHref('tel:' + C.phone);
  }

  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  // ---------- Хранилище ----------
  const store = {
    get(key, def) { try { const v = localStorage.getItem('sl_' + key); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(key, val) {
      try { localStorage.setItem('sl_' + key, JSON.stringify(val)); } catch (e) { /* приватный режим */ }
      try { if (inTelegram && tg.CloudStorage && tg.isVersionAtLeast('6.9')) tg.CloudStorage.setItem('sl_' + key, JSON.stringify(val)); } catch (e) { /* noop */ }
    }
  };

  // ---------- Корзина ----------
  let cart = store.get('cart', []).filter(i => byId[i.id]);
  function saveCart() { store.set('cart', cart); updateCartUI(); }
  function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
  function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
  function cartKey(id, vid) { return id + '::' + (vid || ''); }
  function inCart(id) { return cart.some(i => i.id === id); }
  function addToCart(p, variant) {
    const key = cartKey(p.id, variant && variant.id);
    const ex = cart.find(i => i.key === key);
    if (ex) ex.qty += 1;
    else cart.push({
      key, id: p.id, qty: 1,
      vid: variant ? variant.id : null,
      price: variant && variant.price != null ? variant.price : p.price,
      sku: variant && variant.sku ? variant.sku : p.sku,
      opts: variant ? variantLabel(p, variant) : ''
    });
    saveCart();
    const fab = $('#cartfab');
    fab.classList.remove('is-bump'); void fab.offsetWidth; fab.classList.add('is-bump');
    haptic('success');
  }
  function variantLabel(p, v) {
    const parts = [];
    if (p.opts[0] && v.opt1) parts.push(p.opts[0].label + ' ' + v.opt1);
    if (p.opts[1] && v.opt2) parts.push(p.opts[1].label + ' ' + v.opt2);
    return parts.join(', ');
  }
  function updateCartUI() {
    const n = cartCount();
    $('#cartCount').textContent = n;
    $('#cartfab').classList.toggle('is-empty', n === 0);
    $$('.topbar__badge').forEach(b => { b.textContent = n; b.dataset.n = n; });
  }

  // ---------- Каталог: выборки ----------
  function productsFor(level, type) {
    return PRODUCTS.filter(p => (level === 'all' || p.level === level) && (!type || type === 'all' || p.types.includes(type)));
  }
  function typesFor(level) {
    return TYPES.map(t => ({ ...t, items: productsFor(level, t.id) })).filter(t => t.items.length);
  }
  function cover(p, thumb = true) { return p.imgs[0] ? (thumb ? 'img/t/' : 'img/p/') + p.imgs[0].f : 'img/ui/logo-512.png'; }
  // Для плиток и превью — фото модели (вторая картинка), обложка с надписями обрезалась бы
  function photo(p) { const im = p.imgs[1] || p.imgs[0]; return im ? 'img/t/' + im.f : 'img/ui/logo-512.png'; }
  function lvlSquares(level, lg) {
    const rank = (levelById[level] || {}).rank || 0;
    return `<span class="lvl${lg ? ' lvl--lg' : ''}" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= rank ? 'on' : ''}"></i>`).join('')}</span>`;
  }
  function img(src, alt, cls = '') {
    return `<span class="img-wrap ${cls}" style="display:block;width:100%;height:100%"><img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" onload="this.parentNode.classList.add('is-loaded')" onerror="this.parentNode.classList.add('is-loaded')"></span>`;
  }
  function cardHTML(p, i) {
    const lvl = levelById[p.level];
    return `<button class="card" style="--i:${i}" data-action="product" data-id="${p.id}">
      <div class="card__img">${img(cover(p), p.name)}
        ${p.price === 0 ? '<span class="card__badge">Бесплатно</span>' : ''}
        ${inCart(p.id) ? '<span class="card__incart" title="В корзине">✓</span>' : ''}
      </div>
      <div class="card__name">${esc(p.name)}</div>
      <div class="card__row">
        <span class="card__price">${money(p.price)}</span>
        ${lvl ? `<span class="card__lvl" data-level="${p.level}" title="${lvl.title}">${lvlSquares(p.level)}</span>` : ''}
      </div>
    </button>`;
  }

  // ---------- Вкладки ----------
  const TABS = ['catalog', 'services', 'help', 'contacts'];
  let currentTab = 'catalog';
  // При запуске все уровни закрыты — человек сам выбирает, что раскрыть
  let openLevel = '';
  let searchQuery = '';

  function setTab(tab, opts = {}) {
    if (!TABS.includes(tab)) tab = 'catalog';
    const changed = tab !== currentTab;
    currentTab = tab;
    $$('.tabs__item').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    $('#tabsInk').style.transform = `translateX(${TABS.indexOf(tab) * 100}%)`;
    renderTab();
    if (changed && !opts.silent) {
      haptic('select');
      const tabs = $('#tabs');
      if (window.scrollY > tabs.offsetTop) window.scrollTo({ top: tabs.offsetTop, behavior: 'instant' in window ? 'instant' : 'auto' });
    }
    try { history.replaceState(history.state, '', '#' + tab); } catch (e) { /* file:// */ }
  }

  function renderTab() {
    const v = $('#tabview');
    const html = { catalog: catalogHTML, services: servicesHTML, help: helpHTML, contacts: contactsHTML }[currentTab]();
    v.innerHTML = `<div class="tabpane">${html}</div>`;
    if (currentTab === 'catalog') { bindSearch(); preloadLevelImages(); }
  }

  function catalogHTML() {
    return `
      <label class="search${searchQuery ? ' has-value' : ''}" id="search">
        <span class="search__icon">${ICON.search}</span>
        <input type="search" id="searchInput" placeholder="Поиск по каталогу" value="${esc(searchQuery)}" autocomplete="off" enterkeyhint="search">
        <button class="search__clear" type="button" data-action="search-clear" aria-label="Очистить">${ICON.close}</button>
      </label>
      <div id="catalogBody">${searchQuery ? searchResultsHTML() : levelsHTML()}</div>`;
  }

  function levelsHTML() {
    // раздел бесплатных выкроек помечен free:true при синхронизации (tools/sync/sync.mjs)
    const freeType = TYPES.find(t => t.free) || TYPES.find(t => t.id === 'besplatnye');
    const free = freeType ? productsFor('all', freeType.id) : [];
    return `
      <section class="section">
        <div class="section__head">
          <div><div class="h-eyebrow">Выкройки по уровню сложности</div><h2 class="h-title" style="margin-top:6px">Каталог</h2></div>
        </div>
        <div class="levels">${LEVELS.map(levelHTML).join('')}</div>
      </section>
      ${free.length ? `<section class="section">
        <button class="promo" data-action="list" data-level="all" data-type="${freeType.id}">
          <div>
            <div class="promo__title">Бесплатные выкройки</div>
            <div class="promo__text">${free.map(p => esc(p.name)).join(' · ')}</div>
          </div>
          <img src="${photo(free[free.length - 1])}" alt="" loading="lazy">
        </button>
      </section>` : ''}`;
  }

  function levelHTML(l) {
    const items = productsFor(l.id);
    const types = typesFor(l.id);
    const isOpen = openLevel === l.id;
    const thumbs = items.slice(0, 3).map(p => `<img src="${photo(p)}" alt="" loading="lazy">`).join('');
    return `<article class="level${isOpen ? ' is-open' : ''}" data-level="${l.id}">
      <button class="level__head" data-action="level" data-level="${l.id}" aria-expanded="${isOpen}">
        <div>
          <div class="level__title">${l.title}</div>
          <div class="level__meta">${l.rank ? lvlSquares(l.id, true) : ''}<span class="level__count">${patterns(items.length)}</span></div>
          <div class="level__note">${esc(l.note)}</div>
        </div>
        <div class="level__thumbs">${thumbs}</div>
      </button>
      <div class="level__body"${isOpen ? ' style="height:auto"' : ''}><div class="level__inner"><div class="level__content">
        <div class="types">
          ${types.map(t => `<button class="type" data-action="list" data-level="${l.id}" data-type="${t.id}">
            <img src="${photo(t.items[0])}" alt="" loading="lazy" decoding="async">
            <span class="type__label">${t.title}<span class="type__count">${t.items.length}</span></span>
          </button>`).join('')}
        </div>
        <button class="btn btn--ghost btn--block btn--sm level__all" data-action="list" data-level="${l.id}" data-type="all">Смотреть все · ${items.length}</button>
      </div></div></div>
    </article>`;
  }

  function searchResultsHTML() {
    const q = searchQuery.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const res = PRODUCTS.filter(p => {
      const hay = (p.name + ' ' + p.short + ' ' + p.sku + ' ' + p.types.map(t => (TYPES.find(x => x.id === t) || {}).title).join(' ')).toLowerCase().replace(/ё/g, 'е');
      return words.every(w => hay.includes(w.replace(/ё/g, 'е')));
    });
    if (!res.length) return `<div class="empty"><div class="h-sub">Ничего не найдено</div>Попробуйте изменить запрос или выберите уровень сложности.</div>`;
    return `<section class="section"><div class="h-eyebrow" style="margin-bottom:12px">Найдено: ${patterns(res.length)}</div><div class="grid">${res.map(cardHTML).join('')}</div></section>`;
  }

  function bindSearch() {
    const input = $('#searchInput');
    if (!input) return;
    input.addEventListener('input', () => {
      searchQuery = input.value;
      $('#search').classList.toggle('has-value', !!searchQuery);
      if (searchQuery.trim()) $('#catalogBody').innerHTML = searchResultsHTML(); else { $('#catalogBody').innerHTML = levelsHTML(); preloadLevelImages(); }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  }

  // Раскрытие через анимацию height (от 0 до реальной высоты, потом auto)
  function setLevelOpen(el, open) {
    const body = $('.level__body', el);
    $('.level__head', el).setAttribute('aria-expanded', String(open));
    if (open === el.classList.contains('is-open')) return;
    const from = body.getBoundingClientRect().height;
    el.classList.toggle('is-open', open);
    const to = open ? body.scrollHeight : 0;
    body.style.height = from + 'px';
    void body.offsetHeight;
    body.style.height = to + 'px';
    const done = e => {
      if (e && e.target !== body) return;
      body.removeEventListener('transitionend', done);
      clearTimeout(body._t);
      if (el.classList.contains('is-open')) body.style.height = 'auto';
    };
    body.addEventListener('transitionend', done);
    clearTimeout(body._t);
    body._t = setTimeout(done, 520); // если transitionend не придёт (вкладка в фоне, отключённые анимации)
  }

  function toggleLevel(id) {
    const el = $(`.level[data-level="${id}"]`);
    const willOpen = !el.classList.contains('is-open');
    $$('.level').forEach(x => { if (x !== el) setLevelOpen(x, false); });
    setLevelOpen(el, willOpen);
    if (willOpen) {
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const tabsH = $('#tabs').offsetHeight;
        if (r.top < tabsH || r.top > window.innerHeight * .45) window.scrollTo({ top: r.top + window.scrollY - tabsH - 10, behavior: 'smooth' });
      }, 440);
    }
    openLevel = willOpen ? id : '';
    haptic('select');
  }

  // Заранее загружаем и декодируем фото плиток, чтобы раскрытие не дёргалось на первом кадре
  function preloadLevelImages() {
    const run = () => $$('.level__body img').forEach(img => {
      img.loading = 'eager';
      if (img.decode) img.decode().catch(() => {});
    });
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 600);
  }

  function servicesHTML() {
    return `<section class="section">
      <div class="h-eyebrow">Сделаем под ваш запрос</div>
      <h2 class="h-title" style="margin:6px 0 16px">Услуги</h2>
      <div class="rows">${C.services.map((s, i) => `
        <button class="row" style="--i:${i}" data-action="service" data-id="${s.id}">
          <span class="row__num">${String(i + 1).padStart(2, '0')}</span>
          <span><span class="row__title">${esc(s.title)}</span><span class="row__text">${esc(typeof s.body[0] === 'string' ? s.body[0] : '')}</span></span>
          <span class="row__icon">${ICON.arrow}</span>
        </button>`).join('')}
      </div>
    </section>`;
  }

  // Иконки 18×18 для кружков «Информации»; толщину линии (1px) задаёт CSS .row__q svg
  const INFO_ICON = {
    ruble: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7.5 14.5v-11h3.25a3 3 0 0 1 0 6H5.5M5.5 11.75h5.5"/></svg>',
    truck: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M1.5 4.5h9v7.5h-9zM10.5 7.5h3.2l2.8 2.9v1.6h-6"/><circle cx="4.75" cy="13" r="1.6" style="fill:var(--paper)"/><circle cx="13.25" cy="13" r="1.6" style="fill:var(--paper)"/></svg>',
    refund: '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.2 6.6A6.25 6.25 0 1 1 2.75 9M3.2 2.9v3.7h3.7"/><path d="M8.2 12.4V5.8h1.9a1.75 1.75 0 0 1 0 3.5H7M7 10.9h3.2"/></svg>'
  };

  function helpHTML() {
    const rows = (list, offset = 0) => list.map((h, i) => `
      <button class="row" style="--i:${i + offset}" data-action="link" data-url="${h.url}">
        <span class="row__q">?</span>
        <span class="row__title" style="text-transform:none;letter-spacing:.02em;font-size:17px">${esc(h.title)}</span>
        <span class="row__icon">${ICON.ext}</span>
      </button>`).join('');
    return `<section class="section">
      <div class="h-eyebrow">Ответы на вопросы</div>
      <h2 class="h-title" style="margin:6px 0 8px">Помощь</h2>
      <p class="lead" style="margin-bottom:16px">Нажмите на вопрос — подробный ответ откроется на сайте.</p>
      <div class="rows">${rows(C.help)}</div>
    </section>
    <section class="section">
      <h3 class="h-sub" style="margin-bottom:12px">Информация</h3>
      <div class="rows">${C.info.map((h, i) => `
        <button class="row" style="--i:${i + 7}" data-action="link" data-url="${h.url}">
          <span class="row__q" style="border-color:var(--brown);color:var(--brown)">${INFO_ICON[h.icon] || 'i'}</span>
          <span class="row__title" style="text-transform:none;letter-spacing:.02em;font-size:17px">${esc(h.title)}</span>
          <span class="row__icon">${ICON.ext}</span>
        </button>`).join('')}</div>
    </section>`;
  }

  function contactsHTML() {
    const a = C.about;
    return `<section class="section">
      <div class="h-eyebrow">Свяжитесь с нами</div>
      <h2 class="h-title" style="margin:6px 0 8px">Контакты</h2>
      <div class="rich" style="margin-bottom:16px">${C.contacts.lead.map(t => `<p>${esc(t)}</p>`).join('')}</div>
      <div class="contact-cards">
        <button class="ccard" data-action="mail"><span class="ccard__ic">${ICON.mail}</span><span><span class="h-eyebrow">Электронная почта</span><span class="ccard__value" style="display:block">${C.email}</span></span><span class="row__icon">${ICON.arrow}</span></button>
        <button class="ccard" data-action="tg"><span class="ccard__ic">${ICON.tg}</span><span><span class="h-eyebrow">Telegram</span><span class="ccard__value" style="display:block">@${C.telegram}</span></span><span class="row__icon">${ICON.arrow}</span></button>
        <button class="ccard" data-action="phone"><span class="ccard__ic">${ICON.phone}</span><span><span class="h-eyebrow">Телефон</span><span class="ccard__value" style="display:block">${C.phoneView}</span></span><span class="row__icon">${ICON.arrow}</span></button>
      </div>
    </section>

    <section class="section">
      <div class="h-eyebrow">Философия бренда</div>
      <h2 class="h-title" style="margin:6px 0 14px">О бренде</h2>
      <img class="about-img" src="img/ui/about.webp" alt="Straight Lines" loading="lazy">
      <p class="lead" style="margin-top:14px">${esc(a.lead)}</p>
      <h3 class="h-sub" style="margin-top:24px">Наши принципы</h3>
      <div class="principles">${a.principles.map((p, i) => `
        <div class="principle"><span class="principle__n">${i + 1}</span><div><div class="h-sub">${p.title}</div><p>${esc(p.text)}</p></div></div>`).join('')}
      </div>
      <div class="dna">${esc(a.dna)}</div>
    </section>

    <section class="section">
      <div class="acc" style="margin:0">
        <div class="acc__item">
          <button class="acc__head" data-action="acc"><span class="h-sub">Данные организации</span><span class="acc__plus"></span></button>
          <div class="acc__body"><div class="acc__inner"><div class="acc__content">
            <div class="h-sub" style="margin-bottom:12px;font-size:15px">${C.contacts.company}</div>
            <dl class="req" style="margin:0">${C.contacts.requisites.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          </div></div></div>
        </div>
        ${C.contacts.docs.map(d => `<div class="acc__item"><button class="acc__head" data-action="link" data-url="${d.url}"><span class="h-sub">${d.title}</span><span class="row__icon">${ICON.ext}</span></button></div>`).join('')}
        <div class="acc__item"><button class="acc__head" data-action="link" data-url="/"><span class="h-sub">Открыть сайт sl-ls.ru</span><span class="row__icon">${ICON.ext}</span></button></div>
      </div>
    </section>
    <div class="footer">© 2024–${new Date().getFullYear()} ООО «Прямые линии»<br>Все права защищены</div>`;
  }

  // ---------- Стек экранов ----------
  const stack = [];
  function topbar(title, eyebrow = '', withCart = true) {
    return `<div class="topbar">
      <button class="topbar__btn topbar__back" data-action="back" aria-label="Назад">${ICON.back}</button>
      <div class="topbar__title"><div class="h-sub">${esc(title)}</div>${eyebrow ? `<div class="h-eyebrow">${esc(eyebrow)}</div>` : ''}</div>
      ${withCart ? `<button class="topbar__btn" data-action="cart" aria-label="Корзина">${ICON.bag}<span class="topbar__badge" data-n="${cartCount()}">${cartCount()}</span></button>` : '<span></span>'}
    </div>`;
  }

  function pushScreen(html, onMount, kind) {
    const el = document.createElement('section');
    el.className = 'screen';
    el.dataset.kind = kind || '';
    el.innerHTML = html;
    $('#stack').appendChild(el);
    if (stack.length) stack[stack.length - 1].el.classList.add('is-under');
    stack.push({ el, kind });
    document.body.classList.add('stack-open');
    void el.offsetWidth; // фиксируем стартовое положение, чтобы сработал переход
    el.classList.add('is-in');
    try { history.pushState({ depth: stack.length }, '', location.hash || '#' + currentTab); } catch (e) { /* noop */ }
    if (onMount) onMount(el);
    syncBack();
    haptic();
    return el;
  }

  function popScreen() {
    const top = stack.pop();
    if (!top) return;
    top.el.classList.remove('is-in');
    top.el.classList.add('is-out');
    setTimeout(() => top.el.remove(), 400);
    if (stack.length) {
      const under = stack[stack.length - 1];
      under.el.classList.remove('is-under');
      if (under.refresh) under.refresh();
    } else {
      document.body.classList.remove('stack-open');
      if (currentTab === 'catalog' && !searchQuery) refreshCatalogBadges();
    }
    syncBack();
  }

  function syncBack() {
    if (!tg || !tg.BackButton) return;
    try { stack.length ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) { /* noop */ }
  }

  window.addEventListener('popstate', e => {
    const depth = (e.state && e.state.depth) || 0;
    if ($('#lightbox').hidden === false) { closeLightbox(true); return; }
    while (stack.length > depth) popScreen();
  });

  function back() { if (stack.length) history.back(); }

  function refreshCatalogBadges() {
    $$('#tabview .card').forEach(c => {
      const has = inCart(c.dataset.id);
      const b = $('.card__incart', c);
      if (has && !b) $('.card__img', c).insertAdjacentHTML('beforeend', '<span class="card__incart">✓</span>');
      if (!has && b) b.remove();
    });
  }

  // ---------- Экран списка ----------
  function openList(level, type) {
    const lvl = levelById[level] || levelById.all;
    const types = typesFor(level);
    let current = type || 'all';
    const el = pushScreen(`
      ${topbar('', lvl.title)}
      <div class="chips" role="tablist">
        <button class="chip" data-type="all">Все<sup>${productsFor(level).length}</sup></button>
        ${types.map(t => `<button class="chip" data-type="${t.id}">${t.title}<sup>${t.items.length}</sup></button>`).join('')}
      </div>
      <div class="list-body"></div>`, null, 'list');
    const body = $('.list-body', el);
    const titleEl = $('.topbar__title .h-sub', el);

    function render() {
      $$('.chip', el).forEach(c => c.classList.toggle('is-active', c.dataset.type === current));
      const active = $(`.chip[data-type="${current}"]`, el);
      if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      if (current === 'all') {
        titleEl.textContent = 'Все виды';
        let i = 0;
        body.innerHTML = types.map(t => `
          <div class="group-title"><span class="h-sub">${t.title}</span><span class="h-eyebrow">${t.items.length}</span></div>
          <div class="grid">${t.items.map(p => cardHTML(p, i++)).join('')}</div>`).join('');
      } else {
        const t = TYPES.find(x => x.id === current);
        titleEl.textContent = t ? t.title : '';
        const items = productsFor(level, current);
        body.innerHTML = items.length ? `<div class="grid">${items.map(cardHTML).join('')}</div>` : `<div class="empty">В этом разделе пока нет выкроек</div>`;
      }
    }
    el.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip || chip.dataset.type === current) return;
      current = chip.dataset.type;
      haptic('select');
      el.scrollTo({ top: 0, behavior: 'smooth' });
      render();
    });
    stack[stack.length - 1].refresh = () => {
      $$('.card', el).forEach(c => {
        const has = inCart(c.dataset.id), b = $('.card__incart', c);
        if (has && !b) $('.card__img', c).insertAdjacentHTML('beforeend', '<span class="card__incart">✓</span>');
        if (!has && b) b.remove();
      });
    };
    render();
  }

  // ---------- Экран товара ----------
  function openProduct(id) {
    const p = byId[id];
    if (!p) return;
    const lvl = levelById[p.level];
    const typeTitles = p.types.map(t => (TYPES.find(x => x.id === t) || {}).title).filter(Boolean);
    const sel = {};
    p.opts.forEach((o, i) => { if (o.values.length === 1) sel[i] = o.values[0]; });

    const el = pushScreen(`
      ${topbar(typeTitles[0] || 'Выкройка', lvl ? lvl.title : '')}
      <div class="gallery">
        <div class="gallery__track">${p.imgs.map((im, i) => `<div class="gallery__slide" data-i="${i}">${img('img/p/' + im.f, p.name + ' — фото ' + (i + 1))}</div>`).join('')}</div>
        ${p.imgs.length > 1 ? `<div class="gallery__dots">${p.imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><div class="gallery__count"><span class="gc">1</span> / ${p.imgs.length}</div>` : ''}
      </div>
      ${p.imgs.length > 1 ? `<div class="thumbs">${p.imgs.map((im, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" aria-label="Фото ${i + 1}"><img src="img/t/${im.f}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      <div class="pinfo">
        ${lvl ? `<div class="lvl-label" style="color:var(--lvl-${p.level})">${lvlSquares(p.level, true)} ${lvl.title}</div>` : ''}
        <h1 class="pinfo__name" style="margin-top:10px">${esc(p.name)}</h1>
        ${p.short ? `<div class="pinfo__short">${esc(p.short)}</div>` : ''}
        <div class="pinfo__meta">
          ${p.status ? `<span class="pinfo__status">${esc(p.status)}</span>` : ''}
          ${p.sku ? `<span>Арт.: <span class="psku">${esc(p.sku)}</span></span>` : ''}
        </div>
        <div class="pinfo__price"><b class="pprice">${money(p.price)}</b>${p.old > p.price ? `<s>${money(p.old)}</s>` : ''}</div>
        ${p.opts.map((o, i) => `<div class="opt" data-opt="${i}">
          <div class="opt__label h-eyebrow">${esc(o.label)}</div>
          <div class="opt__values">${o.values.map(v => `<button class="optbtn${sel[i] === v ? ' on' : ''}" data-opt="${i}" data-val="${esc(v)}">${esc(v)}</button>`).join('')}</div>
        </div>`).join('')}
        ${p.opts.length ? `<div class="opt__hint">Нужного размера нет? Возможна разработка выкройки на ваш размер — <button data-action="service" data-id="change-pattern" style="color:var(--blue);border-bottom:1px solid rgba(36,109,220,.35)">напишите нам</button></div>` : ''}
      </div>
      <div class="acc">
        <div class="acc__item is-open">
          <button class="acc__head" data-action="acc"><span class="h-sub">Описание</span><span class="acc__plus"></span></button>
          <div class="acc__body"><div class="acc__inner"><div class="acc__content rich">${p.desc || '<p>Описание появится позже.</p>'}</div></div></div>
        </div>
        ${[['Оплата', 'payment'], ['Доставка', 'delivery'], ['Возврат', 'returns']].map(([t, k]) => `
        <div class="acc__item">
          <button class="acc__head" data-action="acc"><span class="h-sub">${t}</span><span class="acc__plus"></span></button>
          <div class="acc__body"><div class="acc__inner"><div class="acc__content rich">${C.productTabs[k].map(x => `<p>${esc(x)}</p>`).join('')}</div></div></div>
        </div>`).join('')}
      </div>
      <div class="linkrow"><button class="btn btn--ghost btn--sm" data-action="link" data-url="${p.url}">Открыть на сайте ${ICON.ext}</button></div>
      <div class="actionbar">
        <button class="btn btn--grow add-btn" data-action="add">В корзину</button>
      </div>`, null, 'product');

    // ссылки внутри описания — во внешний браузер
    $$('.rich a', el).forEach(a => a.addEventListener('click', e => { e.preventDefault(); openLink(a.getAttribute('href')); }));

    // галерея
    const track = $('.gallery__track', el);
    const dots = $$('.gallery__dots i', el);
    const thumbs = $$('.thumbs button', el);
    let gi = 0;
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === gi) return;
      gi = i;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      thumbs.forEach((d, k) => d.classList.toggle('on', k === i));
      const gc = $('.gc', el); if (gc) gc.textContent = i + 1;
      if (thumbs[i]) thumbs[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, { passive: true });
    thumbs.forEach(b => b.addEventListener('click', () => { track.scrollTo({ left: track.clientWidth * +b.dataset.i, behavior: 'smooth' }); haptic('select'); }));
    $$('.gallery__slide', el).forEach(s => s.addEventListener('click', () => openLightbox(p, +s.dataset.i)));

    // варианты
    function currentVariant() {
      if (!p.variants.length) return null;
      return p.variants.find(v => (p.opts[0] ? v.opt1 === sel[0] : true) && (p.opts[1] ? v.opt2 === sel[1] : true)) || null;
    }
    function syncOpts() {
      if (p.opts[1]) {
        const allowed = new Set(p.variants.filter(v => !sel[0] || v.opt1 === sel[0]).map(v => v.opt2));
        $$('.optbtn[data-opt="1"]', el).forEach(b => { b.disabled = !allowed.has(b.dataset.val); });
        if (sel[1] && !allowed.has(sel[1])) { delete sel[1]; }
        if (!sel[1] && allowed.size === 1) sel[1] = [...allowed][0];
      }
      $$('.optbtn', el).forEach(b => b.classList.toggle('on', sel[b.dataset.opt] === b.dataset.val));
      const v = currentVariant();
      if (v) {
        $('.pprice', el).textContent = money(v.price);
        const sku = $('.psku', el); if (sku && v.sku) sku.textContent = v.sku;
      }
      syncAddBtn();
    }
    function syncAddBtn() {
      const btn = $('.add-btn', el);
      const v = currentVariant();
      const key = cartKey(p.id, v && v.id);
      const has = cart.some(i => i.key === key);
      btn.classList.toggle('is-done', has);
      btn.innerHTML = has ? 'В корзине — оформить' : (p.price === 0 && (!v || v.price === 0) ? 'Получить бесплатно' : 'В корзину');
      btn.dataset.action = has ? 'cart' : 'add';
    }
    el.addEventListener('click', e => {
      const ob = e.target.closest('.optbtn');
      if (ob && !ob.disabled) {
        const i = +ob.dataset.opt;
        sel[i] = ob.dataset.val;
        $$('.opt', el).forEach(o => o.classList.remove('is-error'));
        haptic('select');
        syncOpts();
        return;
      }
      const add = e.target.closest('.add-btn[data-action="add"]');
      if (add) {
        e.stopPropagation();
        const missing = p.opts.map((o, i) => i).filter(i => !sel[i]);
        if (missing.length) {
          missing.forEach(i => { const o = $(`.opt[data-opt="${i}"]`, el); o.classList.remove('is-error'); void o.offsetWidth; o.classList.add('is-error'); });
          $(`.opt[data-opt="${missing[0]}"]`, el).scrollIntoView({ block: 'center', behavior: 'smooth' });
          toast('Выберите ' + p.opts[missing[0]].label.toLowerCase());
          haptic('error');
          return;
        }
        const v = currentVariant();
        if (p.variants.length && !v) { toast('Такого сочетания нет'); haptic('error'); return; }
        ripple(add, e);
        addToCart(p, v);
        toast('Добавлено в корзину');
        syncAddBtn();
      }
    }, true);
    stack[stack.length - 1].refresh = syncAddBtn;
    syncOpts();
  }

  function ripple(btn, e) {
    const r = btn.getBoundingClientRect();
    const s = document.createElement('span');
    const size = Math.max(r.width, r.height);
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = ((e.clientX || r.left + r.width / 2) - r.left - size / 2) + 'px';
    s.style.top = ((e.clientY || r.top + r.height / 2) - r.top - size / 2) + 'px';
    btn.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }

  // ---------- Лайтбокс ----------
  let lbOpen = false;
  function openLightbox(p, start) {
    const lb = $('#lightbox');
    lb.innerHTML = `<button class="lightbox__close" data-action="lb-close" aria-label="Закрыть">${ICON.close}</button>
      <div class="lightbox__count"><span class="lbc">${start + 1}</span> / ${p.imgs.length}</div>
      <div class="lightbox__track">${p.imgs.map(im => `<div class="lightbox__slide"><img src="img/p/${im.f}" alt=""></div>`).join('')}</div>`;
    lb.hidden = false;
    lbOpen = true;
    const track = $('.lightbox__track', lb);
    track.scrollLeft = track.clientWidth * start;
    track.addEventListener('scroll', () => { $('.lbc', lb).textContent = Math.round(track.scrollLeft / track.clientWidth) + 1; }, { passive: true });
    lb.onclick = e => { if (e.target.closest('[data-action="lb-close"]') || e.target.classList.contains('lightbox__slide')) closeLightbox(); };
    try { history.pushState({ depth: stack.length, lb: true }, '', location.hash); } catch (e) { /* noop */ }
    haptic();
  }
  function closeLightbox(fromPop) {
    if (!lbOpen) return;
    lbOpen = false;
    $('#lightbox').hidden = true;
    $('#lightbox').innerHTML = '';
    if (!fromPop) history.back();
  }

  // ---------- Услуга ----------
  function bodyHTML(body) {
    return body.map(b => {
      if (typeof b === 'string') return `<p>${b}</p>`;
      if (b.h) return `<h4>${esc(b.h)}</h4>`;
      if (b.list) return `<ul>${b.list.map(x => `<li>${x}</li>`).join('')}</ul>`;
      if (b.steps) return `<ol class="steps">${b.steps.map(x => `<li>${x}</li>`).join('')}</ol>`;
      if (b.link) return `<p><a href="${b.href}" data-ext>${esc(b.link)} ↗</a></p>`;
      if (b.note) return `<p class="note">${esc(b.note)}</p>`;
      return '';
    }).join('');
  }
  function openService(id) {
    const s = C.services.find(x => x.id === id);
    if (!s) return;
    const n = C.services.indexOf(s) + 1;
    const el = pushScreen(`
      ${topbar('Услуги', '', false)}
      <div class="section">
        <div class="h-eyebrow" style="color:var(--green)">Услуга ${String(n).padStart(2, '0')}</div>
        <h1 class="h-title" style="margin:8px 0 16px">${esc(s.title)}</h1>
        <div class="rich">${bodyHTML(s.body)}</div>
        <div class="linkrow" style="margin:18px 0 0">
          <button class="btn btn--ghost btn--sm" data-action="mail-service" data-id="${s.id}">${ICON.mail} Написать на почту</button>
          <button class="btn btn--ghost btn--sm" data-action="link" data-url="${s.url}">На сайте ${ICON.ext}</button>
        </div>
      </div>
      <div class="actionbar"><button class="btn btn--grow" data-action="tg">${esc(s.cta)}</button></div>`, null, 'service');
    $$('.rich a', el).forEach(a => a.addEventListener('click', e => { e.preventDefault(); openLink(a.getAttribute('href')); }));
  }

  // ---------- Корзина и оформление ----------
  function openCart() {
    if (stack.length && stack[stack.length - 1].kind === 'cart') return;
    const el = pushScreen(`${topbar('Корзина', '', false)}<div class="section cart-body"></div><div class="actionbar cart-bar"></div>`, null, 'cart');
    const user = inTelegram && tg.initDataUnsafe && tg.initDataUnsafe.user;
    const saved = store.get('buyer', {});
    const buyer = {
      name: saved.name || (user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : ''),
      contact: saved.contact || (user && user.username ? '@' + user.username : ''),
      email: saved.email || '',
      comment: ''
    };

    function render() {
      const body = $('.cart-body', el), bar = $('.cart-bar', el);
      if (!cart.length) {
        body.innerHTML = `<div class="empty"><div class="h-sub">Корзина пуста</div>Выберите выкройку в каталоге — она появится здесь.</div>`;
        bar.innerHTML = `<button class="btn btn--grow" data-action="to-catalog">Перейти в каталог</button>`;
        return;
      }
      body.innerHTML = `
        <div class="h-eyebrow">${patterns(cartCount())}</div>
        <div class="citems">${cart.map((it, i) => {
          const p = byId[it.id];
          return `<div class="citem" style="--i:${i}" data-key="${esc(it.key)}">
            <button class="citem__img" data-action="product" data-id="${p.id}">${img(cover(p), p.name)}</button>
            <div>
              <button class="citem__name" data-action="product" data-id="${p.id}" style="text-align:left">${esc(p.name)}</button>
              <div class="citem__var">${[it.opts, it.sku ? 'арт. ' + esc(it.sku) : ''].filter(Boolean).join(' · ')}</div>
              <div class="citem__bottom">
                <div class="qty"><button data-q="-1" aria-label="Меньше">−</button><span>${it.qty}</span><button data-q="1" aria-label="Больше">+</button></div>
                <span class="citem__price">${money(it.price * it.qty)}</span>
              </div>
              <button class="citem__remove" data-remove>Удалить</button>
            </div>
          </div>`;
        }).join('')}</div>
        <div class="total"><span class="h-sub">Итого</span><b>${money(cartTotal())}</b></div>

        <h3 class="h-sub" style="margin-top:22px">Данные покупателя</h3>
        <form class="form" id="orderForm" novalidate>
          <div class="field" data-f="name"><label class="h-eyebrow" for="fName">Имя *</label><input id="fName" name="name" autocomplete="name" value="${esc(buyer.name)}"><div class="field__err">Укажите имя</div></div>
          <div class="field" data-f="contact"><label class="h-eyebrow" for="fContact">Телефон или Telegram *</label><input id="fContact" name="contact" autocomplete="tel" value="${esc(buyer.contact)}" placeholder="+7 … или @username"><div class="field__err">Укажите телефон или ник в Telegram</div></div>
          <div class="field" data-f="email"><label class="h-eyebrow" for="fEmail">E-mail для получения выкройки *</label><input id="fEmail" name="email" type="email" inputmode="email" autocomplete="email" value="${esc(buyer.email)}" placeholder="name@mail.ru"><div class="field__err">Проверьте адрес e-mail</div></div>
          <div class="field" data-f="comment"><label class="h-eyebrow" for="fComment">Комментарий</label><textarea id="fComment" name="comment" placeholder="Пожелания к заказу">${esc(buyer.comment)}</textarea></div>
        </form>
        <div class="notice" style="margin-top:14px">Выкройки в pdf-формате: для печати на плоттере и принтере А4, с описанием модели и последовательностью пошива.</div>`;
      bar.innerHTML = `<button class="btn btn--grow" data-action="checkout">Оформить заказ · ${money(cartTotal())}</button>`;
      $$('#orderForm input, #orderForm textarea', el).forEach(inp => inp.addEventListener('input', () => {
        buyer[inp.name] = inp.value;
        inp.closest('.field').classList.remove('is-error');
        store.set('buyer', { name: buyer.name, contact: buyer.contact, email: buyer.email });
      }));
    }

    el.addEventListener('click', e => {
      const item = e.target.closest('.citem');
      const q = e.target.closest('[data-q]');
      if (item && q) {
        const it = cart.find(x => x.key === item.dataset.key);
        if (!it) return;
        it.qty = Math.max(1, Math.min(99, it.qty + +q.dataset.q));
        saveCart(); haptic('select'); render();
        return;
      }
      if (item && e.target.closest('[data-remove]')) {
        item.classList.add('is-removing');
        haptic('warning');
        setTimeout(() => { cart = cart.filter(x => x.key !== item.dataset.key); saveCart(); render(); }, 280);
        return;
      }
      if (e.target.closest('[data-action="checkout"]')) {
        e.stopPropagation();
        submit();
      }
    }, true);

    function submit() {
      const errors = [];
      if (!buyer.name.trim()) errors.push('name');
      if (buyer.contact.replace(/[^\dA-Za-z_@+]/g, '').length < 4) errors.push('contact');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(buyer.email.trim())) errors.push('email');
      $$('.field', el).forEach(f => f.classList.toggle('is-error', errors.includes(f.dataset.f)));
      if (errors.length) {
        const first = $(`.field[data-f="${errors[0]}"] input`, el);
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => first.focus({ preventScroll: true }), 300);
        haptic('error');
        return;
      }
      openOrderDone(buildOrder(buyer));
    }
    stack[stack.length - 1].refresh = render;
    render();
  }

  function buildOrder(b) {
    const no = 'TG-' + Date.now().toString(36).toUpperCase().slice(-6);
    const lines = cart.map((it, i) => {
      const p = byId[it.id];
      return `${i + 1}. ${p.name}${it.opts ? ' (' + it.opts + ')' : ''}${it.sku ? ', арт. ' + it.sku : ''} — ${it.qty} шт. по ${money(it.price)}`;
    });
    const text = [
      `Заказ ${no} из Telegram-приложения Straight Lines`,
      '',
      ...lines,
      '',
      `Итого: ${money(cartTotal())}`,
      '',
      `Имя: ${b.name.trim()}`,
      `Контакт: ${b.contact.trim()}`,
      `E-mail: ${b.email.trim()}`,
      b.comment.trim() ? `Комментарий: ${b.comment.trim()}` : ''
    ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
    return { no, text };
  }

  function openOrderDone(order) {
    const el = pushScreen(`
      ${topbar('Оформление', '', false)}
      <div class="section" style="text-align:center">
        <div class="success-mark">${ICON.check}</div>
        <h1 class="h-title">Заказ сформирован</h1>
        <p class="lead">Отправьте его нам удобным способом — мы свяжемся с вами для подтверждения и оплаты.</p>
      </div>
      <div class="section">
        <div class="order-text">${esc(order.text)}</div>
        <div style="display:grid;gap:8px;margin-top:16px">
          <button class="btn btn--block" data-send="tg">${ICON.tg} Отправить в Telegram</button>
          <button class="btn btn--dark btn--block" data-send="mail">${ICON.mail} Отправить на e-mail</button>
          <button class="btn btn--ghost btn--block" data-send="copy">Скопировать текст заказа</button>
        </div>
        <div class="notice" style="margin-top:14px">При отправке в Telegram текст заказа копируется автоматически — просто вставьте его в чат с @${C.telegram}.</div>
      </div>
      <div class="actionbar"><button class="btn btn--ghost btn--grow" data-action="finish">Вернуться в каталог</button></div>`, null, 'done');
    let sent = false;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-send]');
      if (!b) return;
      const kind = b.dataset.send;
      copy(order.text).then(ok => {
        if (kind === 'copy') { toast(ok ? 'Текст заказа скопирован' : 'Не удалось скопировать — выделите текст выше вручную'); haptic(ok ? 'success' : 'error'); return; }
        if (kind === 'tg') {
          if (!ok) { toast('Не удалось скопировать — выделите текст выше вручную'); haptic('error'); return; }
          toast('Текст заказа скопирован — вставьте его в чат'); setTimeout(openTelegram, 600);
        }
        if (kind === 'mail') openMail('Заказ ' + order.no, order.text);
        if (!sent) { sent = true; cart = []; saveCart(); }
      });
    });
  }

  function finishOrder() {
    const depth = stack.length;
    if (!depth) return;
    history.go(-depth);
    setTimeout(() => setTab('catalog', { silent: true }), 450);
  }

  // ---------- Делегирование событий ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    switch (a) {
      case 'tab': setTab(t.dataset.tab); break;
      case 'level': toggleLevel(t.dataset.level); break;
      case 'list': openList(t.dataset.level, t.dataset.type); break;
      case 'product': openProduct(t.dataset.id); break;
      case 'service': openService(t.dataset.id); break;
      case 'cart': openCart(); break;
      case 'back': back(); break;
      case 'link': openLink(t.dataset.url); break;
      case 'mail': openMail(); break;
      case 'mail-service': { const s = C.services.find(x => x.id === t.dataset.id); openMail('Заявка: ' + (s ? s.title : ''), ''); break; }
      case 'tg': openTelegram(); break;
      case 'phone': openPhone(); break;
      case 'acc': { const it = t.closest('.acc__item'); it.classList.toggle('is-open'); haptic('select'); break; }
      case 'search-clear': {
        e.preventDefault();
        searchQuery = '';
        const inp = $('#searchInput'); if (inp) inp.value = '';
        $('#search').classList.remove('has-value');
        $('#catalogBody').innerHTML = levelsHTML(); preloadLevelImages();
        break;
      }
      case 'to-catalog': case 'finish': finishOrder(); break;
      default: break;
    }
  });

  // ---------- Старт ----------
  function start() {
    initTelegram();
    try { history.replaceState({ depth: 0 }, '', location.hash || '#catalog'); } catch (e) { /* noop */ }
    // Вкладка при запуске: ?tab=services из кнопок бота (хеш в Telegram занят служебными данными) или #services
    const qTab = new URLSearchParams(location.search).get('tab');
    const initial = TABS.includes(qTab) ? qTab : (location.hash || '').replace('#', '');
    setTab(TABS.includes(initial) ? initial : 'catalog', { silent: true });
    updateCartUI();

    // Подхват корзины из облака Telegram (если локально пусто)
    try {
      if (inTelegram && tg.CloudStorage && tg.isVersionAtLeast('6.9') && !cart.length) {
        tg.CloudStorage.getItem('sl_cart', (err, val) => {
          if (err || !val) return;
          try { const c = JSON.parse(val).filter(i => byId[i.id]); if (c.length && !cart.length) { cart = c; updateCartUI(); refreshCatalogBadges(); } } catch (e) { /* noop */ }
        });
      }
    } catch (e) { /* noop */ }

    // Глубокие ссылки: t.me/<bot>/<app>?startapp=p_takka | s_3d-scan | tab_services
    const sp = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get('startapp') || '';
    if (sp.startsWith('p_') && byId[sp.slice(2)]) openProduct(sp.slice(2));
    else if (sp.startsWith('s_')) openService(sp.slice(2));
    else if (sp.startsWith('tab_')) setTab(sp.slice(4), { silent: true });
    else if (sp.startsWith('l_')) openList(sp.slice(2), 'all');
  }

  start();
})();
