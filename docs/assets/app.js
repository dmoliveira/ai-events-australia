const THEME_KEY = "ai-events-theme";

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

function eventCard(event) {
  return `
    <article class="card">
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
      <div class="meta small muted">
        <span>📍 ${cleanVenue(event)}</span>
      </div>
      <div class="chips">${event.topics.map(topicChip).join("")}</div>
      <div class="actions">
        <a class="button" href="${event.canonical_url}" target="_blank" rel="noreferrer">🔗 Source</a>
        <a class="button" href="https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(event.start)}/${toGCalDate(event.end || event.start)}&details=${encodeURIComponent(event.summary + " " + event.canonical_url)}&location=${encodeURIComponent(`${cleanVenue(event)}, ${event.city}`)}" target="_blank" rel="noreferrer">🗓️ Add</a>
      </div>
    </article>
  `;
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
      <td data-label="Title"><strong>${event.title}</strong><div class="muted">${event.summary}</div></td>
      <td data-label="City">${event.city}</td>
      <td data-label="Format">${event.format}</td>
      <td data-label="Topics">${event.topics.map(topicChip).join("")}</td>
      <td data-label="Links"><a href="${event.canonical_url}" target="_blank" rel="noreferrer">Source</a></td>
    </tr>
  `;
}

function renderTable({ events, meta }) {
  const body = document.querySelector("#events-table-body");
  const search = document.querySelector("#table-search");
  const cityFilter = document.querySelector("#table-city-filter");
  const topicFilter = document.querySelector("#table-topic-filter");
  const count = document.querySelector("#table-count");
  if (!body || !search || !cityFilter || !topicFilter || !count) return;

  cityFilter.innerHTML = `<option value="">All cities</option>${Object.keys(meta.city_counts).sort().map((city) => `<option value="${city}">${city}</option>`).join("")}`;
  topicFilter.innerHTML = `<option value="">All topics</option>${Object.keys(meta.topic_counts).sort().map((topic) => {
    const info = TOPIC_META[topic] || { label: topic, emoji: "🔹" };
    return `<option value="${topic}">${info.emoji} ${info.label}</option>`;
  }).join("")}`;

  function draw() {
    const q = search.value.trim().toLowerCase();
    const city = cityFilter.value;
    const topic = topicFilter.value;
    const filtered = events.filter((event) => {
      const matchesQuery = !q || [event.title, event.summary, event.city, event.organizer, ...(event.topics || [])].join(" ").toLowerCase().includes(q);
      const matchesCity = !city || event.city === city;
      const matchesTopic = !topic || event.topics.includes(topic);
      return matchesQuery && matchesCity && matchesTopic;
    });
    count.textContent = `${filtered.length} matching events`;
    body.innerHTML = filtered.map(rowForEvent).join("");
  }

  [search, cityFilter, topicFilter].forEach((element) => {
    element.addEventListener("input", draw);
    element.addEventListener("change", draw);
  });
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

function renderMap({ events }) {
  const shell = document.querySelector("#events-map");
  const count = document.querySelector("#map-count");
  if (!shell || typeof L === "undefined") return;
  const points = buildMapPoints(events);
  if (count) count.textContent = `${points.length} mapped events`;
  const map = L.map("events-map", { scrollWheelZoom: true }).setView([-26.5, 134.0], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  points.forEach((event) => {
    const marker = L.circleMarker([event.lat, event.lng], {
      radius: 7,
      weight: 2,
      color: "#6ee7ff",
      fillColor: "#7b4dff",
      fillOpacity: 0.85,
    }).addTo(map);
    marker.bindPopup(`
      <div class="map-popup">
        <strong>${event.title}</strong><br>
        <span>${event.city}, ${event.state}</span><br>
        <span>${fmtDate(event.start, event.timezone)}</span><br>
        <a href="${event.canonical_url}" target="_blank" rel="noreferrer">Open source page</a>
      </div>
    `);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  syncTopbarOffset();
  initTheme();
  const data = await loadData();
  const page = document.body.dataset.page;
  if (page === "home") renderHome(data);
  if (page === "calendar") renderCalendar(data);
  if (page === "cities") renderCities(data);
  if (page === "topics") renderTopics(data);
  if (page === "table") renderTable(data);
  if (page === "map") renderMap(data);
});

window.addEventListener("resize", syncTopbarOffset);
