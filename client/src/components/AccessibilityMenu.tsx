import { useEffect, useState } from "react";
import { useReadingPreferences, type TextSize } from "../contexts/ReadingPreferencesContext";
import '../styles/accessibility-menu.scss';

export default function AccessibilityMenu({ isMobile = false }: { isMobile?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const { textSize, setTextSize } = useReadingPreferences();

    const sizes: { value: TextSize; label: string; description: string }[] = [
        { value: 'small', label: 'Small', description: 'Reduce text size' },
        { value: 'normal', label: 'Normal', description: 'Standard text size' },
        { value: 'large', label: 'Large', description: 'Increase text size' },
        { value: 'xlarge', label: 'Extra Large', description: 'Maximum text size' },
    ];

    const handleTextSizeChange = (size: TextSize) => {
        setTextSize(size);
        setIsOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.accessibility-menu')) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <div className={`accessibility-menu ${isMobile ? 'mobile' : ''}`}>
            <button
                className="accessibility-menu-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label="Accessibility options"
                title="Accessibility settings"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="1" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    <path d="M12 9v.01" />
                    <path d="M15 15H9" />
                </svg>
                <span className="sr-only">Accessibility</span>
            </button>

            {isOpen && (
                <div className="accessibility-menu-dropdown">
                    <div className="accessibility-menu-section">
                        <h3 className="accessibility-menu-heading">Text Size</h3>
                        <div className="text-size-options">
                            {sizes.map((size) => (
                                <button
                                    key={size.value}
                                    className={`text-size-option ${textSize === size.value ? 'active' : ''}`}
                                    onClick={() => handleTextSizeChange(size.value)}
                                    title={size.description}
                                    aria-label={`${size.label} text size`}
                                    aria-pressed={textSize === size.value}
                                >
                                    <span className={`text-size-indicator text-size-${size.value}`}>A</span>
                                    <span className="text-size-label">{size.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
