import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";

class ChapterRevision extends Model {
    public id!: number;
    public bookId!: number;
    public chapterNumber!: number;
    public revisionNumber!: number;
    public title!: string;
    public content!: string | null;
    public sourceBookVersionId!: number | null;
    public createdBy!: number | null;
}

ChapterRevision.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        bookId: { type: DataTypes.INTEGER, allowNull: false },
        chapterNumber: { type: DataTypes.INTEGER, allowNull: false },
        revisionNumber: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false },
        content: { type: DataTypes.TEXT("medium"), allowNull: true },
        sourceBookVersionId: { type: DataTypes.INTEGER, allowNull: true },
        createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
        sequelize,
        tableName: "chapter_revisions",
        timestamps: true,
        indexes: [{ unique: true, fields: ["bookId", "chapterNumber", "revisionNumber", "createdBy"] }],
    }
);

export default ChapterRevision;
