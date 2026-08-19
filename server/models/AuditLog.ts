import { DataTypes, Model } from "sequelize";
import { sequelize } from "../utils/database.js";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

class AuditLog extends Model {
    public id!: number;
    public action!: AuditAction;
    public entityType!: string;
    public entityId!: string | null;
    public entityLabel!: string | null;
    public userId!: number | null;
    public requestMethod!: string | null;
    public requestPath!: string | null;
    public metadata!: Record<string, unknown> | null;
    public readonly createdAt!: Date;
}

AuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        action: {
            type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
            allowNull: false,
        },
        entityType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        entityId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        entityLabel: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        requestMethod: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        requestPath: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "audit_logs",
        timestamps: true,
        updatedAt: false,
    }
);

export default AuditLog;
