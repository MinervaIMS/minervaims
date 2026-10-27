import {
  APPLICATION_ROW_ELEMENT_ID, COUNT_START_GLOBAL, HERO_FIGURE_FIELDS, HOME_HERO_FIGURES,
  PRERENDER_ATTRIBUTE, PRERENDER_TEMPLATE_ID, STATIC_INTRO_ATTRIBUTE,
} from './src/lib/prerender-names';
import { KEY_NUMBERS_ELEMENT_ID } from './src/lib/key-numbers';

// =====================================================================
// THE HOMEPAGE'S FIRST SCREEN: THE PAGE'S OWN SCRIPTS (Step 102).
// ---------------------------------------------------------------------
// What vite.prerender.ts writes into dist/index.html, kept apart from the
// build so that it can be read and tested on its own
// (scripts/page-speed.test.mjs). Three small inline scripts:
//
//   head   at every address: on the homepage, preload its logo (and the
//          intro's on a phone's first visit); anywhere else, preload the
//          app's scripts at once, as the built page always did;
//   stamp  after #root, on the homepage only: copy the first screen into
//          place, start the figures' count, colour the page as RouteChrome
//          does, place the hero's calm as HeroMarketBackground does, and on
//          a phone's first visit play the intro as Preloader does;
//   boot   at the end of the body: start the app, at once anywhere but on
//          the homepage's first screen, where it starts once the browser
//          has painted the logo.
//
// They are written the old way (var, no arrows) so that every browser that
// can run the site can run them, and each is wrapped so that a failure
// leaves the page to the app, as it was.
// =====================================================================

/** The count's duration: HeroFigure's (checked by scripts/page-speed.test.mjs). */
export const COUNT_MS = 3200;
/** The phone intro's own sessionStorage key and width (App.tsx). */
export const INTRO_KEY = '__mims_intro__';
export const INTRO_MAX_WIDTH = 1024;
/** When the intro starts to reveal the page: logo in 480ms, held 880ms, out 380ms (Preloader). */
export const INTRO_REVEAL_MS = 480 + 880 + 380;
/** Never wait longer than this for the logo before starting the app. */
export const BOOT_CAP_MS = 2500;

/** What the build learns from the site's own modules (src/prerender/first-screen.tsx). */
export interface FirstScreenFacts {
  /** The hero's logo, and the intro's, at their built addresses. */
  heroLogo: string;
  introLogo: string;
  /** The page's colours at the homepage, as RouteChrome sets them. */
  chrome: { theme: string; base: string; bottom: string };
}

/** The id of the application settings row the build embeds. */
export { APPLICATION_ROW_ELEMENT_ID };

/** The inline scripts, as small and as old-fashioned as they can be. */
export function pageScripts(m: FirstScreenFacts, entry: string, preloads: string[], loaderImages: string[]) {
  const S = JSON.stringify;
  const head = `(function(){try{var d=document,h=d.head,b=window.__mimsBoot={home:location.pathname==='/'},i,l;`
    // The homepage: its logo, and on a phone's first visit the intro's.
    + `if(b.home){var p=[${S(m.heroLogo)}];try{if(innerWidth<${INTRO_MAX_WIDTH}&&!sessionStorage.getItem(${S(INTRO_KEY)}))p.unshift(${S(m.introLogo)})}catch(e){}`
    + `for(i=0;i<p.length;i++){l=d.createElement('link');l.rel='preload';l.as='image';l.href=p[i];l.setAttribute('fetchpriority','high');h.appendChild(l);}return;}`
    + `var m=${S([entry, ...preloads])};for(i=0;i<m.length;i++){l=d.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=m[i];h.appendChild(l);}`
    + `var g=${S(loaderImages)};if(window.matchMedia&&matchMedia('(max-width: 767px)').matches){for(i=0;i<g.length;i++){l=d.createElement('link');l.rel='preload';l.as='image';l.href=g[i];l.setAttribute('fetchpriority','high');h.appendChild(l);}}`
    + `}catch(e){}})();`;

  const C = S(COUNT_START_GLOBAL);
  const stamp = `(function(){var d=document,de=d.documentElement,b=window.__mimsBoot,S=JSON.stringify,W=window;if(!b||!b.home)return;try{`
    + `var t=d.getElementById(${S(PRERENDER_TEMPLATE_ID)}),r=d.getElementById('root');if(!t||!r||!t.content)return;`
    // The same figures the app will show (hooks/useKeyNumbers: the newer of
    // the page's copy and the one kept from a visit): if they differ, the
    // app draws the page as it always has.
    + `var F=${S(HOME_HERO_FIGURES)},K=${S(HERO_FIGURE_FIELDS)};try{var c=JSON.parse(localStorage.getItem('mims_key_figures')||'null'),k=d.getElementById(${S(KEY_NUMBERS_ELEMENT_ID)}),e=k?JSON.parse(k.textContent||'null'):null,`
    + `at=function(s){return s&&s.computed_at?Date.parse(s.computed_at)||0:0};if(c&&c.numbers&&at(c)>at(e)){for(var i=0;i<F.length;i++)for(var j=0;j<K.length;j++){`
    + `if(S(((e&&e.numbers&&e.numbers[F[i]])||{})[K[j]])!==S((c.numbers[F[i]]||{})[K[j]]))return;}}}catch(x){}`
    // On a phone's first visit the intro plays over the screen (below).
    + `var ok=false;try{ok=innerWidth<${INTRO_MAX_WIDTH}&&!sessionStorage.getItem(${S(INTRO_KEY)})}catch(x){}`
    // The figures count from 0+, from the moment the hero is seen: at once,
    // or once the intro starts to reveal it (its start is not known until
    // the intro starts, hence Infinity until then). HeroFigure reads the
    // same moment and carries the count on.
    + `var f=t.content.cloneNode(true),q=f.querySelectorAll('.kn-count[data-target]'),rm=false,n;`
    + `try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(x){}`
    + `if(!rm&&q.length){W[${C}]=ok?Infinity:performance.now();for(n=0;n<q.length;n++){q[n].setAttribute('data-counting','on');q[n].querySelector('.kn-count-face').setAttribute('data-count','0+');}}`
    + `while(r.firstChild)r.removeChild(r.firstChild);r.appendChild(f);de.setAttribute(${S(PRERENDER_ATTRIBUTE)},'home');b.stamped=true;`
    // The page's colours, as RouteChrome sets them at this address.
    + `de.style.backgroundColor=${S(m.chrome.base)};de.style.setProperty('--chrome-bottom',${S(m.chrome.bottom)});de.style.setProperty('--chrome-base',${S(m.chrome.base)});de.setAttribute('data-surface',${S(m.chrome.base.toLowerCase() === '#ffffff' ? 'light' : 'dark')});`
    // The calm over the logo, placed as HeroMarketBackground's place() does.
    + `try{var sh=r.querySelector('[data-hero-shade]'),lo=r.querySelector('[data-hero-keepout="logo"]');if(sh&&lo){var ba=sh.parentNode.getBoundingClientRect(),lr=lo.getBoundingClientRect();`
    + `sh.style.setProperty('--calm-x',Math.round((lr.left+lr.right)/2-ba.left)+'px');sh.style.setProperty('--calm-y',Math.round((lr.top+lr.bottom)/2-ba.top)+'px');`
    + `sh.style.setProperty('--calm-rx',Math.round(lr.width*0.78)+'px');sh.style.setProperty('--calm-ry',Math.round(lr.height*0.72)+'px');}}catch(x){}`
    // The count: HeroFigure's duration and curve, until the app takes over.
    + `if(!rm&&q.length){var g=[],o=[];for(n=0;n<q.length;n++){g.push(+q[n].getAttribute('data-target'));o.push(q[n].querySelector('.kn-count-face'));}`
    + `var dr=function(w){var p=Math.max(0,Math.min((w-W[${C}])/${COUNT_MS},1)),v=1-Math.pow(1-p,3),a=false;for(var y=0;y<q.length;y++){if(!q[y].isConnected)continue;a=true;o[y].setAttribute('data-count',Math.round(g[y]*v)+'+');if(p>=1)q[y].removeAttribute('data-counting');}if(a&&p<1)requestAnimationFrame(dr);};requestAnimationFrame(dr);}`
    // The phone intro, as components/shared/Preloader plays it.
    + `if(!ok)return;`
    + `de.setAttribute(${S(STATIC_INTRO_ATTRIBUTE)},'static');var ov=d.createElement('div'),im=d.createElement('img'),go=false;ov.setAttribute('aria-hidden','true');`
    + `ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background-color:#1F0F4D;will-change:transform;transform-origin:center center';`
    + `im.src=${S(m.introLogo)};im.alt='';im.draggable=false;im.decoding='async';`
    + `im.style.cssText='width:clamp(140px, 16vw, 240px);height:auto;user-select:none;pointer-events:none;will-change:opacity, transform;opacity:0;transform:scale(0.94);visibility:hidden';`
    + `ov.appendChild(im);d.body.appendChild(ov);d.body.style.overflow='hidden';`
    + `var end=function(){try{sessionStorage.setItem(${S(INTRO_KEY)},'1')}catch(x){}d.body.style.overflow='';if(ov.parentNode)ov.parentNode.removeChild(ov);};`
    + `var st=function(){if(go)return;go=true;im.style.visibility='visible';var now=performance.now();if(!ov.animate){if(W[${C}]===Infinity)W[${C}]=now;end();return;}`
    + `var plan=W[${C}]===Infinity;if(plan)W[${C}]=now+${INTRO_REVEAL_MS};`
    + `im.animate([{opacity:0,transform:'scale(0.94)'},{opacity:0.9,transform:'scale(1)'}],{duration:480,easing:'cubic-bezier(0.25,0.46,0.45,0.94)',fill:'forwards'});`
    + `im.animate([{opacity:0.9},{opacity:0}],{duration:380,delay:1360,easing:'cubic-bezier(0.55,0.085,0.68,0.53)',fill:'forwards'});`
    + `var an=ov.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:720,delay:${INTRO_REVEAL_MS},easing:'cubic-bezier(0.645,0.045,0.355,1)',fill:'forwards'});an.onfinish=end;`
    // The count starts on the very frame the page starts to be revealed.
    + `if(plan&&an.ready&&an.ready.then)an.ready.then(function(){if(typeof an.startTime==='number')W[${C}]=an.startTime+${INTRO_REVEAL_MS};},function(){});};`
    + `var dc=im.decode?im.decode():null;if(dc&&dc.then)dc.then(st,st);else if(im.complete)st();else{im.onload=st;im.onerror=st;}setTimeout(st,1400);`
    + `}catch(e){}})();`;

  const boot = `(function(){var d=document,b=window.__mimsBoot||{},on=false;`
    + `var go=function(){if(on)return;on=true;var h=d.head,m=${S(preloads)},i,l;for(i=0;i<m.length;i++){if(h.querySelector('link[rel="modulepreload"][href="'+m[i]+'"]'))continue;l=d.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=m[i];h.appendChild(l);}`
    + `var s=d.createElement('script');s.type='module';s.crossOrigin='';s.src=${S(entry)};h.appendChild(s);};`
    + `if(!b.stamped){go();return;}`
    // The homepage's first screen is on screen: the app is fetched once the
    // browser reports its logo as painted (where it can say so), otherwise
    // a frame after the logo has loaded, and never later than the cap.
    + `var lg=d.querySelector('#root [data-hero-keepout="logo"]'),af=function(){requestAnimationFrame(function(){setTimeout(go,0)})},po=null;`
    + `try{var P=window.PerformanceObserver;if(lg&&P&&P.supportedEntryTypes&&P.supportedEntryTypes.indexOf('largest-contentful-paint')>=0){`
    + `po=new P(function(l){var e=l.getEntries();for(var i=0;i<e.length;i++)if(e[i].element===lg){po.disconnect();setTimeout(go,0);return;}});po.observe({type:'largest-contentful-paint',buffered:true});}}catch(x){po=null;}`
    + `if(lg){lg.addEventListener('error',function(){setTimeout(go,0)});}`
    + `if(!po){if(lg&&!lg.complete)lg.addEventListener('load',af);else af();}setTimeout(go,${BOOT_CAP_MS});})();`;

  return { head, stamp, boot };
}

/** dist/index.html with the first screen and the deferred start, or null if its shape is not the expected one. */
export function rewriteIndexHtml(html: string, m: FirstScreenFacts, firstScreen: string): string | null {
  const entryTag = html.match(/<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/);
  if (!entryTag) return null;
  const preloadRe = /<link rel="modulepreload" crossorigin href="(\/assets\/[^"]+\.js)">/g;
  const preloads = [...html.matchAll(preloadRe)].map((x) => x[1]);
  const loaderRe = /<link rel="preload" as="image" href="(\/__l5e\/[^"]+loader\.webp[^"]*)" fetchpriority="high" media="\(max-width: 767px\)" \/>/g;
  const loaderImages = [...html.matchAll(loaderRe)].map((x) => x[1]);
  const rootRe = /<div id="root">[\s\S]*?<\/div><\/div>/;
  if (!rootRe.test(html) || !html.includes('</body>')) return null;
  const { head, stamp, boot } = pageScripts(m, entryTag[1], preloads, loaderImages);
  const rootDiv = html.match(rootRe)![0];
  let out = html.replace(entryTag[0], `<script>${head}</script>`);
  out = out.replace(preloadRe, '').replace(loaderRe, '');
  out = out.replace(rootDiv, `<template id="${PRERENDER_TEMPLATE_ID}">${firstScreen}</template>\n    ${rootDiv}\n    <script>${stamp}</script>`);
  out = out.replace('</body>', `  <script>${boot}</script>\n  </body>`);
  return out;
}
