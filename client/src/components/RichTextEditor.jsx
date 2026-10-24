import React, { useEffect, useMemo, useRef, useState } from 'react';
import JoditEditor from 'jodit-react';

// Jodit ships a light surface by default: in the site's dark mode the
// editor stayed paper-white while the app's foreground colour (nearly
// white) was inherited into it — white text on a white box, unreadable.
// Track the site's theme from the <html> class (set by ThemeProvider)
// and hand Jodit its matching built-in theme; the CSS overrides in
// index.css (.dark .jodit-…) pin the surface/text colours to the app's
// design tokens as a second guarantee.
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

const RichTextEditor = ({ input, setInput }) => {
  const editor = useRef(null);
  const isDark = useIsDarkMode();

  const config = useMemo(
    () => ({
      theme: isDark ? 'dark' : 'default',
      placeholder: 'Write the course description…',
    }),
    [isDark]
  );

  const handleChange = (newContent) => {
    setInput({ ...input, description: newContent });
  };

  return (
    <JoditEditor
      // Jodit applies its theme at construction time only — remount when
      // the site theme flips so the editor follows it.
      key={isDark ? 'dark' : 'light'}
      ref={editor}
      value={input.description}
      config={config}
      onChange={handleChange}
    />
  );
};

export default RichTextEditor;
