// client/js/components/videoPreview.js
export function mountVideoPreview({ container, file, autoplay = false }) {
    if (!container || !file) return;

    // Ensure one preview instance per container
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

    // Revoke any previous URL
    if (videoEl.dataset.blobUrl) {
        URL.revokeObjectURL(videoEl.dataset.blobUrl);
    }

    const url = URL.createObjectURL(file);
    videoEl.src = url;
    videoEl.dataset.blobUrl = url;

    // Autoplay only if allowed (no sound)
    if (autoplay) {
        videoEl.muted = true;
        videoEl.play().catch(() => {/* ignore autoplay block */});
    }

    // Clean up on unload
    window.addEventListener('beforeunload', () => {
        try { URL.revokeObjectURL(url); } catch {}
    }, { once: true });
}