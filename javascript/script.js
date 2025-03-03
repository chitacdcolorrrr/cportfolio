window.addEventListener('load', function() {
    const title = document.getElementById('title');
    const subtitle = document.getElementById('subtitle');
    const elements = [
        document.getElementById('element1'),
        document.getElementById('element3'),
        document.getElementById('element4'),
        document.getElementById('element5')
    ];

    // Use setTimeout to ensure the transition starts after a tiny delay on page load
    setTimeout(() => {
        title.style.filter = 'blur(0)';
        subtitle.style.filter = 'blur(0)';
        elements.forEach(el => el.style.filter = 'blur(0)');
    }, 10);
});
