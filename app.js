(function () {
  "use strict";

  const CHECKPOINTS = [
    {
      id: 1,
      title: "Bewegend Object",
      lat: 52.16264777185921,
      lng: 6.739713970242445,
      radius: 10,
      task: "Maak een filmpje van iets dat beweegt zonder mens. Stuur het filmpje via WhatsApp."
    },
    {
      id: 2,
      title: "Mash-up Challenge",
      lat: 52.16350028078444,
      lng: 6.740502696627165,
      radius: 10,
      task: "Luister naar de mash-up met 52 nummers en schrijf zoveel mogelijk liedjes of artiesten op.",
      audio: "./assets/FamilieWeekend-Wandeling.mp3"
    },
    {
      id: 3,
      title: "Toren Bouwen",
      lat: 52.16374146005949,
      lng: 6.73973209773058,
      radius: 10,
      task: "Bouw een toren die zelfstandig kan blijven staan met materialen die je hier vindt. Maximaal 2 minuten. Film het resultaat en stuur het via WhatsApp."
    },
    {
      id: 4,
      title: "Rebus+",
      lat: 52.1631707083504,
      lng: 6.7388732994103195,
      radius: 10,
      task: "Los de rebus op en stuur het antwoord via WhatsApp.",
      image: "./assets/RebusPlus.jpg"
    },
    {
      id: 5,
      title: "Sprongfoto",
      lat: 52.162502916195834,
      lng: 6.7382940787492585,
      radius: 10,
      task: "Maak de perfecte sprongfoto waarbij iedereen met de voeten van de grond is. Verstuur de foto via WhatsApp."
    }
  ];

  const COMPLETED_STORAGE_KEY = "gps-wandeling-completed";
  const UNLOCKED_STORAGE_KEY = "gps-wandeling-unlocked";
  const app = document.querySelector("#app");

  const state = {
    position: null,
    accuracy: null,
    error: "",
    info: "",
    watching: false,
    watchId: null,
    permissionStatus: "unknown",
    completed: loadIds(COMPLETED_STORAGE_KEY),
    unlocked: loadIds(UNLOCKED_STORAGE_KEY)
  };

  function loadIds(storageKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
    } catch {
      return [];
    }
  }

  function saveCompleted() {
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(state.completed));
    } catch {
      state.info = "Voortgang kon niet op dit toestel worden bewaard.";
    }
  }

  function saveUnlocked() {
    try {
      localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(state.unlocked));
    } catch {}
  }

  function distanceInMeters(a, b) {
    const R = 6371000;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function getEffectiveRadius(checkpoint) {
    const gpsMargin = state.accuracy ? Math.min(Math.max(state.accuracy * 0.35, 0), 10) : 0;
    return checkpoint.radius + gpsMargin;
  }

  function getCheckpointsWithDistance() {
    return CHECKPOINTS.map((checkpoint) => {
      if (!state.position) {
        return {
          ...checkpoint,
          distance: null,
          isNearby: false,
          effectiveRadius: checkpoint.radius
        };
      }

      const distance = distanceInMeters(state.position, checkpoint);
      const effectiveRadius = getEffectiveRadius(checkpoint);
      return {
        ...checkpoint,
        distance,
        effectiveRadius,
        isNearby: distance <= effectiveRadius
      };
    });
  }

  function getActiveCheckpoint(checkpoints) {
    const nearbyCheckpoint = checkpoints
      .filter((checkpoint) => checkpoint.isNearby && !state.completed.includes(checkpoint.id))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearbyCheckpoint) return nearbyCheckpoint;

    const latestUnlockedId = [...state.unlocked]
      .reverse()
      .find((id) => !state.completed.includes(id));

    return checkpoints.find((checkpoint) => checkpoint.id === latestUnlockedId);
  }

  function getNearestOpenCheckpoint(checkpoints) {
    return checkpoints
      .filter((checkpoint) => !state.completed.includes(checkpoint.id) && checkpoint.distance !== null)
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function formatDistance(distance) {
    if (distance === null) return "Nog niet gevonden";
    if (distance < 1000) return `${Math.round(distance)} meter afstand`;
    return `${(distance / 1000).toFixed(1).replace(".", ",")} km afstand`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function syncUnlockedCheckpoints(checkpoints) {
    const newlyUnlocked = checkpoints
      .filter((checkpoint) => checkpoint.isNearby && !state.unlocked.includes(checkpoint.id))
      .map((checkpoint) => checkpoint.id);

    if (newlyUnlocked.length === 0) return;

    state.unlocked = [...state.unlocked, ...newlyUnlocked];
    saveUnlocked();
  }

  function icon(name) {
    const icons = {
      navigation:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 7 19-7-4-7 4 7-19Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/></svg>',
      location:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9.6 9.7 1.7 1.7 3.4-3.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
      stop:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      pin:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      check:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"/></svg>',
      refresh:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v6h-6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
      download:
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
    };

    return icons[name] || "";
  }

  function render() {
    const checkpoints = getCheckpointsWithDistance();
    syncUnlockedCheckpoints(checkpoints);
    const activeCheckpoint = getActiveCheckpoint(checkpoints);
    const nearestOpenCheckpoint = getNearestOpenCheckpoint(checkpoints);
    const progress = state.completed.length;
    const allDone = progress === CHECKPOINTS.length;
    const accuracyText = state.accuracy ? `${state.accuracy} m` : "-";

    app.innerHTML = `
      <main class="app-shell">
        <div class="app-frame">
          <section class="hero" aria-labelledby="page-title">
            <div class="hero-inner">
              <div class="top-actions">
                <button class="permission-button" type="button" data-action="permission">
                  <span class="icon">${icon("location")}</span>
                  <span>Locatie toestemming</span>
                  <span class="permission-dot ${escapeHtml(state.permissionStatus)}" aria-hidden="true"></span>
                </button>
              </div>

              <p class="kicker">GPS Wandeling</p>
              <h1 id="page-title">Lammersen Wandeling+</h1>
              <p class="intro">
                Loop naar de verborgen punten. Binnen de zone verschijnt automatisch de opdracht.
                Foto's en filmpjes stuur je zelf via WhatsApp.
              </p>

              <div class="stats-grid" aria-label="Status">
                <div class="stat-card">
                  <span>Voortgang</span>
                  <strong>${progress}/${CHECKPOINTS.length}</strong>
                </div>
                <div class="stat-card">
                  <span>GPS-precisie</span>
                  <strong>${accuracyText}</strong>
                </div>
              </div>

              <div class="actions">
                ${
                  state.watching
                    ? `<button class="button secondary" type="button" data-action="stop">
                        <span class="icon">${icon("stop")}</span>
                        Stop GPS
                      </button>`
                    : `<button class="button" type="button" data-action="start">
                        <span class="icon">${icon("navigation")}</span>
                        Start wandeling
                      </button>`
                }
              </div>

              ${renderLocationNotice()}
            </div>
          </section>

          ${allDone ? renderFinishCard() : ""}
          ${activeCheckpoint ? renderActiveCheckpoint(activeCheckpoint) : ""}

          <h2 class="section-title">Checkpoints</h2>
          <section class="checkpoint-list" aria-label="Checkpoints">
            ${checkpoints
              .map((checkpoint) => renderCheckpointCard(checkpoint, nearestOpenCheckpoint))
              .join("")}
          </section>

          <div class="footer-actions">
            <button class="button danger" type="button" data-action="reset">
              <span class="icon">${icon("refresh")}</span>
              Reset voortgang
            </button>
          </div>
        </div>
      </main>
    `;

    attachMediaFallbacks();
  }

  function renderLocationNotice() {
    if (state.error) {
      return `
        <div class="notice error" role="alert">
          <span class="notice-icon">!</span>
          <p>${escapeHtml(state.error)}</p>
        </div>
      `;
    }

    if (state.info) {
      return `
        <div class="notice">
          <span class="notice-icon">i</span>
          <p>${escapeHtml(state.info)}</p>
        </div>
      `;
    }

    if (state.watching && !state.position) {
      return `
        <div class="notice">
          <span class="notice-icon">i</span>
          <p>GPS wordt gezocht. Buiten werkt dit meestal het snelst.</p>
        </div>
      `;
    }

    if (state.accuracy && state.accuracy > 25) {
      return `
        <div class="notice warning">
          <span class="notice-icon">!</span>
          <p>De GPS is nog grof. Wacht even of loop naar een plek met vrij zicht.</p>
        </div>
      `;
    }

    return "";
  }

  function renderFinishCard() {
    return `
      <section class="finish-card" aria-labelledby="finish-title">
        <h2 id="finish-title">Alle opdrachten zijn voltooid</h2>
        <p>Mooi rondje. Tijd om de inzendingen te verzamelen en de winnaars te kiezen.</p>
      </section>
    `;
  }

  function renderActiveCheckpoint(checkpoint) {
    const locationLabel = checkpoint.isNearby ? "Je bent op locatie" : "Opdracht blijft actief";

    return `
      <section class="active-card" aria-labelledby="active-title">
        <div class="active-header">
          <div class="pin-badge">${icon("pin")}</div>
          <div>
            <p class="eyebrow">${locationLabel}</p>
            <h2 class="active-title" id="active-title">${escapeHtml(checkpoint.title)}</h2>
          </div>
        </div>

        <div class="task-box">
          <p class="task-text">${escapeHtml(checkpoint.task)}</p>
          ${checkpoint.audio ? renderAudio(checkpoint.audio) : ""}
          ${checkpoint.image ? renderImage(checkpoint.image, checkpoint.title) : ""}
        </div>

        <div class="active-actions">
          <button class="button" type="button" data-action="complete" data-id="${checkpoint.id}">
            <span class="icon">${icon("check")}</span>
            Opdracht voltooid
          </button>
        </div>
      </section>
    `;
  }

  function renderAudio(src) {
    return `
      <div class="media-shell" data-media-shell="audio">
        <audio controls preload="metadata" data-media="audio">
          <source src="${escapeHtml(src)}" type="audio/mpeg" />
        </audio>
        <a
          class="button secondary media-download"
          href="${escapeHtml(src)}"
          download="FamilieWeekend-Wandeling.mp3"
          target="_blank"
          rel="noopener"
        >
          <span class="icon">${icon("download")}</span>
          Open/download muziekbestand
        </a>
        <p class="media-help">Werkt afspelen niet op je telefoon? Open het bestand dan met deze knop.</p>
      </div>
    `;
  }

  function renderImage(src, title) {
    return `
      <div class="media-shell" data-media-shell="image">
        <img
          class="task-image"
          src="${escapeHtml(src)}"
          alt="Afbeelding voor ${escapeHtml(title)}"
          data-media="image"
        />
      </div>
    `;
  }

  function renderCheckpointCard(checkpoint, nearestOpenCheckpoint) {
    const done = state.completed.includes(checkpoint.id);
    const unlocked = state.unlocked.includes(checkpoint.id);
    const isNext = nearestOpenCheckpoint && checkpoint.id === nearestOpenCheckpoint.id;
    const classNames = [
      "checkpoint-card",
      done ? "is-done" : "",
      checkpoint.isNearby && !done ? "is-near" : "",
      isNext && !done && !checkpoint.isNearby ? "is-next" : ""
    ]
      .filter(Boolean)
      .join(" ");

    const meta = done
      ? "Voltooid"
      : checkpoint.isNearby
        ? "Opdracht beschikbaar"
        : unlocked
          ? "Geactiveerd"
        : checkpoint.distance === null
          ? "Nog verborgen"
          : isNext
            ? `Dichtstbijzijnd - ${formatDistance(checkpoint.distance)}`
            : formatDistance(checkpoint.distance);

    const badge = done
      ? `<div class="status-badge">${icon("check")}<span class="sr-only">Voltooid</span></div>`
      : checkpoint.isNearby
        ? `<div class="status-badge near">${icon("pin")}<span class="sr-only">Dichtbij</span></div>`
        : `<div class="status-badge pending" aria-hidden="true"></div>`;

    return `
      <article class="${classNames}">
        <div>
          <h3 class="checkpoint-title">${escapeHtml(checkpoint.title)}</h3>
          <p class="checkpoint-meta">${escapeHtml(meta)}</p>
        </div>
        ${badge}
      </article>
    `;
  }

  function attachMediaFallbacks() {
    app.querySelectorAll('[data-media="image"]').forEach((image) => {
      image.addEventListener("error", () => {
        const shell = image.closest("[data-media-shell]");
        if (shell) {
          shell.innerHTML = `
            <div class="media-missing">
              Afbeelding niet gevonden. Plaats RebusPlus.jpg in de map assets.
            </div>
          `;
        }
      });
    });

    app.querySelectorAll('[data-media="audio"]').forEach((audio) => {
      audio.addEventListener(
        "error",
        () => {
          const shell = audio.closest("[data-media-shell]");
          if (shell && !shell.querySelector("[data-audio-warning]")) {
            shell.insertAdjacentHTML(
              "beforeend",
              `
                <div class="media-missing" data-audio-warning>
                  Audiobestand kan niet direct in deze browser worden afgespeeld. Gebruik de knop hierboven om het bestand te openen of downloaden.
                </div>
              `
            );
          }
        },
        true
      );
    });
  }

  function canUseLocation() {
    if (!window.isSecureContext) {
      state.error = "GPS werkt alleen via https of localhost. Host de app beveiligd voor gebruik op mobiel.";
      render();
      return false;
    }

    if (!navigator.geolocation) {
      state.error = "Deze browser ondersteunt geen GPS-locatie.";
      render();
      return false;
    }

    return true;
  }

  function updatePosition(geoPosition) {
    state.position = {
      lat: geoPosition.coords.latitude,
      lng: geoPosition.coords.longitude
    };
    state.accuracy = Math.round(geoPosition.coords.accuracy);
    state.error = "";
  }

  function getLocationErrorMessage(geoError) {
    if (geoError.code === 1) {
      return "Locatie-toestemming is geweigerd. Zet locatie aan om de wandeling te gebruiken.";
    }

    if (geoError.code === 2) {
      return "Locatie kon niet worden bepaald. Probeer het buiten opnieuw.";
    }

    return "Locatie ophalen duurde te lang. Probeer opnieuw.";
  }

  function requestLocationPermission() {
    state.error = "";
    state.info = "";

    if (!canUseLocation()) return;

    state.permissionStatus = "checking";
    state.info = "Locatie-toestemming wordt gevraagd. Bevestig dit op je telefoon.";
    render();

    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        updatePosition(geoPosition);
        state.permissionStatus = "granted";
        state.info = "Locatie is toegestaan. Je kunt nu de wandeling starten.";
        render();
      },
      (geoError) => {
        state.permissionStatus = geoError.code === 1 ? "denied" : "unknown";
        state.error = getLocationErrorMessage(geoError);
        render();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000
      }
    );
  }

  function startLocationTracking() {
    state.error = "";
    state.info = "";

    if (!canUseLocation()) return;

    stopLocationTracking(false);
    state.watching = true;
    state.info = "Locatie wordt opgehaald. Geef toestemming als je telefoon daarom vraagt.";
    render();

    state.watchId = navigator.geolocation.watchPosition(
      (geoPosition) => {
        updatePosition(geoPosition);
        state.info = "";
        state.watching = true;
        state.permissionStatus = "granted";
        render();
      },
      (geoError) => {
        if (state.watchId !== null) {
          navigator.geolocation.clearWatch(state.watchId);
          state.watchId = null;
        }

        state.watching = false;
        state.permissionStatus = geoError.code === 1 ? "denied" : state.permissionStatus;
        state.error = getLocationErrorMessage(geoError);

        render();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000
      }
    );
  }

  function stopLocationTracking(showMessage) {
    if (state.watchId !== null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }

    state.watching = false;

    if (showMessage) {
      state.info = "GPS is gestopt. Je voortgang blijft bewaard op dit toestel.";
      render();
    }
  }

  function completeCheckpoint(id) {
    if (!state.completed.includes(id)) {
      state.completed = [...state.completed, id];
      saveCompleted();
    }

    render();
  }

  function resetProgress() {
    state.completed = [];
    state.unlocked = [];
    try {
      localStorage.removeItem(COMPLETED_STORAGE_KEY);
      localStorage.removeItem(UNLOCKED_STORAGE_KEY);
    } catch {}
    state.info = "Voortgang is gereset.";
    render();
  }

  app.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    const action = trigger.getAttribute("data-action");

    if (action === "start") startLocationTracking();
    if (action === "permission") requestLocationPermission();
    if (action === "stop") stopLocationTracking(true);
    if (action === "reset") resetProgress();
    if (action === "complete") completeCheckpoint(Number(trigger.getAttribute("data-id")));
  });

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        state.permissionStatus = permission.state;
        permission.onchange = () => {
          state.permissionStatus = permission.state;
          render();
        };
        render();
      })
      .catch(() => {});
  }

  window.addEventListener("beforeunload", () => stopLocationTracking(false));

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  render();
})();
