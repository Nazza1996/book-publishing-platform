import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";
import type { ReaderChannel } from "./BookChannelMetadata.js";

class ReaderFeedback extends Model {
    public id!: number;
    public bookId!: number;
    public channel!: ReaderChannel;
    public chapterNumber!: number | null;
    public readerUsername!: string;
    public comment!: string;
    public status!: "open" | "reviewed" | "resolved";
}

ReaderFeedback.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        bookId: { type: DataTypes.INTEGER, allowNull: false },
        channel: { type: DataTypes.ENUM("alpha", "beta", "public"), allowNull: false },
        chapterNumber: { type: DataTypes.INTEGER, allowNull: true },
        readerUsername: { type: DataTypes.STRING, allowNull: false, defaultValue: "Reader" },
        comment: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.ENUM("open", "reviewed", "resolved"), allowNull: false, defaultValue: "open" },
    },
    {
        sequelize,
        tableName: "reader_feedback",
        timestamps: true,
    }
);

export default ReaderFeedback;
