import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class Book extends Model {
    public id!: number;
    public slug!: string;
    public title!: string;
    public description!: string;
    public genres?: string[];
    public status!: "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";
	public isFeatured!: boolean;
    public readonly channelMetadata?: any[];
    public readonly releases?: any[];
    public readonly chapters?: any[];
}

Book.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("not_started", "in_progress", "on_hold", "finished", "cancelled"),
            allowNull: false,
            defaultValue: "in_progress",
        },
        genres: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        isFeatured: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: "books",
        timestamps: true,
    }
);

export default Book;
