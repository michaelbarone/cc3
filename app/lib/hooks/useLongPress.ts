/// <reference types="node" />
import React, { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  onClick?: () => void;
  onLongPress: () => void;
  duration?: number;
  disabled?: boolean;
  visualFeedback?: boolean;
  triggerHapticFeedback?: boolean;
}

interface UseLongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  progress: number;
  isLongPressing: boolean;
}

export function useLongPress({
  onClick,
  onLongPress,
  duration = 2000, // 2 seconds as per requirements
  disabled = false,
  visualFeedback = true,
  triggerHapticFeedback = true, // Enable haptic feedback by default
}: UseLongPressOptions): UseLongPressResult {
  const [progress, setProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const pressStartTime = useRef<number>(0);
  const longPressTriggered = useRef<boolean>(false);
  const pressStarted = useRef<boolean>(false);
  const animationStartDelay = 300; // 0.3 seconds delay before animation starts

  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      // Only prevent default for touch events to allow normal click behavior
      if (e.type.startsWith("touch")) {
        e.preventDefault();
      }

      // Mark that a real press has started
      pressStarted.current = true;
      // Reset long press tracker at the start of a new press
      longPressTriggered.current = false;
      pressStartTime.current = Date.now();
      setIsLongPressing(true);

      pressTimer.current = window.setInterval(() => {
        const elapsed = Date.now() - pressStartTime.current;

        // Only start showing progress after the delay
        if (elapsed < animationStartDelay) {
          setProgress(0);
          return;
        }

        // Calculate progress based on time after delay
        const adjustedElapsed = elapsed - animationStartDelay;
        const newProgress = Math.min(
          (adjustedElapsed / (duration - animationStartDelay)) * 100,
          100,
        );
        setProgress(newProgress);

        if (newProgress >= 100) {
          // Mark that a long press has occurred
          longPressTriggered.current = true;

          // Stop the timer
          if (pressTimer.current !== null) {
            window.clearInterval(pressTimer.current);
            pressTimer.current = null;
          }

          // Trigger long press action
          onLongPress();

          // Trigger haptic feedback on mobile devices
          if (triggerHapticFeedback && navigator.vibrate) {
            navigator.vibrate(50);
          }

          // Reset pressing state
          setIsLongPressing(false);
          setProgress(0);
          pressStarted.current = false;
        }
      }, 10);
    },
    [disabled, duration, onLongPress, triggerHapticFeedback],
  );

  const handlePressEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Clear the timer first
      if (pressTimer.current !== null) {
        window.clearInterval(pressTimer.current);
        pressTimer.current = null;
      }

      // Only trigger click if a press actually started and it wasn't a long press
      if (!disabled && pressStarted.current && !longPressTriggered.current && onClick) {
        // This was a regular click, not a long press
        onClick();
      }

      // Reset state
      setIsLongPressing(false);
      setProgress(0);
      pressStarted.current = false;
    },
    [disabled, onClick],
  );

  // Special handler for mouse leave - should NOT trigger click
  const handleMouseLeave = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearInterval(pressTimer.current);
      pressTimer.current = null;
    }

    // Just reset state without triggering click
    setIsLongPressing(false);
    setProgress(0);
    pressStarted.current = false;
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pressTimer.current !== null) {
        window.clearInterval(pressTimer.current);
      }
    };
  }, []);

  return {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    progress,
    isLongPressing,
  };
}
