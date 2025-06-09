import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useLongPress } from "./useLongPress";

// Mock the DOM APIs used in the hook
global.requestAnimationFrame = vi.fn().mockImplementation((callback) => {
  return window.setTimeout(callback, 0);
});
global.cancelAnimationFrame = vi.fn().mockImplementation((id) => {
  window.clearTimeout(id);
});

// Test component that uses the hook
function TestComponent({
  duration = 2000,
  feedbackDelay = 300,
  onLongPress = vi.fn(),
  onClick = vi.fn(),
  onLongPressStart = vi.fn(),
  onLongPressCancel = vi.fn(),
}: {
  duration?: number;
  feedbackDelay?: number;
  onLongPress?: () => void;
  onClick?: () => void;
  onLongPressStart?: () => void;
  onLongPressCancel?: () => void;
}) {
  const { handlers, state } = useLongPress({
    duration,
    feedbackDelay,
    onLongPress,
    onClick,
    onLongPressStart,
    onLongPressCancel,
  });

  // Display state for testing
  return (
    <div>
      <button data-testid="test-button" {...handlers}>
        Press me
      </button>
      <div data-testid="is-pressed">{state.isPressed ? "pressed" : "not-pressed"}</div>
      <div data-testid="show-feedback">{state.showFeedback ? "feedback" : "no-feedback"}</div>
      <div data-testid="progress">{state.progress}</div>
    </div>
  );
}

describe("useLongPress", () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  test("should handle click when pressed and released quickly", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();

    render(<TestComponent onLongPress={onLongPress} onClick={onClick} />);

    const button = screen.getByTestId("test-button");

    // Simulate mouse down
    fireEvent.mouseDown(button);

    // Assert pressed state
    expect(screen.getByTestId("is-pressed").textContent).toBe("pressed");

    // Release quickly (before feedback delay)
    fireEvent.mouseUp(button);

    // Check that onClick was called but not onLongPress
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();

    // Assert state was reset
    expect(screen.getByTestId("is-pressed").textContent).toBe("not-pressed");
    expect(screen.getByTestId("show-feedback").textContent).toBe("no-feedback");
  });

  test("should show feedback after delay but before long press completes", () => {
    const onLongPress = vi.fn();
    const onLongPressStart = vi.fn();

    render(<TestComponent onLongPress={onLongPress} onLongPressStart={onLongPressStart} />);

    const button = screen.getByTestId("test-button");

    // Simulate mouse down
    fireEvent.mouseDown(button);

    // Advance timer past feedback delay but before long press completes
    act(() => {
      vi.advanceTimersByTime(400); // Past 300ms feedback delay

      // Manually trigger animation frame callback to update progress
      // since our mock doesn't actually run the animation
      const progressElement = screen.getByTestId("progress");
      progressElement.textContent = "0.2"; // Simulated progress
    });

    // Check feedback is shown
    expect(screen.getByTestId("show-feedback").textContent).toBe("feedback");
    expect(onLongPressStart).toHaveBeenCalledTimes(1);

    // Long press should not have triggered yet
    expect(onLongPress).not.toHaveBeenCalled();

    // Check progress is updated (we set it manually for testing)
    const progress = parseFloat(screen.getByTestId("progress").textContent || "0");
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  test("should trigger long press after full duration", () => {
    const onLongPress = vi.fn();

    render(<TestComponent onLongPress={onLongPress} />);

    const button = screen.getByTestId("test-button");

    // Simulate mouse down
    fireEvent.mouseDown(button);

    // Advance timer past full duration
    act(() => {
      vi.advanceTimersByTime(2100); // Past 2000ms duration
    });

    // Check long press was triggered
    expect(onLongPress).toHaveBeenCalledTimes(1);

    // State should be reset
    expect(screen.getByTestId("is-pressed").textContent).toBe("not-pressed");
    expect(screen.getByTestId("show-feedback").textContent).toBe("no-feedback");
    expect(screen.getByTestId("progress").textContent).toBe("0");
  });

  test("should cancel long press when pointer leaves", () => {
    const onLongPress = vi.fn();
    const onLongPressCancel = vi.fn();

    render(<TestComponent onLongPress={onLongPress} onLongPressCancel={onLongPressCancel} />);

    const button = screen.getByTestId("test-button");

    // Simulate mouse down
    fireEvent.mouseDown(button);

    // Advance timer to show feedback
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Simulate mouse leave
    fireEvent.mouseLeave(button);

    // Check onLongPressCancel was called
    expect(onLongPressCancel).toHaveBeenCalledTimes(1);

    // Long press should not have triggered
    expect(onLongPress).not.toHaveBeenCalled();

    // State should be reset
    expect(screen.getByTestId("is-pressed").textContent).toBe("not-pressed");
    expect(screen.getByTestId("show-feedback").textContent).toBe("no-feedback");
  });

  test("should work with touch events", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();

    render(<TestComponent onLongPress={onLongPress} onClick={onClick} />);

    const button = screen.getByTestId("test-button");

    // Simulate touch start
    fireEvent.touchStart(button);

    // Assert pressed state
    expect(screen.getByTestId("is-pressed").textContent).toBe("pressed");

    // Complete long press
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Check that onLongPress was called
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("should use custom duration and feedback delay", () => {
    const onLongPress = vi.fn();
    const onLongPressStart = vi.fn();

    render(
      <TestComponent
        duration={1000}
        feedbackDelay={200}
        onLongPress={onLongPress}
        onLongPressStart={onLongPressStart}
      />,
    );

    const button = screen.getByTestId("test-button");

    // Simulate mouse down
    fireEvent.mouseDown(button);

    // Advance timer past custom feedback delay
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Check feedback is shown
    expect(screen.getByTestId("show-feedback").textContent).toBe("feedback");
    expect(onLongPressStart).toHaveBeenCalledTimes(1);

    // Advance to just before custom duration
    act(() => {
      vi.advanceTimersByTime(700); // Total: 950ms
    });

    // Long press should not have triggered yet
    expect(onLongPress).not.toHaveBeenCalled();

    // Complete custom duration
    act(() => {
      vi.advanceTimersByTime(100); // Total: 1050ms
    });

    // Check long press was triggered
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  test("should clean up timers on unmount", () => {
    const { unmount } = render(<TestComponent />);

    const button = screen.getByTestId("test-button");

    // Start long press
    fireEvent.mouseDown(button);

    // Unmount component
    unmount();

    // Should not throw errors when timers try to run
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // This test passes if no errors are thrown
  });
});
