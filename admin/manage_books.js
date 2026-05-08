const titleInput = document.getElementById('bookTitle');
const slugPreview = document.getElementById('slugPreview');
const markdownTextarea = document.getElementById('markdownContent');
const uploadInput = document.getElementById('markdownUpload');
const bookForm = document.getElementById('bookForm');

const editor = new EasyMDE({
    element: markdownTextarea,
    spellChecker: false,
    status: false,
    autofocus: false,
    placeholder: 'Write your book in markdown...',
});

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

updateSlugPreview();