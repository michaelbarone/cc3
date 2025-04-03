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
  duration = 500,
  disabled = false,
  visualFeedback = true,
  triggerHapticFeedback = true,
}: UseLongPressOptions): UseLongPressResult {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = useRef<HTMLElement | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const [progress, setProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handlePressStart = useCallback(
    (urlId: string) => {
      if (disabled) return;

      longPressTriggered.current = false;
      const startTime = Date.now();

      timeoutRef.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress();
        if (triggerHapticFeedback && navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, duration);

      // Start visual feedback
      if (visualFeedback) {
        setIsLongPressing(true);
        const updateProgress = () => {
          const elapsed = Date.now() - startTime;
          const newProgress = Math.min((elapsed / duration) * 100, 100);

          if (newProgress < 100 && isLongPressing) {
            setProgress(newProgress);
            requestAnimationFrame(updateProgress);
          }
        };
        requestAnimationFrame(updateProgress);
      }
    },
    [disabled, duration, onLongPress, triggerHapticFeedback, visualFeedback, isLongPressing],
  );

  const handlePressEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // End visual feedback
    if (visualFeedback) {
      setIsLongPressing(false);
      setProgress(0);
    }

    if (!disabled && !longPressTriggered.current && onClick) {
      onClick();
    }
  }, [disabled, onClick, visualFeedback]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      target.current = e.currentTarget as HTMLElement;
      const urlId = target.current.getAttribute("data-url-id");
      if (urlId) {
        handlePressStart(urlId);
      }
    },
    [handlePressStart],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handlePressEnd();
    },
    [handlePressEnd],
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (visualFeedback) {
        setIsLongPressing(false);
        setProgress(0);
      }
    },
    [visualFeedback],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      target.current = e.currentTarget as HTMLElement;
      const urlId = target.current.getAttribute("data-url-id");
      if (urlId) {
        handlePressStart(urlId);
      }
    },
    [handlePressStart],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      handlePressEnd();
    },
    [handlePressEnd],
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    progress,
    isLongPressing,
  };
}
