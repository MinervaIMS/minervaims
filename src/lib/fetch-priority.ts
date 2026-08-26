// =====================================================================
// `fetchpriority`, spelled the way this version of React can pass on.
// ---------------------------------------------------------------------
// Three images on the site asked for `fetchPriority="high"`: the loader's
// lock-up, the homepage hero and the workspace's Associazioni in Mostra
// card. All three are the largest element on their surface, so the hint
// is exactly the right one to give.
//
// React 18 does not know the camelCase `fetchPriority` prop. It does not
// pass it through: it logs "React does not recognize the fetchPriority
// prop on a DOM element" and DROPS THE ATTRIBUTE. So the hint reached no
// browser, on any of the three, while the warning was printed on every
// single page load - the loader is mounted on every navigation to a lazy
// route, which is every route but the homepage.
//
// Lowercase is what the HTML specification actually defines, and React
// forwards an unrecognised lowercase attribute to the DOM untouched and
// without complaint. The attribute now arrives, the browser honours it,
// and the console is quiet.
//
// It is a plain `Record<string, string>` so that TypeScript accepts the
// spread: `ImgHTMLAttributes` has no member of this name in the React 18
// type definitions either, for the same reason.
// =====================================================================

export const HIGH_FETCH_PRIORITY: Record<string, string> = { fetchpriority: 'high' };
