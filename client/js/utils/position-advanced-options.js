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

    // Check if Advanced Options is already immediately before the button
    if (btn.previousElementSibling === adv) return;

    // Move Advanced Options directly above the convert button
    // This ensures it's always the immediate predecessor regardless of other elements
    btn.parentNode.insertBefore(adv, btn);
  }

  function initContainer(root) {
    placeAdvanced(root);

    // Re-apply whenever uploads/results modify the DOM
    const obs = new MutationObserver(() => {
      // Small delay to ensure DOM is fully updated
      setTimeout(() => placeAdvanced(root), 10);
    });
    obs.observe(root, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Also respond to custom events some tools emit
    ['file-added', 'file-removed', 'conversion-start', 'conversion-complete', 'upload-complete', 'files-updated']
      .forEach(evt => root.addEventListener(evt, () => {
        setTimeout(() => placeAdvanced(root), 10);
      }, { passive: true }));

    // Periodic check to ensure positioning stays correct
    setInterval(() => placeAdvanced(root), 1000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.converter-container').forEach(initContainer);
  });
})();