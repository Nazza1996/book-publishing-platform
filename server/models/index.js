const Book = require('./Book');
const BookVersion = require('./BookVersion');
const Chapter = require('./Chapter');
const User = require('./User');

// Book -> BookVersion relationship
Book.hasMany(BookVersion, { foreignKey: 'bookId', as: 'versions' });
BookVersion.belongsTo(Book, { foreignKey: 'bookId' });

// BookVersion -> Chapter relationship
BookVersion.hasMany(Chapter, { foreignKey: 'bookVersionId', as: 'chapters' });
Chapter.belongsTo(BookVersion, { foreignKey: 'bookVersionId' });

module.exports = {
  Book,
  BookVersion,
  Chapter,
  User,
};
