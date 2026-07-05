import { countWords } from "../helpers";
import type { Chapter, ChapterRelease, ChannelMetadata, ReaderChannel, ReaderGroup } from "../types";
import { ReleaseDots } from "./ReleaseDots";

export function ChapterMiniTable({
    chapters,
    groups,
    metadata,
    releases
}: {
    chapters: Chapter[];
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
}) {
    return (
        <table className="admin-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Words</th>
                    <th>Releases</th>
                </tr>
            </thead>
            <tbody>
                {chapters.map((chapter) => (
                    <tr key={chapter.id ?? chapter.chapterNumber}>
                        <td>{chapter.chapterNumber}</td>
                        <td>{chapter.title}</td>
                        <td>{countWords(chapter.content).toLocaleString()}</td>
                        <td>
                            <ReleaseDots groups={groups} metadata={metadata} releases={releases} chapterNumber={chapter.chapterNumber} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
