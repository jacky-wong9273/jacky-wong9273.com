export const CAT_STORAGE_KEY = 'wichien-maat-behavior';
export const CAT_BEHAVIOR_EVENT = 'wichien:behavior';
export const CAT_LURE_KEY = 'wichien-maat-lure';
export const CAT_LURE_EVENT = 'wichien:lure';

export const CAT_BEHAVIORS = [
  { id: 'auto', label: 'Auto', hint: 'Rest, wander, or hunt on its own' },
  { id: 'sleep', label: 'Sleep', hint: 'Curl up and nap' },
  { id: 'play', label: 'Play around', hint: 'Wander, then pounce and pin the cursor' },
  { id: 'chase', label: 'Hunt', hint: 'Stalk the cursor at a walking pace' },
  { id: 'toy', label: 'Play with lure', hint: 'Bat the toy or nibble the treat' },
  { id: 'groom', label: 'Groom', hint: 'Lick a paw and wash up' },
  { id: 'stretch', label: 'Stretch', hint: 'Long morning stretch' },
  { id: 'loaf', label: 'Loaf', hint: 'Sit still and watch' },
] as const;

export const CAT_LURES = [
  { id: 'toy', label: 'Toy', hint: 'A mouse to chase, bat, and pin' },
  { id: 'food', label: 'Food', hint: 'A fish treat to stalk and nibble' },
] as const;

export type CatBehaviorId = (typeof CAT_BEHAVIORS)[number]['id'];
export type CatLureId = (typeof CAT_LURES)[number]['id'];
export type CatPoseId = 'side' | 'sit' | 'sleep' | 'stretch';
export type CatExprId = 'neutral' | 'alert' | 'sleepy' | 'focused' | 'happy' | 'shut' | 'eat';

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
  return CAT_LURES.find((item) => item.id === id)?.label ?? 'Toy';
}
