/*
 * Smooth-scroll bootstrap: one shared Lenis instance per page.
 * Skipped when the vendor script failed to load or the user prefers reduced
 * motion — in both cases the page keeps native scrolling.
 */
(function () {
    if (typeof window.Lenis !== 'function') {
        return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const lenis = new window.Lenis({
        duration: 1.15,
        smoothWheel: true
    });

    function raf(time) {
        lenis.raf(time);
        window.requestAnimationFrame(raf);
    }

    window.requestAnimationFrame(raf);
    window.AHLenis = lenis;
})();
