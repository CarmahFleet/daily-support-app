const API_URL = "https://script.google.com/macros/s/AKfycbzlTd0HcORu-R78042GmDC5buO-69X9XRB6NjPh-Qmtj_5fnA-fSKBAkXCnuufS5LU5/exec";
const PASSWORD = "Beckett";
const TIMEOUT_MS = 60 * 60 * 1000;

const ENCOURAGEMENT = [
  "Every small step forward is still progress. You're doing better than you think. 💜",
  "You showed up today — that matters more than you know. 💜",
  "It's okay to take things one moment at a time. You've got this. 💜",
  "Dad is proud of you, even on the hard days. 💜",
  "You are stronger than you feel right now. 💜",
  "Small steps still move you forward. Keep going. 💜",
  "Today doesn't have to be perfect. Just today. 💜",
  "You are loved, always. 💜"
];

let DAILY_LIVING = [
  { emoji:"🪥", label:"Brush Teeth" },
  { emoji:"👗", label:"Get Dressed" },
  { emoji:"💊", label:"Medication (morning)" },
  { emoji:"🍳", label:"Breakfast" },
  { emoji:"💧", label:"Drink Water" },
  { emoji:"🥗", label:"Lunch" },
  { emoji:"😴", label:"Journal" },
  { emoji:"🌿", label:"Outside Time" },
  { emoji:"🚿", label:"Shower" },
  { emoji:"💊", label:"Medication (evening)" },
  { emoji:"🍽️", label:"Dinner" }
];

const COLORS = [
  { bg:"#eef3ff", color:"#3C3489" },
  { bg:"#fdf0ff", color:"#7a1fa0" },
  { bg:"#fff0f5", color:"#a01a4a" },
  { bg:"#f0faf0", color:"#2d7a2d" },
  { bg:"#fffbf0", color:"#8a5c00" }
];

let selectedMood = "";
let selectedEnergy = "";
let selectedSupportType = "";
let appData = null;
let activityTimer = null;
let authed = false;
let editTarget = null;
let deleteTarget = null;
let expandedGoals = {};
let taskOrder = [];
let goalOrder = [];

// ─── AUTH ────────────────────────────────────────────────

function checkPin() {
  const val = document.getElementById("pinInput").value;
  if (val === PASSWORD) {
    authed = true;
    sessionStorage.setItem("jessieAuth", Date.now().toString());
    document.getElementById("pinInput").value = "";
    document.getElementById("pinError").innerText = "";
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    resetTimer();
    initApp();
  } else {
    document.getElementById("pinError").innerText = "Incorrect password. Try again.";
    document.getElementById("pinInput").value = "";
  }
}

function resetTimer() {
  clearTimeout(activityTimer);
  activityTimer = setTimeout(lockApp, TIMEOUT_MS);
}

function lockApp() {
  authed = false;
  document.getElementById("appContent").style.display = "none";
  document.getElementById("lockScreen").style.display = "flex";
  document.getElementById("pinInput").value = "";
  document.getElementById("pinError").innerText = "";
}

window.onload = function() {
  const savedAuth = sessionStorage.getItem("jessieAuth");
  if (savedAuth && (Date.now() - parseInt(savedAuth)) < TIMEOUT_MS) {
    authed = true;
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    resetTimer();
    initApp();
  }
  document.addEventListener("touchstart", resetTimer);
  document.addEventListener("click", resetTimer);
};

// ─── NAVIGATION ──────────────────────────────────────────

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById(page === 'checkin' ? 'tab1' : 'tab2').classList.add('active');
  if (page === 'goals' && appData) {
    renderTodayTasks();
    renderGoals();
    renderCompletedGoals();
    renderDifficultThings();
  }
}

// ─── INIT ────────────────────────────────────────────────

async function initApp() {
  try {
    const res = await fetch(API_URL);
    appData = await res.json();
    syncDailyLivingFromData();
    loadTaskOrder();
    loadGoalOrder();
    showGreeting();
    showDadResponse();
    renderDailyLiving();
    loadDadCorner();
    await checkStreak();
  } catch(e) { console.error(e); }
}

function syncDailyLivingFromData() {
  if (appData?.dailyLivingItems?.length > 1) {
    DAILY_LIVING = appData.dailyLivingItems.slice(1).map(row => ({
      emoji: row[2] || '✅',
      label: row[1]
    }));
  }
}

async function refreshData() {
  try {
    const res = await fetch(API_URL);
    appData = await res.json();
    syncDailyLivingFromData();
    loadTaskOrder();
    loadGoalOrder();
  } catch(e) {}
}

function loadTaskOrder() {
  const tasks = (appData?.tasks || []).filter((r, i) =>
    i > 0 && r[1] == 2 && r[6] !== 'Completed' && r[6] !== 'Deleted'
  );
  const withOrder = tasks.map(r => ({ id: String(r[0]), order: r[12] !== '' && r[12] !== undefined && r[12] !== null ? Number(r[12]) : 9999 }));
  withOrder.sort((a, b) => a.order - b.order);
  taskOrder = withOrder.map(r => r.id);
}

function loadGoalOrder() {
  const goals = (appData?.goals || []).filter((r, i) =>
    i > 0 && r[2] && r[3] !== 'Completed' && r[3] !== 'Deleted'
  );
  const withOrder = goals.map(r => ({ id: String(r[0]), order: r[9] !== '' && r[9] !== undefined && r[9] !== null ? Number(r[9]) : 9999 }));
  withOrder.sort((a, b) => a.order - b.order);
  goalOrder = withOrder.map(r => r.id);
}

function showGreeting() {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  document.getElementById("greetingText").innerHTML = `${time}, Jesse 💜`;
  document.getElementById("encouragementText").innerHTML =
    ENCOURAGEMENT[new Date().getDay() % ENCOURAGEMENT.length];
}

function showDadResponse() {
  if (!appData?.dadResponses || appData.dadResponses.length <= 1) return;
  const responses = appData.dadResponses;
  const latest = responses[responses.length - 1];
  if (new Date(latest[3]).toDateString() === new Date().toDateString()) {
    document.getElementById("dadResponseText").innerText = latest[2];
    document.getElementById("dadResponseBox").style.display = "block";
  }
}

// ─── STREAK ──────────────────────────────────────────────

const STREAK_MILESTONES = [7, 10, 14, 21, 30];

function isMilestone(streak) {
  if (streak <= 30) return STREAK_MILESTONES.includes(streak);
  return streak % 10 === 0;
}

async function checkStreak() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateStreak", userId: 2 })
    });
    const data = await res.json();
    if (!data.success || data.alreadyDone) {
      renderStreakBadge();
      return;
    }
    renderStreakBadge();
    if (data.isReset && data.streak === 1) {
      showStreakReset();
    } else if (data.warning) {
      showStreakWarning(data.streak);
    } else if (isMilestone(data.streak)) {
      await showStreakCelebration(data.streak);
    }
  } catch(e) {}
}

function renderStreakBadge() {
  if (!appData?.streaks || appData.streaks.length <= 1) return;
  const row = appData.streaks.find((r, i) => i > 0 && r[0] == 2);
  if (!row) return;
  const streak = Number(row[1]) || 0;
  const warning = row[3] === true || String(row[3]).toUpperCase() === 'TRUE';
  if (streak < 2) return;
  const badgeEl = document.getElementById("appStreakBadge");
  if (!badgeEl) return;
  let label = `${streak} day streak`;
  if (streak >= 365) label = `${Math.floor(streak/365)} year${Math.floor(streak/365)>1?'s':''} & ${streak % 365} days`;
  badgeEl.innerHTML = `
    <div class="app-streak-badge">
      <div class="streak-flame">🔥</div>
      <div class="streak-info">
        <div class="streak-count">${label}</div>
        <div class="streak-label">Keep showing up for yourself 💜</div>
      </div>
      ${warning ? `<div class="streak-warning">⚠️ 1 day grace</div>` : ''}
    </div>`;
}

function showStreakWarning(streak) {
  document.getElementById("streakIcon").innerText = "💜";
  document.getElementById("streakTitle").innerText = "We missed you yesterday";
  document.getElementById("streakMsg").innerText = `Your ${streak} day streak is safe — everyone gets one free day 💜 But if you miss tomorrow too your streak will reset. Come back tomorrow to keep it going.`;
  document.getElementById("streakOverlay").classList.add("active");
}

function showStreakReset() {
  document.getElementById("streakIcon").innerText = "🌱";
  document.getElementById("streakTitle").innerText = "Starting fresh today";
  document.getElementById("streakMsg").innerText = "Every day is a new beginning. Today is day one of something great 💜";
  document.getElementById("streakOverlay").classList.add("active");
}

async function showStreakCelebration(streak) {
  document.getElementById("streakIcon").innerText = "🔥";
  document.getElementById("streakTitle").innerText = `${streak} Day Streak!`;
  document.getElementById("streakMsg").innerText = "Getting your message...";
  document.getElementById("streakOverlay").classList.add("active");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "aiStreakCelebrate", streak })
    });
    const data = await res.json();
    document.getElementById("streakMsg").innerText = data.success
      ? data.message
      : `Jesse, ${streak} days of showing up for yourself. That is something to be genuinely proud of. 💜`;
  } catch(e) {
    document.getElementById("streakMsg").innerText =
      `Jesse, ${streak} days of showing up for yourself. That is something to be genuinely proud of. 💜`;
  }
}

function closeStreak() {
  document.getElementById("streakOverlay").classList.remove("active");
}

// ─── MOOD & ENERGY ───────────────────────────────────────

function selectMood(value) {
  selectedMood = value;
  document.querySelectorAll('.mood-good,.mood-okay,.mood-struggle').forEach(b => b.classList.remove('selected'));
  document.getElementById('mood-' + value).classList.add('selected');
  if (value === 'Struggling') {
    document.body.classList.add('struggling');
    document.getElementById('headerSubtitle').innerText = "It's okay to have hard days 💜";
  } else {
    document.body.classList.remove('struggling');
    document.getElementById('headerSubtitle').innerText = "How are you feeling?";
  }
}

function selectEnergy(value) {
  selectedEnergy = value;
  document.querySelectorAll('.energy-high,.energy-medium,.energy-low').forEach(b => b.classList.remove('selected'));
  document.getElementById('energy-' + value).classList.add('selected');
}

// ─── SUPPORT ─────────────────────────────────────────────

function clearSupBtnSelection() {
  document.querySelectorAll('.sup-btn').forEach(b => {
    b.classList.remove('selected-ok','selected-support','selected-help');
  });
}

function sendOkay() {
  clearSupBtnSelection();
  document.querySelector('.sup-ok').classList.add('selected-ok');
  saveCheckIn("I'm okay", "");
  saveAlert("OKAY", "I'm okay", "");
  alert("Thanks Jesse 💜");
}

function selectSupportType(btn, type) {
  selectedSupportType = type;
  document.querySelectorAll('.support-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function sendSupportRequest() {
  if (!selectedSupportType) selectedSupportType = "Not Sure";
  clearSupBtnSelection();
  document.querySelector('.sup-support').classList.add('selected-support');
  saveCheckIn("I could use some support", selectedSupportType);
  saveAlert("SUPPORT", "I could use some support", selectedSupportType);
  closeOverlay('supportTypeOverlay');
  alert("Thanks Jesse. Dad has been notified 💜");
}

function sendHelpToday() {
  clearSupBtnSelection();
  document.querySelector('.sup-help').classList.add('selected-help');
  saveCheckIn("Dad, I need help today", "");
  saveAlert("HELP", "Dad, I need help today", "");
  openOverlay('helpTodayOverlay');
}

function saveCheckIn(needToday, supportType) {
  post({ action:"checkIn", userId:2, mood:selectedMood||"Not set", energy:selectedEnergy||"Not set", needToday, supportType });
}

function saveAlert(alertType, message, supportType) {
  post({ action:"supportAlert", userId:2, alertType, message, supportType });
}

// ─── SOS ─────────────────────────────────────────────────

function openSOS() {
  document.getElementById("sosConfirmScreen").style.display = "block";
  document.getElementById("sosSentScreen").style.display = "none";
  document.getElementById("sosOverlay").classList.add("active");
}
function closeSOS() { document.getElementById("sosOverlay").classList.remove("active"); }
function confirmSOS() {
  saveAlert("SOS", "🆘 Jesse has sent an SOS and needs urgent help right now.", "");
  document.getElementById("sosConfirmScreen").style.display = "none";
  document.getElementById("sosSentScreen").style.display = "block";
}

function openOverlay(id) { document.getElementById(id).classList.add("active"); }
function closeOverlay(id) { document.getElementById(id).classList.remove("active"); }

// ─── DAILY LIVING ────────────────────────────────────────

function renderDailyLiving() {
  const completed = [];
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone:'Australia/Perth' }).replace(/-/g, '');
  if (appData?.dailyLiving?.length > 1) {
    appData.dailyLiving.forEach(row => {
      const isDone = row[4] === true || String(row[4]).toUpperCase() === 'TRUE';
      if (row[1] == 2 && String(row[2]) === todayStr && isDone)
        completed.push(row[3]);
    });
  }
  const streak = calculateStreak();
  if (streak > 1) {
    document.getElementById("streakBadge").innerHTML =
      `<div class="streak-badge">🔥 ${streak} day streak!</div>`;
  }
  let html = "";
  DAILY_LIVING.forEach((item, idx) => {
    const done = completed.includes(item.label);
    const c = COLORS[idx % COLORS.length];
    html += `
      <div class="dl-item ${done?'completed':''}" style="background:${c.bg};color:${c.color}">
        <input type="checkbox" ${done?'checked':''} onchange="toggleDailyLiving('${escStr(item.label)}',this.checked)">
        <span class="dl-item-label">${item.emoji} ${item.label}</span>
        <button class="dl-move-btn" onclick="moveDailyLiving(${idx},-1)" ${idx===0?'style="opacity:0;pointer-events:none"':''}>▲</button>
        <button class="dl-move-btn" onclick="moveDailyLiving(${idx},1)" ${idx===DAILY_LIVING.length-1?'style="opacity:0;pointer-events:none"':''}>▼</button>
        <button class="dl-edit-btn" onclick="openEditDailyLiving(${idx},'${escStr(item.label)}')">✏️</button>
        <button class="dl-edit-btn" onclick="openDeleteDailyLiving(${idx},'${escStr(item.label)}')">🗑️</button>
      </div>`;
  });
  html += `
    <div class="dl-add-row">
      <input class="dl-add-input" type="text" id="dlAddInput" placeholder="Add a new daily living item...">
      <button class="dl-add-btn" id="dlAddBtn">+ Add</button>
    </div>`;
  document.getElementById("dailyLiving").innerHTML = html;
  document.getElementById("dlAddBtn").addEventListener("click", addDailyLivingItem);
}

function calculateStreak() {
  if (!appData?.dailyLiving?.length > 1) return 0;
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 30; i++) {
    const ds = d.toDateString();
    const entries = appData.dailyLiving.filter(r => r[1]==2 && new Date(r[2]).toDateString()===ds && r[4]===true);
    if (entries.length >= 5) { streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}

function toggleDailyLiving(activity, completed) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone:'Australia/Perth' }).replace(/-/g, '');
  if (appData?.dailyLiving) {
    const existing = appData.dailyLiving.find(r => r[1] == 2 && String(r[2]) === todayStr && r[3] === activity);
    if (existing) {
      existing[4] = completed;
    } else {
      appData.dailyLiving.push([appData.dailyLiving.length, 2, todayStr, activity, completed, '']);
    }
  }
  renderDailyLiving();
  post({ action:"saveDailyLiving", userId:2, activity, completed });
}

// ─── DAILY LIVING EDIT/DELETE/ADD/MOVE ───────────────────

function openEditDailyLiving(idx, currentLabel) {
  editTarget = { type: 'dailyLiving', idx, currentLabel };
  document.getElementById("editOverlayTitle").innerText = "Edit Daily Living Item";
  document.getElementById("editInput").value = currentLabel;
  document.getElementById("editOverlay").classList.add("active");
}

function openDeleteDailyLiving(idx, label) {
  deleteTarget = { type: 'dailyLiving', idx, label };
  document.getElementById("confirmDeleteMsg").innerHTML = `Remove "<strong>${label}</strong>" from your daily living list?`;
  document.getElementById("confirmDeleteOverlay").classList.add("active");
}

function addDailyLivingItem() {
  const input = document.getElementById("dlAddInput");
  const label = input?.value?.trim();
  if (!label) return;
  input.value = "";
  DAILY_LIVING.push({ emoji:"✅", label });
  renderDailyLiving();
  post({ action:"saveDailyLivingItems", items: DAILY_LIVING });
}

function moveDailyLiving(idx, direction) {
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= DAILY_LIVING.length) return;
  const temp = DAILY_LIVING[idx];
  DAILY_LIVING[idx] = DAILY_LIVING[newIdx];
  DAILY_LIVING[newIdx] = temp;
  renderDailyLiving();
  post({ action:"saveDailyLivingItems", items: DAILY_LIVING });
}

// ─── DIFFICULT THING ─────────────────────────────────────

function saveDifficultThing() {
  const desc = document.getElementById("difficultInput").value.trim();
  if (!desc) return;
  document.getElementById("difficultInput").value = "";
  document.getElementById("difficultSaved").style.display = "block";
  setTimeout(() => document.getElementById("difficultSaved").style.display = "none", 3000);
  if (!appData.difficultThings) appData.difficultThings = [[]];
  appData.difficultThings.push(['', 2, new Date().toISOString(), desc, '']);
  renderDifficultThings();
  post({ action:"saveDifficultThing", userId:2, description:desc });
}

// ─── DAD CORNER ──────────────────────────────────────────

function loadDadCorner() {
  if (!appData?.dadCorner || appData.dadCorner.length <= 1) {
    document.getElementById("dadCornerContent").innerHTML =
      "<p style='color:#b8860b;font-size:13px'>Dad hasn't set a focus this week yet.</p>";
    return;
  }
  let latest = null;
  for (let i = appData.dadCorner.length - 1; i >= 1; i--) {
    if (appData.dadCorner[i][2] !== 'Completed') { latest = appData.dadCorner[i]; break; }
  }
  if (!latest) {
    document.getElementById("dadCornerContent").innerHTML =
      "<p style='color:#b8860b;font-size:13px'>Dad hasn't set a focus this week yet.</p>";
    return;
  }
  const focus = latest[3];
  const steps = JSON.parse(latest[4] || '[]');
  const completedSteps = JSON.parse(latest[5] || '[]');
  let html = `<div class="dad-corner-focus">🎯 ${focus}</div>`;
  steps.forEach(step => {
    const done = completedSteps.includes(step);
    html += `
      <div class="dad-corner-step ${done?'done':''}">
        <div class="step-dot ${done?'done':''}"></div>${step}
      </div>`;
  });
  if (steps.length > 0) {
    html += `<div class="dad-progress">${completedSteps.length} of ${steps.length} steps done</div>`;
  }
  document.getElementById("dadCornerContent").innerHTML = html;
}

// ─── TODAY'S TASKS ───────────────────────────────────────

function renderTodayTasks() {
  const tasks = appData?.tasks || [];
  const activeTasks = [];
  for (let i = 1; i < tasks.length; i++) {
    const row = tasks[i];
    if (row[1] == 2 && row[6] !== "Completed" && row[6] !== "Deleted") {
      activeTasks.push(row);
    }
  }
  activeTasks.sort((a, b) => {
    const ai = taskOrder.indexOf(String(a[0]));
    const bi = taskOrder.indexOf(String(b[0]));
    return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
  });

  let html = "";
  activeTasks.forEach((row, idx) => {
    const c = COLORS[idx % COLORS.length];
    const isGoalTask = row[2] !== "" && row[2] !== null && row[2] !== undefined;
    html += `
      <div class="task-item" style="background:${c.bg};color:${c.color}">
        <input type="checkbox" onchange="completeTask('${row[0]}','${escStr(row[4])}')">
        <span class="task-label">${row[4]}</span>
        ${isGoalTask ? `<span class="task-tag">Goal</span>` : ''}
        <button class="move-btn" onclick="moveTask('${row[0]}',-1)" ${idx===0?'style="opacity:0;pointer-events:none"':''}>▲</button>
        <button class="move-btn" onclick="moveTask('${row[0]}',1)" ${idx===activeTasks.length-1?'style="opacity:0;pointer-events:none"':''}>▼</button>
        <button class="icon-btn" onclick="openEdit('task','${row[0]}','${escStr(row[4])}')">✏️</button>
        <button class="icon-btn" onclick="openDeleteTask('${row[0]}','${escStr(row[4])}')">🗑️</button>
      </div>`;
  });
  if (!html) html = `<div class="empty-msg">No tasks yet — add one below or from a goal ✨</div>`;
  document.getElementById("todayTasksList").innerHTML = html;
}

function moveTask(taskId, direction) {
  const idx = taskOrder.indexOf(String(taskId));
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= taskOrder.length) return;
  const temp = taskOrder[idx];
  taskOrder[idx] = taskOrder[newIdx];
  taskOrder[newIdx] = temp;
  renderTodayTasks();
  post({ action:"saveTaskOrder", order: taskOrder });
}

function addManualTask() {
  const title = document.getElementById("manualTaskInput").value.trim();
  if (!title) return;
  document.getElementById("manualTaskInput").value = "";
  showSaved("taskSaved");
  const fakeId = 'tmp' + Date.now();
  if (!appData.tasks) appData.tasks = [[]];
  appData.tasks.push([fakeId, 2, '', '', title, '', 'Not Started', false, '', '', '', '']);
  taskOrder.push(fakeId);
  renderTodayTasks();
  post({ action:"saveTask", userId:2, goalId:"", milestoneId:"", title });
}

async function completeTask(taskId, taskTitle) {
  if (appData?.tasks) {
    appData.tasks.forEach(row => {
      if (String(row[0]) === String(taskId)) row[6] = 'Completed';
    });
  }
  taskOrder = taskOrder.filter(id => id !== String(taskId));
  renderTodayTasks();
  renderGoals();
  post({ action:"completeTask", taskId });
  await showCelebration("task", taskTitle);
}

// ─── GOALS ───────────────────────────────────────────────

function renderGoals() {
  const goals = appData?.goals || [];
  const tasks = appData?.tasks || [];
  const activeGoals = goals.filter((g, i) => i > 0 && g[2] && g[3] !== 'Completed' && g[3] !== 'Deleted');
  activeGoals.sort((a, b) => {
    const ai = goalOrder.indexOf(String(a[0]));
    const bi = goalOrder.indexOf(String(b[0]));
    return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
  });

  let html = "";
  activeGoals.forEach((goal, goalIdx) => {
    const goalId = String(goal[0]);
    const goalName = goal[2];
    const isOpen = expandedGoals[goalId] || false;
    const goalTasks = tasks.filter(t =>
      String(t[2]) === goalId && t[0] !== "TaskID" && t[6] !== "Deleted"
    );
    const completedTasks = goalTasks.filter(t => t[6] === "Completed");
    const pendingTasks = goalTasks.filter(t => t[6] !== "Completed");
    const doneCount = completedTasks.length;
    const taskCount = goalTasks.length;

    html += `
      <div class="goal-card">
        <div class="goal-header" onclick="toggleGoal('${goalId}')">
          <div class="goal-name">🎯 ${goalName}</div>
          ${taskCount > 0 ? `<span style="font-size:11px;color:#7c6fcd;font-weight:700">${doneCount}/${taskCount}</span>` : ''}
          <button class="move-btn" onclick="event.stopPropagation();moveGoal('${goalId}',-1)" ${goalIdx===0?'style="opacity:0;pointer-events:none"':''}>▲</button>
          <button class="move-btn" onclick="event.stopPropagation();moveGoal('${goalId}',1)" ${goalIdx===activeGoals.length-1?'style="opacity:0;pointer-events:none"':''}>▼</button>
          <button class="icon-btn" style="opacity:0.6" onclick="event.stopPropagation();openEdit('goal','${goalId}','${escStr(goalName)}')">✏️</button>
          <button class="icon-btn" style="opacity:0.6" onclick="event.stopPropagation();openDeleteGoal('${goalId}','${escStr(goalName)}')">🗑️</button>
          <div class="goal-chevron ${isOpen?'open':''}" id="chevron_${goalId}">▼</div>
        </div>
        <div class="goal-body ${isOpen?'open':''}" id="goalBody_${goalId}">`;

    completedTasks.forEach(t => {
      html += `
        <div class="goal-task-row completed-task">
          <input type="checkbox" checked disabled>
          <span class="gt-label">${t[4]}</span>
        </div>`;
    });

    pendingTasks.forEach((t, tIdx) => {
      const isFirst = tIdx === 0;
      const isLast = tIdx === pendingTasks.length - 1;
      const tId = String(t[0]);
      html += `
        <div class="goal-task-row${isFirst ? '' : ' queued'}">
          ${isFirst
            ? `<input type="checkbox" onchange="completeTask('${tId}','${escStr(t[4])}')">`
            : `<span style="width:20px;text-align:center;color:#ccc;flex-shrink:0">○</span>`
          }
          <span class="gt-label">${t[4]}</span>
          <button class="move-btn" onclick="moveGoalStep('${goalId}',${tIdx},-1)" ${isFirst?'style="opacity:0;pointer-events:none"':''}>▲</button>
          <button class="move-btn" onclick="moveGoalStep('${goalId}',${tIdx},1)" ${isLast?'style="opacity:0;pointer-events:none"':''}>▼</button>
          <button class="icon-btn" onclick="openEdit('task','${tId}','${escStr(t[4])}')">✏️</button>
          <button class="icon-btn" onclick="openDeleteTask('${tId}','${escStr(t[4])}')">🗑️</button>
        </div>`;
    });

    html += `
        <div class="inline-row" style="margin-top:10px">
          <input class="inline-input" style="font-size:13px;padding:10px 12px" type="text"
            id="goalTask_${goalId}" placeholder="Add a step to this goal...">
          <button class="inline-btn" style="font-size:11px;padding:10px 10px"
            onclick="addGoalTask('${goalId}',false)">+ Goal</button>
          <button class="inline-btn" style="font-size:11px;padding:10px 10px;background:linear-gradient(90deg,#5cb85c,#3d9a3d)"
            onclick="addGoalTask('${goalId}',true)">+ Today</button>
        </div>
        <button class="ai-btn" onclick="getAISuggestions('${goalId}','${escStr(goalName)}')">✨ Get AI suggestions</button>
        <div class="ai-loading" id="aiLoading_${goalId}">Getting suggestions...</div>
        <div class="ai-suggestions-box" id="aiBox_${goalId}"></div>
        <div class="goal-actions">
          <button class="complete-goal-btn" onclick="completeGoal('${goalId}','${escStr(goalName)}')">✅ Mark goal as complete</button>
          <button class="delete-goal-btn" onclick="openDeleteGoal('${goalId}','${escStr(goalName)}')">🗑️ Delete</button>
        </div>
      </div>
      </div>`;
  });

  if (!activeGoals.length) html = `<div class="empty-msg">No active goals — add one below ✨</div>`;
  document.getElementById("goalsList").innerHTML = html;
}

function moveGoalStep(goalId, stepIdx, direction) {
  const tasks = appData?.tasks || [];
  const pendingTasks = tasks.filter(t =>
    String(t[2]) === String(goalId) && t[0] !== "TaskID" && t[6] !== "Deleted" && t[6] !== "Completed"
  );
  const newIdx = stepIdx + direction;
  if (newIdx < 0 || newIdx >= pendingTasks.length) return;
  const reordered = [...pendingTasks];
  const temp = reordered[stepIdx];
  reordered[stepIdx] = reordered[newIdx];
  reordered[newIdx] = temp;
  const allTasks = appData.tasks;
  reordered.forEach((t, i) => {
    const row = allTasks.find(r => String(r[0]) === String(t[0]));
    if (row) row[12] = i;
  });
  renderGoals();
  post({ action:"saveGoalStepOrder", goalId, order: reordered.map(t => String(t[0])) });
}

function moveGoal(goalId, direction) {
  const idx = goalOrder.indexOf(String(goalId));
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= goalOrder.length) return;
  const temp = goalOrder[idx];
  goalOrder[idx] = goalOrder[newIdx];
  goalOrder[newIdx] = temp;
  renderGoals();
  post({ action:"saveGoalOrder", order: goalOrder });
}

function toggleGoal(goalId) {
  expandedGoals[goalId] = !expandedGoals[goalId];
  const body = document.getElementById(`goalBody_${goalId}`);
  const chevron = document.getElementById(`chevron_${goalId}`);
  if (body) body.classList.toggle("open", expandedGoals[goalId]);
  if (chevron) chevron.classList.toggle("open", expandedGoals[goalId]);
}

function addGoal() {
  const goal = document.getElementById("newGoalInput").value.trim();
  if (!goal) return;
  document.getElementById("newGoalInput").value = "";
  showSaved("goalSaved");
  const fakeId = 'tmp' + Date.now();
  if (!appData.goals) appData.goals = [[]];
  appData.goals.push([fakeId, 2, goal, 'Active', '']);
  goalOrder.push(fakeId);
  renderGoals();
  post({ action:"saveGoal", userId:2, goal });
}

function addGoalTask(goalId, addToToday) {
  const input = document.getElementById(`goalTask_${goalId}`);
  const title = input?.value?.trim();
  if (!title) return;
  if (input) input.value = "";
  const fakeId = 'tmp' + Date.now();
  if (!appData.tasks) appData.tasks = [[]];
  appData.tasks.push([fakeId, 2, goalId, '', title, '', 'Not Started', false, '', '', '', '']);
  if (addToToday) taskOrder.push(fakeId);
  expandedGoals[goalId] = true;
  renderGoals();
  if (addToToday) renderTodayTasks();
  post({ action:"saveTask", userId:2, goalId, milestoneId:"", title });
}

function addAISuggestionTask(goalId, title, addToToday) {
  const fakeId = 'tmp' + Date.now();
  if (!appData.tasks) appData.tasks = [[]];
  appData.tasks.push([fakeId, 2, goalId, '', title, '', 'Not Started', false, '', '', '', '']);
  if (addToToday) taskOrder.push(fakeId);
  expandedGoals[goalId] = true;
  renderGoals();
  if (addToToday) renderTodayTasks();
  post({ action:"saveTask", userId:2, goalId, milestoneId:"", title });
}

async function completeGoal(goalId, goalName) {
  if (appData?.goals) {
    const g = appData.goals.find(r => String(r[0]) === String(goalId));
    if (g) g[3] = 'Completed';
  }
  goalOrder = goalOrder.filter(id => id !== String(goalId));
  renderGoals();
  renderCompletedGoals();
  post({ action:"completeGoal", goalId });
  await showCelebration("goal", goalName);
}

// ─── AI ──────────────────────────────────────────────────

async function getAISuggestions(goalId, goalName) {
  const loadingEl = document.getElementById(`aiLoading_${goalId}`);
  const boxEl = document.getElementById(`aiBox_${goalId}`);
  if (!loadingEl || !boxEl) return;
  loadingEl.style.display = "block";
  boxEl.style.display = "none";
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "aiSuggest", goal: goalName })
    });
    const data = await res.json();
    loadingEl.style.display = "none";
    if (!data.success || !data.steps) {
      boxEl.style.display = "block";
      boxEl.innerHTML = `<div style="color:#e05c5c;font-size:13px">Couldn't load suggestions. Please try again.</div>`;
      return;
    }
    boxEl.style.display = "block";
    let html = `<div style="font-size:12px;font-weight:800;color:#7c6fcd;margin-bottom:10px">✨ Tap to add a step:</div>`;
    data.steps.forEach((step, idx) => {
      html += `
        <div class="ai-suggestion-item">
          <div class="ai-suggestion-text">${idx+1}. ${step}</div>
          <div class="ai-add-btns">
            <button class="ai-add-btn ai-add-goal" onclick="addAISuggestionTask('${goalId}','${escStr(step)}',false)">+ Add to goal</button>
            <button class="ai-add-btn ai-add-today" onclick="addAISuggestionTask('${goalId}','${escStr(step)}',true)">+ Goal & today</button>
          </div>
        </div>`;
    });
    boxEl.innerHTML = html;
  } catch(err) {
    if (loadingEl) loadingEl.style.display = "none";
    if (boxEl) { boxEl.style.display = "block"; boxEl.innerHTML = `<div style="color:#e05c5c;font-size:13px">Couldn't load suggestions. Please try again.</div>`; }
  }
}

async function showCelebration(type, context) {
  document.getElementById("celebrationIcon").innerText = type === "goal" ? "🏆" : "🎉";
  document.getElementById("celebrationTitle").innerText = type === "goal" ? "Goal Complete!" : "Task Done!";
  document.getElementById("celebrationMsg").innerText = "Getting your message...";
  document.getElementById("celebrationOverlay").classList.add("active");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "aiCelebrate", type, context })
    });
    const data = await res.json();
    document.getElementById("celebrationMsg").innerText = data.success
      ? data.message
      : "Jesse, you did it. Every step you take is proof of your strength. 💜";
  } catch(e) {
    document.getElementById("celebrationMsg").innerText = "Jesse, you did it. Every step you take is proof of your strength. 💜";
  }
}

function closeCelebration() { document.getElementById("celebrationOverlay").classList.remove("active"); }

// ─── ARCHIVES ────────────────────────────────────────────

function renderCompletedGoals() {
  const goals = appData?.goals || [];
  const completed = goals.filter((g, i) => i > 0 && g[3] === "Completed");
  const section = document.getElementById("completedGoalsSection");
  const body = document.getElementById("completedGoalsBody");
  if (completed.length === 0) { section.style.display = "none"; return; }
  section.style.display = "block";
  let html = "";
  completed.forEach(g => {
    html += `<div class="archive-item-green">🏆 ${g[2]}<span class="archive-date">${formatDate(g[4])}</span></div>`;
  });
  body.innerHTML = html;
}

function renderDifficultThings() {
  const dt = appData?.difficultThings || [];
  const section = document.getElementById("difficultThingsSection");
  const body = document.getElementById("difficultThingsBody");
  if (dt.length <= 1) { section.style.display = "none"; return; }
  section.style.display = "block";
  let html = "";
  for (let i = dt.length - 1; i >= 1; i--) {
    if (dt[i][1] == 2) {
      html += `<div class="archive-item-purple">💪 ${dt[i][3]}<span class="archive-date">${formatDate(dt[i][2])}</span></div>`;
    }
  }
  if (!html) { section.style.display = "none"; return; }
  body.innerHTML = html;
}

function toggleArchive(bodyId, chevronId) {
  const body = document.getElementById(bodyId);
  const chevron = document.getElementById(chevronId);
  const isOpen = body.classList.contains("open");
  body.classList.toggle("open", !isOpen);
  if (chevron) chevron.style.transform = isOpen ? "" : "rotate(180deg)";
}

// ─── EDIT & DELETE ───────────────────────────────────────

function openEdit(type, id, currentValue) {
  editTarget = { type, id };
  document.getElementById("editOverlayTitle").innerText = type === "goal" ? "Edit Goal" : "Edit Task";
  document.getElementById("editInput").value = currentValue;
  document.getElementById("editOverlay").classList.add("active");
}

function saveEdit() {
  if (!editTarget) return;
  const newValue = document.getElementById("editInput").value.trim();
  if (!newValue) return;
  if (editTarget.type === 'dailyLiving') {
    const idx = DAILY_LIVING.findIndex(item => item.label === editTarget.currentLabel);
    if (idx > -1) DAILY_LIVING[idx].label = newValue;
    closeOverlay("editOverlay");
    editTarget = null;
    renderDailyLiving();
    post({ action:"saveDailyLivingItems", items: DAILY_LIVING });
    return;
  }
  if (editTarget.type === 'goal') {
    if (appData?.goals) {
      const g = appData.goals.find(r => String(r[0]) === String(editTarget.id));
      if (g) g[2] = newValue;
    }
  } else {
    if (appData?.tasks) {
      const t = appData.tasks.find(r => String(r[0]) === String(editTarget.id));
      if (t) t[4] = newValue;
    }
  }
  const action = editTarget.type === "goal" ? "editGoal" : "editTask";
  const id = editTarget.id;
  closeOverlay("editOverlay");
  editTarget = null;
  renderTodayTasks();
  renderGoals();
  post({ action, id, newValue });
}

function openDeleteTask(taskId, taskTitle) {
  deleteTarget = { type:"task", id:taskId };
  document.getElementById("confirmDeleteMsg").innerHTML = `Delete task "<strong>${taskTitle}</strong>"?`;
  document.getElementById("confirmDeleteOverlay").classList.add("active");
}

function openDeleteGoal(goalId, goalName) {
  deleteTarget = { type:"goal", id:goalId };
  document.getElementById("confirmDeleteMsg").innerHTML = `Delete goal "<strong>${goalName}</strong>" and all its tasks?`;
  document.getElementById("confirmDeleteOverlay").classList.add("active");
}

function confirmDelete() {
  if (!deleteTarget) return;
  if (deleteTarget.type === 'dailyLiving') {
    DAILY_LIVING.splice(deleteTarget.idx, 1);
    closeOverlay("confirmDeleteOverlay");
    deleteTarget = null;
    renderDailyLiving();
    post({ action:"saveDailyLivingItems", items: DAILY_LIVING });
    return;
  }
  if (deleteTarget.type === "task") {
    if (appData?.tasks) {
      const idx = appData.tasks.findIndex(r => String(r[0]) === String(deleteTarget.id));
      if (idx > -1) appData.tasks.splice(idx, 1);
    }
    taskOrder = taskOrder.filter(id => id !== String(deleteTarget.id));
    const id = deleteTarget.id;
    closeOverlay("confirmDeleteOverlay");
    deleteTarget = null;
    renderTodayTasks();
    renderGoals();
    post({ action:"deleteTask", taskId: id });
  } else {
    if (appData?.goals) {
      const g = appData.goals.find(r => String(r[0]) === String(deleteTarget.id));
      if (g) g[3] = 'Deleted';
    }
    if (appData?.tasks) {
      appData.tasks.forEach(t => {
        if (String(t[2]) === String(deleteTarget.id)) t[6] = 'Deleted';
      });
    }
    goalOrder = goalOrder.filter(id => id !== String(deleteTarget.id));
    const id = deleteTarget.id;
    closeOverlay("confirmDeleteOverlay");
    deleteTarget = null;
    renderGoals();
    post({ action:"deleteGoal", goalId: id });
  }
}

// ─── HELPERS ─────────────────────────────────────────────

function post(body) {
  fetch(API_URL, {
    method:"POST",
    headers:{"Content-Type":"text/plain"},
    body: JSON.stringify(body)
  }).catch(() => {});
}

function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 2500);
}

function escStr(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,"&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(isoMatch[3])} ${months[parseInt(isoMatch[2])-1]} ${isoMatch[1]}`;
  }
  const compact = s.replace(/^'/, '');
  if (/^\d{8}$/.test(compact)) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(compact.slice(6,8))} ${months[parseInt(compact.slice(4,6))-1]} ${compact.slice(0,4)}`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
    }
  } catch(e) {}
  return s;
}
