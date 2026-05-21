import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class Book extends Model {
    public id!: number;
    public slug!: string;
    public title!: string;
    public description!: string;
    public publishedVersionId!: number | null;
	public isFeatured!: boolean;
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
        publishedVersionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'book_versions',
                key: 'id'
            }
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