// Shared labels for test integrity-log events (student result page and
// the instructor attempts view). The wording stays factual — these are
// things the browser recorded happening in the test window.
export const EVENT_LABELS = {
  tab_hidden: "Tab hidden / switched away",
  tab_visible: "Returned to the tab",
  fullscreen_entered: "Entered fullscreen",
  fullscreen_exited: "Exited fullscreen",
  window_blur: "Test window lost focus",
  window_focus: "Test window regained focus",
  copy_attempt: "Copy attempt",
  paste_attempt: "Paste attempt",
  context_menu: "Right-click menu opened",
};

export const eventLabel = (type) => EVENT_LABELS[type] || type;

export const formatEventDetail = (event) => {
  const parts = [];
  if (event.durationMs != null) {
    const secs = Math.round(event.durationMs / 1000);
    parts.push(secs >= 1 ? `away for ${secs}s` : `away for ${event.durationMs}ms`);
  }
  if (event.charCount != null) {
    parts.push(`${event.charCount} characters`);
  }
  return parts.join(" · ");
};

export const formatClock = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : "—";
