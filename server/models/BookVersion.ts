import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class BookVersion extends Model {
    public id!: number;
    public bookId!: number;
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
