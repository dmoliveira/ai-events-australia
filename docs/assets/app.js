const THEME_KEY = "ai-events-theme";
const FAVORITES_KEY = "ai-events-favorites";

const TOPIC_META = {
  ai: { label: "AI", emoji: "🤖" },
  "machine-learning": { label: "Machine Learning", emoji: "🧠" },
  "data-science": { label: "Data Science", emoji: "📊" },
  "generative-ai": { label: "Generative AI", emoji: "✨" },
  "ai-engineering": { label: "AI Engineering", emoji: "🛠️" },
  agents: { label: "Agents", emoji: "🧩" },
  python: { label: "Python", emoji: "🐍" },
  "computer-science": { label: "Computer Science", emoji: "💻" },
  "data-engineering": { label: "Data Engineering", emoji: "🗄️" },
  cloud: { label: "Cloud", emoji: "☁️" },
  ethics: { label: "Ethics", emoji: "⚖️" },
  governance: { label: "Governance", emoji: "🏛️" },
  "health-ai": { label: "Health AI", emoji: "🏥" },
  training: { label: "Training", emoji: "🎓" },
  networking: { label: "Networking", emoji: "🤝" },
  "creative-ai": { label: "Creative AI", emoji: "🎬" },
  "business-ai": { label: "Business AI", emoji: "💼" },
  "business-tech": { label: "Business Tech", emoji: "🚀" },
  innovation: { label: "Innovation", emoji: "🌟" },
  careers: { label: "Careers", emoji: "💼" },
  databases: { label: "Databases", emoji: "🍃" },
};

const CITY_COORDS = {
  Melbourne: { lat: -37.8136, lng: 144.9631 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Brisbane: { lat: -27.4698, lng: 153.0251 },
  Adelaide: { lat: -34.9285, lng: 138.6007 },
  Canberra: { lat: -35.2809, lng: 149.13 },
  Hobart: { lat: -42.8821, lng: 147.3272 },
  "Gold Coast": { lat: -28.0167, lng: 153.4 },
};

function syncTopbarOffset() {
  const topbar = document.querySelector(".topbar-shell");
  const height = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 84;
  document.documentElement.style.setProperty("--topbar-offset", `${height}px`);
}

function clearLoadingState() {
  document.querySelectorAll('.loading-block, .loading-card, .loading-grid').forEach((node) => {
    node.classList.remove('loading-block', 'loading-card', 'loading-grid');
  });
}

function initMobileNav() {
  const shell = document.querySelector('.topbar-shell');
  const toggle = document.querySelector('.nav-toggle');
  if (!shell || !toggle) return;
  toggle.addEventListener('click', () => {
    const isOpen = shell.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? '✕ Close' : '☰ Menu';
    syncTopbarOffset();
  });
}

function initActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topbar-nav a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const target = href.replace('./', '') || 'index.html';
    link.classList.toggle('is-active', target === current);
  });
}

function ensureToast() {
  let toast = document.querySelector('#ui-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ui-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  return toast;
}

function showToast(message) {
  const toast = ensureToast();
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('is-visible'), 1400);
}

function showPageError(message) {
  const target = document.querySelector('#next-events, #calendar-groups, #city-lists, #topic-lists, #events-table-body, #map-preview');
  if (target) {
    target.innerHTML = `<div class="notice"><p class="muted">${message}</p></div>`;
  }
  showToast(message);
}

function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  root.dataset.theme = resolved;
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "auto";
  applyTheme(saved);
  document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeOption || "auto";
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    });
  });
}

async function loadData() {
  const [eventsRes, metaRes] = await Promise.all([
    fetch("./data/events.json"),
    fetch("./data/meta.json"),
  ]);
  const [events, meta] = await Promise.all([eventsRes.json(), metaRes.json()]);
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  return { events, meta };
}

function fmtDate(value, timezone = "Australia/Sydney") {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function topicChip(topic) {
  const meta = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
  return `<span class="pill">${meta.emoji} ${meta.label}</span>`;
}

function toGCalDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function cleanVenue(event) {
  return event.venue_name || "Venue TBC";
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eventPayload(event) {
  return encodeURIComponent(JSON.stringify(event));
}

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

let cachedData = null;

function favoriteButton(event) {
  return `<button class="button favorite-button" type="button" data-favorite-id="${escapeHtml(event.id)}" aria-pressed="false">☆ Save</button>`;
}

function modalButton(event, label = "Details") {
  return `<button class="button detail-button" type="button" data-event="${eventPayload(event)}">ℹ️ ${label}</button>`;
}

function eventCard(event) {
  return `
    <article class="card event-card">
      <div class="eyebrow">${event.emoji} ${event.city}, ${event.state}</div>
      <h3>${event.title}</h3>
      <p class="muted">${event.summary}</p>
      <div class="meta">
        <span>${fmtDate(event.start, event.timezone)}</span>
        <span>•</span>
        <span>${event.format}</span>
        <span>•</span>
        <span>${event.organizer}</span>
      </div>
      <div class="meta small muted"><span>📍 ${cleanVenue(event)}</span></div>
      <div class="chips">${event.topics.map(topicChip).join("")}</div>
      <div class="actions">
        ${favoriteButton(event)}
        ${modalButton(event)}
        <a class="button" href="${event.canonical_url}" target="_blank" rel="noreferrer">🔗 Source</a>
        <a class="button" href="https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(event.start)}/${toGCalDate(event.end || event.start)}&details=${encodeURIComponent(event.summary + " " + event.canonical_url)}&location=${encodeURIComponent(`${cleanVenue(event)}, ${event.city}`)}" target="_blank" rel="noreferrer">🗓️ Add</a>
      </div>
    </article>
  `;
}

function sortEvents(events, sortBy) {
  const sorted = [...events];
  switch (sortBy) {
    case "city":
      return sorted.sort((a, b) => a.city.localeCompare(b.city) || new Date(a.start) - new Date(b.start));
    case "topic":
      return sorted.sort((a, b) => (a.topics[0] || "").localeCompare(b.topics[0] || "") || new Date(a.start) - new Date(b.start));
    case "recent":
      return sorted.sort((a, b) => new Date(b.start) - new Date(a.start));
    case "upcoming":
    default:
      return sorted.sort((a, b) => new Date(a.start) - new Date(b.start));
  }
}

function getUrlState(keys) {
  const params = new URLSearchParams(window.location.search);
  const state = {};
  keys.forEach((key) => {
    const value = params.get(key);
    if (value) state[key] = value;
  });
  return state;
}

function updateUrlState(state) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(state).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function copyCurrentUrl(button) {
  const previous = button.textContent;
  const done = () => {
    button.textContent = "Copied";
    showToast('Shareable link copied');
    setTimeout(() => { button.textContent = previous; }, 1200);
  };
  const fail = () => {
    button.textContent = previous;
    showToast('Copy failed — copy from address bar');
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(window.location.href).then(done).catch(fail);
  } else {
    fail();
  }
}

function withinPreset(event, preset) {
  const now = new Date();
  const start = new Date(event.start);
  if (preset === "week") {
    const diff = (start - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }
  if (preset === "month") {
    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
  }
  if (preset === "30days") {
    const diff = (start - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }
  return true;
}

function presetTopicValue(preset) {
  if (preset === "ai") return "ai";
  if (preset === "genai") return "generative-ai";
  if (preset === "datascience") return "data-science";
  return "";
}

function isTopicPreset(preset) {
  return ["ai", "genai", "datascience"].includes(preset);
}

function setActivePreset(buttons, activePreset) {
  buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.preset === activePreset));
}

function renderHome({ events, meta }) {
  const now = new Date();
  const upcomingEvents = events.filter((event) => event.status === "upcoming" && new Date(event.start) >= now);
  document.querySelector("#stats").innerHTML = `
    <div class="metric"><strong>${meta.event_count}</strong><span class="muted">curated events</span></div>
    <div class="metric"><strong>${meta.city_count}</strong><span class="muted">cities and hubs</span></div>
    <div class="metric"><strong>${meta.featured_scope || "Australia-wide"}</strong><span class="muted">coverage</span></div>
  `;
  document.querySelector("#next-events").innerHTML = upcomingEvents.slice(0, 6).map(eventCard).join("");
  document.querySelector("#city-grid").innerHTML = Object.entries(meta.city_counts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => `<div class="card"><h3>${city}</h3><p class="muted">${count} curated events</p></div>`)
    .join("");
  document.querySelector("#topic-grid").innerHTML = Object.entries(meta.topic_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([topic, count]) => {
      const info = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
      return `<div class="card"><h3>${info.emoji} ${info.label}</h3><p class="muted">${count} events</p></div>`;
    })
    .join("");
  if (meta.next_event) {
    document.querySelector("#next-callout").innerHTML = eventCard(meta.next_event);
  }
  renderSavedEvents(events);
}

function renderSavedEvents(events) {
  const savedSection = document.querySelector('#saved-events-section');
  const savedGrid = document.querySelector('#saved-events-grid');
  if (!savedSection || !savedGrid) return;
  const favorites = loadFavorites();
  const savedEvents = events.filter((event) => favorites.has(event.id)).slice(0, 6);
  if (savedEvents.length) {
    savedSection.classList.remove('is-hidden');
    savedGrid.innerHTML = savedEvents.map(eventCard).join('');
  } else {
    savedSection.classList.add('is-hidden');
    savedGrid.innerHTML = '';
  }
}

function renderCalendar({ events }) {
  const groups = new Map();
  events.forEach((event) => {
    const key = event.start.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });
  document.querySelector("#calendar-groups").innerHTML = Array.from(groups.entries())
    .map(([month, monthEvents]) => {
      const heading = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
      return `<div class="month-group"><div class="section-header"><h2>${heading}</h2><span class="muted">${monthEvents.length} events</span></div><div class="grid cards">${monthEvents.map(eventCard).join("")}</div></div>`;
    })
    .join("");
}

function renderCities({ events, meta }) {
  document.querySelector("#city-lists").innerHTML = Object.keys(meta.city_counts)
    .sort((a, b) => meta.city_counts[b] - meta.city_counts[a])
    .map((city) => {
      const cityEvents = events.filter((event) => event.city === city);
      return `<section class="panel"><div class="section-header"><h2>${city}</h2><span class="muted">${cityEvents.length} events</span></div><div class="grid cards">${cityEvents.map(eventCard).join("")}</div></section>`;
    })
    .join("");
}

function renderTopics({ events, meta }) {
  document.querySelector("#topic-lists").innerHTML = Object.keys(meta.topic_counts)
    .sort((a, b) => meta.topic_counts[b] - meta.topic_counts[a])
    .map((topic) => {
      const info = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
      const topicEvents = events.filter((event) => event.topics.includes(topic));
      return `<section class="panel"><div class="section-header"><h2>${info.emoji} ${info.label}</h2><span class="muted">${topicEvents.length} events</span></div><div class="grid cards">${topicEvents.map(eventCard).join("")}</div></section>`;
    })
    .join("");
}

function rowForEvent(event) {
  return `
    <tr>
      <td data-label="Date">${fmtDate(event.start, event.timezone)}</td>
      <td data-label="Event"><strong>${event.title}</strong><div class="muted">${event.summary}</div></td>
      <td data-label="City">${event.city}</td>
      <td data-label="Format">${event.format}</td>
      <td data-label="Topics">${event.topics.map(topicChip).join("")}</td>
      <td data-label="Link"><div class="actions">${favoriteButton(event)} ${modalButton(event, 'Open')} <a href="${event.canonical_url}" target="_blank" rel="noreferrer">Source</a></div></td>
    </tr>
  `;
}

function ensureModalShell() {
  let shell = document.querySelector('#event-modal');
  if (shell) return shell;
  shell = document.createElement('div');
  shell.id = 'event-modal';
  shell.className = 'modal-shell';
  shell.innerHTML = `
    <div class="modal-backdrop" data-close-modal="true"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" tabindex="-1">
      <button class="modal-close" type="button" aria-label="Close details" data-close-modal="true">✕</button>
      <div id="event-modal-content"></div>
    </div>
  `;
  document.body.appendChild(shell);
  return shell;
}

function renderModalContent(event) {
  return `
    <div class="eyebrow">${escapeHtml(event.emoji)} ${escapeHtml(event.city)}, ${escapeHtml(event.state)}</div>
    <h2 id="event-modal-title">${escapeHtml(event.title)}</h2>
    <p class="muted">${escapeHtml(event.summary)}</p>
    <div class="meta"><span>${escapeHtml(fmtDate(event.start, event.timezone))}</span><span>•</span><span>${escapeHtml(event.format)}</span><span>•</span><span>${escapeHtml(event.organizer)}</span></div>
    <div class="meta"><span>📍 ${escapeHtml(cleanVenue(event))}</span></div>
    <div class="chips">${event.topics.map(topicChip).join('')}</div>
    <div class="modal-actions actions">
      ${favoriteButton(event)}
      <a class="button" href="${escapeHtml(event.canonical_url)}" target="_blank" rel="noreferrer">🔗 Source</a>
      <a class="button" href="https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(event.start)}/${toGCalDate(event.end || event.start)}&details=${encodeURIComponent(event.summary + " " + event.canonical_url)}&location=${encodeURIComponent(`${cleanVenue(event)}, ${event.city}`)}" target="_blank" rel="noreferrer">🗓️ Add</a>
    </div>
  `;
}

function syncFavoriteButtons() {
  const favorites = loadFavorites();
  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    const id = button.getAttribute('data-favorite-id');
    const active = favorites.has(id);
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-favorite', active);
    button.textContent = active ? '★ Saved' : '☆ Save';
  });
}

function initFavorites() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite-id]');
    if (!button) return;
    const id = button.getAttribute('data-favorite-id');
    const favorites = loadFavorites();
    if (favorites.has(id)) {
      favorites.delete(id);
      showToast('Removed from saved events');
    } else {
      favorites.add(id);
      showToast('Saved event');
    }
    saveFavorites(favorites);
    syncFavoriteButtons();
    if (cachedData?.events) renderSavedEvents(cachedData.events);
  });
  syncFavoriteButtons();
}

function initEventModal() {
  const shell = ensureModalShell();
  const card = shell.querySelector('.modal-card');
  const content = shell.querySelector('#event-modal-content');
  let lastTrigger = null;

  function closeModal() {
    shell.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    if (lastTrigger) lastTrigger.focus();
  }

  function trapFocus(event) {
    if (!shell.classList.contains('is-open') || event.key !== 'Tab') return;
    const focusables = [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.hasAttribute('disabled'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.detail-button');
    if (trigger) {
      lastTrigger = trigger;
      const data = JSON.parse(decodeURIComponent(trigger.dataset.event));
      content.innerHTML = renderModalContent(data);
      shell.classList.add('is-open');
      document.body.classList.add('modal-open');
      syncFavoriteButtons();
      card.focus();
      return;
    }
    if (event.target.closest('[data-close-modal="true"]')) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (!shell.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeModal();
    trapFocus(event);
  });
}

function buildFilterOptions(values, formatter = (value) => value) {
  return values.sort().map((value) => `<option value="${value}">${formatter(value)}</option>`).join("");
}

function renderTable({ events, meta }) {
  const body = document.querySelector("#events-table-body");
  const search = document.querySelector("#table-search");
  const cityFilter = document.querySelector("#table-city-filter");
  const topicFilter = document.querySelector("#table-topic-filter");
  const formatFilter = document.querySelector("#table-format-filter");
  const sortSelect = document.querySelector("#table-sort");
  const densitySelect = document.querySelector("#table-density");
  const resetButton = document.querySelector("#table-reset");
  const shareButton = document.querySelector("#table-share");
  const count = document.querySelector("#table-count");
  const summary = document.querySelector("#table-summary");
  const presetButtons = [...document.querySelectorAll(".preset-button")];
  const table = document.querySelector('#events-table');
  if (!body || !search || !cityFilter || !topicFilter || !formatFilter || !sortSelect || !densitySelect || !resetButton || !shareButton || !count || !summary || !table) return;

  cityFilter.innerHTML = `<option value="">All cities</option>${buildFilterOptions(Object.keys(meta.city_counts))}`;
  topicFilter.innerHTML = `<option value="">All topics</option>${buildFilterOptions(Object.keys(meta.topic_counts), (topic) => {
    const info = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
    return `${info.emoji} ${info.label}`;
  })}`;
  formatFilter.innerHTML = `<option value="">All formats</option>${buildFilterOptions([...new Set(events.map((event) => event.format))])}`;
  const initial = getUrlState(["q", "city", "topic", "format", "sort", "preset", "density"]);
  const favoritesPresetFromUrl = new URLSearchParams(window.location.search).get('favorites') === '1';
  if (favoritesPresetFromUrl && !initial.preset) initial.preset = 'favorites';
  if (initial.q) search.value = initial.q;
  if (initial.city) cityFilter.value = initial.city;
  if (initial.topic) topicFilter.value = initial.topic;
  if (initial.format) formatFilter.value = initial.format;
  if (initial.sort) sortSelect.value = initial.sort;
  if (initial.density) densitySelect.value = initial.density;
  if (!initial.topic && isTopicPreset(initial.preset)) topicFilter.value = presetTopicValue(initial.preset);

  function draw() {
    const q = search.value.trim().toLowerCase();
    const city = cityFilter.value;
    const topic = topicFilter.value;
    const format = formatFilter.value;
    const sort = sortSelect.value;
    const density = densitySelect.value;
    const activePreset = presetButtons.find((button) => button.classList.contains("is-active"))?.dataset.preset || "";
    const favoritesOnly = activePreset === 'favorites';
    const filtered = sortEvents(events.filter((event) => {
      const haystack = [event.title, event.summary, event.city, event.organizer, cleanVenue(event), ...(event.topics || [])].join(" ").toLowerCase();
      return (!q || haystack.includes(q))
        && (!city || event.city === city)
        && (!topic || event.topics.includes(topic))
        && (!format || event.format === format)
        && (!activePreset || withinPreset(event, activePreset) || presetTopicValue(activePreset) === topic)
        && (!favoritesOnly || loadFavorites().has(event.id));
    }), sort);
    count.textContent = `${filtered.length} matching events`;
    summary.textContent = filtered.length ? `Showing ${filtered.length} events sorted by ${sort}.` : "No events match the current filters.";
    body.innerHTML = filtered.map(rowForEvent).join("");
    table.classList.toggle('is-compact', density === 'compact');
    updateUrlState({ q, city, topic, format, sort, density, preset: activePreset, favorites: favoritesOnly ? '1' : '' });
  }

  [search, cityFilter, topicFilter, formatFilter, sortSelect, densitySelect].forEach((element) => {
    element.addEventListener("input", draw);
    element.addEventListener("change", draw);
  });
  resetButton.addEventListener("click", () => {
    search.value = "";
    cityFilter.value = "";
    topicFilter.value = "";
    formatFilter.value = "";
    sortSelect.value = "upcoming";
    densitySelect.value = 'comfortable';
    setActivePreset(presetButtons, "");
    draw();
  });
  shareButton.addEventListener("click", () => copyCurrentUrl(shareButton));
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      const isActive = button.classList.contains("is-active");
      if (preset === 'favorites') {
        setActivePreset(presetButtons, isActive ? '' : preset);
        draw();
        return;
      }
      if (isTopicPreset(preset) && isActive) {
        topicFilter.value = "";
      } else if (isTopicPreset(preset)) {
        topicFilter.value = presetTopicValue(preset);
      }
      setActivePreset(presetButtons, isActive ? "" : preset);
      draw();
    });
  });
  if (initial.preset) setActivePreset(presetButtons, initial.preset);
  draw();
}

function buildMapPoints(events) {
  const cityIndex = {};
  return events
    .filter((event) => CITY_COORDS[event.city])
    .map((event) => {
      cityIndex[event.city] = (cityIndex[event.city] || 0) + 1;
      const occurrence = cityIndex[event.city];
      const base = CITY_COORDS[event.city];
      const lat = base.lat + ((occurrence % 5) - 2) * 0.03;
      const lng = base.lng + ((Math.floor(occurrence / 5) % 5) - 2) * 0.03;
      return { ...event, lat, lng };
    });
}

function markerPopup(event) {
  return `
    <div class="map-popup">
      <strong>${event.title}</strong><br>
      <span>${event.city}, ${event.state}</span><br>
      <span>${fmtDate(event.start, event.timezone)}</span><br>
      <span>${cleanVenue(event)}</span><br>
      <a href="${event.canonical_url}" target="_blank" rel="noreferrer">Open event page</a>
    </div>
  `;
}

function mapMarkerIcon(event) {
  return L.divIcon({
    className: "event-map-marker",
    html: `<span>${event.emoji || "📍"}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
  });
}

function renderMap({ events, meta }) {
  const shell = document.querySelector("#events-map");
  const count = document.querySelector("#map-count");
  const cityFilter = document.querySelector("#map-city-filter");
  const topicFilter = document.querySelector("#map-topic-filter");
  const formatFilter = document.querySelector("#map-format-filter");
  const resetButton = document.querySelector("#map-reset");
  const shareButton = document.querySelector("#map-share");
  const preview = document.querySelector("#map-preview");
  const presetButtons = [...document.querySelectorAll(".map-preset-button")];
  if (!shell || !count || !cityFilter || !topicFilter || !formatFilter || !resetButton || !shareButton || !preview) return;
  if (typeof L === "undefined") {
    shell.innerHTML = `<div class="notice"><h3>Map unavailable</h3><p class="muted">The map library did not load. Please use the table or city views, or refresh the page to try again.</p></div>`;
    count.textContent = 'Map unavailable';
    preview.innerHTML = `<div class="muted">Try the table view or city view while the map is unavailable.</div>`;
    return;
  }

  cityFilter.innerHTML = `<option value="">All cities</option>${buildFilterOptions(Object.keys(meta.city_counts))}`;
  topicFilter.innerHTML = `<option value="">All topics</option>${buildFilterOptions(Object.keys(meta.topic_counts), (topic) => {
    const info = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
    return `${info.emoji} ${info.label}`;
  })}`;
  formatFilter.innerHTML = `<option value="">All formats</option>${buildFilterOptions([...new Set(events.map((event) => event.format))])}`;
  const initial = getUrlState(["mapCity", "mapTopic", "mapFormat", "mapPreset"]);
  const favoritesPresetFromUrl = new URLSearchParams(window.location.search).get('favorites') === '1';
  if (favoritesPresetFromUrl && !initial.mapPreset) initial.mapPreset = 'favorites';
  if (initial.mapCity) cityFilter.value = initial.mapCity;
  if (initial.mapTopic) topicFilter.value = initial.mapTopic;
  if (initial.mapFormat) formatFilter.value = initial.mapFormat;
  if (!initial.mapTopic && isTopicPreset(initial.mapPreset)) topicFilter.value = presetTopicValue(initial.mapPreset);

  const points = buildMapPoints(events);
  const map = L.map("events-map", { scrollWheelZoom: true }).setView([-26.5, 134.0], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const clusterLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44 })
    : L.layerGroup();
  map.addLayer(clusterLayer);

  function drawPreview(filtered) {
    preview.innerHTML = filtered.slice(0, 6).map((event) => `
      <div class="map-preview-item">
        <strong>${event.title}</strong>
        <div class="muted small">${event.city} • ${fmtDate(event.start, event.timezone)}</div>
      </div>
    `).join("") || `<div class="muted">No mapped events match the current filters.</div>`;
  }

  function draw() {
    const city = cityFilter.value;
    const topic = topicFilter.value;
    const format = formatFilter.value;
    const activePreset = presetButtons.find((button) => button.classList.contains("is-active"))?.dataset.preset || "";
    const favoritesOnly = activePreset === 'favorites';
    const filtered = points.filter((event) => (!city || event.city === city) && (!topic || event.topics.includes(topic)) && (!format || event.format === format) && (!activePreset || activePreset === 'favorites' || withinPreset(event, activePreset) || presetTopicValue(activePreset) === topic) && (!favoritesOnly || loadFavorites().has(event.id)));
    clusterLayer.clearLayers();
    filtered.forEach((event) => {
      const marker = L.marker([event.lat, event.lng], { icon: mapMarkerIcon(event) });
      marker.bindPopup(markerPopup(event));
      clusterLayer.addLayer(marker);
    });
    count.textContent = `${filtered.length} mapped events`;
    drawPreview(filtered);
    if (filtered.length) {
      const bounds = L.latLngBounds(filtered.map((event) => [event.lat, event.lng]));
      map.fitBounds(bounds.pad(0.2));
    } else {
      map.setView([-26.5, 134.0], 4);
    }
    updateUrlState({ mapCity: city, mapTopic: topic, mapFormat: format, mapPreset: activePreset, favorites: favoritesOnly ? '1' : '' });
  }

  [cityFilter, topicFilter, formatFilter].forEach((element) => {
    element.addEventListener("change", draw);
  });
  resetButton.addEventListener("click", () => {
    cityFilter.value = "";
    topicFilter.value = "";
    formatFilter.value = "";
    setActivePreset(presetButtons, "");
    draw();
  });
  shareButton.addEventListener("click", () => copyCurrentUrl(shareButton));
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      const isActive = button.classList.contains("is-active");
      if (preset === 'favorites') {
        setActivePreset(presetButtons, isActive ? '' : preset);
        draw();
        return;
      }
      if (isTopicPreset(preset) && isActive) {
        topicFilter.value = "";
      } else if (isTopicPreset(preset)) {
        topicFilter.value = presetTopicValue(preset);
      }
      setActivePreset(presetButtons, isActive ? "" : preset);
      draw();
    });
  });
  if (initial.mapPreset) setActivePreset(presetButtons, initial.mapPreset);

  draw();
}

document.addEventListener("DOMContentLoaded", async () => {
  syncTopbarOffset();
  initMobileNav();
  initFavorites();
  initEventModal();
  initActiveNav();
  initTheme();
  try {
    const data = await loadData();
    cachedData = data;
    const page = document.body.dataset.page;
    if (page === "home") renderHome(data);
    if (page === "calendar") renderCalendar(data);
    if (page === "cities") renderCities(data);
    if (page === "topics") renderTopics(data);
    if (page === "table") renderTable(data);
    if (page === "map") renderMap(data);
  } catch (error) {
    showPageError('Some event data could not be loaded. Please refresh and try again.');
  } finally {
    clearLoadingState();
  }
});

window.addEventListener("resize", syncTopbarOffset);
  const favoritesPresetFromUrl = new URLSearchParams(window.location.search).get('favorites') === '1';
  if (favoritesPresetFromUrl && !initial.preset) initial.preset = 'favorites';
