document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = document.querySelectorAll('.feature-grid article, .steps, .security-list');

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach((target) => target.classList.add('is-revealed'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.18 });

    revealTargets.forEach((target) => observer.observe(target));
});
