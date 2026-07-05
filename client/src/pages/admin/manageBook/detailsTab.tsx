import Select, { type MultiValue } from "react-select";
import { genreOptions } from "./constants";
import type { BookEditorState, ChannelMetadata, ReaderChannel, ReaderGroup } from "./types";
import { ChannelSwitcher } from "./components/ChannelSwitcher";
import { Panel } from "./components/Panel";

export function DetailsTab({
    book,
    groups,
    activeChannel,
    metadata,
    onBookFieldChange,
    onBookGenresChange,
    onChannelChange,
    onChannelFieldChange
}: {
    book: BookEditorState;
    groups: ReaderGroup[];
    activeChannel: ReaderChannel;
    metadata: ChannelMetadata;
    onBookFieldChange: (field: "title" | "description", value: string) => void;
    onBookGenresChange: (genres: string[]) => void;
    onChannelChange: (channel: ReaderChannel) => void;
    onChannelFieldChange: (field: keyof ChannelMetadata, value: string | number) => void;
}) {
    return (
        <div id="manageBookDetailsTab">
            <Panel step="1" title="Book Details (Shared & Versioned Metadata)" description="Manage core book information and how it appears to each reader group.">
                <div className="book-details-tab-sections">
                    <div className="book-details-section left">
                        <div className="section-header">
                            <div className="section-title">Shared Details</div>
                            <div className="section-description">These details are shared across all release channels.</div>
                        </div>

                        <div className="field-group">
                            <div className="field">
                                <label htmlFor="bookTitle">Title</label>
                                <input id="bookTitle" type="text" value={book.title} onChange={(e) => onBookFieldChange("title", e.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="bookDescription">Default Description</label>
                                <textarea id="bookDescription" value={book.description} onChange={(e) => onBookFieldChange("description", e.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="bookGenres">Genres</label>
                                <Select
                                    inputId="bookGenres"
                                    className="genre-select"
                                    classNamePrefix="genre-select"
                                    isMulti
                                    options={genreOptions}
                                    value={genreOptions.filter((option) => book.genres.includes(option.value))}
                                    onChange={(selected: MultiValue<{ value: string; label: string }>) => {
                                        onBookGenresChange(selected.map((option) => option.value));
                                    }}
                                    placeholder="Choose genres..."
                                    closeMenuOnSelect={false}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="book-details-section right">
                        <div className="section-header">
                            <div className="section-title">Reader Facing Metadata</div>
                            <div className="section-description">Customize copy for alpha, beta and public readers.</div>
                        </div>

                        <ChannelSwitcher groups={groups} activeChannel={activeChannel} onChange={onChannelChange} />

                        <div className="field-group">
                            <div className="field">
                                <label htmlFor="channelDescription">Book Description</label>
                                <textarea id="channelDescription" maxLength={500} value={metadata.description} onChange={(e) => onChannelFieldChange("description", e.target.value)} />
                                <small>{metadata.description.length} / 500</small>
                            </div>
                            <div className="field">
                                <label htmlFor="authorNote">Author Note</label>
                                <textarea id="authorNote" maxLength={500} value={metadata.authorNote} onChange={(e) => onChannelFieldChange("authorNote", e.target.value)} />
                                <small>{metadata.authorNote.length} / 500</small>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
