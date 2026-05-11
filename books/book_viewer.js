class BookViewer {
    constructor() {
        this.chapters = window.initialChapters || [];
        this.currentChapter = null;
        this.init();
    }

    init() {
        // Get slug from URL
        const slug = new URLSearchParams(window.location.search).get('slug');
        if (!slug) return;

        this.slug = slug;
        this.setupChapterLinks();
        this.loadInitialChapter();
        this.setupHashNavigation();
    }

    setupChapterLinks() {
        const links = document.querySelectorAll('.book-chapters a');
        links.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const chapterNum = parseInt(link.hash.substring(1), 10);
                if (chapterNum > 0) {
                    this.loadChapter(chapterNum);
                    window.location.hash = chapterNum;
                }
            });
        });
    }

    loadInitialChapter() {
        const hash = window.location.hash.substring(1);
        const chapterNum = parseInt(hash, 10);

        if (chapterNum > 0) {
            this.loadChapter(chapterNum);
        } else if (this.chapters.length > 0) {
            // Load first chapter by default
            this.loadChapter(this.chapters[0].num);
            window.history.replaceState(null, '', `?slug=${encodeURIComponent(this.slug)}#${this.chapters[0].num}`);
        }
    }

    setupHashNavigation() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            const chapterNum = parseInt(hash, 10);
            if (chapterNum > 0) {
                this.loadChapter(chapterNum);
            }
        });
    }

    async loadChapter(chapterNum) {
        try {
            const response = await fetch(
                `/api/get-chapter.php?slug=${encodeURIComponent(this.slug)}&num=${chapterNum}`
            );

            if (!response.ok) {
                console.error(`Failed to load chapter ${chapterNum}`);
                return;
            }

            const data = await response.json();
            this.displayChapter(data);
            this.currentChapter = chapterNum;

            // Scroll to top
            document.querySelector('.book-viewer').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading chapter:', error);
        }
    }

    displayChapter(chapter) {
        const viewer = document.querySelector('.book-viewer');
        if (!viewer) return;

        viewer.innerHTML = `
            <h1>${chapter.title}</h1>
            <div class="chapter-content">
                ${chapter.html}
            </div>
        `;

        // Highlight current chapter in sidebar
        const links = document.querySelectorAll('.book-chapters a');
        links.forEach((link) => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${chapter.num}`) {
                link.classList.add('active');
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BookViewer();
    });
} else {
    new BookViewer();
}
