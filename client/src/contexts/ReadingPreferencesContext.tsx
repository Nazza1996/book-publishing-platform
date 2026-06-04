import { createContext, useContext, useLayoutEffect, useState } from "react";

export type TextSize = 'small' | 'normal' | 'large' | 'xlarge';

interface ReadingPreferencesContextType {
    textSize: TextSize;
    setTextSize: (size: TextSize) => void;
}

const READING_PREFS_STORAGE_KEY = 'reading-preferences';
const ReadingPreferencesContext = createContext<ReadingPreferencesContextType | undefined>(undefined);

function getInitialTextSize(): TextSize {
    try {
        const stored = localStorage.getItem(READING_PREFS_STORAGE_KEY);
        if (stored) {
            const prefs = JSON.parse(stored);
            if (prefs.textSize && ['small', 'normal', 'large', 'xlarge'].includes(prefs.textSize)) {
                return prefs.textSize;
            }
        }
    } catch (e) {
        console.error('Failed to parse reading preferences:', e);
    }
    return 'normal';
}

export const useReadingPreferences = () => {
    const context = useContext(ReadingPreferencesContext);
    if (!context) {
        throw new Error("useReadingPreferences must be used within a ReadingPreferencesContext.Provider");
    }
    return context;
}

export const ReadingPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [textSize, setTextSizeState] = useState<TextSize>(getInitialTextSize());

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-text-size', textSize);
        const prefs = {
            textSize,
        };
        localStorage.setItem(READING_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    }, [textSize]);

    const setTextSize = (size: TextSize) => {
        setTextSizeState(size);
    };

    return (
        <ReadingPreferencesContext.Provider value={{ textSize, setTextSize }}>
            {children}
        </ReadingPreferencesContext.Provider>
    );
}
