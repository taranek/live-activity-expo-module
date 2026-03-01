import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import {
  startActivity,
  updateActivity,
  endActivity,
  getActivityState,
  addActivityStateChangeListener,
} from '../../modules/live-activity';

const STEPS = [
  { label: 'Placed', emoji: '\uD83D\uDCCB', progress: 0 },
  { label: 'Preparing', emoji: '\uD83E\uDDD1\u200D\uD83C\uDF73', progress: 0.25 },
  { label: 'Cooking', emoji: '\uD83C\uDF73', progress: 0.5 },
  { label: 'Out for delivery', emoji: '\uD83D\uDEF5', progress: 0.75 },
  { label: 'Delivered', emoji: '\uD83C\uDF89', progress: 1.0 },
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const stepRef = useRef(0);
  const activityIdRef = useRef<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isActive = !!activityId;
  const currentStep = STEPS[stepIndex];
  const isComplete = stepIndex === STEPS.length - 1;

  const handleStart = useCallback(async () => {
    try {
      const id = await startActivity({
        title: 'Order #2137',
        value: STEPS[0].label,
        progress: STEPS[0].progress,
      });
      stepRef.current = 0;
      activityIdRef.current = id;
      setStepIndex(0);
      setActivityId(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const handleAdvance = useCallback(async () => {
    const id = activityIdRef.current;
    if (!id) return;
    try {
      const next = Math.min(stepRef.current + 1, STEPS.length - 1);
      stepRef.current = next;
      setStepIndex(next);
      await updateActivity(id, {
        value: STEPS[next].label,
        progress: STEPS[next].progress,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const handleEnd = useCallback(async () => {
    const id = activityIdRef.current;
    if (!id) return;
    try {
      await endActivity(id);
      activityIdRef.current = null;
      setActivityId(null);
      setStepIndex(0);
      stepRef.current = 0;
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  // Sync React state with native activity state when app comes to foreground
  const syncFromNative = useCallback(() => {
    const state = getActivityState();
    if (state) {
      activityIdRef.current = state.id;
      setActivityId(state.id);
      const idx = STEPS.findIndex((s) => s.label === state.value);
      if (idx !== -1) {
        stepRef.current = idx;
        setStepIndex(idx);
      }
    } else {
      // Activity was ended from the widget
      activityIdRef.current = null;
      setActivityId(null);
      setStepIndex(0);
      stepRef.current = 0;
    }
  }, []);

  // Listen for real-time state changes from the widget (via contentUpdates)
  useEffect(() => {
    const sub = addActivityStateChangeListener((event) => {
      const idx = STEPS.findIndex((s) => s.label === event.value);
      if (idx !== -1) {
        stepRef.current = idx;
        setStepIndex(idx);
      }
    });
    return () => sub.remove();
  }, []);

  // Also sync on foreground (covers app restart / widget ending the activity)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncFromNative();
      }
    });
    return () => subscription.remove();
  }, [syncFromNative]);

  const accent = isDark ? '#FF6B35' : '#E8530E';
  const accentSoft = isDark ? 'rgba(255,107,53,0.12)' : 'rgba(232,83,14,0.08)';
  const cardBg = isDark ? '#1A1A1C' : '#F8F7F4';
  const cardBorder = isDark ? '#2A2A2E' : '#E8E6E1';
  const mutedText = isDark ? '#8E8E93' : '#8E8E93';
  const dangerBg = isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)';
  const danger = '#FF3B30';
  const stepDone = isDark ? '#30D158' : '#248A3D';
  const stepPending = isDark ? '#3A3A3C' : '#D1D1D6';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerLabel} themeColor="textSecondary">
            Live Activity Demo
          </ThemedText>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Order Tracker
          </ThemedText>
        </View>

        {!isActive ? (
          /* ── Idle state ── */
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            key="idle"
            style={styles.idleContainer}
          >
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>{'\uD83C\uDF55'}</ThemedText>
                <ThemedText style={styles.emptyTitle}>No active order</ThemedText>
                <ThemedText
                  style={styles.emptyDesc}
                  themeColor="textSecondary"
                >
                  Start a mock order to see Live Activity in action on your Lock
                  Screen and Dynamic Island.
                </ThemedText>
              </View>

              <AnimatedPressable
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={handleStart}
                entering={FadeIn.delay(200)}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Place Order
                </ThemedText>
              </AnimatedPressable>
            </View>

            <View style={styles.hintContainer}>
              <ThemedText style={[styles.hintText, { color: mutedText }]}>
                The Live Activity will appear on your Lock Screen with interactive
                buttons that update the order without opening the app.
              </ThemedText>
            </View>
          </Animated.View>
        ) : (
          /* ── Active order state ── */
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            exiting={FadeOut.duration(200)}
            key="active"
            style={styles.activeContainer}
            layout={LinearTransition}
          >
            {/* Order card */}
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              {/* Order header */}
              <View style={styles.orderHeader}>
                <View>
                  <ThemedText style={styles.orderNumber}>
                    Order #2137
                  </ThemedText>
                  <ThemedText
                    style={[styles.orderSubtitle, { color: mutedText }]}
                  >
                    Margherita, Pepperoni
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isComplete
                        ? isDark
                          ? 'rgba(48,209,88,0.15)'
                          : 'rgba(36,138,61,0.1)'
                        : accentSoft,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: isComplete ? stepDone : accent },
                    ]}
                  >
                    {isComplete ? 'Done' : 'In Progress'}
                  </ThemedText>
                </View>
              </View>

              {/* Current step display */}
              <Animated.View
                key={stepIndex}
                entering={FadeInUp.duration(300)}
                style={styles.currentStepContainer}
              >
                <ThemedText style={styles.stepEmoji}>
                  {currentStep.emoji}
                </ThemedText>
                <ThemedText style={styles.stepLabel}>
                  {currentStep.label}
                </ThemedText>
              </Animated.View>

              {/* Progress track */}
              <View style={styles.progressTrack}>
                {STEPS.map((step, i) => (
                  <View key={i} style={styles.progressStep}>
                    <View
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor:
                            i <= stepIndex ? stepDone : stepPending,
                        },
                        i === stepIndex && {
                          transform: [{ scale: 1.4 }],
                          backgroundColor: accent,
                        },
                      ]}
                    />
                    {i < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.progressLine,
                          {
                            backgroundColor:
                              i < stepIndex ? stepDone : stepPending,
                          },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* Step labels under dots */}
              <View style={styles.progressLabels}>
                {STEPS.map((step, i) => (
                  <ThemedText
                    key={i}
                    style={[
                      styles.progressLabelText,
                      {
                        color:
                          i === stepIndex
                            ? accent
                            : i < stepIndex
                              ? stepDone
                              : mutedText,
                        fontWeight: i === stepIndex ? '700' : '400',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {step.emoji}
                  </ThemedText>
                ))}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              {!isComplete && (
                <AnimatedPressable
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.actionButton,
                    styles.actionButtonFlex,
                    { backgroundColor: accent },
                  ]}
                  onPress={handleAdvance}
                >
                  <ThemedText style={styles.actionButtonText}>
                    Next Step
                  </ThemedText>
                </AnimatedPressable>
              )}

              <AnimatedPressable
                entering={FadeIn.duration(200).delay(100)}
                style={[
                  styles.actionButton,
                  isComplete && styles.actionButtonFlex,
                  { backgroundColor: isComplete ? accent : dangerBg },
                ]}
                onPress={handleEnd}
              >
                <ThemedText
                  style={[
                    styles.actionButtonText,
                    !isComplete && { color: danger },
                  ]}
                >
                  {isComplete ? 'Done' : 'Cancel'}
                </ThemedText>
              </AnimatedPressable>
            </View>

            <View style={styles.hintContainer}>
              <ThemedText style={[styles.hintText, { color: mutedText }]}>
                {isComplete
                  ? 'Order complete! Tap Done to dismiss the Live Activity.'
                  : 'Tap "Next" on the Lock Screen widget \u2014 it updates the activity without opening the app. Come back here to see the synced state.'}
              </ThemedText>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerLabel: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 24,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  orderSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentStepContainer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  stepEmoji: {
    fontSize: 48,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: '700',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginLeft: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  progressLabelText: {
    flex: 1,
    fontSize: 16,
    textAlign: 'left',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionButtonFlex: {
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  hintContainer: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
