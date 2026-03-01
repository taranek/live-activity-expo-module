import {
  requireNativeModule,
  EventEmitter,
  type Subscription,
} from "expo-modules-core";

export interface LiveActivityContentState {
  value: string;
  progress: number;
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

export async function endActivity(activityId: string): Promise<void> {
  return LiveActivityNative.endActivity(activityId);
}

export function getActivityState(): ActivityState | null {
  return LiveActivityNative.getActivityState();
}

export function addActivityStateChangeListener(
  listener: (event: ActivityStateChangeEvent) => void
): Subscription {
  return emitter.addListener("onActivityStateChange", listener);
}
