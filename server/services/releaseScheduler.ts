import { Op } from "sequelize";
import AuditLog from "../models/AuditLog.js";
import ChapterRelease from "../models/ChapterRelease.js";

const DEFAULT_RELEASE_CHECK_INTERVAL_MS = 60_000;

let promotionInFlight: Promise<number> | null = null;

export async function promoteDueScheduledReleases(now = new Date()) {
    if (promotionInFlight) {
        return promotionInFlight;
    }

    promotionInFlight = (async () => {
        const dueReleases = await ChapterRelease.findAll({
            where: {
                status: "scheduled",
                releaseAt: {
                    [Op.ne]: null,
                    [Op.lte]: now,
                },
            },
        });

        if (dueReleases.length === 0) {
            return 0;
        }

        const dueReleaseIds = dueReleases.map((release) => release.id);
        const [updatedCount] = await ChapterRelease.update(
            { status: "released" },
            {
                where: {
                    id: { [Op.in]: dueReleaseIds },
                    status: "scheduled",
                },
            }
        );

        if (updatedCount > 0) {
            await AuditLog.bulkCreate(dueReleases.map((release) => ({
                action: "UPDATE" as const,
                entityType: "ChapterRelease",
                entityId: String(release.id),
                entityLabel: `Chapter ${release.chapterNumber} ${release.channel}`,
                metadata: {
                    bookId: release.bookId,
                    channel: release.channel,
                    chapterNumber: release.chapterNumber,
                    field: "status",
                    previous: "scheduled",
                    next: "released",
                    releaseAt: release.releaseAt,
                    title: release.title,
                },
            })));
        }

        return updatedCount;
    })().finally(() => {
        promotionInFlight = null;
    });

    return promotionInFlight;
}

export function startScheduledReleaseWorker() {
    const intervalMs = Number(process.env.RELEASE_CHECK_INTERVAL_MS) || DEFAULT_RELEASE_CHECK_INTERVAL_MS;

    void promoteDueScheduledReleases().catch((error) => {
        console.error("Failed to promote scheduled releases", error);
    });

    const interval = setInterval(() => {
        void promoteDueScheduledReleases().catch((error) => {
            console.error("Failed to promote scheduled releases", error);
        });
    }, intervalMs);

    interval.unref?.();
    return interval;
}
