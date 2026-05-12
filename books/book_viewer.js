class BookViewer {
    constructor() {
        this.chapters = window.initialChapters || [];
        this.currentChapter = null;
        this.chapterSelectors = [];
        this.init();
    }

    async init() {
        // Import CustomSelect component
        const { default: CustomSelect } = await import('../components/CustomSelect.js');
        
        // Get slug from URL
        const slug = new URLSearchParams(window.location.search).get('slug');
        if (!slug) return;

        this.slug = slug;
        this.setupChapterSelectors(CustomSelect);
        this.loadInitialChapter();
        this.setupHashNavigation();
    }

    setupChapterSelectors(CustomSelect) {
        const wrapperTop = document.getElementById('chapter-selector-wrapper');
        const wrapperBottom = document.getElementById('chapter-selector-bottom-wrapper');

        if (wrapperTop) {
            const selector = new CustomSelect('chapter-selector-wrapper');
            this.chapterSelectors.push(selector);
            wrapperTop.addEventListener('customSelectChange', (e) => {
                this.handleChapterChange(e.detail.value);
            });
        }

        if (wrapperBottom) {
            const selector = new CustomSelect('chapter-selector-bottom-wrapper');
            this.chapterSelectors.push(selector);
            wrapperBottom.addEventListener('customSelectChange', (e) => {
                this.handleChapterChange(e.detail.value, true);
            });
        }
    }

    handleChapterChange(chapterNum, scrollToTop = false) {
        if (chapterNum > 0) {
            this.loadChapter(chapterNum, scrollToTop);
            window.history.pushState(null, '', `?slug=${encodeURIComponent(this.slug)}#${chapterNum}`);
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
        const selectedChapter = this.chapters.find(ch => ch.num === chapter.num);
        if (selectedChapter) {
            this.chapterSelectors.forEach(selector => {
                selector.setValue(chapter.num);
            });
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
