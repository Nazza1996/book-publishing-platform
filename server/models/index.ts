import Book from './Book.js';
import BookVersion from './BookVersion.js';
import Chapter from './Chapter.js';
import User from './User.js';

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
