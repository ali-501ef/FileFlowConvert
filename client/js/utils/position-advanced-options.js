// Keep Advanced Options directly above the primary Convert button,
// even after uploads or dynamic DOM updates. Non-destructive.

(function () {
  function findPrimaryBtn(root) {
    return (
      root.querySelector(
        'button#convertBtn, button.convert-btn,' +
        'button.merge-btn, button.compress-btn, button.trim-btn,' +
        'button.create-btn, button.extract-btn,' +
        'button.action-primary, button.primary, button.primary-action'
      ) ||
      Array.from(root.querySelectorAll('button')).find((b) => {
        const w = b.getBoundingClientRect?.().width || 0;
        return w > 300; // heuristic for main CTA
      })
    );
  }

  function placeAdvanced(root) {
    const adv = root.querySelector('.advanced-options');
    if (!adv) return;

    const btn = findPrimaryBtn(root);
    if (!btn) return;

    // If it's already right above the button, do nothing
    const prev = btn.previousElementSibling;
    if (prev === adv) return;

    // Move Advanced Options directly above the main button
    btn.parentNode.insertBefore(adv, btn);
  }

  function initContainer(root) {
    placeAdvanced(root);

    // Re-apply whenever uploads/results modify the DOM
    const obs = new MutationObserver(() => placeAdvanced(root));
    obs.observe(root, { childList: true, subtree: true });

    // Also respond to custom events some tools emit
    ['file-added', 'file-removed', 'conversion-start', 'conversion-complete']
      .forEach(evt => root.addEventListener(evt, () => placeAdvanced(root), { passive: true }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.converter-container').forEach(initContainer);
  });
})();