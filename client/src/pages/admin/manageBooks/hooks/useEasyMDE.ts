import { useEffect, useRef } from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import { parseAlignmentBlocks, applyCustomInlineFormatting } from '../utils/markdown';

export function useEasyMDE(onChange?: (content: string) => void) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const editorRef = useRef<EasyMDE | null>(null);

    const isSettingValue = useRef(false);

    useEffect(() => {
        if (!textareaRef.current || editorRef.current) return;

        const editor = new EasyMDE({
            element: textareaRef.current,
            placeholder: 'Write your book in markdown...',
            previewRender(plainText) {
                const rendered = parseAlignmentBlocks(
                    plainText,
                    (segment) => (this as any).parent.markdown(segment)
                );
                return applyCustomInlineFormatting(rendered);
            },
            toolbar: [
                "bold",
                "italic",
                {
                    name: "underline",
                    action: (editorInstance) => wrapSelectionWithUnderline(editorInstance),
                    className: "fa fa-underline",
                    title: "Underline text"
                },
                "strikethrough",
                "heading",
                "|",
                "unordered-list",
                "ordered-list",
                "|",
                "link",
                "image",
                "table",
                "|",
                {
                    name: "left",
                    action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'left'),
                    className: "fa fa-align-left",
                    title: "Left align text"
                },
                {
                    name: "center",
                    action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'center'),
                    className: "fa fa-align-center",
                    title: "Center text"
                },
                {
                    name: "right",
                    action: (editorInstance) => wrapSelectionInAlignmentBlock(editorInstance, 'right'),
                    className: "fa fa-align-right",
                    title: "Right align text"
                },
                "|",
                "preview",
                "guide",
            ]
        });

        const handler = () => {
            if (isSettingValue.current) return;
            onChange?.(editor.value());
        };

        editor.codemirror.on('change', handler);

        editorRef.current = editor;

        return () => {
            editor.codemirror.off('change', handler);
            editor.toTextArea();
            editorRef.current = null;
        };
    }, []);

    const setValue = (value: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        isSettingValue.current = true;
        editor.value(value ?? '');
        isSettingValue.current = false;
    };

    return {
        textareaRef,
        editorRef,
        setValue
    };
}

const wrapSelectionWithUnderline = (editorInstance: any) => {
    const cm = editorInstance.codemirror;
    const selection = cm.getSelection() || 'underlined text';
    const wrapped = `==${selection}==`;

    cm.replaceSelection(wrapped);
    cm.focus();
};

const wrapSelectionInAlignmentBlock = (editorInstance: any, align: string) => {
    const cm = editorInstance.codemirror;
    const selection = cm.getSelection() || 'Aligned text';
    const wrapped = `:::${align}\n${selection}\n:::\n`;

    cm.replaceSelection(wrapped);
    cm.focus();
    syncAlignmentLineClasses(cm);
};

const syncAlignmentLineClasses = (codemirror: any) => {
    const doc = codemirror.getDoc();
    let currentAlign: any = null;

    doc.eachLine((lineHandle: any) => {
        const text = lineHandle.text.trim();

        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-center');
        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-right');
        codemirror.removeLineClass(lineHandle, 'text', 'mde-align-left');

        const openMatch = text.match(/^:::(center|right|left)\s*$/i);
        if (openMatch) {
            currentAlign = openMatch[1].toLowerCase();
            return;
        }

        if (text === ':::') {
            currentAlign = null;
            return;
        }

        if (!currentAlign || text === '') {
            return;
        }

        codemirror.addLineClass(lineHandle, 'text', `mde-align-${currentAlign}`);
    });
};