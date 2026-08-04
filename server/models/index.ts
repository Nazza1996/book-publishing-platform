import Book from './Book.js';
import BookVersion from './BookVersion.js';
import BookChannelMetadata from './BookChannelMetadata.js';
import Chapter from './Chapter.js';
import ChapterRevision from './ChapterRevision.js';
import ChapterRelease from './ChapterRelease.js';
import ReaderFeedback from './ReaderFeedback.js';
import ReaderGroup from './ReaderGroup.js';
import ReaderGroupMember from './ReaderGroupMember.js';
import User from './User.js';

// Book -> BookVersion relationship
Book.hasMany(BookVersion, { foreignKey: 'bookId', as: 'versions' });
BookVersion.belongsTo(Book, { foreignKey: 'bookId' });

// BookVersion -> Chapter relationship
BookVersion.hasMany(Chapter, { foreignKey: 'bookVersionId', as: 'chapters' });
Chapter.belongsTo(BookVersion, { foreignKey: 'bookVersionId' });

// Book -> reader release channel metadata
Book.hasMany(BookChannelMetadata, { foreignKey: 'bookId', as: 'channelMetadata' });
BookChannelMetadata.belongsTo(Book, { foreignKey: 'bookId' });

// Book -> scheduled/released chapter availability
Book.hasMany(ChapterRelease, { foreignKey: 'bookId', as: 'releases' });
ChapterRelease.belongsTo(Book, { foreignKey: 'bookId' });

// Book -> reader groups and feedback
Book.hasMany(ReaderGroup, { foreignKey: 'bookId', as: 'readerGroups' });
ReaderGroup.belongsTo(Book, { foreignKey: 'bookId' });
ReaderGroup.hasMany(ReaderGroupMember, { foreignKey: 'readerGroupId', as: 'members' });
ReaderGroupMember.belongsTo(ReaderGroup, { foreignKey: 'readerGroupId' });
User.hasMany(ReaderGroupMember, { foreignKey: 'userId', as: 'readerMemberships' });
ReaderGroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Book.hasMany(ReaderFeedback, { foreignKey: 'bookId', as: 'feedback' });
ReaderFeedback.belongsTo(Book, { foreignKey: 'bookId' });
User.hasMany(ReaderFeedback, { foreignKey: 'readerUserId', as: 'readerFeedback' });
ReaderFeedback.belongsTo(User, { foreignKey: 'readerUserId', as: 'reader' });

// Book -> chapter revision snapshots
Book.hasMany(ChapterRevision, { foreignKey: 'bookId', as: 'chapterRevisions' });
ChapterRevision.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
User.hasMany(ChapterRevision, { foreignKey: 'createdBy', as: 'chapterRevisions' });
ChapterRevision.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export {
  Book,
  BookVersion,
  BookChannelMetadata,
  Chapter,
  ChapterRevision,
  ChapterRelease,
  ReaderFeedback,
  ReaderGroup,
  ReaderGroupMember,
  User,
};
