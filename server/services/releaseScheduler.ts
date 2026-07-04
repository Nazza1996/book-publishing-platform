import { Op } from "sequelize";
import ChapterRelease from "../models/ChapterRelease.js";

const DEFAULT_RELEASE_CHECK_INTERVAL_MS = 60_000;

let promotionInFlight: Promise<number> | null = null;

export async function promoteDueScheduledReleases(now = new Date()) {
    if (promotionInFlight) {
        return promotionInFlight;
    }

    promotionInFlight = ChapterRelease.update(
        { status: "released" },
        {
            where: {
                status: "scheduled",
                releaseAt: {
                    [Op.ne]: null,
                    [Op.lte]: now,
                },
            },
        }
    ).then(([updatedCount]) => updatedCount)
        .finally(() => {
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
