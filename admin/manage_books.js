const titleInput = document.getElementById('bookTitle');
const slugPreview = document.getElementById('slugPreview');
const markdownTextarea = document.getElementById('markdownContent');
const uploadInput = document.getElementById('markdownUpload');
const bookForm = document.getElementById('bookForm');
const openDeleteBookModalButton = document.getElementById('openDeleteBookModal');
const deleteBookModal = document.getElementById('deleteBookModal');
const closeDeleteBookModalButton = document.getElementById('closeDeleteBookModal');
const deleteBookForm = document.getElementById('deleteBookForm');
const deleteBookSlugInput = document.getElementById('deleteBookSlug');
const deleteBookMessage = document.getElementById('deleteBookMessage');
const addChapterButton = document.getElementById('addChapterButton');
const chaptersList = document.getElementById('chaptersList');
const chaptersJson = document.getElementById('chaptersJson');
const chaptersTitle = document.getElementById('chaptersTitle');

let chapters = [];
let currentChapterIndex = null;
let editor = null;
let editorScroller = null;

const parseAlignmentBlocks = (markdown, renderMarkdown) => {
    const lines = String(markdown || '').replace(/\r\n|\r/g, '\n').split('\n');
    const output = [];
    let buffer = [];
    let currentAlign = null;
    let alignBuffer = [];

    const flushBuffer = () => {
        if (buffer.length === 0) {
            return;
        }

        output.push(renderMarkdown(buffer.join('\n')));
        buffer = [];
    };

    const flushAlignBlock = () => {
        if (!currentAlign) {
            return;
        }

        output.push(`<div class="text-${currentAlign}">${renderMarkdown(alignBuffer.join('\n'))}</div>`);
        currentAlign = null;
        alignBuffer = [];
    };

    for (const line of lines) {
        const openMatch = line.trim().match(/^:::(center|right|left)\s*$/i);

        if (!currentAlign && openMatch) {
            currentAlign = openMatch[1].toLowerCase();
            alignBuffer = [];
            continue;
        }

        if (currentAlign) {
            if (line.trim() === ':::') {
                flushAlignBlock();
            } else {
                alignBuffer.push(line);
            }

            continue;
        }

        buffer.push(line);
    }

    flushAlignBlock();
    flushBuffer();

    return output.join('\n');
};

const syncAlignmentLineClasses = (codemirror) => {
    const doc = codemirror.getDoc();
    let currentAlign = null;

    doc.eachLine((lineHandle) => {
        const text = lineHandle.text.trim();

        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-center');
        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-right');
        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-left');

        const openMatch = text.match(/^:::(center|right|left)\s*$/i);
        if (openMatch) {
            currentAlign = openMatch[1].toLowerCase();
            return;
        }

        if (text === ':::') {
            currentAlign = null;
            return;
        }

        if (!currentAlign || text === '') {
            return;
        }

        codemirror.addLineClass(lineHandle, 'text', `mde-align-${currentAlign}`);
    });
};

const wrapSelectionInAlignmentBlock = (editorInstance, align) => {
    const cm = editorInstance.codemirror;
    const selection = cm.getSelection() || 'Aligned text';
    const wrapped = `:::${align}\n${selection}\n:::\n`;

    cm.replaceSelection(wrapped);
    cm.focus();
    syncAlignmentLineClasses(cm);
};

const wrapSelectionWithUnderline = (editorInstance) => {
    const cm = editorInstance.codemirror;
    const selection = cm.getSelection() || 'underlined text';
    const wrapped = `==${selection}==`;

    cm.replaceSelection(wrapped);
    cm.focus();
};

const applyCustomInlineFormatting = (html) => {
    let formatted = String(html || '');
    formatted = formatted.replace(/==([^=]+)==/g, '<span class="text-underline">$1</span>');
    return formatted;
};

const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-book';

const titleCase = (value) => value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Untitled Book';

const updateSlugPreview = () => {
    slugPreview.textContent = slugify(titleInput.value || 'untitled-book');
};

const extractTitle = (fileName, markdown) => {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) {
        return headingMatch[1].trim();
    }
    return titleCase(fileName.replace(/\.[^.]+$/, ''));
};

const updateEditorScrollState = () => {
    if (!editorScroller) return;
    const isScrollable = editorScroller.scrollHeight > editorScroller.clientHeight + 1;
    editorScroller.classList.toggle('editor-scrollable', isScrollable);
};

// ============ EDITOR INITIALIZATION ============
const initializeEditor = () => {
    if (!markdownTextarea) return;

    if (editor) {
        editor.toTextArea();
        editor = null;
        editorScroller = null;
    }

    editor = new EasyMDE({
        element: markdownTextarea,
        placeholder: 'Write your book in markdown...',
        previewRender: function(plainText) {
            const rendered = parseAlignmentBlocks(plainText, (segment) => this.parent.markdown(segment));
            return applyCustomInlineFormatting(rendered);
        },
        toolbar: [
            "bold",
            "italic",
            {
                name: "underline",
                action: (editorInstance) => wrapSelectionWithUnderline(editorInstance),
                className: "fa fa-underline",
                title: "Underline text"
            },
            "strikethrough",
            "heading",
            "|",
            "unordered-list",
            "ordered-list",
            "|",
            "link",
            "image",
            "table",
            "|",
            {
                name: "left",
                action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'left'),
                className: "fa fa-align-left",
                title: "Left align text"
            },
            {
                name: "center",
                action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'center'),
                className: "fa fa-align-center",
                title: "Center text"
            },
            {
                name: "right",
                action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'right'),
                className: "fa fa-align-right",
                title: "Right align text"
            },
            "|",
            "preview",
            "side-by-side",
            "fullscreen",
            "guide",
        ]
    });

    editorScroller = editor.codemirror.getScrollerElement();

    editor.codemirror.getWrapperElement().addEventListener('wheel', (event) => {
        if (editorScroller?.classList.contains('editor-scrollable')) {
            return;
        }
        event.stopImmediatePropagation();
    }, { capture: true });

    editor.codemirror.on('change', () => {
        syncAlignmentLineClasses(editor.codemirror);
        requestAnimationFrame(updateEditorScrollState);
    });

    syncAlignmentLineClasses(editor.codemirror);
    updateEditorScrollState();
};

// ============ CHAPTER MANAGEMENT ============
const renderChapters = () => {
    if (chapters.length === 0) {
        chaptersList.innerHTML = '<p class="empty-state">No chapters yet. Click the button above to create one.</p>';
        chaptersTitle.textContent = 'Chapters';
        currentChapterIndex = null;
        return;
    }

    chaptersTitle.textContent = `Chapters (${chapters.length})`;

    const ul = document.createElement('ul');
    ul.className = 'chapters-list';

    chapters.forEach((chapter, index) => {
        const li = document.createElement('li');
        li.className = `chapter-item ${currentChapterIndex === index ? 'is-active' : ''}`;
        li.style.cursor = 'pointer';
        li.innerHTML = `
            <div class="chapter-item-content">
                <div class="chapter-number">Chapter ${index + 1}</div>
                <div class="chapter-title-text" data-index="${index}">${htmlEscape(chapter.title || 'Untitled')}</div>
            </div>
            <div class="chapter-item-actions">
                <button type="button" class="chapter-btn edit" data-index="${index}">Edit</button>
                <button type="button" class="chapter-btn delete" data-index="${index}" ${chapters.length === 1 ? 'disabled' : ''}>Delete</button>
            </div>
        `;

        // Make the entire item clickable to select
        li.addEventListener('click', (e) => {
            if (e.target.closest('.chapter-btn.delete')) {
                return; // Don't select if delete button was clicked
            }
            selectChapter(index);
        });

        // Make the title editable
        const titleElement = li.querySelector('.chapter-title-text');
        li.querySelector('.chapter-btn.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            editChapterTitle(titleElement, index);
        });

        li.querySelector('.chapter-btn.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChapter(index);
        });

        ul.appendChild(li);
    });

    chaptersList.innerHTML = '';
    chaptersList.appendChild(ul);
};

const editChapterTitle = (titleElement, index) => {
    const currentTitle = chapters[index].title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'chapter-title-input';
    
    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle !== '') {
            chapters[index].title = newTitle;
        }
        renderChapters();
        // Restore selection after re-render
        if (currentChapterIndex === index) {
            const items = chaptersList.querySelectorAll('.chapter-item');
            if (items[index]) {
                items[index].classList.add('is-active');
            }
        }
    };

    titleElement.replaceWith(input);
    input.focus();
    input.select();

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditing();
        } else if (e.key === 'Escape') {
            renderChapters();
            if (currentChapterIndex === index) {
                const items = chaptersList.querySelectorAll('.chapter-item');
                if (items[index]) {
                    items[index].classList.add('is-active');
                }
            }
        }
    });
};

const selectChapter = (index) => {
    // Save current chapter if editing
    if (currentChapterIndex !== null && editor) {
        chapters[currentChapterIndex].content = editor.value();
    }

    currentChapterIndex = index;
    if (editor) {
        markdownTextarea.value = chapters[index].content || '';
        editor.value(chapters[index].content || '');
    }

    renderChapters();
};

const addChapter = () => {
    chapters.push({
        title: `Chapter ${chapters.length + 1}`,
        content: ''
    });
    selectChapter(chapters.length - 1);
    editChapterTitle(chaptersList.querySelector('.chapter-title-text[data-index="' + (chapters.length - 1) + '"]'), chapters.length - 1);
};

const deleteChapter = (index) => {
    if (chapters.length === 1) {
        alert('You must have at least one chapter. Cannot delete the last chapter.');
        return;
    }
    
    if (confirm(`Delete Chapter ${index + 1}?`)) {
        chapters.splice(index, 1);
        if (currentChapterIndex === index) {
            currentChapterIndex = null;
            if (editor) {
                markdownTextarea.value = '';
                editor.value('');
            }
        }
        renderChapters();
        
        // Auto-select first chapter after deletion
        if (chapters.length > 0) {
            selectChapter(0);
        }
    }
};

const updateChapterFromEditor = () => {
    if (currentChapterIndex !== null && editor) {
        chapters[currentChapterIndex].content = editor.value();
        const titleMatch = chapters[currentChapterIndex].content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            chapters[currentChapterIndex].title = titleMatch[1].trim();
            renderChapters();
        }
    }
};

const htmlEscape = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// ============ EVENT LISTENERS ============
titleInput?.addEventListener('input', updateSlugPreview);

addChapterButton?.addEventListener('click', () => {
    addChapter();
});

uploadInput?.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const contents = String(reader.result || '');
        if (editor) {
            editor.value(contents);
        }
        if (titleInput) {
            titleInput.value = extractTitle(file.name, contents);
        }
        updateSlugPreview();
    };
    reader.readAsText(file);
});

bookForm?.addEventListener('submit', (e) => {
    // Save current chapter being edited
    updateChapterFromEditor();

    // Store chapters as JSON with both title and content
    chaptersJson.value = JSON.stringify(chapters.map(ch => ({
        title: ch.title,
        content: ch.content
    })));
});

if (openDeleteBookModalButton) {
    openDeleteBookModalButton.addEventListener('click', () => {
        if (!deleteBookModal) return;
        const slug = openDeleteBookModalButton.dataset.bookSlug || '';
        const title = openDeleteBookModalButton.dataset.bookTitle || slug || 'this book';
        deleteBookSlugInput.value = slug;
        deleteBookMessage.textContent = `Are you sure you want to delete ${title}?`;
        deleteBookModal.classList.add('is-open');
        deleteBookModal.setAttribute('aria-hidden', 'false');
    });
}

if (closeDeleteBookModalButton) {
    closeDeleteBookModalButton.addEventListener('click', () => {
        if (!deleteBookModal) return;
        deleteBookModal.classList.remove('is-open');
        deleteBookModal.setAttribute('aria-hidden', 'true');
    });
}

if (deleteBookModal) {
    deleteBookModal.addEventListener('click', (event) => {
        if (event.target === deleteBookModal) {
            deleteBookModal.classList.remove('is-open');
            deleteBookModal.setAttribute('aria-hidden', 'true');
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteBookModal?.classList.contains('is-open')) {
        deleteBookModal.classList.remove('is-open');
        deleteBookModal.setAttribute('aria-hidden', 'true');
    }
});

if (deleteBookForm) {
    deleteBookForm.addEventListener('submit', () => {
        if (deleteBookModal) {
            deleteBookModal.classList.remove('is-open');
            deleteBookModal.setAttribute('aria-hidden', 'true');
        }
    });
}

window.addEventListener('resize', updateEditorScrollState);

// Initialize
initializeEditor();
updateSlugPreview();

// Load existing chapters from server if available
if (window.initialChapters && Array.isArray(window.initialChapters)) {
    chapters = window.initialChapters;
}

// Create first chapter if none exist
if (chapters.length === 0) {
    addChapter();
} else {
    renderChapters();
    // Auto-select first chapter if available
    if (chapters.length > 0) {
        selectChapter(0);
    }
}
updateEditorScrollState();