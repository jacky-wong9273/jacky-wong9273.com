export const CAT_STORAGE_KEY = 'wichien-maat-behavior';
export const CAT_BEHAVIOR_EVENT = 'wichien:behavior';

export const CAT_BEHAVIORS = [
  { id: 'auto', label: 'Auto', hint: 'Sleep, play, or hunt from the mouse' },
  { id: 'sleep', label: 'Sleep', hint: 'Curl up and nap' },
  { id: 'play', label: 'Play around', hint: 'Wander, roll, and pounce' },
  { id: 'chase', label: 'Hunt', hint: 'Chase the mouse toy' },
  { id: 'toy', label: 'Play with toy', hint: 'Bat the mouse when it stops' },
  { id: 'groom', label: 'Groom', hint: 'Lick a paw and wash up' },
  { id: 'stretch', label: 'Stretch', hint: 'Long morning stretch' },
  { id: 'loaf', label: 'Loaf', hint: 'Sit still and watch' },
] as const;

export type CatBehaviorId = (typeof CAT_BEHAVIORS)[number]['id'];

export const IDLE_BEHAVIORS = ['sleep', 'play', 'groom', 'stretch', 'loaf'] as const;
export const TOUCH_ROTATION = ['sleep', 'play', 'chase', 'toy', 'groom', 'stretch', 'loaf'] as const;

export function isCatBehaviorId(value: string | null | undefined): value is CatBehaviorId {
  return Boolean(value && CAT_BEHAVIORS.some((item) => item.id === value));
}

export function behaviorLabel(id: CatBehaviorId): string {
  return CAT_BEHAVIORS.find((item) => item.id === id)?.label ?? 'Auto';
}
