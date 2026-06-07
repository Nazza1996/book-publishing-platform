import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";
import type { ReaderChannel } from "./BookChannelMetadata.js";

class ChapterRelease extends Model {
    public id!: number;
    public bookId!: number;
    public channel!: ReaderChannel;
    public chapterNumber!: number;
    public title!: string;
    public content!: string;
    public status!: "scheduled" | "released";
    public releaseAt!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ChapterRelease.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        bookId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        channel: {
            type: DataTypes.ENUM("alpha", "beta", "public"),
            allowNull: false,
        },
        chapterNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "",
        },
        status: {
            type: DataTypes.ENUM("scheduled", "released"),
            allowNull: false,
            defaultValue: "scheduled",
        },
        releaseAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "chapter_releases",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["bookId", "channel", "chapterNumber"],
            },
        ],
    }
);

export default ChapterRelease;
