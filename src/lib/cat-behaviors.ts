export const CAT_STORAGE_KEY = 'wichien-maat-behavior';
export const CAT_BEHAVIOR_EVENT = 'wichien:behavior';
export const CAT_LURE_KEY = 'wichien-maat-lure';
export const CAT_LURE_EVENT = 'wichien:lure';

export const CAT_BEHAVIORS = [
  { id: 'auto', label: 'Auto', hint: 'Rest, wander, hunt a bird, or play with the toy' },
  { id: 'sleep', label: 'Sleep', hint: 'Curl up and nap' },
  { id: 'play', label: 'Play around', hint: 'Wander, then pounce — hunt or play by lure' },
  { id: 'chase', label: 'Hunt', hint: 'Stalk the bird, or dash after the fur toy' },
  { id: 'toy', label: 'Play with lure', hint: 'Bat the fur toy, or stalk the bird' },
  { id: 'groom', label: 'Groom', hint: 'Lick a paw and wash up' },
  { id: 'stretch', label: 'Stretch', hint: 'Long morning stretch' },
  { id: 'loaf', label: 'Loaf', hint: 'Sit still and watch' },
] as const;

export const CAT_LURES = [
  { id: 'toy', label: 'Bird', hint: 'Prey — stalk, leap, pin, then bolt' },
  { id: 'food', label: 'Fur toy', hint: 'A fluffy toy to bat, kick, and toss' },
] as const;

export type CatBehaviorId = (typeof CAT_BEHAVIORS)[number]['id'];
export type CatLureId = (typeof CAT_LURES)[number]['id'];
export type CatPoseId = 'side' | 'sit' | 'sleep' | 'stretch' | 'pounce' | 'walk' | 'leap' | 'hold' | 'bat' | 'kick';
export type CatExprId = 'neutral' | 'alert' | 'sleepy' | 'focused' | 'happy' | 'shut' | 'eat';
export type CatchPhase =
  | 'none'
  | 'pounce'
  | 'leap'
  | 'hold'
  | 'shake'
  | 'bat'
  | 'chase-toy'
  | 'kick'
  | 'toss'
  | 'flee';

export const IDLE_BEHAVIORS = ['sleep', 'play', 'groom', 'stretch', 'loaf'] as const;
export const TOUCH_ROTATION = ['sleep', 'play', 'chase', 'toy', 'groom', 'stretch', 'loaf'] as const;

export function isCatBehaviorId(value: string | null | undefined): value is CatBehaviorId {
  return Boolean(value && CAT_BEHAVIORS.some((item) => item.id === value));
}

export function isCatLureId(value: string | null | undefined): value is CatLureId {
  return Boolean(value && CAT_LURES.some((item) => item.id === value));
}

export function behaviorLabel(id: CatBehaviorId): string {
  return CAT_BEHAVIORS.find((item) => item.id === id)?.label ?? 'Auto';
}

export function lureLabel(id: CatLureId): string {
  return CAT_LURES.find((item) => item.id === id)?.label ?? 'Bird';
}

export function isHuntLure(lure: CatLureId): boolean {
  return lure === 'toy';
}
