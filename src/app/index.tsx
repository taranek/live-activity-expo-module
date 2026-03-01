import { useState, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { startActivity, updateActivity, endActivity } from '../../modules/live-activity';

export default function HomeScreen() {
  const [activityId, setActivityId] = useState<string | null>(null);
  const progressRef = useRef(0);

  const handleStart = async () => {
    try {
      const id = await startActivity({
        title: 'Order Status',
        value: 'Preparing',
        progress: 0,
      });
      progressRef.current = 0;
      setActivityId(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUpdate = async () => {
    if (!activityId) return;
    try {
      const next = Math.min(progressRef.current + 0.25, 1);
      progressRef.current = next;
      const labels = ['Preparing', 'Cooking', 'Ready', 'Out for delivery', 'Delivered'];
      const label = labels[Math.min(Math.floor(next * 4), labels.length - 1)];
      await updateActivity(activityId, { value: label, progress: next });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleEnd = async () => {
    if (!activityId) return;
    try {
      await endActivity(activityId);
      setActivityId(null);
      progressRef.current = 0;
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Live Activity
        </ThemedText>

        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {activityId ? 'Activity is running' : 'No active activity'}
        </ThemedText>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, styles.startButton, activityId && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={!!activityId}
          >
            <ThemedText style={styles.buttonText}>Start</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.updateButton, !activityId && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={!activityId}
          >
            <ThemedText style={styles.buttonText}>Update</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.endButton, !activityId && styles.buttonDisabled]}
            onPress={handleEnd}
            disabled={!activityId}
          >
            <ThemedText style={styles.buttonText}>End</ThemedText>
          </Pressable>
        </View>
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
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
