import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";
import type { ReaderChannel } from "./BookChannelMetadata.js";

class ReaderGroup extends Model {
    public id!: number;
    public bookId!: number;
    public channel!: ReaderChannel;
    public name!: string;
    public description!: string;
    public memberCount!: number;
    public readonly members?: any[];
}

ReaderGroup.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        bookId: { type: DataTypes.INTEGER, allowNull: false },
        channel: { type: DataTypes.ENUM("alpha", "beta", "public"), allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
        memberCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        sequelize,
        tableName: "reader_groups",
        timestamps: true,
        indexes: [{ unique: true, fields: ["bookId", "channel"] }],
    }
);

export default ReaderGroup;
