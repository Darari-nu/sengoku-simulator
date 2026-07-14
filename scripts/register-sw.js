(function() {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  const depth = location.pathname.split("/").filter(Boolean).length > 1 ? "../../" : "./";
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${depth}sw.js`, { scope: depth }).catch(() => {});
  });
})();
