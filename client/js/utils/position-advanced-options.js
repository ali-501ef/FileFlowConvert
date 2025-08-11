// Reorder Advanced Options to appear right above the main action button.
// Runs on every tool page; no-op if selectors aren't found.
document.addEventListener('DOMContentLoaded', () => {
  // Each page wraps content in a .converter-container (used across tools)
  const containers = document.querySelectorAll('.converter-container');

  containers.forEach((root) => {
    const adv = root.querySelector('.advanced-options');
    if (!adv) return;

    // Heuristic to find the primary action button without breaking pages.
    // We try the common classes/ids first; then fall back to the first large button.
    const primaryBtn =
      root.querySelector(
        // common across our tools
        'button#convertBtn, button.convert-btn,' +
        // other common verbs
        'button.merge-btn, button.compress-btn, button.trim-btn, button.create-btn, button.extract-btn,' +
        // generic "primary" classes used in some pages
        'button.action-primary, button.primary, button.primary-action'
      ) ||
      // last resort: the first full-width button inside the container
      Array.from(root.querySelectorAll('button')).find((b) => {
        const w = b.getBoundingClientRect?.().width || 0;
        return w > 300; // likely the main CTA
      });

    if (!primaryBtn) return;

    // If it's already right above, do nothing
    let cursor = primaryBtn.previousElementSibling;
    while (cursor && cursor.matches('.progress-container, .results, .info-grid, .tool-info-section, .file-preview, .upload-area')) {
      cursor = cursor.previousElementSibling;
    }
    if (cursor === adv) return;

    // Move Advanced Options right before the primary button
    primaryBtn.parentNode.insertBefore(adv, primaryBtn);
  });
});