export interface IBook {
  slug: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  draftExists: boolean;
  publishedExists: boolean;
  featured: boolean;
  description: string;
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

  constructor(
    slug: string,
    title: string,
    content: string,
    status: 'draft' | 'published' = 'draft',
    draftExists: boolean = false,
    publishedExists: boolean = false,
    featured: boolean = false,
    description: string = ''
  ) {
    this.slug = slug;
    this.title = title;
    this.content = content;
    this.status = status;
    this.draftExists = draftExists;
    this.publishedExists = publishedExists;
    this.featured = featured;
    this.description = description;
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
    };
  }
}
