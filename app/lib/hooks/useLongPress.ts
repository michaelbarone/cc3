import { useCallback, useRef } from 'react';
import { useIframeState } from '../state/iframe-state-context';

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
}

export function useLongPress({
  onClick,
  onLongPress,
  duration = 500,
  disabled = false,
  visualFeedback = true,
  triggerHapticFeedback = true
}: UseLongPressOptions): UseLongPressResult {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const target = useRef<HTMLElement | null>(null);
  const longPressTriggered = useRef<boolean>(false);

  // Get iframe state context
  const {
    startLongPress,
    endLongPress,
    updateLongPressProgress
  } = useIframeState();

  const handlePressStart = useCallback((urlId: string) => {
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
      startLongPress(urlId);
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);

        if (progress < 100) {
          updateLongPressProgress(progress);
          requestAnimationFrame(updateProgress);
        }
      };
      requestAnimationFrame(updateProgress);
    }
  }, [disabled, duration, onLongPress, triggerHapticFeedback, visualFeedback, startLongPress, updateLongPressProgress]);

  const handlePressEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // End visual feedback
    if (visualFeedback) {
      endLongPress();
    }

    if (!disabled && !longPressTriggered.current && onClick) {
      onClick();
    }
  }, [disabled, onClick, visualFeedback, endLongPress]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    target.current = e.currentTarget as HTMLElement;
    const urlId = target.current.getAttribute('data-url-id');
    if (urlId) {
      handlePressStart(urlId);
    }
  }, [handlePressStart]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlePressEnd();
  }, [handlePressEnd]);

  const onMouseLeave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (visualFeedback) {
      endLongPress();
    }
  }, [visualFeedback, endLongPress]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    target.current = e.currentTarget as HTMLElement;
    const urlId = target.current.getAttribute('data-url-id');
    if (urlId) {
      handlePressStart(urlId);
    }
  }, [handlePressStart]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlePressEnd();
  }, [handlePressEnd]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd
  };
}
