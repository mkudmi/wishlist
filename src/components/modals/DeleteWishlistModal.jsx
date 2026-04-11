import { useEffect } from "react";

export function DeleteWishlistModal({ wishlist, isSubmitting, onClose, onConfirm }) {
  useEffect(() => {
    if (!wishlist || typeof document === "undefined") {
      return undefined;
    }

    const { documentElement, body } = document;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [wishlist]);

  if (!wishlist) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal delete-wishlist-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{`Удалить вишлист "${wishlist.title}"?`}</h3>
        <p className="donation-modal-title delete-wishlist-modal-title">Это удалит все подарки!</p>

        <div className="donation-actions">
          <button type="button" className="button-primary delete-wishlist-cancel" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="button" className="button-secondary delete-wishlist-confirm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}
