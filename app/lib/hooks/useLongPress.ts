/// <reference types="node" />
import React, { useCallback, useEffect, useRef, useState } from "react";

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
  onTouchMove: (e: React.TouchEvent) => void;
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
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const animationStartDelay = 300; // 0.3 seconds delay before animation starts
  const touchMoveTolerance = 10; // Pixels of movement allowed before canceling click

  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      // Store touch start position for touch events
      if (e.type.startsWith("touch")) {
        const touchEvent = e as React.TouchEvent;
        const touch = touchEvent.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        // Don't prevent default to allow scrolling
        // e.preventDefault(); - removing this line
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
          touchStartPos.current = null;
        }
      }, 10);
    },
    [disabled, duration, onLongPress, triggerHapticFeedback],
  );

  // Add touch move handler to detect scrolling
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || !pressStarted.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If user has moved finger more than the tolerance, consider it a scroll, not a tap
    if (deltaX > touchMoveTolerance || deltaY > touchMoveTolerance) {
      // Cancel the timer and reset state
      if (pressTimer.current !== null) {
        window.clearInterval(pressTimer.current);
        pressTimer.current = null;
      }
      setIsLongPressing(false);
      setProgress(0);
      pressStarted.current = false;
    }
  }, []);

  const handlePressEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Clear the timer first
      if (pressTimer.current !== null) {
        window.clearInterval(pressTimer.current);
        pressTimer.current = null;
      }

      // For touch events, check if it was a scroll or a tap
      if (e.type.startsWith("touch")) {
        const touchEvent = e as React.TouchEvent;

        // If we have a touch start position and it's a tap (not a scroll)
        if (touchStartPos.current && pressStarted.current && !longPressTriggered.current) {
          const touch = touchEvent.changedTouches[0];
          const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
          const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

          // Only trigger click if the finger hasn't moved much (it's a tap, not a scroll)
          if (deltaX <= touchMoveTolerance && deltaY <= touchMoveTolerance && onClick) {
            onClick();
          }
        }
      } else if (!disabled && pressStarted.current && !longPressTriggered.current && onClick) {
        // For mouse events, proceed as before
        onClick();
      }

      // Reset state
      setIsLongPressing(false);
      setProgress(0);
      pressStarted.current = false;
      touchStartPos.current = null;
    },
    [disabled, onClick, touchMoveTolerance],
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
    touchStartPos.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
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
    onTouchMove: handleTouchMove,
    onTouchEnd: handlePressEnd,
    progress,
    isLongPressing,
  };
}
