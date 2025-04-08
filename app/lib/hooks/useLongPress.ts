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
  duration = 1000,
  disabled = false,
  visualFeedback = true,
  triggerHapticFeedback = true,
}: UseLongPressOptions): UseLongPressResult {
  const [progress, setProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const pressStartTime = useRef<number>(0);

  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      pressStartTime.current = Date.now();
      setIsLongPressing(true);

      pressTimer.current = window.setInterval(() => {
        const elapsed = Date.now() - pressStartTime.current;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (newProgress >= 100) {
          handlePressEnd();
          onLongPress();
          if (triggerHapticFeedback && navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }, 10);
    },
    [disabled, duration, onLongPress, triggerHapticFeedback],
  );

  const handlePressEnd = useCallback(() => {
    if (
      !disabled &&
      pressTimer.current !== null &&
      (!isLongPressing || (pressTimer.current && pressTimer?.current < 100)) &&
      onClick
    ) {
      onClick();
    }
    console.log("handleClick" + JSON.stringify(pressTimer.current));

    if (pressTimer.current !== null) {
      window.clearInterval(pressTimer.current);
      pressTimer.current = null;
    }
    setIsLongPressing(false);
    setProgress(0);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Only trigger click if we haven't started a long press
      // or if the long press didn't complete
      if (!disabled && (!isLongPressing || progress < 100) && onClick) {
        onClick();
      }
      console.log("handleClick", e);
    },
    [disabled, isLongPressing, progress, onClick],
  );

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
    onMouseLeave: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
    progress,
    isLongPressing,
  };
}
