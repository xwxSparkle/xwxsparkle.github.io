const initializedSidebars = new WeakSet<HTMLElement>();

/** Bind responsive navigation, focus management and scroll locking. */
export function initSidebar(root: ParentNode = document) {
  const sidebar = root.querySelector<HTMLElement>('[data-site-sidebar]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-sidebar-toggle]');
  const close = root.querySelector<HTMLButtonElement>('[data-sidebar-close]');
  const backdrop = root.querySelector<HTMLButtonElement>('[data-sidebar-backdrop]');
  const content = root.querySelector<HTMLElement>('[data-site-content]');
  const skipLink = root.querySelector<HTMLElement>('.skip-link');
  const narrow = window.matchMedia('(max-width: 1023px)');

  if (sidebar && toggle && close && backdrop && !initializedSidebars.has(sidebar)) {
    initializedSidebars.add(sidebar);
    let opened = false;
    let previousFocus: HTMLElement | null = null;
    let previousOverflow = '';
    const previousInert = new Map<HTMLElement, boolean>();
    const background = [content, skipLink].filter((element): element is HTMLElement =>
      Boolean(element)
    );
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusableItems = () =>
      Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) =>
          !element.hidden &&
          !element.closest('[hidden]') &&
          !element.inert &&
          element.getClientRects().length > 0
      );

    const setOpen = (next: boolean, restoreFocus = true) => {
      const willOpen = narrow.matches && next;
      const wasOpen = opened;
      if (!willOpen) document.dispatchEvent(new Event('site:sidebar-close'));
      if (willOpen && !wasOpen) {
        previousFocus =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        previousOverflow = document.body.style.overflow;
        background.forEach((element) => {
          previousInert.set(element, element.inert);
          element.inert = true;
        });
        document.body.style.overflow = 'hidden';
      }
      if (!willOpen && wasOpen) {
        document.body.style.overflow = previousOverflow;
        background.forEach((element) => {
          element.inert = previousInert.get(element) ?? false;
        });
        previousInert.clear();
      }

      opened = willOpen;
      sidebar.dataset.open = String(opened);
      sidebar.inert = narrow.matches && !opened;
      toggle.setAttribute('aria-expanded', String(opened));
      toggle.hidden = !narrow.matches || opened;
      close.hidden = !narrow.matches;
      backdrop.hidden = !opened;
      if (opened) {
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-modal', 'true');
        close.focus({ preventScroll: true });
      } else {
        sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
        if (wasOpen && restoreFocus) {
          const target = narrow.matches
            ? toggle
            : sidebar.querySelector<HTMLElement>('.profile-name');
          (previousFocus?.isConnected && previousFocus === toggle ? previousFocus : target)?.focus({
            preventScroll: true,
          });
        }
      }
    };

    toggle.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    sidebar.addEventListener('click', (event) => {
      if (opened && event.target instanceof Element && event.target.closest('a[href]'))
        setOpen(false);
    });
    sidebar.addEventListener('submit', (event) => {
      if (opened && !event.defaultPrevented) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (!opened || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === 'Tab') {
        const items = focusableItems();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          event.preventDefault();
          sidebar.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || !sidebar.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !sidebar.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    const updateLayout = () => {
      const focused = document.activeElement;
      const wasInside = focused instanceof Node && sidebar.contains(focused);
      const wasControl = focused === toggle || focused === close || focused === backdrop;
      setOpen(false, false);
      if (narrow.matches && wasInside) toggle.focus({ preventScroll: true });
      else if (!narrow.matches && wasControl)
        sidebar.querySelector<HTMLElement>('.profile-name')?.focus({ preventScroll: true });
    };
    narrow.addEventListener('change', updateLayout);
    window.addEventListener('pageshow', updateLayout);
    updateLayout();
  }
}

const initializedTables = new WeakSet<HTMLElement>();

/** Track the current article heading in each rendered contents list. */
export function initTableOfContents(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-toc]').forEach((toc) => {
    if (initializedTables.has(toc)) return;
    const article = toc.dataset.tocFor ? document.getElementById(toc.dataset.tocFor) : null;
    const content = article?.querySelector<HTMLElement>('[data-post-content]');
    if (!article || !content) return;

    const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(
        '[data-page-heading], [data-post-content] h2[id], [data-post-content] h3[id]'
      )
    );
    if (!headings.length) return;
    initializedTables.add(toc);

    let activeId = '';
    let pending = false;
    const linkTarget = (link: HTMLAnchorElement) => decodeURIComponent(link.hash.slice(1));
    const setActive = (id: string) => {
      if (id !== activeId) {
        activeId = id;
        links.forEach((link) => {
          if (linkTarget(link) === id) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }
      if (
        toc.classList.contains('toc--desktop') &&
        window.matchMedia('(min-width: 1200px)').matches
      ) {
        const activeLink = links.find((link) => linkTarget(link) === id);
        if (activeLink) {
          const linkBounds = activeLink.getBoundingClientRect();
          const tocBounds = toc.getBoundingClientRect();
          if (linkBounds.top < tocBounds.top) toc.scrollTop += linkBounds.top - tocBounds.top;
          else if (linkBounds.bottom > tocBounds.bottom)
            toc.scrollTop += linkBounds.bottom - tocBounds.bottom;
        }
      }
    };

    const update = () => {
      pending = false;
      const scrollOffset = parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 32;
      const threshold = Math.min(scrollOffset + 12, window.innerHeight * 0.6);
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= threshold) current = heading;
        else break;
      }
      const articleEnd = content.getBoundingClientRect().bottom;
      if (articleEnd <= window.innerHeight + 2) current = headings[headings.length - 1];
      setActive(current.id);
    };

    const scheduleUpdate = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(update);
    };

    links.forEach((link) => {
      link.addEventListener('click', () => {
        setActive(linkTarget(link));
        const details = link.closest('details');
        if (details) details.open = false;
        scheduleUpdate();
      });
    });

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('hashchange', scheduleUpdate);
    window.addEventListener('load', scheduleUpdate, { once: true });
    document.addEventListener('site:language-change', scheduleUpdate);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(content);
    update();
  });
}
