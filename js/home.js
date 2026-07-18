const page = document.body;
const index = document.querySelector('.index-nav');
const entries = document.querySelectorAll('.index-link[data-scene]');

function showScene(entry) {
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
