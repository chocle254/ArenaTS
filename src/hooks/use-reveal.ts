import { useEffect } from 'react';

const SELECTOR = '[data-reveal], [data-reveal-stagger]';

/**
 * Scroll reveal for the whole app. Elements marked `data-reveal` (or
 * `data-reveal-stagger`, whose children cascade) rise in the first time
 * they enter the viewport. Content is only hidden once this hook has
 * run (html.reveal-ready), so nothing stays invisible without script.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    const scan = (node: ParentNode) => {
      node.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains('is-visible')) io.observe(el);
      });
    };

    scan(document);
    root.classList.add('reveal-ready');

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SELECTOR)) io.observe(n);
          scan(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);
}
