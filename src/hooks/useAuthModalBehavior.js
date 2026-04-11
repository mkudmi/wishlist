import { useEffect, useRef } from "react";

export function useAuthModalBehavior({ isOpen, submitting, modalRef, onClose }) {
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) {
      return undefined;
    }

    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return undefined;
    }

    returnFocusRef.current = document.activeElement;

    const focusTarget =
      modalRef.current?.querySelector('input, button:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])') || null;

    if (focusTarget instanceof HTMLElement) {
      window.setTimeout(() => focusTarget.focus(), 0);
    }

    function handleKeydown(event) {
      if (event.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
          return;
        }
      }

      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);

      if (returnFocusRef.current instanceof HTMLElement) {
        returnFocusRef.current.focus();
      }
    };
  }, [isOpen, modalRef, onClose, submitting]);
}
