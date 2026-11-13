/**
 * A reload (F5, the browser's reload button, pull-to-refresh) opens the page from the top, with the
 * header in view, instead of where the visitor had scrolled to.
 *
 * Only a reload is touched. Back and Forward, inside the site or into it from elsewhere, keep the
 * browser's usual scroll restoration, and so do links to an #anchor.
 *
 * An inline script in <head>, not an effect: the browser restores the old position while the page is
 * still loading, before React has hydrated, so the switch to "manual" has to happen first. Chrome keeps
 * retrying that restoration after the load event as images and fonts grow the page, so "auto" comes
 * back only at the visitor's first own action (a tap, click, key or wheel). By then the browser has
 * given up restoring, and every later Back/Forward step restores as usual.
 *
 * On a first, uncached load Chrome can still restore the old position after all of this, so until the
 * visitor acts (or for 10 seconds) any scroll away from the top is undone: nobody but the browser is
 * scrolling the page at that point.
 */
const SCRIPT = `(function(){try{
var nav=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];
if(!nav||nav.type!=="reload"||location.hash||!("scrollRestoration" in history))return;
history.scrollRestoration="manual";
var top=function(){window.scrollTo(0,0)};
top();
document.addEventListener("DOMContentLoaded",top,{once:true});
window.addEventListener("load",top,{once:true});
var guard=function(){if(window.scrollY>0)top()};
window.addEventListener("scroll",guard,{passive:true});
var events=["pointerdown","keydown","wheel","touchstart"];
var back=function(){history.scrollRestoration="auto";window.removeEventListener("scroll",guard);events.forEach(function(e){window.removeEventListener(e,back,true)})};
events.forEach(function(e){window.addEventListener(e,back,{capture:true,passive:true})});
setTimeout(function(){window.removeEventListener("scroll",guard)},10000);
}catch(e){}})();`;

export default function ScrollTopOnReload() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
