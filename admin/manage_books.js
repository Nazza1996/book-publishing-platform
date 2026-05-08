const titleInput = document.getElementById('bookTitle');
const slugPreview = document.getElementById('slugPreview');
const markdownTextarea = document.getElementById('markdownContent');
const uploadInput = document.getElementById('markdownUpload');
const bookForm = document.getElementById('bookForm');

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

const editor = new EasyMDE({
    element: markdownTextarea,
    placeholder: 'Write your book in markdown...',
    previewRender: function(plainText) {
        return parseAlignmentBlocks(plainText, (segment) => this.parent.markdown(segment));
    },
    toolbar: [
        "bold",
        "italic",
        "strikethrough",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "image",
        "table",
        "|",
        {
            name: "center",
            action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'center'),
            className: "fa fa-align-center",
            title: "Center text"
        },
        {
            name: "left",
            action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'left'),
            className: "fa fa-align-left",
            title: "Left align text"
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

const editorScroller = editor.codemirror.getScrollerElement();

const updateEditorScrollState = () => {
    const isScrollable = editorScroller.scrollHeight > editorScroller.clientHeight + 1;

    editorScroller.classList.toggle('editor-scrollable', isScrollable);
};

editor.codemirror.getWrapperElement().addEventListener('wheel', (event) => {
    if (editorScroller.classList.contains('editor-scrollable')) {
        return;
    }

    event.stopImmediatePropagation();
}, { capture: true });

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

titleInput.addEventListener('input', updateSlugPreview);

uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const contents = String(reader.result || '');
        editor.value(contents);
        titleInput.value = extractTitle(file.name, contents);
        updateSlugPreview();
    };

    reader.readAsText(file);
});

bookForm.addEventListener('submit', () => {
    markdownTextarea.value = editor.value();
});

editor.codemirror.on('change', () => {
    syncAlignmentLineClasses(editor.codemirror);
    requestAnimationFrame(updateEditorScrollState);
});

window.addEventListener('resize', updateEditorScrollState);

updateSlugPreview();
syncAlignmentLineClasses(editor.codemirror);
updateEditorScrollState();