const Book = require('./Book');
const Chapter = require('./Chapter');

Book.hasMany(Chapter, { foreignKey: 'bookId' });
Chapter.belongsTo(Book, { foreignKey: 'bookId' });

module.exports = {
  Book,
  Chapter,
};