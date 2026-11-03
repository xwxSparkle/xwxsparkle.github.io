import { applyLanguage, currentLanguage, translate } from './i18n';

type CatListeningKind = 'overear' | 'wired';

/** Controls only the listening props, leaving the cat's pose and portal layers alone. */
function createCatListening(cat: HTMLElement, onListening?: () => void) {
  const overear = cat.querySelector<SVGGElement>('[data-listen-overear]');
  const backLayer = cat.querySelector<SVGGElement>('[data-cat-back-layer]');
  const foregroundParent = overear?.parentNode;
  const foregroundSibling = overear?.nextSibling ?? null;
  const headphones = cat.querySelector<SVGGElement>('[data-listen-headphones]');
  const player = cat.querySelector<SVGGElement>('[data-listen-player]');
  const leftEarbud = cat.querySelector<SVGGElement>('[data-listen-left-earbud]');
  const rightEarbud = cat.querySelector<SVGGElement>('[data-listen-right-earbud]');
  const leftWire = cat.querySelector<SVGPathElement>('[data-listen-left-wire]');
  const rightWire = cat.querySelector<SVGPathElement>('[data-listen-right-wire]');
  const notes = cat.querySelectorAll<SVGElement>('[data-listen-note]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set<Animation>();
  const timers = new Set<number>();
  let nextKind: CatListeningKind = 'overear';
  let active = false;
  let run = 0;

  const restoreOverear = () => {
    if (!overear || !foregroundParent) return;
    const sibling = foregroundSibling?.parentNode === foregroundParent ? foregroundSibling : null;
    if (overear.parentNode !== foregroundParent || overear.nextSibling !== sibling) {
      foregroundParent.insertBefore(overear, sibling);
    }
  };

  const animate = (
    target: SVGElement | null,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ) => {
    if (!target || typeof target.animate !== 'function') return undefined;
    const animation = target.animate(keyframes, options);
    animations.add(animation);
    // Canceling an animation rejects finished; a stopped interaction is expected.
    void animation.finished.catch(() => {});
    return animation;
  };

  const cancel = (animation: Animation | undefined) => {
    if (!animation) return;
    animations.delete(animation);
    animation.cancel();
  };

  const later = (delay: number, callback: () => void) => {
    const currentRun = run;
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (active && run === currentRun) callback();
    }, delay);
    timers.add(timer);
  };

  const afterAnimation = (
    animation: Animation | undefined,
    fallbackDuration: number,
    callback: () => void
  ) => {
    if (!animation) {
      later(fallbackDuration, callback);
      return;
    }
    const currentRun = run;
    void animation.finished.then(
      () => {
        if (!active || run !== currentRun) return;
        callback();
        cancel(animation);
      },
      () => {}
    );
  };

  const revealWire = (wire: SVGPathElement | null) => {
    const drawing = animate(
      wire,
      [{ opacity: 0 }, { opacity: 0.45, offset: 0.45 }, { opacity: 1 }],
      { duration: 600, easing: 'ease-in-out', fill: 'both' }
    );
    if (drawing) afterAnimation(drawing, 600, () => {});
  };

  const clearMotion = () => {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    for (const animation of animations) animation.cancel();
    animations.clear();
  };

  const stop = () => {
    active = false;
    run += 1;
    clearMotion();
    restoreOverear();
    motion.removeEventListener('change', onMotionChange);
    delete cat.dataset.catListening;
    delete cat.dataset.catListeningPhase;
    delete cat.dataset.catListeningStep;
  };

  const listen = () => {
    cat.dataset.catListeningPhase = 'listening';
    delete cat.dataset.catListeningStep;
    onListening?.();
    if (!active || motion.matches) return;
    if (cat.dataset.catListening === 'wired') {
      animate(
        player,
        [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(0.04px, -0.16px)' },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 2600, iterations: Infinity, easing: 'ease-in-out' }
      );
    }
    notes.forEach((note) => {
      animate(
        note,
        [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(0.2px, -0.85px)' },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: note.dataset.listenNote === 'second' ? 4800 : 4200,
          delay: note.dataset.listenNote === 'second' ? 700 : 0,
          iterations: Infinity,
          easing: 'ease-in-out',
        }
      );
    });
  };

  const onMotionChange = () => {
    if (!active) return;
    run += 1;
    clearMotion();
    restoreOverear();
    listen();
  };

  const start = (): CatListeningKind => {
    stop();
    const kind = nextKind;
    nextKind = kind === 'overear' ? 'wired' : 'overear';
    active = true;
    motion.addEventListener('change', onMotionChange);
    cat.dataset.catListening = kind;
    cat.dataset.catListeningPhase = 'dressing';

    if (motion.matches) {
      listen();
      return kind;
    }

    if (kind === 'overear') {
      if (overear && backLayer) backLayer.appendChild(overear);
      const riseDuration = 900;
      const riseHeight = 19.5;
      const apex = -6.5;
      const landing = 0.12;
      // Both halves share one downward acceleration, with zero velocity at the apex.
      const gravity = (2 * riseHeight) / (riseDuration / 1000) ** 2;
      const fallDuration = Math.sqrt((2 * (landing - apex)) / gravity) * 1000;
      const rise = animate(
        headphones,
        Array.from({ length: 31 }, (_, index) => {
          const progress = index / 30;
          const remaining = (1 - progress) ** 2;
          return {
            transform: `translate(0, ${apex + riseHeight * remaining}px) scale(${1 - 0.3 * remaining})`,
            opacity: 1,
            offset: progress,
          };
        }),
        { duration: riseDuration, easing: 'linear', fill: 'both' }
      );
      afterAnimation(rise, riseDuration, () => {
        restoreOverear();
        const fall = animate(
          headphones,
          Array.from({ length: 31 }, (_, index) => {
            const progress = index / 30;
            return {
              transform: `translate(0, ${apex + (landing - apex) * progress ** 2}px) scale(1)`,
              opacity: 1,
              offset: progress,
            };
          }),
          { duration: fallDuration, easing: 'linear', fill: 'both' }
        );
        afterAnimation(fall, fallDuration, () => {
          const settle = animate(
            headphones,
            [
              { transform: `translate(0, ${landing}px) scale(1)` },
              { transform: 'translate(0, -0.04px) scale(1)', offset: 0.6 },
              { transform: 'translate(0, 0) scale(1)' },
            ],
            { duration: 90, easing: 'ease-out', fill: 'both' }
          );
          afterAnimation(settle, 90, listen);
        });
      });
    } else {
      cat.dataset.catListeningStep = 'left-ear';
      const revealPlayer = animate(
        player,
        [
          { transform: 'translate(5px, 3.2px) rotate(0deg) scale(0.65)', opacity: 0 },
          {
            transform: 'translate(-0.2px, -0.4px) rotate(0deg) scale(1)',
            opacity: 1,
            offset: 0.8,
          },
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        ],
        { duration: 520, easing: 'ease-out', fill: 'both' }
      );
      const fitLeft = animate(
        leftEarbud,
        [
          { transform: 'translate(-2px, 7px) rotate(-55deg) scale(0.5)', opacity: 0 },
          {
            transform: 'translate(-2.6px, 0.7px) rotate(-25deg) scale(0.9)',
            opacity: 1,
            offset: 0.5,
          },
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        ],
        { duration: 600, easing: 'ease-in-out', fill: 'both' }
      );
      revealWire(leftWire);
      afterAnimation(revealPlayer, 520, () => {});
      afterAnimation(fitLeft, 600, () => {
        cat.dataset.catListeningStep = 'right-ear';
        const fitRight = animate(
          rightEarbud,
          [
            { transform: 'translate(-10px, 7px) rotate(45deg) scale(0.5)', opacity: 0 },
            {
              transform: 'translate(2px, 0.9px) rotate(25deg) scale(0.9)',
              opacity: 1,
              offset: 0.6,
            },
            { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
          ],
          { duration: 600, easing: 'ease-in-out', fill: 'both' }
        );
        revealWire(rightWire);
        afterAnimation(fitRight, 600, () => {
          cat.dataset.catListeningStep = 'settling';
          later(300, listen);
        });
      });
    }

    return kind;
  };

  return { start, stop, isActive: () => active };
}

const replies = [
  'cat.lines.hello',
  'cat.lines.sunbeam',
  'cat.lines.pat',
  'cat.lines.curious',
  'cat.lines.scarf',
  'cat.lines.keyboard',
  'cat.lines.cloud',
  'cat.lines.bookmark',
] as const;
const sillyReplies = new Set(['cat.lines.keyboard', 'cat.lines.cloud']);
const randomInteger = (minimum: number, maximum: number) =>
  minimum + Math.floor(Math.random() * (maximum - minimum + 1));

const initializedCats = new WeakSet<HTMLElement>();

/** Bind cat interactions once for each rendered cat. */
export function initCats(root: ParentNode = document) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.querySelectorAll<HTMLElement>('[data-site-cat]').forEach((cat) => {
    if (initializedCats.has(cat)) return;
    const button = cat.querySelector<HTMLButtonElement>('[data-cat-button]');
    const message = cat.querySelector<HTMLElement>('[data-cat-message]');
    const announcement = cat.querySelector<HTMLElement>('[data-cat-announcement]');
    const pose = cat.querySelector<SVGGElement>('[data-cat-pose]');
    const eyes = cat.querySelector<SVGGElement>('[data-cat-eyes]');
    const traveler = cat.querySelector<SVGGElement>('[data-cat-traveler]');
    const sidebar = cat.closest<HTMLElement>('[data-site-sidebar]');
    if (!button || !message || !announcement || !pose || !eyes) return;
    initializedCats.add(cat);
    const listening = createCatListening(cat, () => showMessage(false));
    let activeAnimations: Animation[] = [];
    let revision = 0;
    let inView = typeof IntersectionObserver === 'undefined';
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let deletionTimer: ReturnType<typeof setTimeout> | undefined;
    let messageRevision = 0;
    let portalActive = false;
    let portalRevision = 0;
    let portalTimer: ReturnType<typeof setTimeout> | undefined;
    let portalAnimations: Animation[] = [];
    let clickTimes: number[] = [];
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let suppressNextClick = false;
    let pressPoint: { x: number; y: number } | undefined;
    const cancelPress = () => {
      clearTimeout(holdTimer);
      holdTimer = undefined;
      pressPoint = undefined;
    };

    const clearMessageTimers = () => {
      messageRevision += 1;
      clearTimeout(typingTimer);
      clearTimeout(hideTimer);
      clearTimeout(deletionTimer);
      typingTimer = undefined;
      hideTimer = undefined;
      deletionTimer = undefined;
    };

    const hideMessage = () => {
      clearMessageTimers();
      delete message.dataset.catHumming;
      message.hidden = true;
      message.textContent = '';
      announcement.textContent = '';
      button.setAttribute('aria-expanded', 'false');
      if (!button.classList.contains('is-speaking')) delete cat.dataset.catExpression;
    };
    const showMessage = (announce = true) => {
      clearMessageTimers();
      if (listening.isActive()) {
        message.dataset.catHumming = 'true';
        message.textContent = translate('cat.humming');
        message.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        return;
      }
      delete message.dataset.catHumming;
      const key = replies.find((reply) => reply === message.dataset.catReply);
      if (!key) return;
      const language = currentLanguage();
      const text = translate(key, language);
      const characters = Array.from(text);
      const currentMessageRevision = messageRevision;
      const withoutMotion = reducedMotion.matches;
      message.hidden = false;
      message.textContent = '';
      if (announce) announcement.textContent = text;
      button.setAttribute('aria-expanded', 'true');

      let length = 0;
      const deleteNext = () => {
        if (messageRevision !== currentMessageRevision || message.hidden) return;
        length -= 1;
        message.textContent = characters.slice(0, length).join('');
        if (length > 0) {
          deletionTimer = setTimeout(deleteNext, 30);
        } else {
          hideMessage();
        }
      };
      const completeTyping = () => {
        typingTimer = undefined;
        hideTimer = setTimeout(() => {
          if (messageRevision !== currentMessageRevision || message.hidden) return;
          hideTimer = undefined;
          if (withoutMotion) hideMessage();
          else deleteNext();
        }, 2500);
      };
      if (withoutMotion || characters.length === 0) {
        length = characters.length;
        message.textContent = text;
        completeTyping();
        return;
      }

      const typeNext = () => {
        if (messageRevision !== currentMessageRevision || message.hidden) return;
        length += 1;
        message.textContent = characters.slice(0, length).join('');
        if (length < characters.length) {
          typingTimer = setTimeout(typeNext, language === 'zh' ? 50 : 35);
        } else {
          completeTyping();
        }
      };
      typeNext();
    };
    const stopSpeaking = () => {
      revision += 1;
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations = [];
      button.classList.remove('is-speaking');
      delete cat.dataset.catExpression;
    };

    const cancelPortal = () => {
      portalRevision += 1;
      clearTimeout(portalTimer);
      portalTimer = undefined;
      portalAnimations.forEach((animation) => animation.cancel());
      portalAnimations = [];
      portalActive = false;
      clickTimes = [];
      delete cat.dataset.catPortalActive;
      delete cat.dataset.catPortalOpen;
      delete cat.dataset.catPortalPhase;
      delete cat.dataset.catPortalAway;
      button.removeAttribute('aria-disabled');
      button.removeAttribute('aria-busy');
    };

    const enterPortal = () => {
      cancelPress();
      listening.stop();
      stopSpeaking();
      hideMessage();
      cancelPortal();
      if (!traveler) return;
      portalActive = true;
      cat.dataset.catPortalActive = 'true';
      cat.dataset.catPortalOpen = 'true';
      cat.dataset.catPortalPhase = 'opening';
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-busy', 'true');
      announcement.textContent = translate('cat.portal.leave');
      const token = portalRevision;
      const finish = () => {
        if (token !== portalRevision) return;
        delete cat.dataset.catPortalOpen;
        cat.dataset.catPortalPhase = 'closing';
        portalTimer = setTimeout(() => {
          if (token !== portalRevision) return;
          cancelPortal();
          announcement.textContent = translate('cat.portal.return');
        }, 280);
      };
      const returnHome = () => {
        if (token !== portalRevision) return;
        portalTimer = undefined;
        delete cat.dataset.catPortalAway;
        const animation = traveler.animate(
          [
            { transform: 'translate(28px, 0px)', opacity: 0, offset: 0 },
            { transform: 'translate(21px, 0px)', opacity: 1, offset: 0.2 },
            { transform: 'translate(15px, -2.5px)', opacity: 1, offset: 0.42 },
            { transform: 'translate(9px, 0px)', opacity: 1, offset: 0.63 },
            { transform: 'translate(5px, -2px)', opacity: 1, offset: 0.82 },
            { transform: 'translate(0px, 0px)', opacity: 1, offset: 1 },
          ],
          { duration: 900, easing: 'linear', fill: 'forwards' }
        );
        portalAnimations = [animation];
        void animation.finished.then(finish, () => {});
      };
      if (reducedMotion.matches || typeof traveler.animate !== 'function') {
        portalTimer = setTimeout(() => {
          if (token !== portalRevision) return;
          cat.dataset.catPortalAway = 'true';
          delete cat.dataset.catPortalOpen;
          cat.dataset.catPortalPhase = 'closing';
          portalTimer = setTimeout(() => {
            if (token !== portalRevision) return;
            cat.dataset.catPortalOpen = 'true';
            cat.dataset.catPortalPhase = 'opening';
            delete cat.dataset.catPortalAway;
            portalTimer = setTimeout(finish, 280);
          }, 2200);
        }, 280);
        return;
      }
      const depart = () => {
        if (token !== portalRevision) return;
        portalTimer = undefined;
        const animation = traveler.animate(
          [
            { transform: 'translate(0px, 0px)', opacity: 1, offset: 0 },
            { transform: 'translate(5px, -2px)', opacity: 1, offset: 0.18 },
            { transform: 'translate(9px, 0px)', opacity: 1, offset: 0.36 },
            { transform: 'translate(15px, -2.5px)', opacity: 1, offset: 0.58 },
            { transform: 'translate(21px, 0px)', opacity: 1, offset: 0.75 },
            { transform: 'translate(28px, 0px)', opacity: 0, offset: 1 },
          ],
          { duration: 900, easing: 'linear', fill: 'forwards' }
        );
        portalAnimations = [animation];
        void animation.finished.then(
          () => {
            if (token !== portalRevision) return;
            cat.dataset.catPortalAway = 'true';
            delete cat.dataset.catPortalOpen;
            cat.dataset.catPortalPhase = 'closing';
            portalAnimations = [];
            animation.cancel();
            portalTimer = setTimeout(() => {
              if (token !== portalRevision) return;
              cat.dataset.catPortalOpen = 'true';
              cat.dataset.catPortalPhase = 'opening';
              portalTimer = setTimeout(returnHome, 280);
            }, 2200);
          },
          () => {}
        );
      };
      portalTimer = setTimeout(depart, 280);
    };

    const speak = () => {
      stopSpeaking();
      if (document.hidden || sidebar?.inert || !inView) return;
      if (sillyReplies.has(message.dataset.catReply ?? '')) cat.dataset.catExpression = 'squint';
      if (
        reducedMotion.matches ||
        typeof pose.animate !== 'function' ||
        typeof eyes.animate !== 'function'
      )
        return;

      const currentRevision = revision;
      const syllables = Array.from(
        { length: randomInteger(4, 7) },
        (_, index) => index === 1 || (index > 1 && Math.random() < 0.35)
      );
      for (let index = syllables.length - 1; index > 0; index -= 1) {
        const target = randomInteger(0, index);
        [syllables[index], syllables[target]] = [syllables[target], syllables[index]];
      }
      const pulses = syllables.map((long) => ({
        long,
        duration: long ? randomInteger(270, 390) : randomInteger(125, 190),
      }));
      const duration = pulses.reduce((total, pulse) => total + pulse.duration, 0);
      const poseFrames: Keyframe[] = [{ transform: 'scale(1)', offset: 0, easing: 'ease-in-out' }];
      let elapsed = 0;
      pulses.forEach((pulse) => {
        poseFrames.push(
          {
            transform: pulse.long ? 'scale(1.05, 0.95)' : 'scale(1.035, 0.965)',
            offset: (elapsed + pulse.duration * 0.24) / duration,
            easing: 'ease-in-out',
          },
          {
            transform: pulse.long ? 'scale(0.95, 1.05)' : 'scale(0.965, 1.035)',
            offset: (elapsed + pulse.duration * 0.64) / duration,
            easing: 'ease-in-out',
          },
          {
            transform: 'scale(1)',
            offset: (elapsed + pulse.duration) / duration,
            easing: 'ease-in-out',
          }
        );
        elapsed += pulse.duration;
      });
      const blinkCount = randomInteger(1, 2);
      const blinkDuration = blinkCount === 1 ? randomInteger(160, 220) : randomInteger(350, 500);
      const blinkFrames: Keyframe[] = [{ transform: 'scaleY(1)', offset: 0 }];

      for (let index = 0; index < blinkCount; index += 1) {
        const center = (index + 0.34 + Math.random() * 0.32) / blinkCount;
        const width = (0.34 + Math.random() * 0.26) / blinkCount;
        const start = center - width / 2;
        const closed = `scaleY(${0.04 + Math.random() * 0.08})`;
        blinkFrames.push(
          { transform: 'scaleY(1)', offset: start, easing: 'ease-in-out' },
          { transform: closed, offset: start + width * (0.25 + Math.random() * 0.1) },
          {
            transform: closed,
            offset: start + width * (0.45 + Math.random() * 0.1),
            easing: 'ease-in-out',
          },
          { transform: 'scaleY(1)', offset: start + width }
        );
      }

      blinkFrames.push({ transform: 'scaleY(1)', offset: 1 });
      button.classList.add('is-speaking');
      activeAnimations = [
        pose.animate(poseFrames, { duration, iterations: 1, easing: 'linear' }),
        eyes.animate(blinkFrames, { duration: blinkDuration, delay: duration }),
      ];

      void Promise.allSettled(activeAnimations.map((animation) => animation.finished)).then(() => {
        if (revision === currentRevision) stopSpeaking();
      });
    };

    applyLanguage(currentLanguage(), cat);

    const startHold = () => {
      cancelPress();
      suppressNextClick = false;
      if (portalActive || document.hidden || sidebar?.inert || !inView) return;
      holdTimer = setTimeout(() => {
        holdTimer = undefined;
        if (portalActive || document.hidden || sidebar?.inert || !inView) return;
        suppressNextClick = true;
        clickTimes = [];
        stopSpeaking();
        hideMessage();
        const kind = listening.start();
        announcement.textContent = translate(
          kind === 'overear' ? 'cat.listening.overear' : 'cat.listening.wired'
        );
      }, 650);
    };

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      startHold();
      pressPoint = { x: event.clientX, y: event.clientY };
    });
    button.addEventListener('pointermove', (event) => {
      if (pressPoint && Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 10)
        cancelPress();
    });
    button.addEventListener('pointerup', cancelPress);
    button.addEventListener('pointercancel', cancelPress);
    button.addEventListener('pointerleave', cancelPress);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') suppressNextClick = false;
      if (event.key === ' ' && !event.repeat) startHold();
    });
    button.addEventListener('keyup', (event) => {
      if (event.key === ' ') cancelPress();
    });
    button.addEventListener('blur', cancelPress);

    button.addEventListener('click', () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      if (portalActive || document.hidden || sidebar?.inert || !inView) return;
      cancelPress();
      listening.stop();
      const now = Date.now();
      clickTimes = clickTimes.filter((time) => now - time <= 1200);
      clickTimes.push(now);
      if (clickTimes.length >= 5) {
        enterPortal();
        return;
      }
      const choices = replies.filter((key) => key !== message.dataset.catReply);
      message.dataset.catReply = choices[Math.floor(Math.random() * choices.length)];
      speak();
      if (!document.hidden && !sidebar?.inert && inView) showMessage();
    });

    reducedMotion.addEventListener('change', () => {
      cancelPress();
      cancelPortal();
      if (reducedMotion.matches) {
        stopSpeaking();
        if (!message.hidden) showMessage(false);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelPress();
        listening.stop();
        cancelPortal();
        stopSpeaking();
        hideMessage();
      }
    });

    document.addEventListener('site:sidebar-close', () => {
      cancelPress();
      listening.stop();
      cancelPortal();
      stopSpeaking();
      hideMessage();
    });

    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver((entries) => {
        inView = entries.at(-1)?.isIntersecting ?? false;
        if (!inView) {
          cancelPress();
          listening.stop();
          cancelPortal();
          stopSpeaking();
          hideMessage();
        }
      }).observe(cat);
    }

    if (sidebar && typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        if (sidebar.inert) {
          cancelPress();
          listening.stop();
          cancelPortal();
          stopSpeaking();
          hideMessage();
        }
      }).observe(sidebar, { attributes: true, attributeFilter: ['inert', 'data-open'] });
    }

    document.addEventListener('site:language-change', () => {
      if (!message.hidden) showMessage();
    });
  });
}
