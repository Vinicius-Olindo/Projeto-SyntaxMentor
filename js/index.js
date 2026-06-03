document.addEventListener('DOMContentLoaded', () => {
    const siteHeader = document.querySelector('.site-header');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = document.querySelectorAll('.workflow-step, .feature-grid article, .permission-card, .steps, .security-list, .site-footer');

    const updateHeaderState = () => {
        if (!siteHeader) return;
        siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });

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
