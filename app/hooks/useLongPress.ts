"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LongPressOptions {
  /** Duration in ms before the long press is triggered */
  duration?: number;
  /** Delay in ms before showing visual feedback */
  feedbackDelay?: number;
  /** Callback when long press is triggered */
  onLongPress: () => void;
  /** Optional callback for click action (if not long-pressed) */
  onClick?: () => void;
  /** Optional callback for when long press starts (after feedback delay) */
  onLongPressStart?: () => void;
  /** Optional callback for when long press is cancelled */
  onLongPressCancel?: () => void;
}

/**
 * Custom hook for detecting long-press interactions
 * Provides progress tracking and visual feedback capabilities
 */
export function useLongPress({
  duration = 2000,
  feedbackDelay = 300,
  onLongPress,
  onClick,
  onLongPressStart,
  onLongPressCancel,
}: LongPressOptions) {
  // State to track if the long press is active
  const [isPressed, setIsPressed] = useState(false);
  // State to track visual feedback (after delay)
  const [showFeedback, setShowFeedback] = useState(false);
  // Progress value from 0 to 1
  const [progress, setProgress] = useState(0);

  // Refs to track timers and press start time
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clear all timers and animation frames
  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Reset all states
  const resetState = useCallback(() => {
    setIsPressed(false);
    setShowFeedback(false);
    setProgress(0);
    clearTimers();
  }, [clearTimers]);

  // Update progress animation
  const updateProgress = useCallback(() => {
    if (!isPressed) return;

    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min(elapsed / duration, 1);
    setProgress(newProgress);

    if (newProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPressed, duration]);

  // Start long press detection
  const startLongPress = useCallback(() => {
    clearTimers();
    setIsPressed(true);
    startTimeRef.current = Date.now();

    // Set up feedback timer (visual indicator delay)
    feedbackTimer.current = setTimeout(() => {
      setShowFeedback(true);
      if (onLongPressStart) onLongPressStart();
      updateProgress();
    }, feedbackDelay);

    // Set up long press timer
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      resetState();
    }, duration);
  }, [
    clearTimers,
    updateProgress,
    onLongPress,
    resetState,
    duration,
    feedbackDelay,
    onLongPressStart,
  ]);

  // Cancel long press
  const cancelLongPress = useCallback(() => {
    if (isPressed) {
      if (onLongPressCancel) onLongPressCancel();
      resetState();
    }
  }, [isPressed, onLongPressCancel, resetState]);

  // Handle click event (if not long-pressed)
  const handleClick = useCallback(() => {
    // Only trigger click if not in a long-press state or just starting
    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed < feedbackDelay && onClick) {
      onClick();
    }
    resetState();
  }, [onClick, resetState, feedbackDelay]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Return handlers and state for binding to elements
  return {
    handlers: {
      onMouseDown: startLongPress,
      onMouseUp: handleClick,
      onMouseLeave: cancelLongPress,
      onTouchStart: startLongPress,
      onTouchEnd: handleClick,
      onTouchCancel: cancelLongPress,
    },
    state: {
      isPressed,
      showFeedback,
      progress,
    },
  };
}
