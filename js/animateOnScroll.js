export default async function animateOnScroll(element, options = {}) {
    if (!element) return;

    const defaultOptions = {
        type: 'slide',
        direction: 'right', // Default direction for sliding (left, right, top, down)
        duration: 0.3, // Duration of the animation
        delay: 0, // Delay before the animation starts
        threshold: 0.2, // When x% of the element is in view
    };

    const settings = { ...defaultOptions, ...options };

    // Check if the element is already in the viewport
    const elementTop = element.getBoundingClientRect().top;
    const scrollY = window.scrollY || window.pageYOffset;

    if (elementTop + element.offsetHeight < scrollY) {
        return;
    }

    element.style.opacity = 0;

    if (settings.type === 'slide') {
        switch (settings.direction) {
            case 'left':
                element.style.transform = 'translateX(-50%)'; // Move off-screen to the left
                break;
            case 'right':
                element.style.transform = 'translateX(50%)'; // Move off-screen to the right
                break;
            case 'top':
                element.style.transform = 'translateY(-50%)'; // Move off-screen above
                break;
            case 'down':
                element.style.transform = 'translateY(50%)'; // Move off-screen below
                break;
            default:
                element.style.transform = 'none';
                break;
        }
    }

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                element.style.opacity = 1;
                element.style.transition = `transform ${settings.duration}s ease-out, opacity ${settings.duration}s ease-out ${settings.delay}s`;
                if (settings.type === 'slide') {
                    switch (settings.direction) {
                        case 'left':
                            element.style.transform = 'translateX(0)';
                            break;
                        case 'right':
                            element.style.transform = 'translateX(0)';
                            break;
                        case 'top':
                            element.style.transform = 'translateY(0)';
                            break;
                        case 'down':
                            element.style.transform = 'translateY(0)';
                            break;
                        default:
                            break;
                    }
                }

                observer.unobserve(entry.target); // Unobserve after animation
            }
        });
    }, {
        threshold: settings.threshold,
    });

    observer.observe(element);
}

const isMobile = window.innerWidth <= 768;
if (!isMobile) {
    const profilePic = document.querySelector('.profile-pic');
    animateOnScroll(profilePic, { type: 'slide', direction: 'right', duration: 1 });

    const bioContent = document.querySelector('.bio-content');
    animateOnScroll(bioContent, { type: 'slide', direction: 'left', duration: 1 });

    const storyList = document.querySelector('.story-list');
    animateOnScroll(storyList, { type: 'slide', direction: 'left', duration: 1 });
}