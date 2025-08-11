// client/js/components/videoPreview.js
(function () {
  function mountVideoPreview({ container, file, autoplay = false }) {
    if (!container || !file) return;

    let holder = container.querySelector('.video-preview');
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'video-preview';
      holder.style.marginTop = '16px';
      holder.innerHTML = `
        <video class="video-preview-el" playsinline controls style="width:100%;border-radius:12px;outline:none"></video>
      `;
      container.appendChild(holder);
    }

    const videoEl = holder.querySelector('.video-preview-el');

    if (videoEl.dataset.blobUrl) {
      try { URL.revokeObjectURL(videoEl.dataset.blobUrl); } catch {}
    }

    const url = URL.createObjectURL(file);
    videoEl.src = url;
    videoEl.dataset.blobUrl = url;

    if (autoplay) {
      videoEl.muted = true;
      videoEl.play().catch(() => {});
    }

    window.addEventListener('beforeunload', () => {
      try { URL.revokeObjectURL(url); } catch {}
    }, { once: true });
  }

  window.mountVideoPreview = mountVideoPreview;
})();