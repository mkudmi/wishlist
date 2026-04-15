import { useEffect } from "react";

const shareBrandIcons = {
  telegram: "https://cdn.simpleicons.org/telegram/229ED9",
  vk: "https://cdn.simpleicons.org/vk/2787F5",
  whatsapp: "https://cdn.simpleicons.org/whatsapp/25D366"
};

function ShareIcon({ type }) {
  if (type === "copy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "telegram") {
    return (
      <img src={shareBrandIcons.telegram} alt="" aria-hidden="true" width={24} height={24} loading="lazy" />
    );
  }

  if (type === "vk") {
    return (
      <img src={shareBrandIcons.vk} alt="" aria-hidden="true" width={24} height={24} loading="lazy" />
    );
  }

  if (type === "whatsapp") {
    return (
      <img src={shareBrandIcons.whatsapp} alt="" aria-hidden="true" width={24} height={24} loading="lazy" />
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 4h7v7H4V4Zm2 2v3h3V6H6Zm7-2h7v7h-7V4Zm2 2v3h3V6h-3ZM4 13h7v7H4v-7Zm2 2v3h3v-3H6Zm8-2h1v1h-1v-1Zm2 0h1v1h-1v-1Zm1 1h1v1h-1v-1Zm-3 1h1v1h-1v-1Zm2 1h1v1h-1v-1Zm2 0h1v1h-1v-1Zm-5 2h1v1h-1v-1Zm2 0h3v2h-3v-2Zm-2 2h1v1h-1v-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShareSheetModal({
  isOpen,
  title,
  shareUrl,
  onClose,
  onCopyLink,
  onShareTelegram,
  onShareVk,
  onShareWhatsapp,
  isQrVisible,
  onToggleQr
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const shareItems = [
    { key: "copy", label: "Скопировать ссылку", icon: "copy", onClick: onCopyLink },
    { key: "telegram", label: "Телеграм", icon: "telegram", onClick: onShareTelegram },
    { key: "vk", label: "Вконтакте", icon: "vk", onClick: onShareVk },
    { key: "whatsapp", label: "Вотсап", icon: "whatsapp", onClick: onShareWhatsapp },
    { key: "qr", label: "Сгенерировать QR код", icon: "qr", onClick: onToggleQr }
  ];

  const qrImageUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareUrl)}`
    : "";

  return (
    <div className="share-sheet-backdrop" onClick={onClose}>
      <div
        className="share-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
      >
        <div className="share-sheet-handle" />
        <div className="share-sheet-head">
          <div>
            <p className="share-sheet-kicker">Поделиться</p>
            <h3 id="share-sheet-title">{title || "Вишлист"}</h3>
          </div>
          <button type="button" className="share-sheet-close" onClick={onClose} aria-label="Закрыть окно">
            ×
          </button>
        </div>

        <div className="share-sheet-actions">
          {shareItems.map((item) => (
            <button type="button" className="share-sheet-action" key={item.key} onClick={item.onClick}>
              <span className={`share-sheet-action-icon share-sheet-action-icon-${item.key}`}>
                <ShareIcon type={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {isQrVisible && shareUrl ? (
          <div className="share-sheet-qr-popup-backdrop" onClick={onToggleQr}>
            <div className="share-sheet-qr-popup" onClick={(event) => event.stopPropagation()}>
              <img src={qrImageUrl} alt="QR код для ссылки на вишлист" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
