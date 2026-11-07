// The theme is the `dark` class on <html>. A saved choice ("light" or "dark") wins; without one the site
// follows the operating system. THEME_SCRIPT runs in <head> before paint so pages never flash.
//
// This module must stay a plain (server-safe) module, NOT "use client": the root layout (a server component)
// inlines THEME_SCRIPT into <head>. Imported from a "use client" file it becomes a client reference, so the
// browser can only hydrate <head> after the layout's JS chunks have loaded. Under load they arrive late, <head>
// suspends outside any Suspense boundary and React throws hydration error #418 and re-renders the whole
// document (dropping the font preload). See tests/unit/client-boundary.test.ts.
export const THEME_STORAGE_KEY = "theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
