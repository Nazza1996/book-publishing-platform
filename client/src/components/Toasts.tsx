import { useEffect, useState } from 'react';
import { subscribeToasts, toast, type ToastItem } from '../helpers';

const AUTO_DISMISS_MS = 4500;

function isIrrelevantScriptError(event: ErrorEvent) {
    return event.message === 'Script error.'
        && !event.error
        && event.lineno === 0
        && event.colno === 0;
}

export default function Toasts() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const dismissTimers = new Map<number, number>();

        const unsubscribe = subscribeToasts((toast) => {
            setToasts((current) => [...current, toast]);

            const timer = window.setTimeout(() => {
                setToasts((current) => current.filter((item) => item.id !== toast.id));
                dismissTimers.delete(toast.id);
            }, AUTO_DISMISS_MS);

            dismissTimers.set(toast.id, timer);
        });

        return () => {
            unsubscribe();
            dismissTimers.forEach((timer) => window.clearTimeout(timer));
        };
    }, []);

    useEffect(() => {
        const onWindowError = (event: ErrorEvent) => {
            if (isIrrelevantScriptError(event)) {
                console.warn('Suppressed opaque browser script error.', event);
                return;
            }

            const message = event.error instanceof Error
                ? event.error.message
                : event.message || 'Unexpected error';

            toast.error(message);
        };

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason instanceof Error
                ? reason.message
                : typeof reason === 'string'
                    ? reason
                    : 'Unexpected error';

            toast.error(message);
        };

        window.addEventListener('error', onWindowError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        return () => {
            window.removeEventListener('error', onWindowError);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, []);

    const handleToastClick = (id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    return (
        <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast-${toast.type}`} role="status" onClick={() => handleToastClick(toast.id)}>
                    <span className="toast-message" onClick={(e) => e.stopPropagation()}>
                        {toast.message}
                    </span>
                </div>
            ))}
        </div>
    );
}