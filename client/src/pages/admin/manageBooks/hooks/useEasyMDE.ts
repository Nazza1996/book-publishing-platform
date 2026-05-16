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
            }
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