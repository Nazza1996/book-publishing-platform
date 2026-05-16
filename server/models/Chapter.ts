import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database";

class Chapter extends Model {
    public id!: number;
    public bookId!: number;
	public chapterNumber!: number;
	public title!: string
	public content!: string;
}

Chapter.init(
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
		chapterNumber: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		title: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		content: {
			type: DataTypes.TEXT("medium"),
			allowNull: true,
		},
    },
    {
        sequelize,
        tableName: "chapters",
        timestamps: true,
    }
);

export default Chapter;