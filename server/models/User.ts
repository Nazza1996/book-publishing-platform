import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class User extends Model {
    public id!: number;
    public username!: string;
    public password_hash!: string;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "users",
        timestamps: true,
    }
);

export default User;