import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class BookVersion extends Model {
    public id!: number;
    public bookId!: number;
    public status!: "draft" | "published";
    public isWorkingDraft!: boolean;
}

BookVersion.init(
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
        status: {
            type: DataTypes.ENUM("draft", "published"),
            allowNull: false,
            defaultValue: "draft",
        },
        isWorkingDraft: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        }
    },
    {
        sequelize,
        tableName: "book_versions",
        timestamps: true,
    }
);

export default BookVersion;