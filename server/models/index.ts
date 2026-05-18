import Book from './Book';
import BookVersion from './BookVersion';
import Chapter from './Chapter';
import User from './User';

// Book -> BookVersion relationship
Book.hasMany(BookVersion, { foreignKey: 'bookId', as: 'versions' });
BookVersion.belongsTo(Book, { foreignKey: 'bookId' });

// BookVersion -> Chapter relationship
BookVersion.hasMany(Chapter, { foreignKey: 'bookVersionId', as: 'chapters' });
Chapter.belongsTo(BookVersion, { foreignKey: 'bookVersionId' });

// Book -> PublishedVersion relationship (for quick access)
Book.belongsTo(BookVersion, { foreignKey: 'publishedVersionId', as: 'publishedVersion' });

export {
  Book,
  BookVersion,
  Chapter,
  User,
};
