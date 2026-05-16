import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database";

class Book extends Model {
    public id!: number;
    public title!: string;
    public description!: string;
    public status!: string;
	public isFeatured!: boolean;
}

Book.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
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
            type: DataTypes.ENUM("draft", "published"),
            allowNull: false,
            defaultValue: "draft",
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