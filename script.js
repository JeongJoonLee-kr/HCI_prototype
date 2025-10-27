const SCREENS = {
  wave: document.querySelector('[data-screen="wave"]'),
  timer: document.querySelector('[data-screen="timer"]'),
  summary: document.querySelector('[data-screen="summary"]'),
};

const timerValueEl = document.getElementById('timer-value');
const summaryTimestampEl = document.getElementById('summary-timestamp');
const summaryWaterSavedEl = document.getElementById('summary-water-saved');
const summaryDurationEl = document.getElementById('summary-duration');
const summaryDelayEl = document.getElementById('summary-delay');
const summaryCountdownEl = document.getElementById('summary-countdown');
const summarySlides = Array.from(document.querySelectorAll('.summary__slide'));
const usageBars = document.querySelectorAll('.usage-bar');
const summaryDelayDetailEl = document.getElementById('summary-delay-detail');
const versionToggleButton = document.getElementById('version-toggle');
const timerAnimationEl = document.getElementById('timer-animation');
const timerAnimationImage = document.getElementById('timer-animation-image');
const timerAnimationCaption = document.getElementById('timer-animation-caption');
const bodyEl = document.body;

const SESSION_DURATION = 30; // seconds
const SUMMARY_INTERVAL = 5000;
const SUMMARY_RESET_TIMEOUT = 20000;

const TIMER_ANIMATION_STAGES = [
  {
    maxElapsed: 10,
    src: 'assets/running_cat_slow.gif',
    caption: 'Easy pace',
    alt: 'Animated cat jogging in place slowly',
  },
  {
    maxElapsed: 20,
    src: 'assets/running_cat_normal.gif',
    caption: 'Keep it steady',
    alt: 'Animated cat running at a steady pace',
  },
  {
    maxElapsed: Infinity,
    src: 'assets/running_cat_fast.gif',
    caption: 'Final sprint',
    alt: 'Animated cat sprinting quickly',
  },
];

let state = 'wave';
let timerStart = null;
let timerInterval = null;
let summaryInterval = null;
let summaryTimeout = null;
let activeSlideIndex = 0;
let summaryCountdown = SUMMARY_INTERVAL / 1000;
let prototypeVersion = 'A';
let currentAnimationStage = null;

const recommendedDuration = SESSION_DURATION;
let lastSessionStats = {
  duration: recommendedDuration,
  delay: 1.2,
  waterSaved: 0,
};

function showScreen(key) {
  Object.entries(SCREENS).forEach(([name, element]) => {
    if (name === key) {
      element.removeAttribute('hidden');
    } else {
      element.setAttribute('hidden', '');
    }
  });
  state = key;
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function updateTimerDisplay(secondsRemaining) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = Math.max(0, Math.ceil(secondsRemaining % 60));
  timerValueEl.textContent = `${pad(minutes)}:${pad(seconds)}`;
}

function interpolateColor(start, end, t) {
  const r = Math.round(start[0] + (end[0] - start[0]) * t);
  const g = Math.round(start[1] + (end[1] - start[1]) * t);
  const b = Math.round(start[2] + (end[2] - start[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function lighten(color, amount) {
  const [r, g, b] = color
    .replace(/[rgb()]/g, '')
    .split(',')
    .map((v) => Number(v.trim()));
  const lightenChannel = (channel) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${lightenChannel(r)}, ${lightenChannel(g)}, ${lightenChannel(b)})`;
}

function darken(color, amount) {
  const [r, g, b] = color
    .replace(/[rgb()]/g, '')
    .split(',')
    .map((v) => Number(v.trim()));
  const darkenChannel = (channel) => Math.round(channel * (1 - amount));
  return `rgb(${darkenChannel(r)}, ${darkenChannel(g)}, ${darkenChannel(b)})`;
}

function updateTimerBackground(progress) {
  const startColor = [92, 255, 163];
  const endColor = [255, 64, 64];
  const color = interpolateColor(startColor, endColor, progress);
  const lighter = lighten(color, 0.15);
  const darker = darken(color, 0.15);
  SCREENS.timer.style.background = `radial-gradient(circle at 20% 20%, ${lighter}, transparent 55%),
    radial-gradient(circle at 80% 80%, ${darker}, transparent 60%),
    ${color}`;
}

function clearTimerBackground() {
  if (SCREENS.timer) {
    SCREENS.timer.style.background = '';
  }
}

function syncTimerAnimationVisibility() {
  if (!timerAnimationEl) {
    return;
  }
  if (prototypeVersion === 'B') {
    timerAnimationEl.removeAttribute('hidden');
  } else {
    timerAnimationEl.setAttribute('hidden', '');
  }
}

function setTimerAnimationStage(stageIndex) {
  if (!timerAnimationEl || !timerAnimationImage || !timerAnimationCaption) {
    return;
  }
  const boundedIndex = Math.min(stageIndex, TIMER_ANIMATION_STAGES.length - 1);
  const stage = TIMER_ANIMATION_STAGES[boundedIndex];
  timerAnimationImage.src = stage.src;
  timerAnimationImage.alt = stage.alt;
  timerAnimationCaption.textContent = stage.caption;
  currentAnimationStage = boundedIndex;
}

function resetTimerAnimation() {
  currentAnimationStage = null;
  if (prototypeVersion === 'B') {
    setTimerAnimationStage(0);
  }
}

function updateTimerAnimationStage(elapsed) {
  if (prototypeVersion !== 'B') {
    return;
  }
  const stageIndex = TIMER_ANIMATION_STAGES.findIndex((stage) => elapsed < stage.maxElapsed);
  const indexToUse = stageIndex === -1 ? TIMER_ANIMATION_STAGES.length - 1 : stageIndex;
  if (currentAnimationStage !== indexToUse) {
    setTimerAnimationStage(indexToUse);
  }
}

function updateTimerVisuals(elapsed) {
  const progress = Math.min(1, elapsed / SESSION_DURATION);
  if (prototypeVersion === 'A') {
    updateTimerBackground(progress);
  } else {
    clearTimerBackground();
  }
  updateTimerAnimationStage(elapsed);
}

function resetUsageBars() {
  usageBars.forEach((bar) => {
    const amount = Number(bar.dataset.amount);
    const normalized = Math.min(1, amount / 450);
    bar.style.setProperty('--usage', normalized.toString());
  });
}

function startTimer() {
  timerStart = performance.now();
  showScreen('timer');
  syncTimerAnimationVisibility();
  resetTimerAnimation();
  updateTimerDisplay(SESSION_DURATION);
  updateTimerVisuals(0);

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    const elapsed = (performance.now() - timerStart) / 1000;
    const remaining = SESSION_DURATION - elapsed;
    updateTimerDisplay(Math.max(remaining, 0));
    updateTimerVisuals(Math.max(elapsed, 0));

    if (remaining <= 0) {
      finishSession();
    }
  }, 100);
}

function computeWaterSaved(durationSeconds) {
  const baselineFlowLitersPerSec = 0.166; // approx 10L per minute
  const recommendedLiters = recommendedDuration * baselineFlowLitersPerSec;
  const actualLiters = durationSeconds * baselineFlowLitersPerSec;
  const saved = Math.max(0, recommendedLiters - actualLiters);
  return Math.max(0, saved);
}

function finishSession() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const elapsed = (performance.now() - timerStart) / 1000;
  timerStart = null;
  const duration = Math.max(0, elapsed);
  const waterSaved = computeWaterSaved(duration);
  const delaySeconds = Math.max(0, duration - recommendedDuration);

  lastSessionStats = {
    duration,
    waterSaved,
    delay: Number(delaySeconds.toFixed(1)),
  };

  startSummary();
}

function updateSummarySlideContent() {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  });
  summaryTimestampEl.textContent = `Recorded ${formatter.format(new Date())}`;
  summaryWaterSavedEl.textContent = `${lastSessionStats.waterSaved.toFixed(2)} L`;
  summaryDurationEl.textContent = `Session length: ${lastSessionStats.duration.toFixed(1)} s`;
  summaryDelayEl.textContent = `${Math.max(0, lastSessionStats.delay).toFixed(1)} s`;
  if (lastSessionStats.delay > 0.5) {
    summaryDelayDetailEl.textContent = 'Try turning off the tap a little sooner next time.';
  } else {
    summaryDelayDetailEl.textContent = 'Great reaction time!';
  }
}

function showSummarySlide(index) {
  summarySlides.forEach((slide, slideIndex) => {
    if (slideIndex === index) {
      slide.removeAttribute('hidden');
    } else {
      slide.setAttribute('hidden', '');
    }
  });
  activeSlideIndex = index;
  summaryCountdown = SUMMARY_INTERVAL / 1000;
  summaryCountdownEl.textContent = summaryCountdown;
}

function startSummaryRotation() {
  if (summaryInterval) {
    clearInterval(summaryInterval);
  }

  summaryInterval = setInterval(() => {
    summaryCountdown -= 1;
    if (summaryCountdown <= 0) {
      const nextIndex = (activeSlideIndex + 1) % summarySlides.length;
      showSummarySlide(nextIndex);
    } else {
      summaryCountdownEl.textContent = summaryCountdown;
    }
  }, 1000);
}

function scheduleSummaryReset() {
  if (summaryTimeout) {
    clearTimeout(summaryTimeout);
  }
  summaryTimeout = setTimeout(() => {
    returnToWave();
  }, SUMMARY_RESET_TIMEOUT);
}

function startSummary() {
  updateSummarySlideContent();
  showScreen('summary');
  showSummarySlide(0);
  startSummaryRotation();
  scheduleSummaryReset();
}

function cancelSummary() {
  if (summaryInterval) {
    clearInterval(summaryInterval);
    summaryInterval = null;
  }
  if (summaryTimeout) {
    clearTimeout(summaryTimeout);
    summaryTimeout = null;
  }
}

function returnToWave() {
  cancelSummary();
  showScreen('wave');
}

function toggleVersion() {
  prototypeVersion = prototypeVersion === 'A' ? 'B' : 'A';
  applyVersion();
}

function applyVersion() {
  const isVersionB = prototypeVersion === 'B';
  if (bodyEl) {
    bodyEl.classList.toggle('version-b', isVersionB);
    bodyEl.classList.toggle('version-a', !isVersionB);
  }
  if (versionToggleButton) {
    versionToggleButton.setAttribute('aria-pressed', String(isVersionB));
    versionToggleButton.textContent = isVersionB
      ? 'Switch to Version A'
      : 'Switch to Version B';
  }
  syncTimerAnimationVisibility();
  if (isVersionB) {
    clearTimerBackground();
    if (state === 'timer' && timerStart) {
      const elapsed = (performance.now() - timerStart) / 1000;
      updateTimerVisuals(Math.max(elapsed, 0));
    } else {
      setTimerAnimationStage(0);
    }
  } else {
    currentAnimationStage = null;
    if (state === 'timer' && timerStart) {
      const elapsed = (performance.now() - timerStart) / 1000;
      updateTimerVisuals(Math.max(elapsed, 0));
    } else {
      updateTimerBackground(0);
    }
  }
}

function handleWaveGesture() {
  if (state === 'wave') {
    startTimer();
  } else if (state === 'timer') {
    finishSession();
  } else if (state === 'summary') {
    returnToWave();
  }
}

function handleKeydown(event) {
  if (event.code === 'Space') {
    if (
      event.target &&
      event.target.closest &&
      event.target.closest('button, [role="button"], input, textarea, select, a[href]')
    ) {
      return;
    }
    event.preventDefault();
    handleWaveGesture();
  }
}

function init() {
  resetUsageBars();
  applyVersion();
  if (versionToggleButton) {
    versionToggleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleVersion();
    });
  }
  document.addEventListener('click', handleWaveGesture);
  document.addEventListener('keydown', handleKeydown);
  showScreen('wave');
}

init();
