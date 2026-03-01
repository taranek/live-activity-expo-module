import { requireNativeModule } from "expo-modules-core";

export interface LiveActivityContentState {
  value: string;
  progress: number;
}

export interface StartActivityParams extends LiveActivityContentState {
  title: string;
}

const LiveActivityNative = requireNativeModule("LiveActivity");

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
