import { promises as fs } from 'fs';
import { join, dirname, parse } from 'path';
import { fileURLToPath } from 'url';
import { Book } from '../models/Book';
import { Chapter } from '../models/Chapter';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class BookController {
  private static baseDir(): string {
    return join(__dirname, '..', '..', 'content', 'books');
  }

  private static draftsDir(): string {
    return join(this.baseDir(), 'drafts');
  }

  private static publishedDir(): string {
    return join(this.baseDir(), 'published');
  }

  static async ensureStorage(): Promise<void> {
    const dirs = [this.baseDir(), this.draftsDir(), this.publishedDir()];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory already exists
      }
    }
  }

  static normalizeSlug(value: string): string {
    let slug = value.toLowerCase().trim();
    slug = slug.replace(/[^a-z0-9]+/gi, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug !== '' ? slug : 'untitled-book';
  }

  static async slugExists(slug: string): Promise<boolean> {
    await this.ensureStorage();
    const metadata = await this.loadMetadata();
    return slug in metadata;
  }

  static async generateUniqueSlug(baseSlug: string): Promise<string> {
    await this.ensureStorage();

    if (!(await this.slugExists(baseSlug))) {
      return baseSlug;
    }

    for (let i = 2; i <= 999; i++) {
      const newSlug = `${baseSlug}-${i}`;
      if (!(await this.slugExists(newSlug))) {
        return newSlug;
      }
    }

    return `${baseSlug}-${Date.now()}`;
  }

  static prettyTitle(slug: string): string {
    let title = slug.replace(/[-_]/g, ' ').trim();
    title = title.replace(/\s+/g, ' ');
    return title !== '' ? title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Untitled Book';
  }

  private static draftPath(slug: string): string {
    return join(this.draftsDir(), `${slug}.md`);
  }

  private static publishedPath(slug: string): string {
    return join(this.publishedDir(), `${slug}.md`);
  }

  private static metadataPath(): string {
    return join(this.baseDir(), 'metadata.json');
  }

  private static async loadMetadata(): Promise<Record<string, any>> {
    const path = this.metadataPath();
    try {
      const data = await fs.readFile(path, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private static async saveMetadata(book: Book): Promise<void> {
    const metadata = await this.loadMetadata();
    metadata[book.slug] = book.toJSON();
    await fs.writeFile(this.metadataPath(), JSON.stringify(metadata, null, 2));
  }

  private static async deleteMetadata(slug: string): Promise<void> {
    const metadata = await this.loadMetadata();
    delete metadata[slug];
    await fs.writeFile(this.metadataPath(), JSON.stringify(metadata, null, 2));
  }

  private static async readFile(path: string): Promise<string | null> {
    try {
      return await fs.readFile(path, 'utf-8');
    } catch {
      return null;
    }
  }

  private static async writeFile(path: string, contents: string): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, contents.trimEnd() + '\n');
  }

  private static async moveIfExists(from: string, to: string): Promise<void> {
    try {
      await fs.rename(from, to);
    } catch {
      // File doesn't exist
    }
  }

  static async listBooks(): Promise<Book[]> {
    await this.ensureStorage();
    const books: Map<string, Book> = new Map();
    const metadata = await this.loadMetadata();

    const dirs = [
      { status: 'draft' as const, dir: this.draftsDir() },
      { status: 'published' as const, dir: this.publishedDir() },
    ];

    for (const { status, dir } of dirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (!file.endsWith('.md')) continue;
          
          const slug = parse(file).name;
          const path = join(dir, file);
          const contents = await this.readFile(path);

          if (!books.has(slug)) {
            books.set(slug, new Book(
              slug,
              metadata[slug]?.title || '',
              contents || '',
              'draft',
              false,
              false,
              metadata[slug]?.featured || false,
              metadata[slug]?.description || ''
            ));
          }

          const book = books.get(slug)!;
          book.content = contents || '';
          book.title = metadata[slug]?.title || '';

          if (status === 'draft') {
            book.draftExists = true;
          } else if (status === 'published') {
            book.publishedExists = true;
            book.status = 'published';
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    const result = Array.from(books.values());
    result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }

  static async getBook(slug: string): Promise<Book | null> {
    await this.ensureStorage();
    slug = this.normalizeSlug(slug);

    const draft = await this.readFile(this.draftPath(slug));
    const published = await this.readFile(this.publishedPath(slug));
    const contents = draft ?? published;

    if (contents === null) {
      return null;
    }

    const metadata = await this.loadMetadata();

    return new Book(
      slug,
      metadata[slug]?.title || '',
      contents,
      published !== null ? 'published' : 'draft',
      draft !== null,
      published !== null,
      metadata[slug]?.featured || false,
      metadata[slug]?.description || ''
    );
  }

  static async saveDraft(existingSlug: string, book: Book): Promise<string> {
    await this.ensureStorage();

    const baseSlug = this.normalizeSlug(book.title);
    const normalizedExistingSlug = this.normalizeSlug(existingSlug);

    let newSlug: string;
    if (normalizedExistingSlug === '') {
      newSlug = await this.generateUniqueSlug(baseSlug);
    } else {
      newSlug = baseSlug;
    }

    if (normalizedExistingSlug !== '' && normalizedExistingSlug !== newSlug) {
      if (await this.slugExists(newSlug)) {
        throw new Error(`A book with the title '${this.prettyTitle(newSlug)}' already exists. Please choose a different title.`);
      }
      await this.moveIfExists(this.draftPath(normalizedExistingSlug), this.draftPath(newSlug));
      await this.moveIfExists(this.publishedPath(normalizedExistingSlug), this.publishedPath(newSlug));
    }

    await this.writeFile(this.draftPath(newSlug), book.content);

    book.slug = newSlug;
    await this.saveMetadata(book);

    if (normalizedExistingSlug !== '' && normalizedExistingSlug !== newSlug) {
      await this.deleteMetadata(normalizedExistingSlug);
    }

    return newSlug;
  }

  static async publishBook(existingSlug: string, book: Book): Promise<string> {
    const slug = await this.saveDraft(existingSlug, book);
    
    const draftPath = this.draftPath(slug);
    const publishedPath = this.publishedPath(slug);
    
    await fs.mkdir(dirname(publishedPath), { recursive: true });
    const content = await fs.readFile(draftPath);
    await fs.writeFile(publishedPath, content);

    book.slug = slug;
    book.status = 'published';
    await this.saveMetadata(book);

    if (existingSlug !== '' && existingSlug !== slug) {
      await this.deleteMetadata(existingSlug);
    }

    return slug;
  }

  static async convertToDraft(slug: string): Promise<string> {
    await this.ensureStorage();
    slug = this.normalizeSlug(slug);

    const publishedContents = await this.readFile(this.publishedPath(slug));

    if (publishedContents === null) {
      throw new Error('This book is not published yet.');
    }

    await this.toggleFeatured(slug, false);
    await this.writeFile(this.draftPath(slug), publishedContents);
    await fs.unlink(this.publishedPath(slug)).catch(() => {});

    return slug;
  }

  static async toggleFeatured(slug: string, featured?: boolean): Promise<Book[]> {
    await this.ensureStorage();
    slug = this.normalizeSlug(slug);

    const book = await this.getBook(slug);
    if (book === null) {
      throw new Error('Book not found.');
    }

    if (!book.publishedExists) {
      throw new Error('Only published books can be featured.');
    }

    book.featured = featured ?? !book.featured;
    await this.saveMetadata(book);

    const published = await this.getPublishedBooks();
    const metadata = await this.loadMetadata();

    let featuredBooks = published.filter((b) => metadata[b.slug]?.featured || false);
    featuredBooks = featuredBooks.slice(0, 3);

    while (featuredBooks.length < 3) {
      featuredBooks.push(Book.placeholder());
    }

    return featuredBooks;
  }

  static async countFeaturedBooks(): Promise<number> {
    await this.ensureStorage();
    const published = await this.getPublishedBooks();
    const metadata = await this.loadMetadata();

    return published.filter((b) => metadata[b.slug]?.featured || false).length;
  }

  static async getPublishedBooks(): Promise<Book[]> {
    const books = await BookController.listBooks();
    const published = books.filter((b) => b.publishedExists);

    const result: Book[] = [];
    for (const book of published) {
      const bookData = await BookController.getPublishedBook(book.slug);
      if (bookData !== null) {
        result.push(bookData);
      }
    }

    return result;
  }

  static async getFeaturedBooks(): Promise<Book[]> {
    await this.ensureStorage();
    const published = await this.getPublishedBooks();
    const metadata = await this.loadMetadata();

    let featured = published.filter((b) => metadata[b.slug]?.featured || false);
    featured = featured.slice(0, 3);

    while (featured.length < 3) {
      featured.push(Book.placeholder());
    }

    return featured;
  }

  static async getPublishedBook(slug: string): Promise<Book | null> {
    slug = this.normalizeSlug(slug);
    const contents = await this.readFile(this.publishedPath(slug));

    if (contents === null) {
      return null;
    }

    const metadata = await this.loadMetadata();

    return new Book(
      slug,
      metadata[slug]?.title || '',
      contents,
      'published',
      false,
      true,
      metadata[slug]?.featured || false,
      metadata[slug]?.description || ''
    );
  }

  static markdownToHtml(markdown: string): string {
    markdown = this.normalizeFormattingMarkup(markdown);
    markdown = markdown.replace(/\r\n|\r/g, '\n');
    const lines = markdown.split('\n');
    return this.renderMarkdownLines(lines);
  }

  private static normalizeFormattingMarkup(markdown: string): string {
    let result = markdown;
    result = result.replace(/<div\s+class=["']text-center["']\s*>/gi, ':::center');
    result = result.replace(/<div\s+class=["']text-right["']\s*>/gi, ':::right');
    result = result.replace(/<div\s+class=["']text-left["']\s*>/gi, ':::left');
    result = result.replace(/<\/div>/gi, ':::');
    return result;
  }

  private static renderMarkdownLines(lines: string[]): string {
    const html: string[] = [];
    let paragraph: string[] = [];
    let inList = false;
    let inCode = false;
    let codeLines: string[] = [];
    let inAlignBlock = false;
    let alignClass = '';
    let alignLines: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;

      let formatted = this.formatInline(paragraph.join('\n'));
      formatted = formatted.replace(/(^|\n)( +)/g, (m) => {
        return m[0] === '\n' ? '\n' + '&nbsp;'.repeat(m.length - 1) : m;
      });
      formatted = formatted.replace(/\n/g, '<br />');

      html.push(`<p>${formatted}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    const closeAlignBlock = () => {
      if (!inAlignBlock) return;

      html.push(`<div class="${alignClass}">${this.renderMarkdownLines(alignLines)}</div>`);
      inAlignBlock = false;
      alignClass = '';
      alignLines = [];
    };

    for (const line of lines) {
      if (!inAlignBlock) {
        const alignMatch = /^:::(center|right|left)\s*$/i.exec(line.trim());
        if (alignMatch) {
          flushParagraph();
          closeList();
          inAlignBlock = true;
          alignClass = `text-${alignMatch[1].toLowerCase()}`;
          alignLines = [];
          continue;
        }
      }

      if (inAlignBlock) {
        if (line.trim() === ':::') {
          closeAlignBlock();
        } else {
          alignLines.push(line);
        }
        continue;
      }

      if (line.trim() === '```') {
        if (inCode) {
          html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
          codeLines = [];
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
      if (headingMatch) {
        flushParagraph();
        closeList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${this.formatInline(headingMatch[2].trim())}</h${level}>`);
        continue;
      }

      const listMatch = /^[-*]\s+(.+)$/.exec(line);
      if (listMatch) {
        flushParagraph();
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${this.formatInline(listMatch[1].trim())}</li>`);
        continue;
      }

      if (line.trim() === '') {
        flushParagraph();
        closeList();
        continue;
      }

      paragraph.push(line);
    }

    if (inAlignBlock) {
      closeAlignBlock();
    }

    if (inCode) {
      html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
    }

    flushParagraph();
    closeList();

    return html.join('\n');
  }

  private static formatInline(text: string): string {
    text = this.escapeHtml(text);
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/==([^=]+)==/g, '<span class="text-underline">$1</span>');
    text = text.replace(/\+\+([^+]+)\+\+/g, '<span class="text-underline">$1</span>');
    text = text.replace(/__([^_]+)__/g, '<span class="text-underline">$1</span>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  static async deleteBook(slug: string): Promise<void> {
    await this.ensureStorage();
    slug = this.normalizeSlug(slug);

    await fs.unlink(this.draftPath(slug)).catch(() => {});
    await fs.unlink(this.publishedPath(slug)).catch(() => {});

    await this.deleteMetadata(slug);
  }

  private static chaptersMetadataPath(bookSlug: string, published: boolean): string {
    const dir = this.chaptersDir(bookSlug, published);
    return join(dir, 'metadata.json');
  }

  private static async loadChaptersMetadata(bookSlug: string, published: boolean): Promise<Record<number, string>> {
    const path = this.chaptersMetadataPath(bookSlug, published);
    try {
      const data = await fs.readFile(path, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  static async saveChaptersMetadata(bookSlug: string, published: boolean, metadata: Record<number, string>): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);
    const path = this.chaptersMetadataPath(bookSlug, published);

    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(metadata, null, 2));
  }

  private static chaptersDir(bookSlug: string, published: boolean): string {
    const base = published ? this.publishedDir() : this.draftsDir();
    return join(base, bookSlug, 'chapters');
  }

  private static chapterPath(bookSlug: string, chapterNum: number, published: boolean): string {
    const dir = this.chaptersDir(bookSlug, published);
    const filename = String(chapterNum).padStart(3, '0') + '.md';
    return join(dir, filename);
  }

  static async listChapters(bookSlug: string, published: boolean): Promise<Chapter[]> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);
    const dir = this.chaptersDir(bookSlug, published);

    const chapters: Chapter[] = [];

    try {
      const files = await fs.readdir(dir);
      const metadata = await this.loadChaptersMetadata(bookSlug, published);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const chapterNum = parseInt(parse(file).name, 10);
        const path = join(dir, file);
        const content = await this.readFile(path);
        const title = metadata[chapterNum] || this.extractChapterTitle(content || '');

        chapters.push(new Chapter(chapterNum, title, content || ''));
      }
    } catch {
      // Directory doesn't exist
    }

    chapters.sort((a, b) => a.num - b.num);
    return chapters;
  }

  static async getChapter(bookSlug: string, chapterNum: number, published: boolean): Promise<Chapter | null> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);
    const path = this.chapterPath(bookSlug, chapterNum, published);

    const content = await this.readFile(path);
    if (content === null) {
      return null;
    }

    const metadata = await this.loadChaptersMetadata(bookSlug, published);
    const title = metadata[chapterNum] || this.extractChapterTitle(content);

    return new Chapter(chapterNum, title, content);
  }

  static async saveChapter(bookSlug: string, chapterNum: number, content: string): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);
    const path = this.chapterPath(bookSlug, chapterNum, false);

    await this.writeFile(path, content);
  }

  static async deleteChapter(bookSlug: string, chapterNum: number): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);
    const path = this.chapterPath(bookSlug, chapterNum, false);

    await fs.unlink(path).catch(() => {});
  }

  static async reorderChapters(bookSlug: string, newOrder: Record<number, number>): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);

    for (const [newNum, oldNum] of Object.entries(newOrder)) {
      const oldPath = this.chapterPath(bookSlug, oldNum, false);
      const newPath = this.chapterPath(bookSlug, parseInt(newNum) + 1, false);

      try {
        const content = await this.readFile(oldPath);
        if (content !== null && oldPath !== newPath) {
          await this.writeFile(newPath, content);
          await fs.unlink(oldPath).catch(() => {});
        }
      } catch {
        // Error during reordering
      }
    }
  }

  static async publishChapters(bookSlug: string): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);

    const draftDir = this.chaptersDir(bookSlug, false);
    const publishedDir = this.chaptersDir(bookSlug, true);

    await fs.mkdir(publishedDir, { recursive: true });

    try {
      const files = await fs.readdir(draftDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const srcFile = join(draftDir, file);
        const dstFile = join(publishedDir, file);

        const content = await fs.readFile(srcFile);
        await fs.writeFile(dstFile, content);
      }
    } catch {
      // Draft directory doesn't exist
    }

    const draftMetadata = await this.loadChaptersMetadata(bookSlug, false);
    if (Object.keys(draftMetadata).length > 0) {
      await this.saveChaptersMetadata(bookSlug, true, draftMetadata);
    }
  }

  private static extractChapterTitle(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = /^#\s+(.+)$/.exec(line);
      if (match) {
        return match[1].trim();
      }
    }
    return 'Untitled Chapter';
  }

  static async cleanupOrphanedChapters(bookSlug: string, maxChapterNum: number, published: boolean): Promise<void> {
    await this.ensureStorage();
    bookSlug = this.normalizeSlug(bookSlug);

    for (let num = maxChapterNum + 1; num <= 999; num++) {
      const path = this.chapterPath(bookSlug, num, published);
      try {
        await fs.unlink(path);
      } catch {
        break;
      }
    }
  }
}
