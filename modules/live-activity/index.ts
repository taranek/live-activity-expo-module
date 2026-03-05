import {
  requireNativeModule,
  EventEmitter,
  type Subscription,
} from "expo-modules-core";

export interface LiveActivityContentState {
  value: string;
  progress: number;
  subtitle?: string;
  actionLabel?: string;
  cancelLabel?: string;
  doneLabel?: string;
  tintColor?: string;
  /** SF Symbol name (e.g. "shippingbox.fill", "flame", "car.fill") */
  icon?: string;
}

export interface StartActivityParams extends LiveActivityContentState {
  title: string;
}

export interface ActivityState {
  id: string;
  title: string;
  value: string;
  progress: number;
}

export interface ActivityStateChangeEvent {
  id: string;
  value: string;
  progress: number;
}

export interface WidgetActionEvent {
  action: "advance" | "end";
}

const LiveActivityNative = requireNativeModule("LiveActivity");
const emitter = new EventEmitter(LiveActivityNative);

export async function startActivity(
  params: StartActivityParams
): Promise<string> {
  return LiveActivityNative.startActivity(params);
}

export async function updateActivity(
  activityId: string,
  state: LiveActivityContentState
): Promise<void> {
  return LiveActivityNative.updateActivity(activityId, state);
}

export interface EndActivityOptions extends LiveActivityContentState {
  dismissAfterSeconds?: number;
}

export async function endActivity(
  activityId: string,
  options?: EndActivityOptions
): Promise<void> {
  return LiveActivityNative.endActivity(activityId, options ?? null);
}

export function getActivityState(): ActivityState | null {
  return LiveActivityNative.getActivityState();
}

/** Reads and clears any pending widget action from UserDefaults. Returns null if none. */
export function getPendingAction(): "advance" | "end" | null {
  return LiveActivityNative.getPendingAction() ?? null;
}

/** Write step data to shared UserDefaults so the widget can update the activity directly. */
export function syncSteps(
  steps: LiveActivityContentState[],
  currentIndex: number
): void {
  LiveActivityNative.syncSteps(steps, currentIndex);
}

export function addActivityStateChangeListener(
  listener: (event: ActivityStateChangeEvent) => void
): Subscription {
  return emitter.addListener("onActivityStateChange", listener);
}

export function addWidgetActionListener(
  listener: (event: WidgetActionEvent) => void
): Subscription {
  return emitter.addListener("onWidgetAction", listener);
}
