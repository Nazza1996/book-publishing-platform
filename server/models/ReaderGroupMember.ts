import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";

class ReaderGroupMember extends Model {
    public id!: number;
    public readerGroupId!: number;
    public username!: string;
    public status!: "active" | "invited" | "removed";
    public joinedAt!: Date | null;
}

ReaderGroupMember.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        readerGroupId: { type: DataTypes.INTEGER, allowNull: false },
        username: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.ENUM("active", "invited", "removed"), allowNull: false, defaultValue: "active" },
        joinedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize,
        tableName: "reader_group_members",
        timestamps: true,
        indexes: [{ unique: true, fields: ["readerGroupId", "username"] }],
    }
);

export default ReaderGroupMember;
