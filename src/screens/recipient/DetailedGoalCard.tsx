import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Goal } from '../../types';
import { goalService } from '../../services/GoalService';
import { userService } from '../../services/userService';
import { notificationService } from '../../services/NotificationService';
import { experienceGiftService } from '../../services/ExperienceGiftService';
import { RootStackParamList } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HintPopup from '../../components/HintPopup';
import { aiHintService } from '../../services/AIHintService';
import { useApp } from '../../context/AppContext';

interface DetailedGoalCardProps {
  goal: Goal;
  onFinish?: (goal: Goal) => void;
}

// ===== Debug switch =====
// Production default = false (one session per day).
const DEBUG_ALLOW_MULTIPLE_PER_DAY: boolean = true;

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}
function rollingWeek(start: Date) {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}
function day2(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

const COLORS = {
  purple: '#7C3AED',
  purpleDark: '#6D28D9',
  grayLight: '#E5E7EB',
  emerald: '#10B981',
  emeraldLight: '#34D399',
  text: '#111827',
  sub: '#6B7280',
};

// ===== Animated Capsule =====
const Capsule: React.FC<{
  isFilled: boolean;
  fillColor: string;
  emptyColor: string;
}> = ({ isFilled, fillColor, emptyColor }) => {
  const widthAnim = useRef(new Animated.Value(isFilled ? 1 : 0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const didAnimateIn = useRef(isFilled);

  useEffect(() => {
    if (isFilled && !didAnimateIn.current) {
      didAnimateIn.current = true;

      Animated.sequence([
        Animated.timing(widthAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.06,
              duration: 160,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(widthAnim, {
        toValue: isFilled ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [isFilled, widthAnim, glowAnim, scaleAnim]);

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <Animated.View style={[styles.capsule, { backgroundColor: emptyColor, transform: [{ scale: scaleAnim }] }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: fillColor,
            borderRadius: 50,
            shadowColor: fillColor,
            shadowOpacity,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
            elevation: (shadowOpacity as unknown as number),
          },
        ]}
      />
    </Animated.View>
  );
};

// ===== Animated Current Day Circle =====
const AnimatedFilledDay: React.FC<{ label: string }> = ({ label }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.12, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [fillAnim, scaleAnim]);

  return (
    <Animated.View style={[styles.filledCircle, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fillAnim }]}>
        <LinearGradient
          colors={['#7C3AED', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.filledCircle}
        />
      </Animated.View>
      <Text style={styles.dayTextFilled}>{label}</Text>
    </Animated.View>
  );
};

type UserProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Goals'>;

const DetailedGoalCard: React.FC<DetailedGoalCardProps> = ({ goal, onFinish }) => {
  const { state, dispatch } = useApp();
  const [currentGoal, setCurrentGoal] = useState(goal);
  const [empoweredName, setEmpoweredName] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<UserProfileNavigationProp>();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Popup State
  const [showHint, setShowHint] = useState(false);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [pendingHint, setPendingHint] = useState<string | null>(null);
  const [lastSessionNumber, setLastSessionNumber] = useState<number>(0);
  const timerState = state.goalTimers[currentGoal.id] || null;
  const isTimerRunning = Boolean(timerState?.isRunning);
  const canFinish = timeElapsed >= 5;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  useEffect(() => {
    if (currentGoal.empoweredBy) {
      userService.getUserName(currentGoal.empoweredBy).then(setEmpoweredName).catch(() => {});
    }
  }, [currentGoal.empoweredBy]);

  useEffect(() => {
    const computeElapsed = () => {
      if (!timerState) return 0;
      const base = timerState.elapsedBeforePause || 0;
      if (timerState.isRunning && timerState.startedAt) {
        return Math.floor((Date.now() - timerState.startedAt) / 1000) + base;
      }
      return base;
    };

    setTimeElapsed(computeElapsed());

    if (!timerState?.isRunning) {
      return;
    }

    const t = setInterval(() => {
      setTimeElapsed(computeElapsed());
    }, 1000);

    return () => clearInterval(t);
  }, [timerState?.isRunning, timerState?.startedAt, timerState?.elapsedBeforePause]);

  const handleStart = async () => {
    if (isTimerRunning || loading) return;

    const goalId = currentGoal.id;
    if (!goalId) return;

    setLoading(true);
    setTimeElapsed(0);
    setPendingHint(null);
    dispatch({
      type: 'START_GOAL_TIMER',
      payload: {
        goalId,
        startedAt: Date.now(),
        elapsedBeforePause: 0,
      },
    });

    try {
      const gift = await experienceGiftService.getExperienceGiftById(currentGoal.experienceGiftId);
      const recipientName = await userService.getUserName(currentGoal.userId);

      const totalSessionsDone =
        (currentGoal.currentCount * currentGoal.sessionsPerWeek) +
        (currentGoal.weeklyLogDates?.length || 0);
      const totalSessions = currentGoal.sessionsPerWeek * currentGoal.targetCount;
      
      if (totalSessionsDone != totalSessions) {
        // 🪄 Pre-generate hint now (AI call) but DON'T save to DB yet
        const hint = await aiHintService.generateHint({
          goalId,
          experienceType: gift?.experience?.title || 'experience',
          sessionNumber: totalSessionsDone + 1,
          totalSessions,
          userName: recipientName || undefined,
        });

        // Store hint only in memory (to show later when finishing)
        setPendingHint(hint);
      }

    } catch (err) {
      console.warn('Hint pre-generation failed:', err);
      dispatch({ type: 'CLEAR_GOAL_TIMER', payload: { goalId } });
      Alert.alert('Error', 'Could not start the session timer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (g: Goal) => {
    // @ts-ignore
    navigation.navigate('Roadmap', { goal: g });
  };

  const handleFinish = async () => {
    if (!isTimerRunning || !canFinish || loading) return;

    const goalId = currentGoal.id;
    if (!goalId) return;

    setLoading(true);

    try {
      const updated = await goalService.tickWeeklySession(goalId);

      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      setCurrentGoal(updated);

      const gift = await experienceGiftService.getExperienceGiftById(updated.experienceGiftId);
      const recipientName = await userService.getUserName(updated.userId);

      const totalSessionsDone =
        (updated.currentCount * updated.sessionsPerWeek) + (updated.weeklyLogDates?.length || 0);

      setLastSessionNumber(totalSessionsDone);
      dispatch({ type: 'CLEAR_GOAL_TIMER', payload: { goalId } });
      setTimeElapsed(0);

      if (updated.isCompleted) {
        await notificationService.createNotification(
          updated.empoweredBy,
          'goal_completed',
          `🎉 ${recipientName} just earned ${gift.experience.title}`,
          `Goal completed: ${updated.description}`,
          {
            goalId: updated.id,
            giftId: updated.experienceGiftId,
            giverId: updated.empoweredBy,
            recipientId: updated.userId,
            experienceTitle: gift.experience.title,
          }
        );
        onFinish?.(updated);
        navigation.navigate('Completion', { goal: updated, experienceGift: gift });
      } else {
        console.log(pendingHint);
        // save the hint to DB (after session is finished)
        const hintToShow = pendingHint || "Keep going! You're doing great 💪";
       
        if (pendingHint) {
          const hintObj = { session: totalSessionsDone, hint: pendingHint, date: Date.now() };
          await goalService.appendHint(goalId, hintObj);

          // Update local state hints array
          setCurrentGoal((prev) => ({
            ...prev,
            hints: [...(prev.hints || []), hintObj],
          }));
        }

        setLastHint(hintToShow);
        setShowHint(true);
        setPendingHint(null);

        await notificationService.createNotification(
          updated.empoweredBy,
          'goal_progress',
          `✅ ${recipientName} made progress on their goal`,
          `This week's progress: ${updated.weeklyCount}/${updated.sessionsPerWeek}
  Weeks completed: ${updated.currentCount}/${updated.targetCount}`,
          {
            goalId: updated.id,
            giftId: updated.experienceGiftId,
            giverId: updated.empoweredBy,
            recipientId: updated.userId,
            experienceTitle: gift.experience.title,
          }
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not update goal progress.');
    } finally {
      setLoading(false);
    }
  };

  // Calendar (anchored week)
  const weekDates = useMemo(() => {
    const start = currentGoal.weekStartAt ? new Date(currentGoal.weekStartAt) : new Date();
    start.setHours(0, 0, 0, 0);
    return rollingWeek(start);
  }, [currentGoal.weekStartAt]);

  const loggedSet = useMemo(() => new Set(currentGoal.weeklyLogDates || []), [currentGoal.weeklyLogDates]);

  const weeklyFilled = Math.max(0, currentGoal.weeklyCount || 0);
  const weeklyTotal = Math.max(1, currentGoal.sessionsPerWeek || 1);
  const overallFilled = Math.max(0, currentGoal.currentCount || 0);
  const overallTotal = Math.max(1, currentGoal.targetCount || 1);

  const renderCapsuleBar = (filled: number, total: number, fillColor: string, emptyColor: string) => {
    const items = Array.from({ length: Math.max(0, total) }, (_, i) => i < filled);
    return (
      <View style={styles.capsuleRow}>
        {items.map((isFilled, idx) => (
          <Capsule key={idx} isFilled={isFilled} fillColor={fillColor} emptyColor={emptyColor} />
        ))}
      </View>
    );
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const todayIso = isoDay(new Date());
  const alreadyLoggedToday = loggedSet.has(todayIso);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={() => handlePress(currentGoal)} style={{ borderRadius: 16 }}>
        <View style={styles.card}>
          <Text style={styles.title}>{currentGoal.title}</Text>
          {!!empoweredName && <Text style={styles.empoweredText}>⚡ Empowered by {empoweredName}</Text>}

          {/* Rolling week calendar */}
          <View style={styles.calendarRow}>
            {weekDates.map((d) => {
              const label = day2(d);
              const iso = isoDay(d);
              const filled = loggedSet.has(iso);
              const isToday = iso === todayIso;

              return (
                <View key={iso} style={styles.dayCell}>
                  {filled ? (
                    isToday ? (
                      <AnimatedFilledDay label={label} />
                    ) : (
                      <LinearGradient
                        colors={['#7C3AED', '#3B82F6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.filledCircle}
                      >
                        <Text style={styles.dayTextFilled}>{label}</Text>
                      </LinearGradient>
                    )
                  ) : (
                    <View style={styles.emptyCircle}>
                      <Text style={styles.dayTextEmpty}>{label}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Weekly Progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Sessions this week</Text>
              <Text style={styles.progressText}>
                {weeklyFilled}/{weeklyTotal}
              </Text>
            </View>
            {renderCapsuleBar(weeklyFilled, weeklyTotal, '#84b3e9ff', COLORS.grayLight)}
          </View>

          {/* Overall Progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Weeks completed</Text>
              <Text style={styles.progressText}>
                {overallFilled}/{overallTotal}
              </Text>
            </View>
            {renderCapsuleBar(overallFilled, overallTotal, '#84b3e9ff', COLORS.grayLight)}
          </View>

          {/* Timer Section */}
          {!isTimerRunning ? (
            alreadyLoggedToday && !DEBUG_ALLOW_MULTIPLE_PER_DAY ? (
              <View style={styles.disabledStartContainer}>
                <Text style={styles.disabledStartText}>You already made progress today</Text>
                <Text style={styles.disabledStartText}>Come back tomorrow for more 💪</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.startButton} onPress={handleStart} disabled={loading}>
                <Text style={styles.startButtonText}>{loading ? 'Loading...' : 'Start Session'}</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
              <TouchableOpacity
                style={[styles.finishButton, canFinish ? styles.finishButtonActive : styles.finishButtonDisabled]}
                onPress={handleFinish}
                disabled={!canFinish || loading}
              >
                <Text style={styles.finishButtonText}>{canFinish ? 'Finish Session' : 'Complete Session'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Pressable>

      {/* Hint Popup */}
      <HintPopup
        visible={showHint}
        hint={lastHint || ''}
        sessionNumber={lastSessionNumber}
        totalSessions={overallTotal}
        onClose={() => setShowHint(false)}
      />
    </Animated.View>
  );
};

const CIRCLE = 38;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  empoweredText: { fontSize: 14, color: '#6b7280', marginBottom: 14 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dayCell: { alignItems: 'center', width: CIRCLE },
  emptyCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayTextEmpty: { color: '#6b7280', fontWeight: '600' },
  dayTextFilled: { color: '#fff', fontWeight: '700' },
  progressBlock: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: '#4b5563' },
  progressText: { color: '#111827', fontWeight: '600' },
  capsuleRow: { flexDirection: 'row', gap: 3 },
  capsule: {
    flex: 1,
    height: 12,
    borderRadius: 50,
    backgroundColor: COLORS.grayLight,
    overflow: 'hidden',
  },
  disabledStartContainer: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  disabledStartText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  startButton: { backgroundColor: '#235c9eff', paddingVertical: 14, borderRadius: 12 },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  timerContainer: { alignItems: 'center' },
  timerText: { fontSize: 36, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  finishButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  finishButtonActive: { backgroundColor: '#7c3aed' },
  finishButtonDisabled: { backgroundColor: '#9ca3af' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default DetailedGoalCard;