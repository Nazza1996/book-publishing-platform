import { DataTypes, Model } from "sequelize"
import { sequelize } from "../utils/database.js";

class User extends Model {
    public id!: number;
    public username!: string;
    public password_hash!: string;
    public role!: "admin" | "reader";
    public active!: boolean;
    public password_changed_at!: Date | null;
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
        role: {
            type: DataTypes.ENUM("admin", "reader"),
            allowNull: false,
            defaultValue: "reader",
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        password_changed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "users",
        timestamps: true,
    }
);

export default User;
