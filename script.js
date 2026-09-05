(() => {
  // --- 1. Ambient Hero Video Controller with Synchronized Pop & Fade Animation ---
  const heroVideo = document.getElementById('hero-bg-video');
  const heroLeft = document.getElementById('hero-left');
  const heroRight = document.getElementById('hero-right');
  const scrollHint = document.getElementById('hero-scroll-hint');

  let isVideoActive = false;

  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    // Set video playback speed slightly faster for responsive, snappy feel
    heroVideo.playbackRate = 1.08;

    // Start video playback
    const startVideo = () => {
      const playPromise = heroVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isVideoActive = true;
          })
          .catch(() => {
            // Autoplay blocked by browser policy - unlock on first interaction
            const unlockPlay = () => {
              heroVideo.play().then(() => {
                isVideoActive = true;
              }).catch(() => {});
              window.removeEventListener('touchstart', unlockPlay);
              window.removeEventListener('click', unlockPlay);
              window.removeEventListener('scroll', unlockPlay);
            };
            window.addEventListener('touchstart', unlockPlay, { passive: true, once: true });
            window.addEventListener('click', unlockPlay, { passive: true, once: true });
            window.addEventListener('scroll', unlockPlay, { passive: true, once: true });
          });
      }
    };

    heroVideo.addEventListener('playing', () => { isVideoActive = true; });
    heroVideo.addEventListener('pause', () => { isVideoActive = false; });

    startVideo();

    // Pause video when scrolled out of viewport to save battery & GPU
    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            heroVideo.play().catch(() => {});
          } else {
            heroVideo.pause();
          }
        });
      }, { threshold: 0.1 });

      videoObserver.observe(heroVideo);
    }

    // Synchronized Flank Pop-up & Automatic Fade Loop
    // Timeline Choreography:
    // 0.00 to 0.08: Video starts moving first; font waits briefly
    // 0.08 to 0.32: Font transition activates, slides in and pops into place
    // 0.32 to 0.76: Full presentation peak (clear, stable reading)
    // 0.76 to 0.98: Font transition completes and automatically fades out before video loop
    function updateFlanks() {
      if (heroLeft && heroRight) {
        if (!isVideoActive && heroVideo.currentTime === 0) {
          // If video hasn't started yet, keep flanks visible as fallback
          heroLeft.style.opacity = '1';
          heroLeft.style.transform = 'translate3d(0, 0, 0) scale(1)';
          heroRight.style.opacity = '1';
          heroRight.style.transform = 'translate3d(0, 0, 0) scale(1)';
        } else {
          const duration = heroVideo.duration || 7.39;
          const progress = Math.min(1, Math.max(0, (heroVideo.currentTime % duration) / duration));

          let ease = 0;
          let leftTranslate = -70;
          let rightTranslate = 70;
          let leftScale = 0.90;
          let rightScale = 0.90;
          let baseOpacity = 0;
          let exitFade = 1;

          if (progress < 0.08) {
            // Initial delay: video begins first, font waits
            ease = 0;
            leftTranslate = -70;
            rightTranslate = 70;
            leftScale = 0.90;
            rightScale = 0.90;
            baseOpacity = 0;
            exitFade = 1;
          } else if (progress <= 0.32) {
            // Pop progression (cubic ease-out from 0.08 to 0.32)
            const popFactor = (progress - 0.08) / 0.24;
            ease = 1 - Math.pow(1 - popFactor, 3);
            leftTranslate = -70 * (1 - ease);
            rightTranslate = 70 * (1 - ease);
            leftScale = 0.90 + 0.10 * ease;
            rightScale = 0.90 + 0.10 * ease;
            baseOpacity = ease;
            exitFade = 1;
          } else if (progress <= 0.76) {
            // Full presentation peak
            ease = 1;
            leftTranslate = 0;
            rightTranslate = 0;
            leftScale = 1;
            rightScale = 1;
            baseOpacity = 1;
            exitFade = 1;
          } else {
            // Automatic exit fade as video reaches completion (from 0.76 to 0.98)
            ease = 1;
            leftTranslate = 0;
            rightTranslate = 0;
            leftScale = 1;
            rightScale = 1;
            baseOpacity = 1;
            const fadeFactor = Math.min(1, Math.max(0, (progress - 0.76) / 0.22));
            exitFade = 1 - fadeFactor;
          }

          // Scroll exit fade if user scrolls down into the About section
          const scrollExit = Math.max(0, 1 - (window.scrollY / 220));

          const finalOpacity = Math.max(0, Math.min(1, baseOpacity * exitFade * scrollExit)).toFixed(3);

          heroLeft.style.opacity = finalOpacity;
          heroLeft.style.transform = `translate3d(${leftTranslate.toFixed(1)}px, 0, 0) scale(${leftScale.toFixed(3)})`;

          heroRight.style.opacity = finalOpacity;
          heroRight.style.transform = `translate3d(${rightTranslate.toFixed(1)}px, 0, 0) scale(${rightScale.toFixed(3)})`;
        }
      }

      requestAnimationFrame(updateFlanks);
    }

    requestAnimationFrame(updateFlanks);
  }

  // Fade out scroll hint once user starts scrolling
  if (scrollHint) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        scrollHint.style.opacity = '0';
        scrollHint.style.pointerEvents = 'none';
      } else {
        scrollHint.style.opacity = '1';
        scrollHint.style.pointerEvents = 'auto';
      }
    }, { passive: true });
  }

  // --- 2. Mobile & Tablet Slide-out Drawer Navigation ---
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

  // --- 3. Smooth Anchor Scrolling for Navbar & In-page Links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // --- 4. Direct Contact Form Email Forwarder to sunysarkar003@gmail.com ---
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
})();
