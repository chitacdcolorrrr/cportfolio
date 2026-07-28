const page = document.body;
const index = document.querySelector('.index-nav');
const entries = document.querySelectorAll('.index-link[data-scene]');
const warmBackground = '/images/home-loved-background.webp?v=20260718-home-1';

let warmScenePromise;

function preloadImage(source, fetchPriority = 'auto') {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.decoding = 'async';
        image.fetchPriority = fetchPriority;
        image.addEventListener('load', async () => {
            if (typeof image.decode === 'function') {
                try {
                    await image.decode();
                } catch {
                    // A completed load is still safe to paint when decode() is unavailable or interrupted.
                }
            }

            resolve(image);
        }, { once: true });
        image.addEventListener('error', reject, { once: true });
        image.src = source;
    });
}

function prepareWarmScene() {
    if (!warmScenePromise) {
        warmScenePromise = preloadImage(warmBackground, 'low')
            .then(() => {
                page.classList.add('warm-scene-ready');
            })
            .catch(() => {
                warmScenePromise = undefined;
                // Keep the primary scene visible if the optional hover image fails.
            });
    }

    return warmScenePromise;
}

function scheduleWarmScene() {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prepareWarmScene, { timeout: 4500 });
        return;
    }

    window.setTimeout(prepareWarmScene, 3800);
}

function showScene(entry) {
    if (entry.dataset.scene === 'loved') {
        prepareWarmScene();
    }

    page.dataset.scene = entry.dataset.scene;
}

function showIndexScene() {
    page.dataset.scene = 'index';
}

entries.forEach((entry) => {
    entry.addEventListener('pointerenter', () => showScene(entry));
    entry.addEventListener('focus', () => showScene(entry));
});

index.addEventListener('pointerleave', showIndexScene);
index.addEventListener('focusout', (event) => {
    if (!index.contains(event.relatedTarget)) {
        showIndexScene();
    }
});

window.addEventListener('pageshow', showIndexScene);

// The intro reveal itself is owned by js/loader.js (asset preloading +
// percentage counter). Warm up the hover scene once the browser is idle.
scheduleWarmScene();
