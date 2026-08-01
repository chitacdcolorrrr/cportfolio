/*
 * Boot loader: streams the page's critical assets (window.AH_LOADER_ASSETS)
 * through fetch and counts real downloaded bytes against real Content-Length
 * totals — the counter always reports a measured value. The display only
 * smooths the true progress, never invents it: a stalled network shows as a
 * stalled number. Fonts expose no byte stream, so they gate completion
 * instead of feeding the counter. 100% requires every byte (or its timeout)
 * plus fonts plus the minimum display time; MAX_TIME forces the reveal.
 *
 * Guaranteed reveal: the inline 8s fallback timer in each page's <head> and
 * the MAX_TIME below both end in `intro-ready` — the page can never stay
 * hidden behind a failed load.
 *
 * Also owns the cross-page exit transition (defocus + overexpose) for
 * same-origin link navigations.
 */
(function () {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let finished = false;

    function finish(skip = false) {
        if (finished) {
            return;
        }

        finished = true;
        window.clearTimeout(window.introFallbackTimer);

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (skip) {
                    root.classList.add('intro-skip');
                }

                root.classList.add('intro-ready');
                window.dispatchEvent(new CustomEvent('ah:intro'));
            });
        });
    }

    // Reduced motion: reveal immediately. Assets still load via the CSS paint.
    if (reduceMotion) {
        finish(true);
        return;
    }

    const loader = document.querySelector('.site-loader');
    const count = loader ? loader.querySelector('.site-loader-count') : null;
    const fill = loader ? loader.querySelector('.site-loader-fill') : null;

    const manifest = Array.isArray(window.AH_LOADER_ASSETS) ? window.AH_LOADER_ASSETS : [];
    // Pages with a pre-bar intro (homepage) declare AH_LOADER_BAR_DELAY so the
    // chase starts when the progress UI fades in — otherwise a fast network
    // finishes the chase before the bar is ever seen. Must match --loader-in-at
    // in css/styles.css. Default 0: the counter runs from page start.
    const BAR_DELAY = Number.isFinite(+window.AH_LOADER_BAR_DELAY)
        ? +window.AH_LOADER_BAR_DELAY
        : 0;
    const MIN_TIME = 1100 + BAR_DELAY;
    const MAX_TIME = 6500;
    const ITEM_TIMEOUT = 5000;
    // Borrowed denominator for assets whose length the server never declares.
    const FALLBACK_SIZE = 65536;

    const assets = manifest.map((source) => ({ source, total: 0, loaded: 0, done: false }));
    let fontsDone = false;

    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
        fontsDone = true;
    });

    // Decode the fetched bytes once so the reveal paint hits a warm bitmap.
    function warmDecode(blob) {
        if (!blob || !blob.size || typeof URL.createObjectURL !== 'function') {
            return;
        }

        const image = new Image();
        image.decoding = 'async';
        image.src = URL.createObjectURL(blob);

        const revoke = () => URL.revokeObjectURL(image.src);

        if (typeof image.decode === 'function') {
            image.decode().then(revoke, revoke);
        } else {
            image.addEventListener('load', revoke, { once: true });
            image.addEventListener('error', revoke, { once: true });
        }
    }

    async function streamAsset(asset) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), ITEM_TIMEOUT);

        try {
            const response = await fetch(asset.source, { signal: controller.signal });

            if (!response.ok) {
                throw new Error('status ' + response.status);
            }

            const declared = parseInt(response.headers.get('content-length') || '', 10);

            if (Number.isFinite(declared) && declared > 0) {
                asset.total = declared;
            }

            if (response.body && typeof response.body.getReader === 'function') {
                const reader = response.body.getReader();
                const chunks = [];

                for (;;) {
                    const part = await reader.read();

                    if (part.done) {
                        break;
                    }

                    chunks.push(part.value);
                    asset.loaded += part.value.byteLength;
                }

                // A finished transfer carries every byte; trust the wire
                // total if the stream ever under-reports (e.g. compression).
                if (!asset.total || asset.loaded < asset.total) {
                    asset.loaded = asset.total || asset.loaded;
                }

                if (!asset.total) {
                    asset.total = asset.loaded;
                }

                warmDecode(new Blob(chunks));
            } else {
                const blob = await response.blob();
                asset.loaded = blob.size;

                if (!asset.total) {
                    asset.total = blob.size;
                }

                warmDecode(blob);
            }
        } catch {
            // Aborted or failed: settle the asset so the counter can still
            // converge. The CSS paint retries the URL on its own.
            if (!asset.total) {
                asset.total = asset.loaded || FALLBACK_SIZE;
            }

            asset.loaded = Math.max(asset.loaded, asset.total);
        } finally {
            window.clearTimeout(timeout);
            asset.done = true;
        }
    }

    // Without fetch streams, an asset is one unknown-size unit: it reports
    // nothing until the classic preload completes, then settles 1/1.
    function imageFallback(asset) {
        return new Promise((resolve) => {
            const image = new Image();

            image.decoding = 'async';
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
            image.src = asset.source;
            window.setTimeout(resolve, ITEM_TIMEOUT);
        }).then(() => {
            asset.total = 1;
            asset.loaded = 1;
            asset.done = true;
        });
    }

    const canStream =
        typeof window.fetch === 'function' && typeof window.AbortController === 'function';

    assets.forEach((asset) => {
        if (canStream) {
            streamAsset(asset);
        } else {
            imageFallback(asset);
        }
    });

    function realProgress() {
        let loadedBytes = 0;
        let knownTotal = 0;
        let knownCount = 0;
        let unknownCount = 0;

        assets.forEach((asset) => {
            loadedBytes += asset.loaded;

            if (asset.total > 0) {
                knownTotal += asset.total;
                knownCount += 1;
            } else {
                unknownCount += 1;
            }
        });

        const allAssetsDone = assets.every((asset) => asset.done);

        if (allAssetsDone && fontsDone) {
            return 1;
        }

        // Undeclared lengths borrow the average known size until they settle.
        const borrowed = unknownCount * (knownCount ? knownTotal / knownCount : FALLBACK_SIZE);
        const totalBytes = knownTotal + borrowed;
        const byteProgress = totalBytes > 0 ? loadedBytes / totalBytes : 0;

        // Fonts are a gate, not bytes: hold the last notch until they land.
        return Math.min(byteProgress, 0.999);
    }

    const startedAt = performance.now();
    let shown = 0;

    function render(value) {
        // Floor, not round: never claim a percent the bytes haven't earned.
        // Only the completion path may pass value >= 1 and show 100.
        const percent = value >= 1 ? 100 : Math.min(99, Math.floor(value * 100));

        if (count) {
            count.textContent = String(percent).padStart(3, '0') + ' %';
        }

        if (fill) {
            fill.style.transform = 'scaleX(' + Math.min(1, value) + ')';
        }
    }

    function frame(now) {
        if (root.classList.contains('intro-ready')) {
            // The external fallback already revealed; stop quietly.
            finished = true;
            return;
        }

        const elapsed = now - startedAt;

        // Pre-bar intro: the progress UI is still off-screen — hold the
        // display at zero so the chase is seen from its first visible frame.
        if (elapsed < BAR_DELAY) {
            render(0);
            window.requestAnimationFrame(frame);
            return;
        }

        const target = realProgress();

        // Smoothing only: chase the measured value, quickly upward and
        // gently downward (a re-estimated total can pull the bar back).
        shown += (target - shown) * (target > shown ? 0.18 : 0.06);

        if (Math.abs(target - shown) < 0.002) {
            shown = target;
        }

        render(shown);

        if (target >= 1 && elapsed >= MIN_TIME && shown >= 0.994) {
            render(1);
            finish(false);
            return;
        }

        if (elapsed >= MAX_TIME) {
            render(1);
            finish(true);
            return;
        }

        window.requestAnimationFrame(frame);
    }

    render(0);
    window.requestAnimationFrame(frame);

    // Exit transition: intercept same-origin navigations so the current page
    // can defocus + overexpose before the browser leaves. The destination
    // page's own loader veil covers the arrival, so there is no flash.
    document.addEventListener('click', (event) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const anchor = event.target.closest('a[href]');

        if (
            !anchor ||
            anchor.target === '_blank' ||
            anchor.hasAttribute('download') ||
            anchor.hasAttribute('data-no-transition')
        ) {
            return;
        }

        const url = new URL(anchor.href, window.location.href);

        if (url.origin !== window.location.origin) {
            return;
        }

        if (url.pathname === window.location.pathname && url.hash) {
            return;
        }

        event.preventDefault();
        root.classList.add('nav-exit');

        window.setTimeout(() => {
            window.location.href = anchor.href;
        }, 360);
    });

    window.addEventListener('pageshow', () => {
        root.classList.remove('nav-exit');
    });
})();
