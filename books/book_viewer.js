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
        this.setupChapterSelector();
        this.loadInitialChapter();
        this.setupHashNavigation();
    }

    setupChapterSelector() {
        const selectorTop = document.getElementById('chapter-selector');
        const selectorBottom = document.getElementById('chapter-selector-bottom');

        if (!selectorTop && !selectorBottom) return;

        const handleChapterChange = (e, scrollToTop = false) => {
            const chapterNum = parseInt(e.target.value, 10);
            if (chapterNum > 0) {
                this.loadChapter(chapterNum, scrollToTop);
                window.history.pushState(null, '', `?slug=${encodeURIComponent(this.slug)}#${chapterNum}`);
            }
        };

        if (selectorTop) {
            selectorTop.addEventListener('change', handleChapterChange);
        }

        if (selectorBottom) {
            selectorBottom.addEventListener('change', (e) => handleChapterChange(e, true));
        }
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

    async loadChapter(chapterNum, scrollToTop = false) {
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
            if (scrollToTop) {
                document.querySelector('.book-viewer').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading chapter:', error);
        }
    }

    displayChapter(chapter) {
        const viewer = document.querySelector('.book-viewer');
        if (!viewer) return;

        viewer.innerHTML = `
            <h1 style="text-align: center;">${chapter.title}</h1>
            <div class="chapter-content">
                ${chapter.html}
            </div>
        `;

        // Update chapter selectors
        const selector = document.getElementById('chapter-selector');
        if (selector) {
            selector.value = chapter.num;
        }
        
        const selectorBottom = document.getElementById('chapter-selector-bottom');
        if (selectorBottom) {
            selectorBottom.value = chapter.num;
        }
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
