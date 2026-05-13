import { Chapter } from "./Chapter";

export interface IBook {
  slug: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  draftExists: boolean;
  publishedExists: boolean;
  featured: boolean;
  description: string;
  chapters?: Chapter[];
}

export class Book implements IBook {
  slug: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  draftExists: boolean;
  publishedExists: boolean;
  featured: boolean;
  description: string;
  chapters?: Chapter[];

  constructor(
    slug: string,
    title: string,
    content: string,
    status: 'draft' | 'published' = 'draft',
    draftExists: boolean = false,
    publishedExists: boolean = false,
    featured: boolean = false,
    description: string = '',
    chapters?: Chapter[]
  ) {
    this.slug = slug;
    this.title = title;
    this.content = content;
    this.status = status;
    this.draftExists = draftExists;
    this.publishedExists = publishedExists;
    this.featured = featured;
    this.description = description;
    this.chapters = chapters;
  }

  static placeholder(): Book {
    return new Book(
      'placeholder',
      'Placeholder',
      '',
      'draft',
      false,
      false,
      false,
      ''
    );
  }

  toJSON() {
    return {
      slug: this.slug,
      title: this.title,
      status: this.status,
      draftExists: this.draftExists,
      publishedExists: this.publishedExists,
      featured: this.featured,
      description: this.description,
      chapters: this.chapters,
    };
  }
}
