(() => {
  const TOTAL_FRAMES = 207;
  const FOLDER_PATH = 'ezgif-1466cabf9db57347-png-split';
  const FRAME_PREFIX = 'ezgif-frame-';
  const LERP_FACTOR = 0.09; // Butter-smooth easing factor

  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const progressBar = document.getElementById('loader-progress');
  const heroTrack = document.getElementById('hero');
  const heroContent = document.getElementById('hero-content');

  if (!canvas || !ctx) return;

  // Array of loaded Image elements
  const frames = new Array(TOTAL_FRAMES).fill(null);
  const loadPromises = new Array(TOTAL_FRAMES).fill(null);
  let loadedCount = 0;
  let lastRenderedImage = null;
  let currentProgress = 0;
  let targetProgress = 0;
  let isResized = true;

  // Frame URL generator (1-indexed, 3 digits zero-padded)
  function getFrameUrl(index) {
    const frameNum = String(index + 1).padStart(3, '0');
    return `${FOLDER_PATH}/${FRAME_PREFIX}${frameNum}.png`;
  }

  // Handle Retina / HiDPI canvas sizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = canvas.clientWidth || window.innerWidth;
    const displayHeight = canvas.clientHeight || window.innerHeight;

    const targetW = Math.round(displayWidth * dpr);
    const targetH = Math.round(displayHeight * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      isResized = true;
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // Draw image to canvas in full screen cover mode for desktop, mobile, and tablet
  function drawImageCover(image) {
    if (!image || !image.complete || image.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;

    // Full screen edge-to-edge cover across all viewports
    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const destWidth = imgWidth * scale;
    const destHeight = imgHeight * scale;
    const destX = (canvasWidth - destWidth) * 0.5;
    const destY = 0; // Natural top anchor: head portion is 100% visible below navbar

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, destX, destY, destWidth, destHeight);

    // Seamlessly erase the watermark icon in the bottom corner with soft feathered smoke
    const iconX = Math.round(destX + destWidth * 0.88);
    const iconY = Math.round(destY + destHeight * 0.76);
    const iconW = Math.round(destWidth * 0.075);
    const iconH = Math.round(destHeight * 0.11);

    if (iconX < canvasWidth && iconY < canvasHeight && iconX + iconW > 0 && iconY + iconH > 0) {
      const sourceY = Math.max(0, Math.round(iconY - iconH * 1.15));
      ctx.save();
      ctx.filter = 'blur(8px)';
      ctx.drawImage(canvas, iconX - 8, sourceY, iconW + 16, iconH + 16, iconX - 8, iconY - 4, iconW + 16, iconH + 16);
      ctx.restore();
    }
  }

  // Find the closest loaded frame so there is never a blank flash
  function getNearestLoadedFrame(targetIdx) {
    if (frames[targetIdx]) return frames[targetIdx];

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0 && frames[prev]) return frames[prev];

      const next = targetIdx + offset;
      if (next < TOTAL_FRAMES && frames[next]) return frames[next];
    }
    return null;
  }

  // Update progress bar UI
  function onFrameLoaded() {
    loadedCount++;
    const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
      if (loadedCount >= TOTAL_FRAMES) {
        setTimeout(() => {
          progressBar.classList.add('loaded');
        }, 400);
      }
    }
  }

  // Load a single frame via native Image
  function loadSingleFrame(index) {
    if (frames[index]) return Promise.resolve(frames[index]);
    if (loadPromises[index]) return loadPromises[index];

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[index] = img;
        onFrameLoaded();
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = getFrameUrl(index);
    });

    loadPromises[index] = promise;
    return promise;
  }

  // Progressive preloader:
  // 1. Frame 0 immediately
  // 2. Keyframes (every 4th frame)
  // 3. Remaining frames
  async function startPreloading() {
    // Step 1: Load frame 0 first and display immediately in the hero
    const frame0 = await loadSingleFrame(0);
    if (frame0) {
      drawImageCover(frame0);
      lastRenderedImage = frame0;
    }

    // Step 2: Keyframes distributed evenly for immediate responsiveness
    const keyframes = [];
    for (let i = 0; i < TOTAL_FRAMES; i += 4) {
      if (i !== 0) keyframes.push(i);
    }
    await loadInBatches(keyframes, 6);

    // Step 3: All remaining frames in parallel
    const remaining = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!frames[i]) remaining.push(i);
    }
    await loadInBatches(remaining, 8);
  }

  async function loadInBatches(indices, concurrency) {
    let poolIndex = 0;
    async function worker() {
      while (poolIndex < indices.length) {
        const idx = indices[poolIndex++];
        await loadSingleFrame(idx);
      }
    }
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
  }

  // Compute scroll ratio based on scrolling through the Hero section
  function getScrollFraction() {
    if (!heroTrack) return 0;
    const scrollableDist = heroTrack.offsetHeight - window.innerHeight;
    if (scrollableDist <= 0) return 0;
    const progress = window.scrollY / scrollableDist;
    return Math.min(Math.max(progress, 0), 1);
  }

  // Smooth Animation Loop using Physics Lerp
  function tick() {
    targetProgress = getScrollFraction();

    // Lerp smoothing
    const delta = targetProgress - currentProgress;
    if (Math.abs(delta) > 0.0001) {
      currentProgress += delta * LERP_FACTOR;
    } else {
      currentProgress = targetProgress;
    }

    // Target frame index based on smoothed progress
    const targetIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
    );

    // Render frame to hero canvas
    const frameToDraw = getNearestLoadedFrame(targetIndex);
    if (frameToDraw && (frameToDraw !== lastRenderedImage || isResized)) {
      drawImageCover(frameToDraw);
      lastRenderedImage = frameToDraw;
      isResized = false;
    }

    // Smoothly pop left and right text flanks with the scrolling animation of the video
    const heroLeft = document.getElementById('hero-left');
    const heroRight = document.getElementById('hero-right');
    const scrollHint = document.getElementById('hero-scroll-hint');

    if (heroLeft && heroRight) {
      // Pop progression driven by scrolling animation (reaches peak between 0.25 and 0.8)
      const popFactor = Math.min(1, Math.max(0, currentProgress / 0.28));
      const ease = 1 - Math.pow(1 - popFactor, 3); // Cubic ease out

      // Left flank slides in from left (-70px to 0) and pops into place
      const leftTranslate = (-70 * (1 - ease)).toFixed(1);
      const leftScale = (0.90 + 0.10 * ease).toFixed(3);
      const leftOpacity = (0.35 + 0.65 * ease).toFixed(3);

      // Right flank slides in from right (+70px to 0) and pops into place
      const rightTranslate = (70 * (1 - ease)).toFixed(1);
      const rightScale = (0.90 + 0.10 * ease).toFixed(3);
      const rightOpacity = (0.35 + 0.65 * ease).toFixed(3);

      // Smooth exit fade as user scrolls past 0.82 into the About section
      const exitFade = currentProgress > 0.82 ? Math.max(0, (1 - currentProgress) / 0.18) : 1;

      heroLeft.style.opacity = (leftOpacity * exitFade).toFixed(3);
      heroLeft.style.transform = `translate3d(${leftTranslate}px, 0, 0) scale(${leftScale})`;

      heroRight.style.opacity = (rightOpacity * exitFade).toFixed(3);
      heroRight.style.transform = `translate3d(${rightTranslate}px, 0, 0) scale(${rightScale})`;

      if (scrollHint) {
        scrollHint.style.opacity = Math.max(0, 1 - currentProgress * 4).toFixed(3);
      }
    }

    requestAnimationFrame(tick);
  }

  // Mobile & Tablet Slide-out Drawer Navigation Controller
  const navToggle = document.getElementById('nav-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerNavItems = document.querySelectorAll('.drawer-nav-item');

  function openDrawer() {
    if (!mobileDrawer || !drawerBackdrop) return;
    mobileDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    if (navToggle) {
      navToggle.classList.add('active');
      navToggle.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!mobileDrawer || !drawerBackdrop) return;
    mobileDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    if (navToggle) {
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer && mobileDrawer.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeDrawer);
  }

  // Auto-close drawer on link click and update active state
  drawerNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      drawerNavItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      closeDrawer();
    });
  });

  // Direct Contact Form Email Forwarder to sunysarkar003@gmail.com
  const contactForm = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnIcon = document.getElementById('btn-icon');
  const formStatus = document.getElementById('form-status');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const messageInput = document.getElementById('message');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !email || !message) return;

      // Visual sending state
      if (submitBtn) submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending to Suny Sarkar...';
      if (btnIcon) btnIcon.className = 'ri-loader-4-line ri-spin';
      if (formStatus) {
        formStatus.style.display = 'none';
        formStatus.className = 'form-status-msg';
      }

      try {
        const response = await fetch('https://formsubmit.co/ajax/sunysarkar003@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            email: email,
            message: message,
            _subject: `New Portfolio Message from ${name}!`,
            _template: 'table'
          })
        });

        const data = await response.json();

        if (response.ok || data.success === 'true' || data.success === true) {
          if (formStatus) {
            formStatus.className = 'form-status-msg success';
            formStatus.innerHTML = `<i class="ri-checkbox-circle-fill"></i> Thank you, ${name}! Your message was successfully sent to Suny Sarkar (sunysarkar003@gmail.com).`;
            formStatus.style.display = 'flex';
          }
          contactForm.reset();
        } else {
          throw new Error(data.message || 'Submission error');
        }
      } catch (err) {
        // Fallback: Opens email client pre-addressed to sunysarkar003@gmail.com
        if (formStatus) {
          formStatus.className = 'form-status-msg success';
          formStatus.innerHTML = `<i class="ri-checkbox-circle-fill"></i> Message ready! Opening your email client to send to sunysarkar003@gmail.com...`;
          formStatus.style.display = 'flex';
        }
        window.location.href = `mailto:sunysarkar003@gmail.com?subject=Portfolio Message from ${encodeURIComponent(name)}&body=${encodeURIComponent(message + '\n\n---\nSender: ' + name + ' (' + email + ')')}`;
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Send Message';
        if (btnIcon) btnIcon.className = 'ri-send-plane-fill';
      }
    });
  }

  // Expose for debugging
  window.__ANIMATION_DEBUG__ = {
    getLoadedCount: () => loadedCount,
    getCurrentProgress: () => currentProgress,
    getTargetProgress: () => targetProgress,
    getFrames: () => frames
  };

  // Start preloading and render loop
  startPreloading();
  requestAnimationFrame(tick);
})();
