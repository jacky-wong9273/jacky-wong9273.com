import {
  CAT_BEHAVIOR_EVENT,
  CAT_LURE_EVENT,
  CAT_LURE_KEY,
  CAT_STORAGE_KEY,
  IDLE_BEHAVIORS,
  TOUCH_ROTATION,
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
const JAM_RANGE = 104;
const CHASE_CATCH_RANGE = 78;
const INTEREST_RANGE = 188;
const JAM_HOLD_MIN = 1600;
const JAM_HOLD_MAX = 2600;
const CHASE_JAM_MS = 3000;
const JAM_COOLDOWN = 2400;
const CHASE_JAM_COOLDOWN = 3200;
const YANK_RELEASE = 240;
const POUNCE_MS = 280;
const FLEE_MS = 2100;
const CAT_W = 260;
const CAT_H = 180;

type Point = { x: number; y: number };
type LiveBehavior = Exclude<CatBehaviorId, 'auto'>;

const ANCHORS: Record<CatPoseId, { head: Point; mouth: Point; origin: Point }> = {
  side: { head: { x: 199, y: 58 }, mouth: { x: 224, y: 86 }, origin: { x: 130, y: 126 } },
  sit: { head: { x: 126, y: 50 }, mouth: { x: 130, y: 86 }, origin: { x: 130, y: 126 } },
  sleep: { head: { x: 109, y: 92 }, mouth: { x: 125, y: 113 }, origin: { x: 130, y: 126 } },
  stretch: { head: { x: 73, y: 131 }, mouth: { x: 47, y: 150 }, origin: { x: 130, y: 126 } },
  pounce: { head: { x: 203, y: 92 }, mouth: { x: 234, y: 111 }, origin: { x: 130, y: 126 } },
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

export function initWichienMaat() {
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
  let pose: CatPoseId = 'sit';
  let expr: CatExprId = 'neutral';
  let jammed = false;
  let jamUntil = 0;
  let jamCooldownUntil = 0;
  let yank = 0;
  let pouncing = false;
  let pounceUntil = 0;
  let fleeing = false;
  let fleeUntil = 0;
  let fleeTarget: Point = restPoint();
  let yawnUntil = 0;
  let nextYawn = performance.now() + rand(8000, 16000);
  let usingMouse = hasFinePointer();

  const applyBehaviorClass = (next: LiveBehavior) => {
    root.classList.remove(
      'is-sleep',
      'is-play',
      'is-chase',
      'is-toy',
      'is-groom',
      'is-stretch',
      'is-loaf',
      'is-excited',
    );
    root.classList.add(`is-${next}`);
    document.documentElement.dataset.catLive = next;
    document.documentElement.dataset.catLure = lure;
    window.dispatchEvent(new CustomEvent('wichien:live', { detail: { behavior: next, mode, lure } }));
  };

  const setBehavior = (next: LiveBehavior, hold = rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX)) => {
    behavior = next;
    behaviorUntil = performance.now() + hold;
    applyBehaviorClass(next);
    if (next === 'play' || next === 'groom' || next === 'stretch') wander = wanderPoint();
    if (next === 'sleep' || next === 'loaf') wander = restPoint();
    if (next !== 'play' && next !== 'chase') {
      jammed = false;
      pouncing = false;
      fleeing = false;
      document.documentElement.classList.remove('is-cat-jamming');
    }
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
    if (persist) writeStored(CAT_LURE_KEY, next);
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

  const decideAutoDesktop = (now: number) => {
    if (pointerMoving) {
      if (behavior !== 'chase') setBehavior('chase', 1e9);
      return;
    }
    if (now - lastPointerMove < IDLE_MS) return;
    if (behavior === 'chase') {
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
    if (jammed || pouncing || fleeing) return;
    if (mode !== 'auto') {
      if (behavior !== mode) setBehavior(mode, 1e9);
      return;
    }
    if (pointerIsFine()) decideAutoDesktop(now);
    else decideAutoTouch(now);
  };

  const tryPounceJam = (now: number, distance: number) => {
    if (jammed || pouncing || fleeing || now < jamCooldownUntil) return;
    const reach = behavior === 'chase' ? CHASE_CATCH_RANGE : behavior === 'play' ? JAM_RANGE : 0;
    if (!reach || distance > reach) return;
    pouncing = true;
    pounceUntil = now + POUNCE_MS;
  };

  const startFlee = (now: number) => {
    fleeing = true;
    fleeUntil = now + FLEE_MS;
    const fromX = cat.x + CAT_W * 0.5;
    const fromY = cat.y + CAT_H * 0.7;
    const awayX = fromX < pointer.x ? -1 : 1;
    const awayY = fromY < pointer.y ? -1 : 1;
    fleeTarget = {
      x: clamp((awayX < 0 ? 24 : window.innerWidth - 210) + rand(-28, 28), -36, window.innerWidth - 120),
      y: clamp((awayY < 0 ? 28 : window.innerHeight - 160) + rand(-22, 22), 10, window.innerHeight - 120),
    };
    spawnSpark(lurePos.x, lurePos.y, 'dust');
    spawnSpark(fromX, fromY, 'dust');
  };

  const startJam = (now: number) => {
    jammed = true;
    pouncing = false;
    jamUntil = now + (behavior === 'chase' ? CHASE_JAM_MS : rand(JAM_HOLD_MIN, JAM_HOLD_MAX));
    yank = 0;
    document.documentElement.classList.add('is-cat-jamming');
    spawnSpark(lurePos.x, lurePos.y, lure === 'food' ? 'food' : 'toy');
    spawnSpark(lurePos.x + rand(-10, 10), lurePos.y + rand(-8, 8), lure === 'food' ? 'food' : 'toy');
  };

  const endJam = (now: number) => {
    jammed = false;
    pouncing = false;
    document.documentElement.classList.remove('is-cat-jamming');
    jamCooldownUntil = now + (behavior === 'chase' ? CHASE_JAM_COOLDOWN : JAM_COOLDOWN);
    lureJolt.x += rand(-22, 22);
    lureJolt.y += rand(-16, 14);
    if (behavior === 'chase' || behavior === 'play') {
      startFlee(now);
    }
    if (behavior === 'play' && mode === 'auto') {
      wander = wanderPoint();
    }
  };

  const choosePose = (speed: number): CatPoseId => {
    if (behavior === 'sleep') return 'sleep';
    if (behavior === 'stretch') return 'stretch';
    if (behavior === 'groom') return 'sit';
    if (behavior === 'loaf') return 'sit';
    if (pouncing || jammed) return 'pounce';
    if (fleeing || behavior === 'chase') return 'side';
    if (behavior === 'play') return speed > 10 || Math.hypot(cat.x - wander.x, cat.y - wander.y) > 24 ? 'side' : 'sit';
    if (behavior === 'toy') return 'sit';
    return speed > 14 ? 'side' : 'sit';
  };

  const chooseExpr = (now: number, distance: number): CatExprId => {
    if (now < yawnUntil) return 'shut';
    if (jammed || pouncing) return 'focused';
    if (fleeing) return 'alert';
    if (behavior === 'sleep' || behavior === 'groom') return 'shut';
    if (behavior === 'stretch') return 'sleepy';
    if (behavior === 'loaf') return distance < 140 ? 'alert' : 'sleepy';
    if (behavior === 'chase') return distance < 130 ? 'focused' : 'alert';
    if (behavior === 'play') return 'happy';
    if (behavior === 'toy') return 'happy';
    return 'neutral';
  };

  const maxSpeedFor = (distance: number) => {
    if (fleeing) return 280;
    if (pouncing) return 320;
    if (jammed) return 28;
    if (behavior === 'chase') {
      if (distance > 280) return 132;
      if (distance > 140) return 172;
      return 118;
    }
    if (behavior === 'toy') return 78;
    if (behavior === 'play') return 86;
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
        if (!jammed) {
          lureJolt.x *= 0.35;
          lureJolt.y *= 0.35;
        } else if (behavior !== 'chase') {
          yank += Math.hypot(dx, dy);
        }
      }
      sparkBudget += 1;
      if (sparkBudget > 5 && (behavior === 'chase' || behavior === 'toy' || jammed)) {
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
    const dt = clamp((now - lastFrame) / 1000, 0.008, 0.034);
    lastFrame = now;
    const fine = pointerIsFine();

    if (!fine) {
      pointer = virtualMouse(now);
      pointerMoving = behavior === 'chase';
    } else if (now - lastPointerMove > IDLE_MS) {
      pointerMoving = false;
    }

    if (now >= nextYawn && (behavior === 'loaf' || behavior === 'sleep')) {
      yawnUntil = now + 1600;
      nextYawn = now + rand(10000, 18000);
    }

    const toyGoalX = pointer.x + lureJolt.x;
    const toyGoalY = pointer.y + lureJolt.y;
    if (!jammed) {
      lurePos.x = lerp(lurePos.x, toyGoalX, fine ? 0.42 : 0.07);
      lurePos.y = lerp(lurePos.y, toyGoalY, fine ? 0.42 : 0.07);
    }
    lureJolt.x *= 0.88;
    lureJolt.y *= 0.88;

    tickBehavior(now);

    pose = choosePose(Math.hypot(vel.x, vel.y));
    const mouth = worldFromLocal(cat, ANCHORS[pose].mouth, facing);
    const head = worldFromLocal(cat, ANCHORS[pose].head, facing);
    const distance = Math.hypot(mouth.x - lurePos.x, mouth.y - lurePos.y);

    if (fleeing && now >= fleeUntil) {
      fleeing = false;
    }

    if (pouncing && now >= pounceUntil) {
      if (distance < JAM_RANGE + 18) startJam(now);
      else {
        pouncing = false;
        jamCooldownUntil = now + 900;
      }
    }

    if (jammed) {
      const pin = worldFromLocal(cat, ANCHORS[pose].mouth, facing);
      lurePos.x = lerp(lurePos.x, pin.x + facing * 8, 0.4);
      lurePos.y = lerp(lurePos.y, pin.y + 2, 0.4);
      if (now >= jamUntil || yank > YANK_RELEASE) endJam(now);
    } else if (!fleeing) {
      tryPounceJam(now, distance);
    }

    const mouthAnchor = ANCHORS[pose].mouth;
    if (fleeing) {
      catTarget = fleeTarget;
    } else if (behavior === 'chase' || pouncing) {
      const standoff = pouncing ? 8 : behavior === 'chase' ? 26 : 54;
      catTarget = catFromLocal(
        { x: lurePos.x - facing * standoff, y: lurePos.y + 6 },
        mouthAnchor,
        facing,
      );
    } else if (behavior === 'toy') {
      catTarget = catFromLocal({ x: lurePos.x - facing * 26, y: lurePos.y + 10 }, mouthAnchor, facing);
      if (now - lastToyBat > (lure === 'food' ? 680 : 560) && distance < 84) {
        lastToyBat = now;
        lureJolt.x += rand(-16, 16);
        lureJolt.y += rand(-12, 10);
        spawnSpark(lurePos.x, lurePos.y, lure === 'food' ? 'food' : 'toy');
      }
    } else if (behavior === 'play') {
      if (!jammed && !pouncing) {
        if (distance < INTEREST_RANGE && now >= jamCooldownUntil) {
          catTarget = catFromLocal(
            { x: lurePos.x - facing * 34, y: lurePos.y + 8 },
            mouthAnchor,
            facing,
          );
        } else {
          if (Math.hypot(cat.x - wander.x, cat.y - wander.y) < 30) wander = wanderPoint();
          catTarget = wander;
        }
      }
    } else if (behavior === 'sleep' || behavior === 'loaf') {
      catTarget.x = lerp(catTarget.x, wander.x, 0.03);
      catTarget.y = lerp(catTarget.y, wander.y, 0.03);
    } else {
      catTarget.x = lerp(catTarget.x, wander.x, 0.05);
      catTarget.y = lerp(catTarget.y, wander.y, 0.05);
    }

    const speedCap = maxSpeedFor(distance);
    steer(cat, vel, catTarget, speedCap, pouncing ? 900 : fleeing ? 780 : 420, dt);
    cat.x += vel.x * dt;
    cat.y += vel.y * dt;
    cat.x = clamp(cat.x, -36, window.innerWidth - 110);
    cat.y = clamp(cat.y, 10, window.innerHeight - 118);

    const speed = Math.hypot(vel.x, vel.y);
    stride += speed * dt * 0.045;
    const lookX = behavior === 'sleep' ? head.x + facing * 40 : lurePos.x;
    const desiredFacing = lookX < head.x - 6 ? -1 : lookX > head.x + 6 ? 1 : facing;
    if (fleeing) {
      facing = vel.x < -8 ? -1 : vel.x > 8 ? 1 : facing;
    } else if (desiredFacing !== facing && now >= turnAfter && (speed > 18 || behavior === 'chase' || behavior === 'play')) {
      facing = desiredFacing;
      turnAfter = now + 280;
    } else if (desiredFacing !== facing && now >= turnAfter + 420) {
      facing = desiredFacing;
      turnAfter = now + 360;
    }

    pose = choosePose(speed);
    expr = chooseExpr(now, distance);

    const tilt = fleeing
      ? clamp(vel.x * 0.05 * facing, -10, 10)
      : behavior === 'chase'
        ? clamp(vel.x * 0.04 * facing, -7, 7)
        : behavior === 'stretch'
          ? -4
          : pouncing
            ? -8
            : 0;

    wrap.style.transform = `translate3d(${cat.x}px, ${cat.y}px, 0) scaleX(${facing}) rotate(${tilt}deg)`;
    wrap.style.setProperty('--gait', `${clamp(0.86 - speed / 420, 0.32, 0.86)}s`);
    wrap.style.setProperty('--stride', String(stride));

    const showLure = fine || behavior === 'chase' || behavior === 'toy' || jammed || fleeing;
    lureEl.style.transform = `translate3d(${lurePos.x}px, ${lurePos.y}px, 0)`;
    lureEl.classList.toggle('is-visible', showLure);
    lureEl.classList.toggle('is-batted', Math.hypot(lureJolt.x, lureJolt.y) > 5);
    lureEl.classList.toggle('is-running', pointerMoving || behavior === 'chase');
    lureEl.classList.toggle('is-jammed', jammed);
    lureEl.dataset.lure = lure;

    root.dataset.pose = pose;
    root.dataset.poseGroup = pose;
    root.dataset.expr = expr;
    root.dataset.lure = lure;
    root.classList.toggle('is-moving', !jammed && speed > 14 && (pose === 'side' || pose === 'pounce' || fleeing));
    root.classList.toggle('is-pouncing', pouncing);
    root.classList.toggle('is-jamming', jammed);
    root.classList.toggle('is-fleeing', fleeing);
    root.classList.toggle('is-excited', behavior === 'chase' && distance < 150);
    root.classList.toggle('is-yawning', now < yawnUntil);

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
