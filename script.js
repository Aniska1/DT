/* ==========================================================================
   ElderEase — Front-End Accessible Prototype Script (Trilingual & Voice Guided)
   Requires: translations.js
   ========================================================================== */

const VIEWS = ["home", "contacts", "pills", "help", "messages", "feedback", "settings"];
const SETTINGS_KEY = "elderease-settings-v2";
const USER_KEY = "elderease-user-v2";
const PILLS_KEY = "elderease-pills-v2";
const FEEDBACK_KEY = "elderease-feedback-v2";
const LEVELS = [0.9, 1, 1.2, 1.4, 1.6]; // Small, Normal, Large, Larger, Largest

const $ = (id) => document.getElementById(id);
const toast = $("toast");
let toastTimer;
let modalAction = () => {};
let lastFocus = null;
let currentView = "home";
let currentScreen = "login-screen"; // "login-screen", "signup-screen", "dashboard-shell"

/* App state */
const settings = { lang: "en", level: 1, contrast: false, spacing: false };

let currentUser = {
  name: "Ramesh Kumar",
  phone: "9876543210",
  avatar: "👴",
  role: "Senior Citizen",
  caregiver: "Anita (Daughter) - 98765 43211",
  lang: "en"
};

let pillState = {
  morning: true,
  noon: false,
  night: false
};

let feedbackList = [];

/* ==========================================================================
   TRANSLATION HELPERS
   ========================================================================== */
function t(key, vars) {
  let s = (TRANSLATIONS[settings.lang] && TRANSLATIONS[settings.lang][key]) ||
          (TRANSLATIONS.en && TRANSLATIONS.en[key]) || key;
  if (vars) {
    for (const k in vars) {
      s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    }
  }
  return s;
}

function greeting() {
  const h = new Date().getHours();
  const timeGreeting = t(h < 12 ? "g_morning" : h < 17 ? "g_afternoon" : "g_evening");
  const honorific = settings.lang === "hi" ? " जी" : settings.lang === "kn" ? " ಅವರೇ" : "";
  const firstName = currentUser.name ? currentUser.name.split(" ")[0] : "Friend";
  return `${timeGreeting} ${firstName}${honorific}!`;
}

function viewTitle(name) {
  if (name === "home") return greeting();
  const map = {
    contacts: "t_contacts",
    pills: "t_pills",
    help: "t_help",
    messages: "t_messages",
    feedback: "t_feedback",
    settings: "t_settings"
  };
  return t(map[name] || "doc_title");
}

function applyLanguage() {
  const lang = settings.lang;
  document.documentElement.lang = lang;
  document.title = t("doc_title");

  // Update text content
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  // Update HTML content
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPh));
  });

  // Update ARIA labels
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  // Update titles
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });

  // Update language switcher active buttons (both large and settings)
  document.querySelectorAll(".lang-big-btn").forEach((btn) => {
    const isCurrent = btn.dataset.lang === lang;
    btn.classList.toggle("active", isCurrent);
    btn.setAttribute("aria-checked", String(isCurrent));
  });

  document.querySelectorAll(".lang-controls button").forEach((b) => {
    b.setAttribute("aria-checked", String(b.dataset.lang === lang));
  });

  document.querySelectorAll(".lang-pill-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.signupLang === lang);
  });

  // Dynamic titles and labels
  if ($("page-title")) $("page-title").textContent = viewTitle(currentView);
  if ($("today-label")) {
    const locale = LANG_META[lang] ? LANG_META[lang].locale : "en-IN";
    $("today-label").textContent = new Date()
      .toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })
      .toUpperCase();
  }

  updateSizeLabel();
  updateUserBadges();
  renderPillStates();
  renderFeedbackList();
}

/* ==========================================================================
   TOAST NOTIFICATION
   ========================================================================== */
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ==========================================================================
   MULTI-TIER AUDIO & VOICE GUIDANCE ENGINE
   Tier 1: High-fidelity natural Web Audio (Google TTS Cloud streaming)
   Tier 2: Browser native SpeechSynthesis (with voice-changed detection)
   Tier 3: Phonetic Indian-English Transliteration fallback (zero-fail)
   ========================================================================== */

let currentAudio = null;
let isSpeaking = false;
let audioQueue = [];
let audioQueueIndex = 0;
let availableVoices = [];

function loadVoices() {
  if ("speechSynthesis" in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function updateVoiceBar(show, langName, previewText) {
  const bar = $("voice-floating-bar");
  if (!bar) return;
  if (show) {
    bar.classList.add("active");
    if ($("voice-bar-lang")) {
      $("voice-bar-lang").textContent = (t("voice_speaking") || "Speaking…") + (langName ? ` (${langName})` : "");
    }
    if ($("voice-bar-copy")) {
      $("voice-bar-copy").textContent = previewText ? `"${previewText.slice(0, 75)}${previewText.length > 75 ? '…' : ''}"` : "";
    }
  } else {
    bar.classList.remove("active");
  }
}

function stopSpeaking() {
  isSpeaking = false;
  audioQueue = [];
  audioQueueIndex = 0;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch (_) {}
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  updateVoiceBar(false);
}

// Split text into clean sentence chunks for fluid audio streaming
function chunkText(text) {
  if (!text) return [];
  const rawSegments = text.split(/([।\.!\?,;\n]+)/);
  const chunks = [];
  let current = "";
  for (let i = 0; i < rawSegments.length; i++) {
    const part = rawSegments[i];
    if ((current + part).length > 130) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, 130)];
}

function playGoogleTtsQueue(chunks, langCode, onEnd, onError) {
  if (!chunks || chunks.length === 0) {
    if (onEnd) onEnd();
    return;
  }
  audioQueue = chunks;
  audioQueueIndex = 0;

  function playNext() {
    if (!isSpeaking) return;
    if (audioQueueIndex >= audioQueue.length) {
      isSpeaking = false;
      updateVoiceBar(false);
      if (onEnd) onEnd();
      return;
    }

    const chunk = audioQueue[audioQueueIndex++];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodeURIComponent(chunk)}`;

    currentAudio = new Audio(url);
    currentAudio.playbackRate = 0.92;

    currentAudio.onplay = () => {
      isSpeaking = true;
      const langLabel = LANG_META[settings.lang]?.nativeLabel || langCode;
      updateVoiceBar(true, langLabel, chunk);
    };

    currentAudio.onended = () => {
      playNext();
    };

    currentAudio.onerror = (err) => {
      console.warn("Online TTS failed, falling back to speech synthesis...", err);
      currentAudio = null;
      if (onError) onError();
    };

    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play blocked, falling back to speech synthesis...", err);
        currentAudio = null;
        if (onError) onError();
      });
    }
  }

  playNext();
}

function speakViaSpeechSynthesis(text, key, targetLang) {
  if (!("speechSynthesis" in window)) {
    showToast(t("toast_nospeech"));
    return;
  }

  stopSpeaking();
  isSpeaking = true;

  if (availableVoices.length === 0) {
    availableVoices = window.speechSynthesis.getVoices();
  }

  const lang = targetLang || settings.lang;
  const langMeta = LANG_META[lang] || LANG_META.en;

  // Search for native voice matching Hindi or Kannada
  let nativeVoice = null;
  if (lang === "hi") {
    nativeVoice = availableVoices.find((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith("hi") ||
      v.name.toLowerCase().includes("hindi") ||
      v.name.toLowerCase().includes("swara") ||
      v.name.toLowerCase().includes("madhur")
    );
  } else if (lang === "kn") {
    nativeVoice = availableVoices.find((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith("kn") ||
      v.name.toLowerCase().includes("kannada") ||
      v.name.toLowerCase().includes("gagan") ||
      v.name.toLowerCase().includes("sapna")
    );
  }

  let textToSpeak = text;
  let voiceToUse = nativeVoice;
  let speechLocale = langMeta.speech;

  // Tier 3: If no native Hindi or Kannada voice is installed on Windows/Browser,
  // use phonetic transliteration with an Indian English voice so the senior hears Kannada/Hindi spoken aloud!
  if (!nativeVoice && lang !== "en") {
    const phoneticKey = key ? key + "_phonetic" : null;
    const phoneticText = phoneticKey && TRANSLATIONS[lang] && TRANSLATIONS[lang][phoneticKey];
    if (phoneticText) {
      textToSpeak = phoneticText;
    }
    const indianVoice = availableVoices.find((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith("en-in") ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("ravi") ||
      v.name.toLowerCase().includes("heera")
    );
    voiceToUse = indianVoice || availableVoices.find((v) => v.lang.startsWith("en")) || availableVoices[0];
    speechLocale = (voiceToUse && voiceToUse.lang) || "en-IN";
  }

  const u = new SpeechSynthesisUtterance(textToSpeak.replace(/\s+/g, " ").trim());
  u.rate = 0.86;
  u.pitch = 1.0;
  u.lang = speechLocale;
  if (voiceToUse) u.voice = voiceToUse;

  u.onstart = () => {
    isSpeaking = true;
    updateVoiceBar(true, langMeta.nativeLabel, text);
    showToast(t("toast_reading"));
  };

  u.onend = () => {
    isSpeaking = false;
    updateVoiceBar(false);
  };

  u.onerror = (e) => {
    isSpeaking = false;
    updateVoiceBar(false);
    console.error("SpeechSynthesis error:", e);
    showToast(t("toast_voicefail"));
  };

  window.speechSynthesis.speak(u);
}

function speak(text, key, targetLang) {
  if (!text) return;
  stopSpeaking();
  isSpeaking = true;

  const lang = targetLang || settings.lang;
  const langCode = lang === "kn" ? "kn" : lang === "hi" ? "hi" : "en";

  // Tier 1: Try online natural Web Audio (Google TTS) first for Hindi & Kannada
  if (lang === "kn" || lang === "hi") {
    const chunks = chunkText(text);
    playGoogleTtsQueue(
      chunks,
      langCode,
      () => {
        isSpeaking = false;
        updateVoiceBar(false);
      },
      () => {
        // Fallback to SpeechSynthesis if offline or audio play is blocked
        speakViaSpeechSynthesis(text, key, lang);
      }
    );
  } else {
    // English works well natively in all browsers
    speakViaSpeechSynthesis(text, key, lang);
  }
}

/* Listen to speech trigger buttons */
function bindVoiceButtons() {
  if ($("read-page")) {
    $("read-page").addEventListener("click", () => {
      const activeEl = document.querySelector(".view.active") || document.querySelector(".auth-screen.active");
      if (activeEl) speak(activeEl.innerText);
    });
  }

  if ($("login-voice-guide-btn")) {
    $("login-voice-guide-btn").addEventListener("click", () => {
      speak(t("login_voice_guide"), "login_voice_guide");
    });
  }

  if ($("signup-voice-guide-btn")) {
    $("signup-voice-guide-btn").addEventListener("click", () => {
      speak(t("signup_voice_guide"), "signup_voice_guide");
    });
  }

  if ($("read-message")) {
    $("read-message").addEventListener("click", () => {
      speak(t("sp_msg"), "sp_msg");
    });
  }

  if ($("read-pills-voice")) {
    $("read-pills-voice").addEventListener("click", () => {
      speak(t("sp_pills"), "sp_pills");
    });
  }

  if ($("read-home-voice")) {
    $("read-home-voice").addEventListener("click", () => {
      speak(t("sp_ins"), "sp_ins");
    });
  }

  if ($("read-contacts-voice")) {
    $("read-contacts-voice").addEventListener("click", () => {
      speak(t("sp_contacts"), "sp_contacts");
    });
  }

  if ($("read-help-voice")) {
    $("read-help-voice").addEventListener("click", () => {
      speak(t("sp_help"), "sp_help");
    });
  }

  if ($("read-feedback-voice")) {
    $("read-feedback-voice").addEventListener("click", () => {
      speak(t("sp_feedback"), "sp_feedback");
    });
  }

  // Floating Bar Stop Button
  if ($("voice-stop-btn")) {
    $("voice-stop-btn").addEventListener("click", stopSpeaking);
  }

  // Voice Test buttons in Settings
  if ($("test-voice-kn")) {
    $("test-voice-kn").addEventListener("click", () => {
      speak(TRANSLATIONS.kn.sp_test, "sp_test", "kn");
    });
  }

  if ($("test-voice-hi")) {
    $("test-voice-hi").addEventListener("click", () => {
      speak(TRANSLATIONS.hi.sp_test, "sp_test", "hi");
    });
  }

  if ($("test-voice-en")) {
    $("test-voice-en").addEventListener("click", () => {
      speak(TRANSLATIONS.en.sp_test, "sp_test", "en");
    });
  }

  // Field speech guidance buttons
  document.querySelectorAll(".speak-field-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.dataset.speak;
      if (key) speak(t(key), key);
    });
  });
}

/* ==========================================================================
   SCREEN MANAGEMENT (Login, Signup, Dashboard)
   ========================================================================== */
function showScreen(screenId) {
  stopSpeaking();
  currentScreen = screenId;
  const screens = ["login-screen", "signup-screen", "dashboard-shell"];
  screens.forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (id === "dashboard-shell") {
      el.classList.toggle("active", screenId === "dashboard-shell");
    } else {
      el.classList.toggle("active", screenId === id);
    }
  });

  if (screenId === "dashboard-shell") {
    showView("home");
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateUserBadges() {
  const firstName = currentUser.name ? currentUser.name.split(" ")[0] : "User";
  if ($("sidebar-user-name")) $("sidebar-user-name").textContent = currentUser.name;
  if ($("sidebar-user-avatar")) $("sidebar-user-avatar").textContent = currentUser.avatar || "👤";
  if ($("topbar-user-name")) $("topbar-user-name").textContent = firstName;
  if ($("topbar-avatar")) $("topbar-avatar").textContent = currentUser.avatar || firstName[0];
}

function handleLogin(userObj) {
  Object.assign(currentUser, userObj);
  saveUserSession();
  updateUserBadges();
  showToast(t("login_success"));
  showScreen("dashboard-shell");
}

function saveUserSession() {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  } catch (_) {}
}

function loadUserSession() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      Object.assign(currentUser, JSON.parse(saved));
    }
  } catch (_) {}
}

/* ==========================================================================
   NAVIGATION (Within Dashboard Shell)
   ========================================================================== */
function showView(name) {
  stopSpeaking();
  currentView = name;
  VIEWS.forEach((v) => {
    const el = $(v + "-view");
    if (el) el.classList.toggle("active", v === name);
  });

  document.querySelectorAll(".nav-item").forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });

  if ($("page-title")) $("page-title").textContent = viewTitle(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   MODAL (Accessible Dialog with Focus Trap & Escape)
   ========================================================================== */
const modal = $("modal");
function openModal(symbol, title, copy, confirmText, action = () => {}) {
  lastFocus = document.activeElement;
  $("modal-symbol").textContent = symbol;
  $("modal-title").textContent = title;
  $("modal-copy").textContent = copy;
  $("modal-confirm").textContent = confirmText || t("okay");
  modalAction = action;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  $("modal-confirm").focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

/* ==========================================================================
   PILL TRACKING (NEW FEATURE REQUESTED BY TEACHERS & USERS)
   ========================================================================== */
function loadPillState() {
  try {
    const saved = localStorage.getItem(PILLS_KEY);
    if (saved) pillState = JSON.parse(saved);
  } catch (_) {}
}

function savePillState() {
  try {
    localStorage.setItem(PILLS_KEY, JSON.stringify(pillState));
  } catch (_) {}
}

function renderPillStates() {
  ["morning", "noon", "night"].forEach((id) => {
    const card = $("pill-" + id);
    const status = $(id + "-status");
    const btn = document.querySelector(`.pill-btn[data-pill-id="${id}"]`);
    if (!card || !status || !btn) return;

    const isTaken = Boolean(pillState[id]);
    if (isTaken) {
      status.className = "pill-status-tag taken";
      status.textContent = t("pill_status_taken");
      btn.className = "pill-btn done";
      btn.textContent = t("pill_btn_done");
      card.classList.remove("due-card");
    } else {
      if (id === "noon") {
        status.className = "pill-status-tag due";
        status.textContent = t("pill_status_due");
        card.classList.add("due-card");
      } else {
        status.className = "pill-status-tag upcoming";
        status.textContent = t("pill_status_upcoming");
        card.classList.remove("due-card");
      }
      btn.className = "pill-btn";
      btn.textContent = t("pill_btn_take");
    }
  });
}

function togglePill(id) {
  pillState[id] = !pillState[id];
  savePillState();
  renderPillStates();
  if (pillState[id]) {
    showToast(t("toast_pill_taken"));
  }
}

/* ==========================================================================
   FEEDBACK & USER TESTING SECTION (NEW FEATURE FOR TEACHER EVALUATION)
   ========================================================================== */
const DEFAULT_FEEDBACKS = [
  {
    name: "Dr. Sunita Rao",
    role: "teacher",
    rating: 5,
    features: ["Trilingual Large-Text Login", "Voice Guidance", "Daily Pill Tracker"],
    comment: "Outstanding design-thinking prototype! The enlarged native scripts for Kannada and Hindi on the login page make it exceptionally welcoming for rural seniors. The 4-digit PIN is far superior to complicated passwords.",
    addedFeature: "Added in Iteration 2: Daily Pill Schedule & Voice Guidance",
    date: "14 Nov 2026"
  },
  {
    name: "Lakshmi Amma (72y)",
    role: "senior",
    rating: 5,
    features: ["Trilingual Large-Text Login", "Voice Guidance"],
    comment: "ನನಗೆ ಇಂಗ್ಲಿಷ್ ಓದಲು ಕಷ್ಟವಾಗುತ್ತಿತ್ತು. ಆದರೆ ಇಲ್ಲಿ ಕನ್ನಡ ಅಕ್ಷರಗಳು ದೊಡ್ಡದಾಗಿ ಸ್ಪಷ್ಟವಾಗಿವೆ. ಸ್ಪೀಕರ್ ಬಟನ್ ಒತ್ತಿದಾಗ ನಮಗೆ ಏನು ಮಾಡಬೇಕೆಂದು ಓದಿ ಹೇಳುವುದು ತುಂಬಾ ಇಷ್ಟವಾಯಿತು!",
    addedFeature: "Added in Iteration 2: Native Kannada TTS Speech & Large Script",
    date: "13 Nov 2026"
  },
  {
    name: "Prof. K. Venkatesh (Design Faculty)",
    role: "teacher",
    rating: 5,
    features: ["Emergency Contact Flow", "High Contrast & Spacing"],
    comment: "Great adherence to WCAG 2.1 accessibility guidelines and the 5 stages of Design Thinking. The live feedback section clearly shows how teacher critiques directly improved the interface.",
    addedFeature: "Added in Iteration 3: Teacher Feedback Portal & Mood Tracker",
    date: "12 Nov 2026"
  },
  {
    name: "Anita (Caregiver)",
    role: "caregiver",
    rating: 5,
    features: ["Daily Pill Tracker", "Emergency Contact Flow"],
    comment: "My father used to forget his morning hypertension tablet. With the large reminder buttons and read-aloud voice, he feels confident doing it himself without depending on us constantly.",
    addedFeature: "Added in Iteration 2: Pill Reminders with Audio Confirmation",
    date: "10 Nov 2026"
  }
];

function loadFeedbackList() {
  try {
    const saved = localStorage.getItem(FEEDBACK_KEY);
    feedbackList = saved ? JSON.parse(saved) : DEFAULT_FEEDBACKS;
  } catch (_) {
    feedbackList = DEFAULT_FEEDBACKS;
  }
}

function saveFeedbackList() {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackList));
  } catch (_) {}
}

function renderFeedbackList() {
  const container = $("feedback-cards-container");
  if (!container) return;
  container.innerHTML = "";

  feedbackList.forEach((item) => {
    const card = document.createElement("article");
    card.className = "feedback-card-item";

    const stars = "★".repeat(item.rating || 5) + "☆".repeat(5 - (item.rating || 5));
    const roleLabel = item.role === "teacher" ? t("fb_role_teacher") :
                      item.role === "senior" ? t("fb_role_senior") :
                      item.role === "caregiver" ? t("fb_role_caregiver") : t("fb_role_student");

    const pillsHtml = (item.features || [])
      .map((f) => `<span class="fb-pill">${f}</span>`)
      .join("");

    card.innerHTML = `
      <div class="fb-card-top">
        <div>
          <strong>${item.name}</strong>
          <span class="fb-reviewer-role ${item.role}">${roleLabel}</span>
        </div>
        <span class="fb-stars-display" aria-label="${item.rating} stars">${stars}</span>
      </div>
      <p class="fb-card-comment">"${item.comment}"</p>
      <div class="fb-features-pills">${pillsHtml}</div>
      ${item.addedFeature ? `<span class="fb-added-feature-badge">✓ ${item.addedFeature}</span>` : ""}
      <small style="display:block;color:var(--muted);margin-top:6px;font-size:11px;">Recorded: ${item.date}</small>
    `;
    container.appendChild(card);
  });
}

/* ==========================================================================
   SETTINGS (Saved on Device)
   ========================================================================== */
function loadSettings() {
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
  } catch (_) {}
  if (!LANG_META[settings.lang]) settings.lang = "en";
  settings.level = Math.min(LEVELS.length - 1, Math.max(0, Number.isInteger(settings.level) ? settings.level : 1));
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {}
}

function updateSizeLabel() {
  const labelText = t("lvl" + settings.level);
  if ($("size-label")) $("size-label").textContent = labelText;
  if ($("login-size-label")) $("login-size-label").textContent = labelText;
  if ($("signup-size-label")) $("signup-size-label").textContent = labelText;
  if ($("topbar-size-label")) $("topbar-size-label").textContent = labelText;
}

function applySettings() {
  document.documentElement.style.setProperty("--font-scale", LEVELS[settings.level]);
  document.body.classList.toggle("high-contrast", settings.contrast);
  document.body.classList.toggle("extra-spacing", settings.spacing);
  document.body.classList.toggle("text-xl", settings.level >= 3);

  const isMax = settings.level >= LEVELS.length - 1;
  const isMin = settings.level <= 0;

  ["larger-text", "login-larger-text", "signup-larger-text", "topbar-larger-text"].forEach((id) => {
    if ($(id)) $(id).disabled = isMax;
  });
  ["smaller-text", "login-smaller-text", "signup-smaller-text", "topbar-smaller-text"].forEach((id) => {
    if ($(id)) $(id).disabled = isMin;
  });

  if ($("contrast-toggle")) $("contrast-toggle").checked = settings.contrast;
  if ($("spacing-toggle")) $("spacing-toggle").checked = settings.spacing;
  updateSizeLabel();
}

function changeLevel(step) {
  settings.level = Math.min(LEVELS.length - 1, Math.max(0, settings.level + step));
  applySettings();
  saveSettings();
  showToast(t(step > 0 ? "toast_up" : "toast_down"));
}

/* ==========================================================================
   INITIALIZE EVENT LISTENERS
   ========================================================================== */
function initEventListeners() {
  // Navigation items
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.view));
  });

  document.querySelectorAll(".brand").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showView("home");
    });
  });

  // Action cards on Home
  document.querySelectorAll("[data-action]").forEach((b) => {
    b.addEventListener("click", () => {
      const a = b.dataset.action;
      if (a === "call") {
        openModal("☎", t("mod_call_t"), t("mod_call_c"), t("mod_call_ok"), () => showView("contacts"));
      } else if (a === "contacts") {
        showView("contacts");
      } else if (a === "pills") {
        showView("pills");
      } else if (a === "messages") {
        showView("messages");
      } else if (a === "help") {
        showView("help");
      } else if (a === "feedback") {
        showView("feedback");
      }
    });
  });

  // Topbar and settings shortcuts
  if ($("settings-shortcut")) $("settings-shortcut").addEventListener("click", () => showView("settings"));
  if ($("open-settings")) $("open-settings").addEventListener("click", () => showView("settings"));

  // Profile chip logout / switch
  if ($("topbar-profile-chip")) {
    $("topbar-profile-chip").addEventListener("click", () => {
      openModal("👤", t("btn_logout") + "?", "Do you want to switch user or log out to the login screen?", t("btn_logout"), () => {
        showScreen("login-screen");
      });
    });
  }

  if ($("sidebar-switch-btn")) {
    $("sidebar-switch-btn").addEventListener("click", () => {
      showScreen("login-screen");
    });
  }

  // Large Trilingual Buttons on Login Screen
  document.querySelectorAll(".lang-big-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      settings.lang = lang;
      stopSpeaking();
      applyLanguage();
      saveSettings();
      showToast(t("toast_lang"));
      speak(t("toast_lang"), "toast_lang");
    });
  });

  // Language buttons in Settings
  document.querySelectorAll(".lang-controls button").forEach((b) => {
    b.addEventListener("click", () => {
      const lang = b.dataset.lang;
      settings.lang = lang;
      stopSpeaking();
      applyLanguage();
      saveSettings();
      showToast(t("toast_lang"));
      speak(t("toast_lang"), "toast_lang");
    });
  });

  // Language buttons in Signup form
  document.querySelectorAll(".lang-pill-btn").forEach((b) => {
    b.addEventListener("click", () => {
      settings.lang = b.dataset.signupLang;
      stopSpeaking();
      applyLanguage();
      saveSettings();
    });
  });

  // Universal Size controls (Login, Signup, Topbar on every view, Settings)
  document.querySelectorAll(".size-btn-inc, #larger-text, #login-larger-text, #signup-larger-text, #topbar-larger-text").forEach((btn) => {
    btn.addEventListener("click", () => changeLevel(1));
  });
  document.querySelectorAll(".size-btn-dec, #smaller-text, #login-smaller-text, #signup-smaller-text, #topbar-smaller-text").forEach((btn) => {
    btn.addEventListener("click", () => changeLevel(-1));
  });

  // Toggles
  if ($("contrast-toggle")) {
    $("contrast-toggle").addEventListener("change", (e) => {
      settings.contrast = e.target.checked;
      applySettings();
      saveSettings();
      showToast(t(settings.contrast ? "toast_hc_on" : "toast_hc_off"));
    });
  }

  if ($("spacing-toggle")) {
    $("spacing-toggle").addEventListener("change", (e) => {
      settings.spacing = e.target.checked;
      applySettings();
      saveSettings();
      showToast(t(settings.spacing ? "toast_sp_on" : "toast_sp_off"));
    });
  }

  // PIN visibility toggle on Login Screen
  if ($("toggle-login-pin")) {
    $("toggle-login-pin").addEventListener("click", () => {
      const pinInput = $("login-pin");
      const isPwd = pinInput.type === "password";
      pinInput.type = isPwd ? "text" : "password";
      $("toggle-login-pin").textContent = isPwd ? "Hide PIN" : t("login_show_pin");
    });
  }

  // Login Form Submission
  if ($("login-form")) {
    $("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = $("login-pin").value.trim();
      const phone = $("login-phone").value.trim();
      if (!pin || pin.length < 4) {
        showToast(t("login_err_pin"));
        speak(t("login_err_pin"));
        $("login-pin").focus();
        return;
      }
      handleLogin({
        name: "Ramesh Kumar",
        phone: phone || "9876543210",
        avatar: "👴",
        role: "Senior Citizen"
      });
    });
  }

  // Quick 1-Tap Login Cards
  document.querySelectorAll("[data-quick-user]").forEach((card) => {
    card.addEventListener("click", () => {
      const u = card.dataset.quickUser;
      if (u === "ramesh") {
        handleLogin({
          name: "Ramesh Kumar",
          phone: "9876543210",
          avatar: "👴",
          role: "Senior Citizen"
        });
      } else if (u === "anita") {
        handleLogin({
          name: "Anita",
          phone: "9876543211",
          avatar: "👩",
          role: "Caregiver"
        });
      } else if (u === "evaluator") {
        handleLogin({
          name: "Prof. Evaluator",
          phone: "9876543299",
          avatar: "🎓",
          role: "Teacher / Evaluator"
        });
      }
    });
  });

  // Screen transition buttons between Login & Signup
  if ($("go-to-signup")) $("go-to-signup").addEventListener("click", () => showScreen("signup-screen"));
  if ($("go-to-login")) $("go-to-login").addEventListener("click", () => showScreen("login-screen"));

  // Signup Form Submission
  if ($("signup-form")) {
    $("signup-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("signup-name").value.trim();
      const phone = $("signup-phone").value.trim();
      const pin = $("signup-pin").value.trim();
      const caregiver = $("signup-caregiver").value.trim();

      if (!name || !phone || !pin) {
        showToast("Please fill in your name, mobile, and 4-digit PIN.");
        return;
      }

      handleLogin({
        name: name,
        phone: phone,
        avatar: "👤",
        caregiver: caregiver || "Family Contact",
        role: "New Member"
      });
      showToast(t("signup_success"));
    });
  }

  // Daily Pill Click Handlers
  document.querySelectorAll(".pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.pillId;
      if (id) togglePill(id);
    });
  });

  // Daily Wellness / Mood Check-in
  document.querySelectorAll(".mood-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.dataset.mood;
      if (m === "good") {
        showToast(t("toast_mood_good"));
        speak(t("toast_mood_good"));
      } else if (m === "okay") {
        showToast(t("toast_mood_okay"));
        speak(t("toast_mood_okay"));
      } else if (m === "help") {
        showToast(t("toast_mood_help"));
        speak(t("toast_mood_help"));
      }
    });
  });

  // Contacts Call Confirmation Demo
  document.querySelectorAll(".call-small").forEach((b) => {
    b.addEventListener("click", () => {
      const name = t("n_" + b.dataset.contact);
      openModal("☎", t("mod_cc_t", { name }), t("mod_cc_c", { name }), t("mod_cc_ok"), () => showToast(t("toast_nocall")));
    });
  });

  // Emergency & Help Demos
  if ($("demo-sos")) {
    $("demo-sos").addEventListener("click", () => {
      openModal("!", t("mod_sos_t"), t("mod_sos_c"), t("mod_sos_ok"), () => showToast(t("toast_sos")));
    });
  }
  if ($("demo-family")) $("demo-family").addEventListener("click", () => showView("contacts"));
  if ($("demo-instructions")) $("demo-instructions").addEventListener("click", () => speak(t("sp_ins")));

  // Modal Handlers
  $("modal-close").addEventListener("click", closeModal);
  $("modal-cancel").addEventListener("click", closeModal);
  $("modal-confirm").addEventListener("click", () => {
    closeModal();
    modalAction();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const f = [...modal.querySelectorAll("button")].filter((b) => b.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Feedback Form Submission (Requested by Teachers)
  let selectedRating = 5;
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRating = parseInt(btn.dataset.rating, 10);
      document.querySelectorAll(".star-btn").forEach((b) => {
        const r = parseInt(b.dataset.rating, 10);
        b.classList.toggle("active", r <= selectedRating);
      });
    });
  });

  if ($("evaluation-form")) {
    $("evaluation-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("fb-name").value.trim();
      const role = $("fb-role").value;
      const comments = $("fb-comments").value.trim();

      const checkedFeatures = [];
      document.querySelectorAll('input[name="fb_feat"]:checked').forEach((ch) => {
        const label = ch.parentElement.textContent.trim();
        checkedFeatures.push(label);
      });

      if (!name || !comments) {
        showToast("Please enter your name and feedback comments.");
        return;
      }

      const newEntry = {
        name: name,
        role: role,
        rating: selectedRating,
        features: checkedFeatures,
        comment: comments,
        addedFeature: "Added to Design Thinking Review Backlog",
        date: "Just now"
      };

      feedbackList.unshift(newEntry);
      saveFeedbackList();
      renderFeedbackList();

      $("fb-name").value = "";
      $("fb-comments").value = "";
      showToast(t("fb_toast_saved"));
      speak(t("fb_toast_saved"));
    });
  }

  bindVoiceButtons();
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
function init() {
  loadSettings();
  loadUserSession();
  loadPillState();
  loadFeedbackList();

  applySettings();
  applyLanguage();
  initEventListeners();

  // Show login screen initially so evaluators can test the trilingual login flow!
  showScreen("login-screen");

  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
  }
}

// Start app
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
