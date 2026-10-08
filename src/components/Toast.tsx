import { useEffect, useRef } from "react";

export type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Bumps to restart the auto-dismiss timer for a repeated message. */
  nonce: number;
};

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onDismiss, 5200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, onDismiss]);

  if (!toast) return <div className="toast" aria-live="polite" />;

  return (
    <div className="toast show" role="status" aria-live="polite">
      {toast.message}
      {toast.actionLabel && toast.onAction ? (
        <button
          type="button"
          className="toast-undo"
          onClick={() => {
            toast.onAction?.();
            onDismiss();
          }}
        >
          {toast.actionLabel}
        </button>
      ) : null}
    </div>
  );
}