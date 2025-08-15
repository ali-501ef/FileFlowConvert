/* Minimal: keeps placeholders, reserves space, and provides a hook
   for later ad network init. No external scripts loaded here. */
(function() {
  const slots = document.querySelectorAll('.ad-slot[data-lazy]');
  if (!('IntersectionObserver' in window)) return; // graceful

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);

      // Hook point: later we can inject ad code here.
      // For now, just tag as "ready" and keep placeholder visible.
      el.dataset.ready = "1";
    });
  }, { rootMargin: '300px 0px' });

  slots.forEach(s => io.observe(s));
})();