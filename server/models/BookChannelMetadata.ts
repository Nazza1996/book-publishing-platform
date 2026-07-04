import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";

export type ReaderChannel = "alpha" | "beta" | "public";

class BookChannelMetadata extends Model {
    public id!: number;
    public bookId!: number;
    public channel!: ReaderChannel;
    public description!: string;
    public authorNote!: string;
    public releaseLimit!: number;
    public nextRelease!: string;
}

BookChannelMetadata.init(
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
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "",
        },
        authorNote: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "",
        },
        releaseLimit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        nextRelease: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
        },
    },
    {
        sequelize,
        tableName: "book_channel_metadata",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["bookId", "channel"],
            },
        ],
    }
);

export default BookChannelMetadata;
