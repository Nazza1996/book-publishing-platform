export interface IChapter {
  num: number;
  title: string;
  content: string;
}

export class Chapter implements IChapter {
  num: number;
  title: string;
  content: string;

  constructor(num: number, title: string, content: string = '') {
    this.num = num;
    this.title = title;
    this.content = content;
  }

  toJSON() {
    return {
      num: this.num,
      title: this.title,
      content: this.content,
    };
  }
}
