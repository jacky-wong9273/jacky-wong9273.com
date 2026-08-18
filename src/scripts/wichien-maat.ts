import {
  CAT_BEHAVIOR_EVENT,
  CAT_STORAGE_KEY,
  IDLE_BEHAVIORS,
  TOUCH_ROTATION,
  type CatBehaviorId,
  isCatBehaviorId,
} from '../lib/cat-behaviors';

const IDLE_MS = 1700;
const TOY_PLAY_MS = 4200;
const IDLE_HOLD_MIN = 5200;
const IDLE_HOLD_MAX = 8800;
const TOUCH_HOLD_MIN = 5600;
const TOUCH_HOLD_MAX = 8200;
const CATCH_DISTANCE = 118;
const MOVE_EPSILON = 0.9;

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[], except?: T) => {
  const pool = except === undefined ? items : items.filter((item) => item !== except);
  return pool[Math.floor(Math.random() * pool.length)] ?? items[0];
};

const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readStoredMode = (): CatBehaviorId => {
  try {
    const stored = localStorage.getItem(CAT_STORAGE_KEY);
    if (isCatBehaviorId(stored)) return stored;
  } catch {
    /* ignore private-mode storage */
  }
  return 'auto';
};

const writeStoredMode = (mode: CatBehaviorId) => {
  try {
    localStorage.setItem(CAT_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
};

const wanderPoint = (): Point => {
  const padX = Math.min(140, window.innerWidth * 0.18);
  const padY = Math.min(120, window.innerHeight * 0.16);
  return {
    x: rand(padX, Math.max(padX + 8, window.innerWidth - padX)),
    y: rand(padY, Math.max(padY + 8, window.innerHeight - padY)),
  };
};

const restPoint = (): Point => ({
  x: window.innerWidth - 168,
  y: window.innerHeight - 196,
});

export function initWichienMaat() {
  const root = document.getElementById('cursor-cat');
  const wrap = root?.querySelector<HTMLElement>('.cursor-cat-wrap');
  const toy = document.getElementById('mouse-toy');
  const trail = document.getElementById('cursor-cat-trail');
  if (!root || !wrap || !toy || !trail) return;

  if (prefersReducedMotion()) {
    root.classList.add('is-on', 'is-loaf', 'is-reduced');
    wrap.style.transform = `translate3d(${window.innerWidth - 148}px, ${window.innerHeight - 180}px, 0)`;
    toy.hidden = true;
    return;
  }

  const sparkPool: HTMLSpanElement[] = [];
  const hues = ['', 'is-cream', 'is-seal'];
  for (let i = 0; i < 16; i++) {
    const spark = document.createElement('span');
    spark.className = 'cat-spark';
    spark.style.display = 'none';
    trail.appendChild(spark);
    sparkPool.push(spark);
  }
  let sparkIndex = 0;
  let sparkBudget = 0;

  const spawnSpark = (sx: number, sy: number) => {
    const spark = sparkPool[sparkIndex % sparkPool.length];
    sparkIndex += 1;
    spark.className = `cat-spark ${hues[sparkIndex % hues.length]}`;
    spark.style.display = 'block';
    spark.style.left = `${sx}px`;
    spark.style.top = `${sy}px`;
    spark.style.animation = 'none';
    void spark.offsetWidth;
    spark.style.animation = '';
  };

  let mode: CatBehaviorId = readStoredMode();
  let behavior: Exclude<CatBehaviorId, 'auto'> = mode === 'auto' ? 'loaf' : mode;
  let behaviorUntil = performance.now() + rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX);

  let pointer: Point = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.28 };
  let toyPos: Point = { ...pointer };
  let toyJolt: Point = { x: 0, y: 0 };
  let cat: Point = { x: pointer.x - 86, y: pointer.y + 18 };
  let catTarget: Point = { ...cat };
  let prevCat: Point = { ...cat };
  let wander: Point = wanderPoint();
  let lastPointerMove = performance.now();
  let pointerMoving = false;
  let lastToyBat = 0;
  let facing = 1;
  let virtualPhase = Math.random() * Math.PI * 2;

  const applyBehaviorClass = (next: Exclude<CatBehaviorId, 'auto'>) => {
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
    window.dispatchEvent(new CustomEvent('wichien:live', { detail: { behavior: next, mode } }));
  };

  const setBehavior = (next: Exclude<CatBehaviorId, 'auto'>, hold = rand(IDLE_HOLD_MIN, IDLE_HOLD_MAX)) => {
    behavior = next;
    behaviorUntil = performance.now() + hold;
    applyBehaviorClass(next);
    if (next === 'play' || next === 'groom' || next === 'stretch') {
      wander = wanderPoint();
    }
    if (next === 'sleep' || next === 'loaf') {
      wander = restPoint();
    }
  };

  const setMode = (next: CatBehaviorId, persist = true) => {
    mode = next;
    document.documentElement.dataset.catBehavior = next;
    if (persist) writeStoredMode(next);
    if (next === 'auto') {
      setBehavior(
        hasFinePointer() ? pick(IDLE_BEHAVIORS) : pick(TOUCH_ROTATION),
        rand(2800, 4600),
      );
    } else {
      setBehavior(next, 1e9);
    }
  };

  const syncPointerMode = () => {
    const fine = hasFinePointer();
    root.classList.toggle('is-touch', !fine);
    document.documentElement.classList.toggle('has-mouse-toy', fine);
    toy.hidden = false;
  };

  const virtualMouse = (now: number): Point => {
    virtualPhase += 0.0085;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const t = now * 0.001 + virtualPhase;
    return {
      x: w * 0.5 + Math.sin(t * 0.72) * w * 0.3 + Math.sin(t * 1.35) * 36,
      y: h * 0.46 + Math.cos(t * 0.58) * h * 0.22 + Math.cos(t * 1.1) * 28,
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

    if (now >= behaviorUntil) {
      const next = pick(IDLE_BEHAVIORS, behavior);
      setBehavior(next);
    }
  };

  const decideAutoTouch = (now: number) => {
    if (now < behaviorUntil) return;
    setBehavior(pick(TOUCH_ROTATION, behavior), rand(TOUCH_HOLD_MIN, TOUCH_HOLD_MAX));
  };

  const tickBehavior = (now: number) => {
    if (mode !== 'auto') {
      if (behavior !== mode) setBehavior(mode, 1e9);
      return;
    }
    if (hasFinePointer()) decideAutoDesktop(now);
    else decideAutoTouch(now);
  };

  syncPointerMode();
  setMode(mode, false);
  root.classList.add('is-on');

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      if (!hasFinePointer()) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
      if (Math.hypot(dx, dy) > MOVE_EPSILON) {
        lastPointerMove = performance.now();
        pointerMoving = true;
        toyJolt.x *= 0.35;
        toyJolt.y *= 0.35;
      }
      sparkBudget += 1;
      if (sparkBudget > 3 && (behavior === 'chase' || behavior === 'toy')) {
        sparkBudget = 0;
        spawnSpark(event.clientX, event.clientY);
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

  const tick = (now: number) => {
    const fine = hasFinePointer();
    if (!fine) {
      pointer = virtualMouse(now);
      pointerMoving = behavior === 'chase';
    } else if (now - lastPointerMove > IDLE_MS) {
      pointerMoving = false;
    }

    const toyGoalX = pointer.x + toyJolt.x;
    const toyGoalY = pointer.y + toyJolt.y;
    toyPos.x = lerp(toyPos.x, toyGoalX, fine ? 0.55 : 0.08);
    toyPos.y = lerp(toyPos.y, toyGoalY, fine ? 0.55 : 0.08);
    toyJolt.x *= 0.86;
    toyJolt.y *= 0.86;

    const distance = Math.hypot(cat.x + 70 - toyPos.x, cat.y + 54 - toyPos.y);
    tickBehavior(now);
    root.classList.toggle('is-excited', behavior === 'chase' && distance < CATCH_DISTANCE);

    if (behavior === 'chase') {
      catTarget.x = toyPos.x - 74;
      catTarget.y = toyPos.y - 18;
    } else if (behavior === 'toy') {
      catTarget.x = toyPos.x - 58;
      catTarget.y = toyPos.y - 6;
      if (now - lastToyBat > 520) {
        lastToyBat = now;
        toyJolt.x += rand(-22, 22);
        toyJolt.y += rand(-16, 14);
        spawnSpark(toyPos.x, toyPos.y);
      }
    } else if (behavior === 'play') {
      if (Math.hypot(cat.x - wander.x, cat.y - wander.y) < 28) wander = wanderPoint();
      catTarget = wander;
    } else if (behavior === 'sleep' || behavior === 'loaf') {
      catTarget.x = lerp(catTarget.x, wander.x, 0.02);
      catTarget.y = lerp(catTarget.y, wander.y, 0.02);
    } else {
      catTarget.x = lerp(catTarget.x, wander.x, 0.04);
      catTarget.y = lerp(catTarget.y, wander.y, 0.04);
    }

    const follow =
      behavior === 'chase' ? (distance > 160 ? 0.16 : 0.22) : behavior === 'toy' ? 0.2 : behavior === 'play' ? 0.07 : 0.045;

    cat.x = lerp(cat.x, catTarget.x, follow);
    cat.y = lerp(cat.y, catTarget.y, follow);
    cat.x = clamp(cat.x, -20, window.innerWidth - 96);
    cat.y = clamp(cat.y, 8, window.innerHeight - 110);

    const vx = cat.x - prevCat.x;
    prevCat = { ...cat };
    const lookX = behavior === 'sleep' ? cat.x + 80 : toyPos.x;
    const desiredFacing = lookX < cat.x + 64 ? -1 : 1;
    if (behavior !== 'sleep' && behavior !== 'groom') facing = desiredFacing;

    const tilt =
      behavior === 'chase'
        ? clamp(vx * 8, -18, 18)
        : behavior === 'play'
          ? Math.sin(now / 180) * 8
          : behavior === 'stretch'
            ? -6
            : 0;

    wrap.style.transform = `translate3d(${cat.x}px, ${cat.y}px, 0) scaleX(${facing}) rotate(${tilt * facing}deg)`;
    toy.style.transform = `translate3d(${toyPos.x}px, ${toyPos.y}px, 0)`;
    const showToy = fine || behavior === 'chase' || behavior === 'toy';
    toy.classList.toggle('is-visible', showToy);
    toy.classList.toggle('is-batted', Math.hypot(toyJolt.x, toyJolt.y) > 6);
    toy.classList.toggle('is-running', pointerMoving || behavior === 'chase');

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
