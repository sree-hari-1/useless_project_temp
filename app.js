const STORAGE_KEY = "procrastiNation";
const defaultState = {
  tasks: [],
  sessions: [],
  notifications: [],
  lastReminderAt: 0,
  users: [],
  currentUser: null
};

const worldCatalog = [
  { id: "bedroom", name: "Bedroom", icon: "🏠", reason: null, threshold: 0, className: "world-bedroom", description: "The original headquarters of delay." },
  { id: "social", name: "Social Media Forest", icon: "📱", reason: "Social media", threshold: 3600, className: "world-social", description: "Notifications grow on every tree." },
  { id: "gaming", name: "Gaming Dungeon", icon: "🎮", reason: "Gaming", threshold: 3600, className: "world-gaming", description: "One more round is carved in stone." },
  { id: "videos", name: "YouTube Cave", icon: "🎬", reason: "Videos", threshold: 3600, className: "world-videos", description: "The algorithm knows you are here." },
  { id: "sleeping", name: "Sleep Valley", icon: "😴", reason: "Sleeping", threshold: 3600, className: "world-sleeping", description: "Clouds, naps, and no alarms." },
  { id: "eating", name: "Snack Kingdom", icon: "🍔", reason: "Eating", threshold: 3600, className: "world-eating", description: "A feast for every unfinished task." },
  { id: "chatting", name: "Gossip Village", icon: "💬", reason: "Chatting", threshold: 3600, className: "world-chatting", description: "Everyone knows you are not working." }
];

const state = loadState();

// Older versions did not attach sessions to accounts.
// Preserve that history by assigning it to the currently logged-in account.
if (state.currentUser?.name) {
  let migrated = false;
  state.sessions = state.sessions.map((session) => {
    if (!session.userName) {
      migrated = true;
      return { ...session, userName: state.currentUser.name };
    }
    return session;
  });
  if (migrated) save();
}

if (state.currentUser?.name) {
  let migrated = false;
  state.tasks = state.tasks.map((task) => {
    if (!task.userName) {
      migrated = true;
      return { ...task, userName: state.currentUser.name };
    }
    return task;
  });
  if (migrated) save();
}

let running = null;
let timerId = null;
const authState = { mode: "login" };
const demoState = { active: false };
let worldFocusId = "bedroom";
const demoAdmin = { name: "admin123", password: "demoworld123" };

const quotes = [
  "You don't need motivation. You need another five minutes.",
  "Somewhere, a deadline is getting nervous.",
  "Productivity is temporary. Procrastination is forever.",
  "Your task believes in you. Sadly.",
  "Tomorrow is the most committed member of your team."
];

const reactions = [
  "EXCELLENT CHOICE, HUMAN.",
  "YOUR RESPONSIBILITIES CAN WAIT.",
  "THE DEADLINE IS SHAKING.",
  "THIS IS BECOMING A LIFESTYLE."
];

const authQuotes = [
  "Welcome to Procrasti-Nation — where 'later' is a lifestyle.",
  "Your responsibilities called. We told them you were busy doing nothing.",
  "Why chase your dreams when you can chase another YouTube video?",
  "Today's plan: do nothing. Tomorrow's plan: blame today.",
  "Productivity is temporary. Procrastination is forever.",
  "Your deadline believes in you. We don't know why.",
  "You're not wasting time. You're investing it very poorly.",
  "Achievement unlocked: You opened the app instead of doing your work.",
  "The task can wait. This loading screen cannot.",
  "Remember: every minute spent procrastinating is a minute you didn't spend studying.",
  "Your future self has officially stopped expecting anything.",
  "Motivation has left the server. Please try again tomorrow.",
  "One small step for productivity, one giant leap away from it.",
  "You had one job. Fortunately, you postponed it.",
  "Welcome back, champion. Your unfinished tasks missed you.",
  "Some people build empires. You built a 47-tab browser session.",
  "The deadline isn't running away. Unfortunately, neither are you.",
  "Enter Procrasti-Nation. Leave productivity at the door."
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...(saved || {}),
      users: Array.isArray(saved?.users) ? saved.users : [],
      currentWorlds: saved?.currentWorlds && typeof saved.currentWorlds === "object" ? saved.currentWorlds : {},
      currentUser: saved?.currentUser || null
    };
  } catch {
    return { ...defaultState };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function humanSeconds(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatClock(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.dataset.world = getCurrentWorld().id;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => el.classList.remove("show"), 2600);
}

function getUserSessions() {
  const currentName = state.currentUser?.name;
  if (!currentName) return [];
  return state.sessions.filter((session) => session.userName === currentName);
}

function getUserTasks() {
  const currentName = state.currentUser?.name;
  if (!currentName) return [];
  return state.tasks.filter((task) => task.userName === currentName);
}

function getCategorySeconds(reason) {
  return getUserSessions().filter((session) => session.reason === reason).reduce((sum, session) => sum + Number(session.duration || 0), 0);
}

function getWorldProgress() {
  return worldCatalog.map((world) => ({
    ...world,
    seconds: world.reason ? getCategorySeconds(world.reason) : 0,
    unlocked: (demoState.active && isDemoAdmin()) || !world.reason || getCategorySeconds(world.reason) >= world.threshold
  }));
}

function isDemoAdmin() {
  return state.currentUser?.name === demoAdmin.name && state.currentUser?.isDemoAdmin === true;
}

function getCurrentWorld() {
  const currentName = state.currentUser?.name;
  const selectedId = currentName && state.currentWorlds?.[currentName];
  const worlds = getWorldProgress();
  return worlds.find((world) => world.id === selectedId && world.unlocked) || worlds[0];
}

function setCurrentWorld(worldId) {
  const world = getWorldProgress().find((item) => item.id === worldId);
  if (!world?.unlocked || !state.currentUser?.name) return;
  worldFocusId = worldId;
  state.currentWorlds = state.currentWorlds || {};
  state.currentWorlds[state.currentUser.name] = worldId;
  save();
  renderWorldMap();
  applyCurrentWorld();
  toast(`${world.icon} ENTERED ${world.name.toUpperCase()}.`);
}

function applyCurrentWorld() {
  const world = getCurrentWorld();
  document.body.dataset.currentWorld = world.id;
  renderWorldEnvironment(world);
  document.querySelectorAll("#achievementCelebration").forEach((overlay) => {
    overlay.dataset.world = world.id;
  });
  const badgeIcon = document.getElementById("topWorldBadgeIcon");
  const badgeName = document.getElementById("topWorldBadgeName");
  if (badgeIcon) badgeIcon.textContent = world.icon;
  if (badgeName) badgeName.textContent = world.name.toUpperCase();
  const badge = document.getElementById("topWorldBadge");
  if (badge) badge.title = `Current world: ${world.name}`;
}

function renderWorldEnvironment(world = getCurrentWorld()) {
  const environment = document.getElementById("worldEnvironment");
  if (!environment) return;
  const worldUi = {
    bedroom: {
      tag: "COZY ROOM, QUESTIONABLE PRIORITIES",
      locations: {
        quest: ["🏰", "QUEST CASTLE", "Assignments waiting outside"], journal: ["📜", "WASTE ARCHIVE", "Yesterday's excuses"], badges: ["🏆", "BADGE TEMPLE", "Tiny useless victories"], npc: ["🤖", "PROFESSOR'S LAB", "He has concerns"], rank: ["🏅", "GLORY BOARD", "Compare your delay"], alert: ["🔔", "ALERT TOWER", "Ignore responsibly"]
      }
    },
    social: {
      tag: "EVERY TREE HAS A NOTIFICATION",
      locations: {
        quest: ["🌳", "SCROLLING GROVE", "Tasks buried in the feed"], journal: ["📱", "INFINITE FEED", "Your glorious scroll history"], badges: ["❤️", "LIKE SHRINE", "React to your delay"], npc: ["💬", "COMMENT CANOPY", "Everyone has an opinion"], rank: ["👍", "VIRAL HEIGHTS", "Compete for attention"], alert: ["🔔", "PING TREE", "Another notification"]
      }
    },
    gaming: {
      tag: "ONE MORE ROUND IS NEVER ONE MORE ROUND",
      locations: {
        quest: ["🕹️", "QUEST ARCADE", "Missions you will postpone"], journal: ["💾", "SAVE POINT", "Your backlog checkpoint"], badges: ["🏆", "TROPHY ROOM", "Victories over productivity"], npc: ["🎧", "STREAMER'S DEN", "The audience is waiting"], rank: ["🪙", "SCOREBOARD", "Climb the useless ranks"], alert: ["🚨", "BOSS ALARM", "The deadline approaches"]
      }
    },
    videos: {
      tag: "THE ALGORITHM KNOWS YOU ARE HERE",
      locations: {
        quest: ["▶️", "WATCHLIST THEATER", "Things to watch instead"], journal: ["📺", "REPLAY CAVE", "Every episode counts"], badges: ["🍿", "PREMIERE STAGE", "Applause for delay"], npc: ["🎬", "CREATOR STUDIO", "Subscribe to excuses"], rank: ["📊", "TRENDING SCREEN", "Top procrastinators"], alert: ["🔔", "RECOMMENDATION WALL", "One more video"]
      }
    },
    sleeping: {
      tag: "THE DEADLINE CAN WAIT UNTIL AFTER THE NAP",
      locations: {
        quest: ["🛏️", "DREAM BED", "Tasks fade into dreams"], journal: ["🌙", "NAP ARCHIVE", "A history of dozing"], badges: ["✨", "DREAM SHRINE", "Sleepy achievements"], npc: ["🐑", "SHEEP MEADOW", "Count them later"], rank: ["☁️", "CLOUD NINE", "Float above the rankings"], alert: ["⏰", "ALARM VALLEY", "Snooze with confidence"]
      }
    },
    eating: {
      tag: "A FEAST FOR EVERY UNFINISHED TASK",
      locations: {
        quest: ["🍔", "BURGER CASTLE", "A side of responsibilities"], journal: ["🍕", "SNACK ARCHIVE", "Every bite documented"], badges: ["🍽️", "FEAST HALL", "Serve your achievements"], npc: ["👨‍🍳", "CHEF'S KITCHEN", "Special: one more snack"], rank: ["🍟", "FRY LEAGUE", "Crispy competition"], alert: ["🥤", "REFILL STATION", "Hydrate your avoidance"]
      }
    },
    chatting: {
      tag: "EVERYONE KNOWS YOU ARE NOT WORKING",
      locations: {
        quest: ["🏠", "RUMOR COTTAGE", "The task is the gossip"], journal: ["📜", "GOSSIP ARCHIVE", "Who said what"], badges: ["🎉", "CELEBRATION SQUARE", "Celebrate nothing"], npc: ["🗣️", "TALKING BENCH", "Pull up a chair"], rank: ["👀", "NOSY HEIGHTS", "Watch the watchers"], alert: ["💬", "WHISPER TOWER", "The village knows"]
      }
    }
  }[world.id] || {};
  const title = document.getElementById("worldTitleName");
  const tag = document.getElementById("worldTitleTag");
  if (title) title.textContent = `${world.icon} ${world.name.toUpperCase()}`;
  if (tag) tag.textContent = worldUi.tag || "THE BRIGHTEST PLACE TO AVOID YOUR RESPONSIBILITIES";
  Object.entries(worldUi.locations || {}).forEach(([location, content]) => {
    const button = document.querySelector(`[data-location="${location}"]`);
    if (button) button.innerHTML = `<span class="location-illustration">${content[0]}</span><b>${content[1]}</b><small>${content[2]}</small>`;
  });
  const scenes = {
    bedroom: '<span class="scene-bed">🛏️</span><span class="scene-desk">📖 💻</span><span class="scene-phone">📱</span><span class="scene-clock">⏰</span><span class="scene-landmark">🪟 ☁️</span>',
    social: '<span class="scene-trees">🌳 🌳 🌳</span><span class="scene-fruit">📱 ❤️ 🔔 👍</span><span class="scene-phone">📱</span><span class="scene-landmark">🌲 🌲 🌲</span>',
    gaming: '<span class="scene-monitor">🖥️</span><span class="scene-controller">🎮</span><span class="scene-console">🕹️ 🟪 🟦</span><span class="scene-landmark">🧱 🧱 🧱</span>',
    videos: '<span class="scene-screen">📺 ▶️</span><span class="scene-popcorn">🍿</span><span class="scene-play">▶️ ▶️ ▶️</span><span class="scene-landmark">🎞️ 🎞️ 🎞️</span>',
    sleeping: '<span class="scene-moon">🌙</span><span class="scene-sleep-clouds">☁️ ☁️ ☁️</span><span class="scene-sheep">🐑</span><span class="scene-landmark">🛌 🛌 🛌</span>',
    eating: '<span class="scene-food">🍔 🍕 🍟</span><span class="scene-fridge">🧊</span><span class="scene-plate">🍽️</span><span class="scene-landmark">🛒 🍴 🛒</span>',
    chatting: '<span class="scene-houses">🏠 🏠 🏠</span><span class="scene-bubbles">💬 💬 💬</span><span class="scene-npc">🧑‍🤝‍🧑</span><span class="scene-landmark">🪑 🪑 🪑</span>'
  };
  environment.innerHTML = scenes[world.id] || scenes.bedroom;
}

function showWorldReaction(reason) {
  const overlay = document.getElementById("worldReaction");
  const message = document.getElementById("worldReactionMessage");
  const decor = document.getElementById("worldReactionDecor");
  if (!overlay || !message || !decor) return;
  const world = getCurrentWorld();
  const reactionsByWorld = {
    bedroom: "EXCELLENT DECISION!",
    social: "YOU COULD HAVE STOPPED SCROLLING.",
    gaming: "QUEST: DO ABSOLUTELY NOTHING.",
    videos: "ONE MORE VIDEO WON.",
    sleeping: "JUST FIVE MORE MINUTES...",
    eating: "SNACK BREAK ACTIVATED.",
    chatting: "THE VILLAGE KNOWS."
  };
  const decorByWorld = {
    bedroom: "🛏️ ✨ 💤 ✨",
    social: "🔔 ❤️ 👍 💬 📱",
    gaming: "🎮 💥 +10 XP",
    videos: "▶️ CLICK ▶️",
    sleeping: "☁️ Z z z ☁️",
    eating: "🍔 🍕 🍟 🥤",
    chatting: '💬 "Are you working?"  💬 "No."'
  };
  overlay.dataset.world = world.id;
  message.textContent = reactionsByWorld[world.id] || reason;
  decor.textContent = decorByWorld[world.id] || world.icon;
  overlay.classList.remove("hidden");
  overlay.classList.remove("world-reaction-pop");
  void overlay.offsetWidth;
  overlay.classList.add("world-reaction-pop");
  clearTimeout(showWorldReaction.timeoutId);
  showWorldReaction.timeoutId = setTimeout(() => overlay.classList.add("hidden"), 2400);
}

function claimLegacyTasks(userName) {
  let migrated = false;
  state.tasks = state.tasks.map((task) => {
    if (!task.userName) {
      migrated = true;
      return { ...task, userName };
    }
    return task;
  });
  if (migrated) save();
}

function claimLegacySessions(userName) {
  let migrated = false;
  state.sessions = state.sessions.map((session) => {
    if (!session.userName) {
      migrated = true;
      return { ...session, userName };
    }
    return session;
  });
  if (migrated) save();
}

function getTotalSeconds() {
  return getUserSessions().reduce((sum, session) => sum + Number(session.duration || 0), 0);
}

function getTopReason() {
  const sessions = getUserSessions();
  const counts = {};
  sessions.forEach((session) => {
    counts[session.reason] = (counts[session.reason] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

function getLevelInfo() {
  const total = getTotalSeconds();
  const totalXp = Math.floor(total / 3.6);
  const maxXp = 1000;
  const level = Math.max(1, Math.floor(totalXp / maxXp) + 1);
  const xp = totalXp % maxXp;
  const label = total > 86400 ? "THE CHOSEN SLOTH" : total > 36000 ? "LORD OF PROCRASTINATION" : total > 10800 ? "COUCH WARRIOR" : total > 600 ? "SERIOUS SLACKER" : "NOVICE SLACKER";
  return { level, xp, totalXp, maxXp, label };
}

function ensureDefaultNotifications() {
  if (state.notifications.length) return;
  state.notifications = [
    { id: 1, message: "Your task is still waiting. Don’t worry. You can ignore it again.", time: new Date().toISOString() },
    { id: 2, message: "You haven’t procrastinated in 2 hours. Everything okay?", time: new Date().toISOString() },
    { id: 3, message: "No pressure. The deadline is definitely not getting louder.", time: new Date().toISOString() }
  ];
  save();
}

function addNotification(message) {
  state.notifications.unshift({
    id: Date.now() + Math.random(),
    message,
    time: new Date().toISOString()
  });
  state.notifications = state.notifications.slice(0, 10);
  save();
  renderNotifications();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Procrasti-Nation", { body: message });
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    toast("Browser notifications are not supported here.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      toast("ALERTS ENABLED. YOUR EXCUSES HAVE BEEN RECORDED.");
      addNotification("Notifications enabled. You are now officially monitored by your own excuses.");
    } else {
      toast("ALERTS DISABLED. IN-APP REMINDERS STILL WORK.");
    }
  });
}

function maybePushReminder() {
  const now = Date.now();
  if (now - state.lastReminderAt < 90000) return;
  state.lastReminderAt = now;
  const reminders = [
    "Your task is still waiting. Don’t worry. You can ignore it again.",
    "You haven’t procrastinated in 2 hours. Everything okay?",
    "No one asked for productive behavior today.",
    "The deadline is still pretending it’s not a problem."
  ];
  addNotification(reminders[Math.floor(Math.random() * reminders.length)]);
  save();
}

function renderDashboardStats() {
  const sessions = getUserSessions();
  const totalSeconds = getTotalSeconds();
  const average = sessions.length ? Math.round(totalSeconds / sessions.length / 60) : 0;
  const levelInfo = getLevelInfo();

  document.getElementById("totalTime").textContent = humanSeconds(totalSeconds);
  document.getElementById("sessionCount").textContent = sessions.length;
  document.getElementById("avgTime").textContent = `${average}m`;
  document.getElementById("topReason").textContent = getTopReason();
  document.getElementById("quote").textContent = `“${quotes[Math.floor(Date.now() / 60000) % quotes.length]}”`;
  document.getElementById("playerLevel").textContent = levelInfo.level;
  document.getElementById("playerRank").textContent = levelInfo.label;
  document.getElementById("xpText").textContent = `${Math.round(levelInfo.xp)} / ${levelInfo.maxXp}`;
  document.getElementById("xpBar").style.width = `${Math.min(100, (levelInfo.xp / levelInfo.maxXp) * 100)}%`;
  document.getElementById("hpBar").style.width = `${Math.min(100, (totalSeconds / 43200) * 100)}%`;
  const tasks = getUserTasks();
  document.getElementById("activeQuest").textContent = tasks[0]?.name || "No active quest";
  document.getElementById("questMeta").textContent = tasks[0]?.deadline ? `Deadline: ${new Date(tasks[0].deadline).toLocaleString()}` : "Deadline: 2 hours";

  document.getElementById("profileTitle").textContent = levelInfo.label;
  document.getElementById("profileText").textContent = totalSeconds
    ? `You’ve sacrificed ${humanSeconds(totalSeconds)} to the art of doing anything else.`
    : "Start a session to discover your true potential.";

  document.getElementById("sideStatus").textContent = running ? "Currently avoiding responsibility." : "Idle. The deadline is trembling.";
  document.getElementById("livePill").textContent = running ? "● IN PROGRESS" : "● READY";

  const ladder = getProgressionLadder();
  document.getElementById("achievementLadder").innerHTML = ladder.map((item) => `<span>${item}</span>`).join("");
}

function getProgressionLadder() {
  const level = getLevelInfo().level;
  return getLevelAchievements().filter((item) => item.unlocked && item.level <= level).map((item) => item.title);
}

function getLevelAchievements() {
  const level = getLevelInfo().level;
  const levelNames = [
    "🌱 FIRST DAY OF DELAY",
    "🛋️ COUCH APPRENTICE",
    "🗿 PROFESSIONAL WASTER",
    "💀 DEADLINE NECROMANCER",
    "👑 LORD OF PROCRASTINATION",
    "🐌 CHOSEN SLOTH",
    "🧠 MASTER OF DELAY",
    "🏰 DEADLINE TYRANT",
    "🌪️ CHAOS ARCHITECT",
    "👑 LEGENDARY EXCUSE EMPEROR"
  ];

  return levelNames.map((title, index) => ({
    level: index + 1,
    title: `LV.${index + 1} ${title}`,
    unlocked: level >= index + 1,
    description: `Reach level ${index + 1}`
  }));
}

function renderTasks() {
  const el = document.getElementById("taskList");
  const tasks = getUserTasks();
  if (!tasks.length) {
    el.innerHTML = '<div class="list-item">No quest assigned. Your greatest achievement yet.</div>';
    return;
  }

  el.innerHTML = tasks.map((task) => `
    <div class="task-item ${task.done ? "done" : ""}">
      <label class="task-check">
        <input type="checkbox" data-task="${state.tasks.indexOf(task)}" ${task.done ? "checked" : ""}>
        <span>${escapeHtml(task.name)}</span>
      </label>
      <div class="task-meta">
        <span class="task-pill">${task.priority}</span>
        ${task.deadline ? `<span class="task-deadline">Due ${escapeHtml(new Date(task.deadline).toLocaleString())}</span>` : ""}
      </div>
    </div>
  `).join("");
}

function renderHistory() {
  const sessions = getUserSessions();
  const recent = sessions.slice().reverse().slice(0, 8);
  const full = sessions.slice().reverse();

  document.getElementById("recentList").innerHTML = recent.length
    ? recent.map((session) => `
      <div class="list-item">
        <div>
          <b>${escapeHtml(session.reason)}</b>
          <small>${escapeHtml(session.task || "No task")} · ${new Date(session.start).toLocaleString()}</small>
        </div>
        <b>${humanSeconds(session.duration)}</b>
      </div>
    `).join("")
    : '<div class="list-item">No evidence yet. Start procrastinating.</div>';

  document.getElementById("historyList").innerHTML = full.length
    ? full.map((session) => `
      <div class="list-item">
        <div>
          <b>${escapeHtml(session.reason)}</b>
          <small>${escapeHtml(session.task || "No task")} · ${new Date(session.start).toLocaleString()}</small>
        </div>
        <b>${humanSeconds(session.duration)}</b>
      </div>
    `).join("")
    : '<div class="list-item">Clean record. Disgusting.</div>';
}

function getAchievementCatalog() {
  const sessions = getUserSessions();
  const total = getTotalSeconds();
  const longestSession = sessions.length ? Math.max(...sessions.map((session) => Number(session.duration || 0))) : 0;
  const uniqueReasons = new Set(sessions.map((session) => session.reason)).size;
  const socialSeconds = sessions.filter((session) => session.reason === "Social media").reduce((sum, session) => sum + Number(session.duration || 0), 0);
  const gamingCount = sessions.filter((session) => session.reason === "Gaming").length;
  const videoSeconds = sessions.filter((session) => session.reason === "Videos").reduce((sum, session) => sum + Number(session.duration || 0), 0);
  const chatSeconds = sessions.filter((session) => session.reason === "Chatting").reduce((sum, session) => sum + Number(session.duration || 0), 0);
  const eatingCount = sessions.filter((session) => session.reason === "Eating").length;
  const sleepCount = sessions.filter((session) => session.reason === "Sleeping" && Number(session.duration || 0) >= 3600).length;
  const studyAvoidance = sessions.filter((session) => /study|assignment|exam|homework|revision|notes|research|course|chapter|math|algorithm|data structures|essay/i.test(session.task || "")).length;
  const tasks = getUserTasks();
  const tasksWithoutComplete = tasks.filter((task) => !task.done).length >= 5 && !tasks.some((task) => task.done);

  const sameTaskThreeDays = (() => {
    const byTask = new Map();
    sessions.forEach((session) => {
      if (!session.task) return;
      const key = session.task.trim().toLowerCase();
      const dayKey = new Date(session.start).toDateString();
      const set = byTask.get(key) || new Set();
      set.add(dayKey);
      byTask.set(key, set);
    });
    return [...byTask.values()].some((days) => days.size >= 3);
  })();

  const singleDayReasons = (() => {
    const map = {};
    sessions.forEach((session) => {
      const key = new Date(session.start).toDateString();
      map[key] = map[key] || new Set();
      map[key].add(session.reason);
    });
    return Object.values(map).some((set) => set.size >= 3);
  })();

  const sameTaskAvoided = (() => {
    const counts = {};
    sessions.forEach((session) => {
      if (!session.task) return;
      const key = session.task.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.values(counts).some((count) => count >= 5);
  })();

  const weeklyTotal = (() => {
    const now = Date.now();
    return sessions.filter((session) => now - new Date(session.start).getTime() <= 7 * 24 * 60 * 60 * 1000).reduce((sum, session) => sum + Number(session.duration || 0), 0);
  })();

  const achievements = [
    ...getLevelAchievements(),
    { title: "🐣 NOVICE SLACKER", unlocked: total >= 600, description: "Waste your first 10 minutes" },
    { title: "🛋️ COUCH WARRIOR", unlocked: total >= 3600, description: "Waste 1 hour" },
    { title: "🎮 DEDICATED COWARD", unlocked: total >= 10800, description: "Waste 3 hours" },
    { title: "💀 DEADLINE NECROMANCER", unlocked: sessions.length >= 3, description: "Ignore 3 deadlines" },
    { title: "👑 LORD OF PROCRASTINATION", unlocked: total >= 36000, description: "Waste 10 hours" },
    { title: "🐌 THE CHOSEN SLOTH", unlocked: total >= 100000, description: "Waste 27.7 hours and become legend" },
    { title: "😭 PRODUCTIVITY FAILURE", unlocked: tasks.some((task) => task.done), description: "Complete a task" },
    { title: "📱 THUMB ATHLETE", unlocked: socialSeconds >= 3600, description: "1 hour of social media" },
    { title: "🎮 ONE MORE GAME", unlocked: gamingCount >= 5, description: "5 gaming sessions" },
    { title: "🎬 ONE MORE EPISODE", unlocked: videoSeconds >= 7200, description: "2+ hours of videos" },
    { title: "🧠 PROFESSIONAL EXCUSE MAKER", unlocked: uniqueReasons >= 5, description: "Use 5 different excuses" },
    { title: "📚 ACADEMIC AVOIDANCE SPECIALIST", unlocked: studyAvoidance >= 5, description: "Procrastinate on study tasks 5 times" },
    { title: "🗿 UNBOTHERED", unlocked: Object.values(sessions.reduce((acc, session) => {
      const day = new Date(session.start).toDateString();
      acc[day] = (acc[day] || 0) + Number(session.duration || 0);
      return acc;
    }, {})).some((value) => value >= 21600), description: "6+ hours in one day" },
    { title: "💬 SOCIAL BUTTERFLY", unlocked: chatSeconds >= 7200, description: "2+ hours of chatting" },
    { title: "🍔 SNACK BREAK CHAMPION", unlocked: eatingCount >= 5, description: "5 eating-related misses" },
    { title: "😴 STRATEGIC NAP", unlocked: sleepCount >= 1, description: "Sleep your way out of responsibility" },
    { title: "🧹 ANYTHING BUT THE TASK", unlocked: sessions.some((session) => ["Social media", "Gaming", "Videos", "Chatting"].includes(session.reason) && /study|assignment|exam|homework|read|research|course|book|notes/i.test(session.task || "")), description: "Hide behind productive-looking nonsense" },
    { title: "📅 ILL DO IT TOMORROW", unlocked: sameTaskThreeDays, description: "Same task, 3 different days" },
    { title: "🕳️ THE RABBIT HOLE", unlocked: singleDayReasons, description: "3 reasons in one day" },
    { title: "🏃 TASK DODGER", unlocked: sameTaskAvoided, description: "Avoid same task 5 times" },
    { title: "🧘 MASTER OF DOING NOTHING", unlocked: weeklyTotal >= 36000, description: "10 hours in a week" },
    { title: "🧨 DEADLINE DISASTER", unlocked: tasks.filter((task) => task.deadline && !task.done && new Date(task.deadline).getTime() < Date.now()).length >= 3, description: "3 missed deadlines" },
    { title: "🐐 THE GOAT", unlocked: total >= 360000, description: "100 hours of chaos" }
  ];

  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  achievements.push({ title: "👑 EMPEROR OF EXCUSES", unlocked: unlockedCount >= 15, description: "Unlock 15 badge achievements" });
  return achievements;
}

function renderAchievements() {
  const demoEnabled = demoState.active && isDemoAdmin();
  const achievements = getAchievementCatalog()
    .map((item) => demoEnabled ? { ...item, unlocked: true } : item);
  const unlockedCount = achievements.filter((item) => item.unlocked).length;

  document.getElementById("achievementGrid").innerHTML = achievements.map((item) => `
    <button type="button" class="achievement ${item.unlocked ? "unlocked" : "locked"}" data-achievement-title="${escapeHtml(item.title)}" aria-label="${item.unlocked ? "Unlocked: " : "Locked: "}${escapeHtml(item.title)}">
      <div class="icon">${item.unlocked ? item.title.split(" ")[0] : "🔒"}</div>
      <div class="ach-name">${item.title}</div>
      <div class="ach-detail">${item.unlocked ? "UNLOCKED — TAP TO REPLAY" : item.description}</div>
      ${!item.unlocked ? '<div class="ach-lock-tag">LOCKED</div>' : ""}
    </button>
  `).join("") + `<div class="achievement-summary">${unlockedCount}/${achievements.length} BADGES</div>`;

  document.querySelectorAll("[data-achievement-title]").forEach((card) => {
    card.addEventListener("click", () => {
      const achievement = achievements.find((item) => item.title === card.dataset.achievementTitle);
      if (!achievement) return;
      if (achievement.unlocked) {
        replayAchievement(achievement);
      } else {
        toast(`🔒 ${achievement.description.toUpperCase()}`);
      }
    });
  });
  const status = document.getElementById("achievementDemoStatus");
  if (status) status.classList.toggle("hidden", !demoEnabled);
  celebrateNewAchievement(achievements);
}

function replayAchievement(achievement) {
  const overlay = document.getElementById("achievementCelebration");
  if (!overlay) return;
  const world = getCurrentWorld();
  const effects = {
    bedroom: "✨ 🎺 ✨ 🎺 ✨",
    social: "❤️ 👍 🔔 💬 ❤️",
    gaming: "🪙 ✨ +500 XP ✨ 🪙",
    videos: "📺 ▶ WATCHED ▶ 📺",
    sleeping: "☁️ Z z z ✨ Z z z ☁️",
    eating: "🥁 👨‍🍳 TA-DA! 🍽️",
    chatting: "💬 YO, LOOK! 🎉 NO WAY! 💬"
  };
  document.getElementById("celebrationTitle").textContent = achievement.title;
  document.getElementById("celebrationDetail").textContent = `${achievement.description} — replayed for the showcase.`;
  document.getElementById("celebrationFx").textContent = effects[world.id] || "✨ ✨ ✨";
  overlay.dataset.world = world.id;
  overlay.classList.remove("hidden");
  overlay.classList.remove("achievement-pop");
  void overlay.offsetWidth;
  overlay.classList.add("achievement-pop");
  clearTimeout(replayAchievement.timeoutId);
  replayAchievement.timeoutId = setTimeout(() => overlay.classList.add("hidden"), 3900);
}

function celebrateNewAchievement(achievements) {
  if (!state.currentUser || (demoState.active && isDemoAdmin())) return;
  const key = `pnSeenAchievements:${encodeURIComponent(state.currentUser.name)}`;
  let seen = [];
  const unlocked = achievements.filter((item) => item.unlocked);
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      localStorage.setItem(key, JSON.stringify(unlocked.map((item) => item.title)));
      return;
    }
    seen = JSON.parse(stored);
  } catch (_) { seen = []; }
  const fresh = unlocked.find((item) => !seen.includes(item.title));
  if (!fresh) return;

  localStorage.setItem(key, JSON.stringify(unlocked.map((item) => item.title)));
  replayAchievement(fresh);
}

function renderWorldMap() {
  const current = getCurrentWorld();
  const worlds = getWorldProgress();
  const currentLabel = document.getElementById("currentWorldLabel");
  if (currentLabel) currentLabel.textContent = `${current.icon} ${current.name}`;
  const worldPaths = `<svg class="world-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <line x1="50" y1="48" x2="16" y2="18"></line><line x1="50" y1="48" x2="84" y2="18"></line>
    <line x1="50" y1="48" x2="16" y2="53"></line><line x1="50" y1="48" x2="84" y2="53"></line>
    <line x1="50" y1="48" x2="35" y2="91"></line><line x1="50" y1="48" x2="65" y2="91"></line>
  </svg>`;
  document.getElementById("worldMap").innerHTML = worldPaths + worlds.map((world) => {
    const minutes = Math.floor(world.seconds / 60);
    const progress = world.reason ? `${minutes}m / ${Math.floor(world.threshold / 60)}m` : "HOME BASE";
    return `
      <div tabindex="-1" class="map-node world-node-${world.id} ${world.unlocked ? "active" : "locked"} ${current.id === world.id ? "current" : ""}">
        <div class="map-icon">${world.icon}</div>
        <strong>${escapeHtml(world.name)}</strong>
        <small>${escapeHtml(world.description)}</small>
        <span class="map-progress">${progress} ${world.unlocked ? "🔓" : "🔒"}</span>
        ${!world.unlocked ? `<span class="map-requirement">${Math.max(0, Math.ceil((world.threshold - world.seconds) / 60))} more minutes of ${escapeHtml(world.reason.toLowerCase())}</span>` : ""}
        ${world.unlocked && current.id !== world.id ? `<button type="button" class="pixel-btn small world-enter-btn" data-world="${world.id}">ENTER</button>` : ""}
        ${current.id === world.id ? '<span class="world-current-mark">⭐ CURRENT WORLD</span>' : ""}
      </div>
    `;
  }).join("");
  document.querySelectorAll(".world-enter-btn").forEach((button) => {
    button.addEventListener("click", () => setCurrentWorld(button.dataset.world));
  });
}

const worldNeighbors = {
  bedroom: { ArrowUp: "social", ArrowRight: "gaming", ArrowDown: "chatting", ArrowLeft: "eating" },
  social: { ArrowRight: "gaming", ArrowDown: "bedroom" },
  gaming: { ArrowLeft: "social", ArrowDown: "bedroom" },
  eating: { ArrowUp: "bedroom", ArrowRight: "chatting", ArrowDown: "videos" },
  chatting: { ArrowUp: "bedroom", ArrowLeft: "eating", ArrowDown: "sleeping" },
  videos: { ArrowUp: "eating", ArrowRight: "sleeping" },
  sleeping: { ArrowUp: "chatting", ArrowLeft: "videos" }
};

function handleWorldMapKeydown(event) {
  const sourceId = worldFocusId || getCurrentWorld().id;
  if (!Object.prototype.hasOwnProperty.call(worldNeighbors, sourceId)) return;
  const targetId = worldNeighbors[sourceId][event.key];
  if (!targetId) return;
  event.preventDefault();
  worldFocusId = targetId;
  const target = getWorldProgress().find((world) => world.id === targetId);
  if (target?.unlocked) {
    setCurrentWorld(targetId);
  } else {
    toast(`${target.icon} ${Math.max(0, Math.ceil((target.threshold - target.seconds) / 60))} MORE MINUTES OF ${target.reason.toUpperCase()} TO UNLOCK.`);
  }
  setTimeout(() => document.querySelector(`.world-node-${targetId}`)?.focus(), 0);
}

function renderLeaderboard() {
  const leaderboardStatus = document.getElementById("leaderboardStatus");
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardStatus || !leaderboardList) return;

  // This MVP leaderboard is real for every account on this browser.
  // Each completed procrastination session is tied to the account that started it.
  const totals = {};
  (state.users || []).forEach((user) => {
    totals[user.name] = 0;
  });

  state.sessions.forEach((session) => {
    const name = session.userName;
    if (name) totals[name] = (totals[name] || 0) + Number(session.duration || 0);
  });

  // Keep the current user visible even before their first session.
  if (state.currentUser?.name && !(state.currentUser.name in totals)) {
    totals[state.currentUser.name] = 0;
  }

  const entries = Object.entries(totals)
    .map(([name, seconds]) => ({
      name,
      score: seconds / 3600,
      isUser: name === state.currentUser?.name
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  leaderboardStatus.textContent = state.users?.length > 1
    ? "LOCAL ARENA • LIVE ON THIS DEVICE"
    : "LOCAL ARENA • ADD FRIENDS TO COMPETE";

  if (!entries.length) {
    leaderboardList.innerHTML = `
      <div class="leaderboard-empty">
        🐌 No procrastinators yet.<br>
        Create an account and become the first legend.
      </div>`;
    return;
  }

  leaderboardList.innerHTML = entries.map((entry, index) => `
    <div class="leaderboard-item ${entry.isUser ? "you" : ""}">
      <div class="rank">${index === 0 ? "🏆" : `#${index + 1}`}</div>
      <div class="name">
        ${escapeHtml(entry.name)}
        ${entry.isUser ? '<span class="you-tag">YOU</span>' : ""}
      </div>
      <div class="score">${Number(entry.score).toFixed(1)}h</div>
    </div>
  `).join("");
}

function renderNotifications() {
  const items = state.notifications.length ? state.notifications : [{ message: "No notifications yet. The universe is still giving you a chance.", time: new Date().toISOString() }];
  const markup = items.map((item) => `
    <div class="notification-item">
      <div class="dot"></div>
      <div>
        <p>${escapeHtml(item.message)}</p>
        <small>${new Date(item.time).toLocaleString()}</small>
      </div>
    </div>
  `).join("");

  document.getElementById("dashboardNotifications").innerHTML = markup;
  document.getElementById("notificationList").innerHTML = markup;
}

function renderNpcDialogue() {
  const sessions = getUserSessions();
  const peak = getTopReason();
  const longest = sessions.slice().sort((a, b) => b.duration - a.duration)[0];
  const firstLine = sessions.length ? `You procrastinate most when ${peak || "avoiding the obvious"}.` : "I have not yet observed your true patterns.";
  const secondLine = longest ? `Your favorite excuse is: "${longest.reason || "Just five minutes."}".` : 'Your favorite excuse is: "Just five minutes."';

  document.getElementById("aiInsight").innerHTML = `
    <div class="dialogue-line">I've analyzed your behavior.</div>
    <div class="dialogue-line">${firstLine}</div>
    <div class="dialogue-line">${secondLine}</div>
    <div class="dialogue-line">You have said this ${sessions.length || 0} times.</div>
    <div class="dialogue-line">I am disappointed.</div>
  `;
}

function setPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  const target = document.getElementById(pageName);
  if (target) target.classList.add("active");
  document.querySelectorAll(".nav").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  document.getElementById("pageTitle").textContent = title;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updatePicker() {
  const taskPicker = document.getElementById("taskPicker");
  const options = getUserTasks().filter((task) => !task.done).map((task) => `<option value="${state.tasks.indexOf(task)}">${escapeHtml(task.name)}</option>`).join("");
  taskPicker.innerHTML = '<option value="">Nothing specific (even better)</option>' + options;
}

function normalizeReason(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isValidReason(value) {
  const cleaned = normalizeReason(value);
  if (!cleaned || cleaned.length < 3) return false;
  const lower = cleaned.toLowerCase();
  const weakPatterns = ["meh", "idk", "nothing", "stuff", "things", "lol", "maybe", "whatever", "uh", "um", "n/a"];
  if (weakPatterns.some((word) => lower.includes(word))) return false;
  return /because|since|while|need to|have to|trying to|busy|tired|overwhelmed|stuck|my|i'm|i am|can't|cannot|should|must|just|due to|as i/i.test(lower) || cleaned.length >= 12;
}

function showCustomReasonInput() {
  document.getElementById("customReasonWrap").classList.remove("hidden");
  document.getElementById("customReasonInput").focus();
  document.getElementById("customReasonError").classList.add("hidden");
}

function hideCustomReasonInput() {
  document.getElementById("customReasonWrap").classList.add("hidden");
  document.getElementById("customReasonInput").value = "";
  document.getElementById("customReasonError").classList.add("hidden");
}

function validateCustomReason() {
  const reason = normalizeReason(document.getElementById("customReasonInput").value);
  if (!isValidReason(reason)) {
    const message = "This is not a valid excuse. We need a reason with actual effort, not a shrug in a trench coat. Please provide a coherent explanation for your avoidance.";
    document.getElementById("customReasonError").textContent = message;
    document.getElementById("customReasonError").classList.remove("hidden");
    toast(message);
    return;
  }
  startSession(reason);
}

function startSession(reason) {
  const taskValue = document.getElementById("taskPicker").value;
  const selectedTask = taskValue === "" ? null : state.tasks[Number(taskValue)];
  const quickFive = document.getElementById("quickFiveCheck").checked;

  running = {
    reason,
    task: selectedTask ? selectedTask.name : "",
    start: Date.now(),
    quickFive,
    userName: state.currentUser?.name || "Guest"
  };

  document.getElementById("reasonModal").classList.add("hidden");
  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) stopBtn.disabled = false;
  const timerReason = document.getElementById("timerReason");
  if (timerReason) timerReason.textContent = reason + (selectedTask ? ` · avoiding ${selectedTask.name}` : "");
  const worldStopBtn = document.getElementById("worldStopBtn");
  if (worldStopBtn) worldStopBtn.disabled = false;
  const worldTimerReason = document.getElementById("worldTimerReason");
  if (worldTimerReason) worldTimerReason.textContent = reason + (selectedTask ? ` · avoiding ${selectedTask.name}` : "");
  document.getElementById("quickFiveCheck").checked = false;
  hideCustomReasonInput();
  document.querySelector(".timer-block")?.classList.remove("hidden");
  document.querySelector(".world-session-hud")?.classList.remove("hidden");

  toast(`${getCurrentWorld().icon} ${reactions[0]}`);
  showWorldReaction(reason);
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 500);
  updateTimer();
  render();
}

function updateTimer() {
  if (!running) return;
  const elapsed = (Date.now() - running.start) / 1000;
  const timerNode = document.getElementById("timer");
  if (timerNode) timerNode.textContent = formatClock(elapsed);
  const worldTimerNode = document.getElementById("worldTimer");
  if (worldTimerNode) worldTimerNode.textContent = formatClock(elapsed);
  const stage = Math.min(3, Math.floor(elapsed / 1800));
  if (stage > 0) toast(reactions[stage]);
}

function stopSession() {
  if (!running) return;

  const worldsBefore = getWorldProgress();
  clearInterval(timerId);
  const end = Date.now();
  const duration = Math.max(1, Math.floor((end - running.start) / 1000));
  const savedSession = {
    ...running,
    end,
    duration,
    userName: state.currentUser?.name || "Guest"
  };
  state.sessions.push(savedSession);
  save();
  const newlyUnlocked = getWorldProgress().filter((world) => world.unlocked && !worldsBefore.find((before) => before.id === world.id)?.unlocked);

  running = null;
  const timerNode = document.getElementById("timer");
  if (timerNode) timerNode.textContent = "00:00:00";
  const worldTimerNode = document.getElementById("worldTimer");
  if (worldTimerNode) worldTimerNode.textContent = "00:00:00";
  const timerReason = document.getElementById("timerReason");
  if (timerReason) timerReason.textContent = "No excuse selected.";
  const worldTimerReason = document.getElementById("worldTimerReason");
  if (worldTimerReason) worldTimerReason.textContent = "No excuse selected.";
  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) stopBtn.disabled = true;
  const worldStopBtn = document.getElementById("worldStopBtn");
  if (worldStopBtn) worldStopBtn.disabled = true;
  document.querySelector(".timer-block")?.classList.add("hidden");
  document.querySelector(".world-session-hud")?.classList.add("hidden");
  toast("😐 DISAPPOINTING. YOU STOPPED PROCRASTINATING.");
  addNotification(`You procrastinated for ${humanSeconds(duration)} because of ${savedSession.reason.toLowerCase()}.`);
  newlyUnlocked.forEach((world) => {
    addNotification(`${world.icon} WORLD UNLOCKED: ${world.name}. Visit the World screen to enter it.`);
    toast(`${world.icon} WORLD UNLOCKED: ${world.name.toUpperCase()}!`);
  });
  render();
}

function handleTaskToggle(index, checked) {
  const task = state.tasks[index];
  if (!task) return;
  task.done = checked;
  save();
  render();

  if (checked) {
    toast("💀 YOU ACTUALLY BECAME PRODUCTIVE?");
    addNotification(`Task completed: ${task.name}. We’ll pretend this wasn’t a miracle.`);
  }
}

function updateAuthButton() {
  const button = document.getElementById("authButton");
  if (!button) return;
  button.textContent = state.currentUser ? `LOG OUT (${state.currentUser.name})` : "REGISTER / LOGIN";
  const demoButton = document.getElementById("achievementDemoBtn");
  if (demoButton) {
    demoButton.classList.toggle("hidden", !isDemoAdmin());
    demoButton.textContent = demoState.active ? "EXIT DEMO" : "DEMO SHOWCASE";
  }
}

function openAuthModal(mode = "login") {
  authState.mode = mode;
  document.getElementById("authModal").classList.remove("hidden");
  document.getElementById("authTitle").textContent = mode === "register" ? "REGISTER" : "LOGIN";
  document.getElementById("authSubmitBtn").textContent = mode === "register" ? "CREATE ACCOUNT" : "LOGIN";
  document.querySelectorAll(".auth-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.auth === mode));
  document.getElementById("authMessage").classList.add("hidden");
  document.getElementById("authQuote").textContent = authQuotes[Math.floor(Math.random() * authQuotes.length)];
  document.getElementById("authName").focus();
}

function showAuthScreen() {
  document.body.classList.add("logged-out");
  openAuthModal("login");
}

function enterWorld() {
  document.body.classList.remove("logged-out");
  closeAuthModal();
}

function closeAuthModal() {
  if (document.body.classList.contains("logged-out")) return;
  document.getElementById("authModal").classList.add("hidden");
  document.getElementById("authForm").reset();
  document.getElementById("authMessage").classList.add("hidden");
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const mode = authState.mode;
  const name = normalizeReason(document.getElementById("authName").value);
  const password = document.getElementById("authPassword").value.trim();
  const messageBox = document.getElementById("authMessage");

  if (!name || !password) {
    messageBox.textContent = "Both username and password are required. We take this seriously, even if your excuses are not.";
    messageBox.classList.remove("hidden");
    return;
  }

  if (mode === "register") {
    if (name.toLowerCase() === demoAdmin.name) {
      messageBox.textContent = "That username is reserved for the world showcase administrator.";
      messageBox.classList.remove("hidden");
      return;
    }
    if ((state.users || []).some((user) => user.name.toLowerCase() === name.toLowerCase())) {
      messageBox.textContent = "That username already exists. Someone else already claimed that level of chaos.";
      messageBox.classList.remove("hidden");
      return;
    }
    state.users.push({ name, password });
    state.currentUser = { name };
    toast("ACCOUNT CREATED. THE FUTURE IS OFFICIALLY DELAYED.");
  } else {
    if (name.toLowerCase() === demoAdmin.name && password === demoAdmin.password) {
      state.currentUser = { name: demoAdmin.name, isDemoAdmin: true };
      toast("WORLD SHOWCASE ADMIN ACCESS GRANTED.");
    } else {
    const user = (state.users || []).find((entry) => entry.name.toLowerCase() === name.toLowerCase() && entry.password === password);
    if (!user) {
      messageBox.textContent = "Invalid login. The system has detected weak credentials and dramatic denial.";
      messageBox.classList.remove("hidden");
      return;
    }
    state.currentUser = { name: user.name };
    toast("WELCOME BACK. YOUR BACKLOG HAS BEEN WAITING.");
    }
  }

  claimLegacySessions(state.currentUser.name);
  claimLegacyTasks(state.currentUser.name);
  save();
  enterWorld();
  render();
}

function render() {
  renderDashboardStats();
  renderTasks();
  renderHistory();
  renderAchievements();
  renderWorldMap();
  renderLeaderboard();
  renderNotifications();
  renderNpcDialogue();
  updatePicker();
  updateAuthButton();
  applyCurrentWorld();
}

function initializeEvents() {
  document.querySelectorAll(".nav").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.page));
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setPage(button.dataset.go);
    });
  });

  const openProcrastination = () => {
    if (running) return;
    hideCustomReasonInput();
    document.getElementById("reasonModal").classList.remove("hidden");
  };

  document.getElementById("startBtn").addEventListener("click", openProcrastination);
  document.getElementById("worldStartBtn").addEventListener("click", openProcrastination);

  document.getElementById("closeModal").addEventListener("click", () => {
    hideCustomReasonInput();
    document.getElementById("reasonModal").classList.add("hidden");
  });

  document.getElementById("closeAuthModal").addEventListener("click", closeAuthModal);

  document.getElementById("authButton").addEventListener("click", () => {
    if (state.currentUser) {
      state.currentUser = null;
      demoState.active = false;
      save();
      render();
      showAuthScreen();
      toast("LOGGED OUT. YOU ARE FREE TO MAKE TERRIBLE CHOICES AGAIN.");
      return;
    }
    openAuthModal("login");
  });

  document.getElementById("notifyPermissionBtn").addEventListener("click", requestNotificationPermission);

  document.querySelectorAll(".reason-grid button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.reason === "Other") {
        showCustomReasonInput();
        return;
      }
      startSession(button.dataset.reason);
    });
  });

  document.getElementById("customReasonSubmit").addEventListener("click", validateCustomReason);
  document.getElementById("customReasonInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      validateCustomReason();
    }
  });

  document.getElementById("stopBtn").addEventListener("click", stopSession);
  document.getElementById("worldStopBtn").addEventListener("click", stopSession);
  document.getElementById("worldMap").addEventListener("keydown", handleWorldMapKeydown);

  document.getElementById("taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("taskInput").value.trim();
    const priority = document.getElementById("priority").value;
    const deadline = document.getElementById("deadlineInput").value;

    if (!name) {
      toast("YOU NEED A TASK BEFORE YOU CAN AVOID IT PROPERLY.");
      return;
    }

    state.tasks.push({ name, deadline, priority, done: false, userName: state.currentUser?.name || "Guest" });
    document.getElementById("taskInput").value = "";
    document.getElementById("deadlineInput").value = "";
    save();
    render();
    toast("QUEST ADDED. THE UNIVERSE IS CONCERNED.");
  });

  document.getElementById("taskList").addEventListener("click", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    handleTaskToggle(Number(checkbox.dataset.task), checkbox.checked);
  });

  document.getElementById("clearHistory").addEventListener("click", () => {
    if (confirm("Erase all procrastination evidence?")) {
      const currentName = state.currentUser?.name;
      if (currentName) {
        state.sessions = state.sessions.filter((session) => (session.userName || currentName) !== currentName);
      }
      save();
      render();
      toast("EVIDENCE DESTROYED. VERY RESPONSIBLE.");
    }
  });

  document.getElementById("clearNotifications").addEventListener("click", () => {
    state.notifications = [];
    save();
    renderNotifications();
    toast("ALERT LOG CLEARED. THE VOID IS LISTENING.");
  });

  document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);
  document.getElementById("achievementDemoBtn").addEventListener("click", () => {
    if (!isDemoAdmin()) {
      demoState.active = false;
      renderAchievements();
      renderWorldMap();
      toast("DEMO SHOWCASE IS AVAILABLE ONLY TO ADMIN123.");
      return;
    }
    demoState.active = !demoState.active;
    document.getElementById("achievementDemoBtn").textContent = demoState.active ? "EXIT DEMO" : "DEMO SHOWCASE";
    renderAchievements();
    renderWorldMap();
    applyCurrentWorld();
    toast(demoState.active ? "🎬 DEMO SHOWCASE ENABLED. EVERYTHING IS UNLOCKED." : "DEMO SHOWCASE CLOSED. REAL PROGRESS RESTORED.");
  });
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => openAuthModal(tab.dataset.auth));
  });

  window.addEventListener("online", renderLeaderboard);
  window.addEventListener("offline", renderLeaderboard);
}

function boot() {
  ensureDefaultNotifications();
  initializeEvents();
  render();
  if (!state.currentUser) {
    showAuthScreen();
  }
  setInterval(() => {
    if (!document.hidden) maybePushReminder();
  }, 60000);
}

boot();
