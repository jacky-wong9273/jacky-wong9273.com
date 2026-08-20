import {
  CAT_BEHAVIOR_EVENT,
  CAT_LURE_EVENT,
  CAT_LURE_KEY,
  CAT_STORAGE_KEY,
  IDLE_BEHAVIORS,
  TOUCH_ROTATION,
  isHuntLure,
  type CatchPhase,
  type CatBehaviorId,
  type CatExprId,
  type CatLureId,
  type CatPoseId,
  isCatBehaviorId,
  isCatLureId,
} from '../lib/cat-behaviors';

const IDLE_MS = 2200;
const TOY_PLAY_MS = 5200;
const IDLE_HOLD_MIN = 6400;
const IDLE_HOLD_MAX = 11000;
const TOUCH_HOLD_MIN = 6200;
const TOUCH_HOLD_MAX = 9000;
const MOVE_EPSILON = 0.9;
const HUNT_CATCH_RANGE = 82;
const PLAY_BAT_RANGE = 92;
const INTEREST_RANGE = 188;
const HUNT_POUNCE_MS = 260;
const HUNT_LEAP_MS = 420;
const HUNT_HOLD_MS = 1500;
const HUNT_SHAKE_MS = 1600;
const PLAY_COOLDOWN = 320;
const HUNT_COOLDOWN = 2800;
const FLEE_HUNT_MS = 2000;
const FLEE_PLAY_MS = 1400;
const CAT_W = 260;
const CAT_H = 180;
const BIRD_FLAP = [0, 1, 0, 2] as const;

type Point = { x: number; y: number };
type LiveBehavior = Exclude<CatBehaviorId, 'auto'>;

const ANCHORS: Record<CatPoseId, { head: Point; mouth: Point; paw: Point }> = {
  side: { head: { x: 199, y: 58 }, mouth: { x: 224, y: 86 }, paw: { x: 214, y: 150 } },
  sit: { head: { x: 126, y: 50 }, mouth: { x: 130, y: 86 }, paw: { x: 168, y: 150 } },
  sleep: { head: { x: 109, y: 92 }, mouth: { x: 125, y: 113 }, paw: { x: 150, y: 140 } },
  stretch: { head: { x: 73, y: 131 }, mouth: { x: 47, y: 150 }, paw: { x: 40, y: 155 } },
  pounce: { head: { x: 203, y: 92 }, mouth: { x: 234, y: 111 }, paw: { x: 220, y: 148 } },
  walk: { head: { x: 203, y: 62 }, mouth: { x: 229, y: 90 }, paw: { x: 220, y: 155 } },
  leap: { head: { x: 187, y: 99 }, mouth: { x: 224, y: 107 }, paw: { x: 232, y: 128 } },
  hold: { head: { x: 161, y: 101 }, mouth: { x: 135, y: 132 }, paw: { x: 128, y: 148 } },
  bat: { head: { x: 135, y: 50 }, mouth: { x: 141, y: 76 }, paw: { x: 181, y: 32 } },
  kick: { head: { x: 143, y: 86 }, mouth: { x: 135, y: 108 }, paw: { x: 168, y: 140 } },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[], except?: T) => {
  const pool = except === undefined ? items : items.filter((item) => item !== except);
  return pool[Math.floor(Math.random() * pool.length)] ?? items[0];
};

const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMouseLike = (event: PointerEvent) =>
  event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === '';

const readStoredMode = (): CatBehaviorId => {
  try {
    const stored = localStorage.getItem(CAT_STORAGE_KEY);
    if (isCatBehaviorId(stored)) return stored;
  } catch {
    /* ignore private-mode storage */
  }
  return 'auto';
};

const readStoredLure = (): CatLureId => {
  try {
    const stored = localStorage.getItem(CAT_LURE_KEY);
    if (isCatLureId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'toy';
};

const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const wanderPoint = (): Point => {
  const padX = Math.min(160, window.innerWidth * 0.16);
  const padY = Math.min(140, window.innerHeight * 0.18);
  return {
    x: rand(padX, Math.max(padX + 8, window.innerWidth - padX)),
    y: rand(padY, Math.max(padY + 8, window.innerHeight - padY)),
  };
};

const restPoint = (): Point => ({
  x: window.innerWidth - 220,
  y: window.innerHeight - 210,
});

const worldFromLocal = (cat: Point, local: Point, facing: number) => {
  const originX = CAT_W * 0.5;
  const originY = CAT_H * 0.7;
  return {
    x: cat.x + originX + (local.x - originX) * facing,
    y: cat.y + originY + (local.y - originY),
  };
};

const catFromLocal = (world: Point, local: Point, facing: number): Point => {
  const originX = CAT_W * 0.5;
  const originY = CAT_H * 0.7;
  return {
    x: world.x - originX - (local.x - originX) * facing,
    y: world.y - originY - (local.y - originY),
  };
};

const steer = (pos: Point, vel: Point, target: Point, maxSpeed: number, accel: number, dt: number) => {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2.5) {
    vel.x *= Math.pow(0.12, dt * 10);
    vel.y *= Math.pow(0.12, dt * 10);
    return dist;
  }
  const arrive = clamp(dist / 90, 0.22, 1);
  const desiredX = (dx / dist) * maxSpeed * arrive;
  const desiredY = (dy / dist) * maxSpeed * arrive;
  vel.x += clamp(desiredX - vel.x, -accel * dt, accel * dt);
  vel.y += clamp(desiredY - vel.y, -accel * dt, accel * dt);
  const speed = Math.hypot(vel.x, vel.y);
  if (speed > maxSpeed) {
    vel.x *= maxSpeed / speed;
    vel.y *= maxSpeed / speed;
  }
  return dist;
};

declare global {
  interface Window {
    __wichienMaatStop?: () => void;
  }
}

export function initWichienMaat() {
  window.__wichienMaatStop?.();
  let stopped = false;
  let raf = 0;
  window.__wichienMaatStop = () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    document.documentElement.classList.remove('is-cat-jamming');
  };

  const root = document.getElementById('cursor-cat');
  const wrap = root?.querySelector<HTMLElement>('.cursor-cat-wrap');
  const lureEl = document.getElementById('cat-lure');
  const trail = document.getElementById('cursor-cat-trail');
  if (!root || !wrap || !lureEl || !trail) return;

  if (prefersReducedMotion()) {
    root.classList.add('is-on', 'is-loaf', 'is-reduced');
    root.dataset.pose = 'sit';
    root.dataset.poseGroup = 'sit';
    root.dataset.expr = 'sleepy';
    wrap.style.transform = `translate3d(${window.innerWidth - 200}px, ${window.innerHeight - 196}px, 0)`;
    lureEl.hidden = true;
    return;
  }

  const sparkPool: HTMLSpanElement[] = [];
  for (let i = 0; i < 16; i++) {
    const spark = document.createElement('span');
    spark.className = 'cat-spark';
    spark.style.display = 'none';
    trail.appendChild(spark);
    sparkPool.push(spark);
  }
  let sparkIndex = 0;
  let sparkBudget = 0;

  const spawnSpark = (sx: number, sy: number, kind: 'toy' | 'food' | 'dust') => {
    const spark = sparkPool[sparkIndex % sparkPool.length];
    sparkIndex += 1;
    const hues =
      kind === 'food' ? ['is-cream', 'is-seal', ''] : kind === 'dust' ? ['is-seal', 'is-cream'] : ['', 'is-cream', 'is-seal'];
    spark.className = `cat-spark ${hues[sparkIndex % hues.length]}`;
    spark.style.display = 'block';
    spark.style.left = `${sx}px`;
    spark.style.top = `${sy}px`;
    spark.style.animation = 'none';
    void spark.offsetWidth;
    spark.style.animation = '';
  };

  let mode: CatBehaviorId = readStoredMode();
  let lure: CatLureId = readStoredLure();
  let behavior: LiveBehavior = mode === 'auto' ? 'loaf' : mode;
  let behaviorUntil = performance.now() + rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX);

  let pointer: Point = { x: window.innerWidth * 0.68, y: window.innerHeight * 0.3 };
  let lurePos: Point = { ...pointer };
  let lureJolt: Point = { x: 0, y: 0 };
  let cat: Point = { x: pointer.x - 140, y: pointer.y + 24 };
  let catTarget: Point = { ...cat };
  let vel: Point = { x: 0, y: 0 };
  let wander: Point = wanderPoint();
  let lastPointerMove = performance.now();
  let pointerMoving = false;
  let lastToyBat = 0;
  let facing = 1;
  let turnAfter = 0;
  let virtualPhase = Math.random() * Math.PI * 2;
  let lastFrame = performance.now();
  let stride = 0;
  let walkFrame = 0;
  let flapFrame = 0;
  let pose: CatPoseId = 'sit';
  let expr: CatExprId = 'neutral';
  let phase: CatchPhase = 'none';
  let phaseUntil = 0;
  let actionCooldownUntil = 0;
  let playCombo = 0;
  let fleeTarget: Point = restPoint();
  let yawnUntil = 0;
  let nextYawn = performance.now() + rand(8000, 16000);
  let usingMouse = hasFinePointer();

  const hunting = () => isHuntLure(lure);
  const mood = () => (hunting() ? 'hunt' : 'play');
  const catching = () => phase !== 'none' && phase !== 'flee';
  const pinning = () => phase === 'hold' || phase === 'shake' || phase === 'kick';

  const applyBehaviorClass = (next: LiveBehavior) => {
    root.classList.remove('is-sleep', 'is-play', 'is-chase', 'is-toy', 'is-groom', 'is-stretch', 'is-loaf', 'is-excited');
    root.classList.add(`is-${next}`);
    document.documentElement.dataset.catLive = next;
    document.documentElement.dataset.catLure = lure;
    window.dispatchEvent(new CustomEvent('wichien:live', { detail: { behavior: next, mode, lure } }));
  };

  const setJamLock = (on: boolean) => {
    document.documentElement.classList.toggle('is-cat-jamming', on);
  };

  const resetCatch = () => {
    phase = 'none';
    phaseUntil = 0;
    playCombo = 0;
    setJamLock(false);
  };

  const setBehavior = (next: LiveBehavior, hold = rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX)) => {
    behavior = next;
    behaviorUntil = performance.now() + hold;
    applyBehaviorClass(next);
    if (next === 'play' || next === 'groom' || next === 'stretch') wander = wanderPoint();
    if (next === 'sleep' || next === 'loaf') wander = restPoint();
    if (next !== 'play' && next !== 'chase' && next !== 'toy') resetCatch();
  };

  const setMode = (next: CatBehaviorId, persist = true) => {
    mode = next;
    document.documentElement.dataset.catBehavior = next;
    if (persist) writeStored(CAT_STORAGE_KEY, next);
    if (next === 'auto') {
      setBehavior(pointerIsFine() ? pick(IDLE_BEHAVIORS) : pick(TOUCH_ROTATION), rand(3200, 5200));
    } else {
      setBehavior(next, 1e9);
    }
  };

  const setLure = (next: CatLureId, persist = true) => {
    lure = next;
    document.documentElement.dataset.catLure = next;
    lureEl.dataset.lure = next;
    root.dataset.lure = next;
    root.dataset.mood = mood();
    if (persist) writeStored(CAT_LURE_KEY, next);
    resetCatch();
    window.dispatchEvent(new CustomEvent('wichien:lure-live', { detail: { lure: next } }));
  };

  const pointerIsFine = () => usingMouse || hasFinePointer();

  const syncPointerMode = () => {
    const fine = pointerIsFine();
    root.classList.toggle('is-touch', !fine);
    document.documentElement.classList.toggle('has-cat-lure', fine);
    lureEl.hidden = false;
  };

  const virtualMouse = (now: number): Point => {
    virtualPhase += 0.0048;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const t = now * 0.0007 + virtualPhase;
    return {
      x: w * 0.5 + Math.sin(t * 0.62) * w * 0.26 + Math.sin(t * 1.05) * 28,
      y: h * 0.48 + Math.cos(t * 0.5) * h * 0.2 + Math.cos(t * 0.92) * 22,
    };
  };

  const engageBehavior = (): LiveBehavior => (hunting() ? 'chase' : 'play');

  const decideAutoDesktop = (now: number) => {
    if (pointerMoving) {
      const next = engageBehavior();
      if (behavior !== next) setBehavior(next, 1e9);
      return;
    }
    if (now - lastPointerMove < IDLE_MS) return;
    if (behavior === 'chase' || behavior === 'play') {
      setBehavior('toy', TOY_PLAY_MS);
      return;
    }
    if (behavior === 'toy') {
      if (now >= behaviorUntil) setBehavior(pick(IDLE_BEHAVIORS, 'toy'), rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX));
      return;
    }
    if (now >= behaviorUntil) setBehavior(pick(IDLE_BEHAVIORS, behavior));
  };

  const decideAutoTouch = (now: number) => {
    if (now < behaviorUntil) return;
    setBehavior(pick(TOUCH_ROTATION, behavior), rand(TOUCH_HOLD_MIN, TOUCH_HOLD_MAX));
  };

  const tickBehavior = (now: number) => {
    if (catching() || phase === 'flee') return;
    if (mode !== 'auto') {
      if (behavior !== mode) setBehavior(mode, 1e9);
      return;
    }
    if (pointerIsFine()) decideAutoDesktop(now);
    else decideAutoTouch(now);
  };

  const knockLure = (power: number, lift: number) => {
    lureJolt.x += -facing * rand(power * 0.7, power) + rand(-18, 18);
    lureJolt.y += rand(-lift, -lift * 0.35);
    spawnSpark(lurePos.x, lurePos.y, lure === 'food' ? 'food' : 'toy');
  };

  const startFlee = (now: number) => {
    phase = 'flee';
    phaseUntil = now + (hunting() ? FLEE_HUNT_MS : FLEE_PLAY_MS);
    setJamLock(false);
    const fromX = cat.x + CAT_W * 0.5;
    const fromY = cat.y + CAT_H * 0.7;
    const awayX = fromX < pointer.x ? -1 : 1;
    const awayY = fromY < pointer.y ? -1 : 1;
    fleeTarget = {
      x: clamp((awayX < 0 ? 24 : window.innerWidth - 210) + rand(-28, 28), -36, window.innerWidth - 120),
      y: clamp((awayY < 0 ? 28 : window.innerHeight - 160) + rand(-22, 22), 10, window.innerHeight - 120),
    };
    knockLure(hunting() ? 36 : 54, hunting() ? 18 : 42);
    spawnSpark(fromX, fromY, 'dust');
  };

  const startHuntCatch = (now: number) => {
    phase = 'pounce';
    phaseUntil = now + HUNT_POUNCE_MS;
    vel.x = 0;
    vel.y = 0;
  };

  const startPlayBat = (now: number) => {
    playCombo += 1;
    if (playCombo % 3 === 0) {
      phase = 'kick';
      phaseUntil = now + 460;
    } else {
      phase = 'bat';
      phaseUntil = now + 340;
      knockLure(48, 36);
    }
  };

  const advancePhase = (now: number) => {
    if (phase === 'none' || now < phaseUntil) return;

    if (phase === 'flee') {
      resetCatch();
      actionCooldownUntil = now + (hunting() ? HUNT_COOLDOWN : PLAY_COOLDOWN + 700);
      if (behavior === 'play' && mode === 'auto') wander = wanderPoint();
      return;
    }

    if (hunting()) {
      if (phase === 'pounce') {
        phase = 'leap';
        phaseUntil = now + HUNT_LEAP_MS;
        return;
      }
      if (phase === 'leap') {
        phase = 'hold';
        phaseUntil = now + HUNT_HOLD_MS;
        vel.x = 0;
        vel.y = 0;
        setJamLock(true);
        spawnSpark(lurePos.x, lurePos.y, 'toy');
        spawnSpark(lurePos.x + rand(-8, 8), lurePos.y + rand(-8, 8), 'dust');
        return;
      }
      if (phase === 'hold') {
        phase = 'shake';
        phaseUntil = now + HUNT_SHAKE_MS;
        vel.x = 0;
        vel.y = 0;
        spawnSpark(lurePos.x, lurePos.y, 'dust');
        return;
      }
      if (phase === 'shake') {
        startFlee(now);
      }
      return;
    }

    if (phase === 'bat' || phase === 'kick') {
      if (phase === 'kick') knockLure(62, 52);
      if (playCombo >= 4) {
        playCombo = 0;
        startFlee(now);
      } else {
        phase = 'none';
        actionCooldownUntil = now + PLAY_COOLDOWN;
      }
    }
  };

  const tryStartCatch = (now: number, distance: number) => {
    if (phase !== 'none' || now < actionCooldownUntil) return;
    const live = behavior === 'chase' || behavior === 'play' || behavior === 'toy';
    if (!live) return;
    if (hunting()) {
      if (distance <= HUNT_CATCH_RANGE) startHuntCatch(now);
      return;
    }
    if (distance <= PLAY_BAT_RANGE) startPlayBat(now);
  };

  const poseForPhase = (speed: number, distance: number): CatPoseId | null => {
    switch (phase) {
      case 'pounce':
        return 'pounce';
      case 'leap':
        return 'leap';
      case 'hold':
      case 'shake':
        return 'hold';
      case 'bat':
      case 'toss':
        return 'bat';
      case 'kick':
        return 'kick';
      case 'chase-toy':
      case 'flee':
        return speed > 10 ? 'walk' : 'side';
      default:
        break;
    }
    if (behavior === 'sleep') return 'sleep';
    if (behavior === 'stretch') return 'stretch';
    if (behavior === 'groom' || behavior === 'loaf') return 'sit';
    if (hunting() && (behavior === 'chase' || behavior === 'play')) {
      if (speed > 16) return 'walk';
      return distance < 170 ? 'pounce' : 'side';
    }
    if (!hunting() && (behavior === 'play' || behavior === 'chase' || behavior === 'toy')) {
      if (speed > 14) return 'walk';
      return distance < 110 ? 'sit' : 'side';
    }
    if (behavior === 'toy') return speed > 12 ? 'walk' : 'sit';
    return speed > 14 ? 'walk' : 'sit';
  };

  const chooseExpr = (now: number, distance: number): CatExprId => {
    if (now < yawnUntil) return 'shut';
    if (phase === 'hold' || phase === 'shake' || phase === 'leap') return 'focused';
    if (phase === 'bat' || phase === 'kick' || phase === 'toss') return 'happy';
    if (phase === 'flee') return hunting() ? 'alert' : 'happy';
    if (behavior === 'sleep' || behavior === 'groom') return 'shut';
    if (behavior === 'stretch') return 'sleepy';
    if (behavior === 'loaf') return distance < 140 ? 'alert' : 'sleepy';
    if (hunting()) return distance < 150 ? 'focused' : 'alert';
    return 'happy';
  };

  const maxSpeedFor = (distance: number) => {
    if (phase === 'flee') return hunting() ? 300 : 220;
    if (phase === 'leap') return 340;
    if (phase === 'pounce') return 260;
    if (pinning()) return 22;
    if (phase === 'bat' || phase === 'kick') return 40;
    if (hunting() && behavior === 'chase') {
      if (distance > 240) return 148;
      if (distance > 120) return 88;
      return 64;
    }
    if (!hunting() && (behavior === 'play' || behavior === 'chase' || behavior === 'toy')) return 168;
    if (behavior === 'toy') return 78;
    if (behavior === 'play') return 96;
    if (behavior === 'stretch' || behavior === 'groom') return 54;
    return 38;
  };

  syncPointerMode();
  setLure(lure, false);
  setMode(mode, false);
  root.classList.add('is-on');

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      if (isMouseLike(event) && !usingMouse) {
        usingMouse = true;
        syncPointerMode();
      }
      if (!pointerIsFine()) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
      if (Math.hypot(dx, dy) > MOVE_EPSILON) {
        lastPointerMove = performance.now();
        pointerMoving = true;
        if (!pinning()) {
          lureJolt.x *= 0.35;
          lureJolt.y *= 0.35;
        }
      }
      sparkBudget += 1;
      if (sparkBudget > 5 && (behavior === 'chase' || behavior === 'toy' || catching())) {
        sparkBudget = 0;
        spawnSpark(event.clientX, event.clientY, lure === 'food' ? 'food' : 'toy');
      }
    },
    { passive: true },
  );

  window.addEventListener('resize', () => {
    syncPointerMode();
    wander = wanderPoint();
  });

  window.addEventListener(CAT_BEHAVIOR_EVENT, ((event: CustomEvent<{ behavior?: string }>) => {
    if (isCatBehaviorId(event.detail?.behavior)) setMode(event.detail.behavior);
  }) as EventListener);

  window.addEventListener(CAT_LURE_EVENT, ((event: CustomEvent<{ lure?: string }>) => {
    if (isCatLureId(event.detail?.lure)) setLure(event.detail.lure);
  }) as EventListener);

  const tick = (now: number) => {
    if (stopped) return;
    const dt = clamp((now - lastFrame) / 1000, 0.008, 0.034);
    lastFrame = now;
    const fine = pointerIsFine();

    if (!fine) {
      pointer = virtualMouse(now);
      pointerMoving = behavior === 'chase' || behavior === 'play';
    } else if (now - lastPointerMove > IDLE_MS) {
      pointerMoving = false;
    }

    if (now >= nextYawn && (behavior === 'loaf' || behavior === 'sleep')) {
      yawnUntil = now + 1600;
      nextYawn = now + rand(10000, 18000);
    }

    const toyGoalX = pointer.x + lureJolt.x;
    const toyGoalY = pointer.y + lureJolt.y;
    if (!pinning()) {
      const follow = phase === 'leap' ? 0.18 : fine ? 0.42 : 0.07;
      lurePos.x = lerp(lurePos.x, toyGoalX, follow);
      lurePos.y = lerp(lurePos.y, toyGoalY, follow);
    }
    lureJolt.x *= phase === 'toss' || phase === 'bat' ? 0.94 : 0.88;
    lureJolt.y *= phase === 'toss' || phase === 'bat' ? 0.93 : 0.88;

    tickBehavior(now);
    advancePhase(now);

    pose = poseForPhase(Math.hypot(vel.x, vel.y), 0) ?? 'sit';
    const mouth = worldFromLocal(cat, ANCHORS[pose].mouth, facing);
    const head = worldFromLocal(cat, ANCHORS[pose].head, facing);
    const paw = worldFromLocal(cat, ANCHORS[pose].paw, facing);
    const distance = Math.hypot(mouth.x - lurePos.x, mouth.y - lurePos.y);

    if (phase === 'none') tryStartCatch(now, distance);

    if (phase === 'hold' || phase === 'shake') {
      lurePos.x = lerp(lurePos.x, mouth.x + facing * 4, 0.65);
      lurePos.y = lerp(lurePos.y, mouth.y + 6, 0.65);
    } else if (phase === 'kick') {
      lurePos.x = lerp(lurePos.x, paw.x, 0.4);
      lurePos.y = lerp(lurePos.y, paw.y, 0.4);
    } else if (phase === 'bat') {
      lurePos.x = lerp(lurePos.x, paw.x, 0.28);
      lurePos.y = lerp(lurePos.y, paw.y, 0.28);
    } else if (phase === 'leap') {
      lurePos.x = lerp(lurePos.x, mouth.x + facing * 10, 0.12);
      lurePos.y = lerp(lurePos.y, mouth.y, 0.12);
    }

    const mouthAnchor = ANCHORS[pose].mouth;
    if (phase === 'flee') {
      catTarget = fleeTarget;
    } else if (phase === 'leap' || phase === 'pounce') {
      catTarget = catFromLocal({ x: lurePos.x - facing * 8, y: lurePos.y + 4 }, mouthAnchor, facing);
    } else if (pinning() || phase === 'bat') {
      catTarget = { x: cat.x, y: cat.y };
      vel.x = 0;
      vel.y = 0;
    } else if (behavior === 'chase' || (behavior === 'play' && hunting())) {
      const standoff = hunting() ? (distance < 150 ? 22 : 36) : 28;
      catTarget = catFromLocal({ x: lurePos.x - facing * standoff, y: lurePos.y + 6 }, mouthAnchor, facing);
    } else if (behavior === 'toy' || behavior === 'play') {
      if (distance < INTEREST_RANGE && now >= actionCooldownUntil) {
        catTarget = catFromLocal({ x: lurePos.x - facing * 30, y: lurePos.y + 10 }, mouthAnchor, facing);
      } else {
        if (Math.hypot(cat.x - wander.x, cat.y - wander.y) < 30) wander = wanderPoint();
        catTarget = wander;
      }
      if (behavior === 'toy' && !hunting() && now - lastToyBat > 520 && distance < 84 && phase === 'none') {
        lastToyBat = now;
        startPlayBat(now);
      }
    } else if (behavior === 'sleep' || behavior === 'loaf') {
      catTarget.x = lerp(catTarget.x, wander.x, 0.03);
      catTarget.y = lerp(catTarget.y, wander.y, 0.03);
    } else {
      catTarget.x = lerp(catTarget.x, wander.x, 0.05);
      catTarget.y = lerp(catTarget.y, wander.y, 0.05);
    }

    const speedCap = maxSpeedFor(distance);
    const accel = phase === 'leap' ? 980 : phase === 'flee' ? 820 : phase === 'pounce' ? 760 : 420;
    steer(cat, vel, catTarget, speedCap, accel, dt);
    cat.x += vel.x * dt;
    cat.y += vel.y * dt;
    cat.x = clamp(cat.x, -36, window.innerWidth - 110);
    cat.y = clamp(cat.y, 10, window.innerHeight - 118);

    const speed = Math.hypot(vel.x, vel.y);
    const gaitRate = (hunting() ? 0.052 : 0.07) * (phase === 'flee' ? 1.55 : 1);
    stride += speed * dt * gaitRate;
    walkFrame = Math.floor(stride) % 4;
    const flapMs = phase === 'hold' || phase === 'shake' ? 70 : pointerMoving || phase === 'flee' ? 90 : 130;
    flapFrame = BIRD_FLAP[Math.floor(now / flapMs) % BIRD_FLAP.length];

    const lookX = behavior === 'sleep' ? head.x + facing * 40 : lurePos.x;
    const desiredFacing = lookX < head.x - 6 ? -1 : lookX > head.x + 6 ? 1 : facing;
    if (phase === 'flee') {
      facing = vel.x < -8 ? -1 : vel.x > 8 ? 1 : facing;
    } else if (desiredFacing !== facing && now >= turnAfter && (speed > 18 || catching() || behavior === 'chase' || behavior === 'play')) {
      facing = desiredFacing;
      turnAfter = now + 260;
    } else if (desiredFacing !== facing && now >= turnAfter + 420) {
      facing = desiredFacing;
      turnAfter = now + 360;
    }

    pose = poseForPhase(speed, distance) ?? 'sit';
    expr = chooseExpr(now, distance);

    const tilt =
      phase === 'leap'
        ? -10
        : phase === 'flee'
          ? clamp(vel.x * 0.05 * facing, -10, 10)
          : hunting() && behavior === 'chase'
            ? clamp(vel.x * 0.035 * facing, -6, 6)
            : 0;

    wrap.style.transform = `translate3d(${cat.x}px, ${cat.y}px, 0) scaleX(${facing}) rotate(${tilt}deg)`;
    wrap.style.setProperty('--gait', `${clamp(0.82 - speed / 380, 0.28, 0.82)}s`);

    const showLure = fine || behavior === 'chase' || behavior === 'toy' || catching() || phase === 'flee';
    lureEl.style.transform = `translate3d(${lurePos.x}px, ${lurePos.y}px, 0)`;
    lureEl.classList.toggle('is-visible', showLure);
    lureEl.classList.toggle('is-batted', Math.hypot(lureJolt.x, lureJolt.y) > 8 && !hunting());
    lureEl.classList.toggle('is-tossed', phase === 'toss' || (phase === 'flee' && !hunting()));
    lureEl.classList.toggle('is-running', pointerMoving || phase === 'flee' || behavior === 'chase');
    lureEl.classList.toggle('is-caught', pinning());
    lureEl.dataset.lure = lure;
    lureEl.dataset.flap = String(flapFrame);

    root.dataset.pose = pose;
    root.dataset.poseGroup = pose;
    root.dataset.expr = expr;
    root.dataset.lure = lure;
    root.dataset.mood = mood();
    root.dataset.phase = phase;
    root.dataset.frame = String(walkFrame);
    root.classList.toggle('is-moving', !pinning() && speed > 12 && (pose === 'walk' || pose === 'side' || phase === 'flee'));
    root.classList.toggle('is-excited', hunting() && distance < 150);
    root.classList.toggle('is-yawning', now < yawnUntil);

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
}
