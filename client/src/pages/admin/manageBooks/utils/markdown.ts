export const parseAlignmentBlocks = (
    markdown: string,
    renderMarkdown: (text: string) => string
) => {
    const lines = markdown.replace(/\r\n|\r/g, '\n').split('\n');

    const output: string[] = [];

    let buffer: string[] = [];

    let currentAlign: string | null = null;

    let alignBuffer: string[] = [];

    const flushBuffer = () => {
        if (buffer.length === 0) return;

        output.push(renderMarkdown(buffer.join('\n')));

        buffer = [];
    };

    const flushAlignBlock = () => {
        if (!currentAlign) return;

        output.push(
            `<div class="text-${currentAlign}">
                ${renderMarkdown(alignBuffer.join('\n'))}
            </div>`
        );

        currentAlign = null;

        alignBuffer = [];
    };

    for (const line of lines) {
        const openMatch = line.trim().match(/^:::(center|right|left)\s*$/i);

        if (!currentAlign && openMatch) {
            flushBuffer();

            currentAlign = openMatch[1].toLowerCase();

            continue;
        }

        if (currentAlign) {
            if (line.trim() === ':::') {
                flushAlignBlock();
            } else {
                alignBuffer.push(line);
            }

            continue;
        }

        buffer.push(line);
    }

    flushAlignBlock();

    flushBuffer();

    return output.join('\n');
};

export const applyCustomInlineFormatting = (html: string) => {
    return html.replace(
        /==([^=]+)==/g,
        '<span class="text-underline">$1</span>'
    );
};