/**
 * Advanced Options Pruning Utility
 * Removes non-functional or unsupported advanced options from the UI
 */

// Import the capability matrix
let matrix = {};

// Load matrix asynchronously since we can't use import assertions in all browsers
async function loadMatrix() {
  try {
    const response = await fetch('/config/advancedOptions.matrix.json');
    matrix = await response.json();
  } catch (error) {
    console.warn('[Options] Could not load capability matrix:', error);
    matrix = {};
  }
}

// Initialize matrix on module load
loadMatrix();

function nearestOptionGroup(el) {
  return el?.closest?.(".option-group, .checkbox-group, .premium-checkbox-item, .option-row") || el;
}

export function hideOption(el, reason = "") {
  const grp = nearestOptionGroup(el);
  if (grp) {
    grp.remove();
    if (window.console) {
      console.info("[Options] Removed non-functional option:", reason || el?.id || el?.name);
    }
  }
}

// Hard rule: remove if matrix marks as unsupported
export function pruneByMatrix(toolKey, root = document) {
  const rules = matrix[toolKey] || {};
  Object.entries(rules).forEach(([key, status]) => {
    if (status === "unsupported") {
      const el = root.querySelector(`[id='${key}'], [name='${key}'], [data-option='${key}']`);
      if (el) {
        hideOption(el, `${toolKey}.${key} marked unsupported`);
      }
    }
  });
}

// Safe binder: if binding/validation fails, remove the control
export function bindOrPrune(toolKey, key, selector, binder, root = document) {
  try {
    const el = root.querySelector(selector);
    if (!el) throw new Error("missing element");
    // If matrix says unknown, let it try; if it throws, we prune.
    binder(el);
  } catch (e) {
    const el = root.querySelector(selector);
    if (el) {
      hideOption(el, `${toolKey}.${key}: ${e.message}`);
    }
  }
}

// After a backend error that targets a specific option, remove it for this session
export function pruneOnBackendError(toolKey, errorObj = {}, root = document) {
  const msg = (errorObj?.message || "").toLowerCase();
  const rules = matrix[toolKey] || {};
  Object.keys(rules).forEach((key) => {
    if (msg.includes(key.toLowerCase()) || msg.includes("unsupported") || msg.includes("invalid option")) {
      const el = root.querySelector(`[id='${key}'], [name='${key}'], [data-option='${key}']`);
      if (el) {
        hideOption(el, `${toolKey}.${key} rejected by backend`);
      }
    }
  });
}

// Check if advanced options container should be hidden (no remaining options)
export function checkAdvancedOptionsContainer(root = document) {
  const advancedContainer = root.querySelector('.advanced-options');
  if (advancedContainer) {
    const remainingOptions = advancedContainer.querySelectorAll('.option-group, .checkbox-group, .premium-checkbox-item, .option-row');
    if (remainingOptions.length === 0) {
      advancedContainer.style.display = 'none';
      console.info("[Options] Hiding empty advanced options container");
    }
  }
}

// Collect only existing options for payload
export function collectExistingOptions(optionSelectors, root = document) {
  const payload = {};
  Object.entries(optionSelectors).forEach(([key, selector]) => {
    const el = root.querySelector(selector);
    if (el) {
      if (el.type === 'checkbox') {
        payload[key] = el.checked;
      } else {
        payload[key] = el.value;
      }
    }
  });
  return payload;
}

// Print summary of removed options
export function printRemovalSummary(toolKey, removedOptions = []) {
  if (removedOptions.length > 0) {
    console.info(`[Options] ${toolKey}: Removed ${removedOptions.length} non-functional options:`, removedOptions);
  }
}