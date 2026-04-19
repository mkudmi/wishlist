import { formatMoney, getUserDisplayName } from "../../lib/helpers";

export function DonationModal({
  wish,
  mode,
  currentUser,
  donationName,
  donationAmount,
  donationContact,
  isFirstContributor,
  isCoordinatorConfirmed,
  isNameInvalid,
  isAmountInvalid,
  isContactInvalid,
  isCoordinatorConfirmInvalid,
  donationError,
  isDonationSubmitting,
  target,
  remaining,
  onNameChange,
  onAmountChange,
  onContactChange,
  onCoordinatorConfirmChange,
  onDonateFullRemaining,
  onSubmitContribution,
  onSubmitReservation,
  onClose
}) {
  if (!wish) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="donation-close-button" onClick={onClose} aria-label="Закрыть" disabled={isDonationSubmitting}>
          <span aria-hidden="true">×</span>
        </button>
        <h3>{mode === "reserve" ? "Забронировать подарок" : "Поучаствовать в подарке"}</h3>
        <p className="donation-modal-title">{wish.title}</p>
        <p className="donation-modal-subtitle">
          {mode === "reserve"
            ? "Кто бронирует подарок"
            : `Участвует: ${currentUser ? getUserDisplayName(currentUser) : donationName.trim() || "Гость"}`}
        </p>

        <form className="donation-form" onSubmit={mode === "reserve" ? onSubmitReservation : onSubmitContribution}>
          {mode === "reserve" || !currentUser ? (
            <label className={isNameInvalid ? "donation-field-invalid" : ""}>
              Твое имя
              <input
                type="text"
                value={donationName}
                onChange={onNameChange}
                placeholder="Например: Аня"
                autoFocus
              />
            </label>
          ) : null}

          {mode !== "reserve" ? (
            <label className={isAmountInvalid ? "donation-field-invalid" : ""}>
              Сумма
              <input
                type="text"
                inputMode="decimal"
                value={donationAmount}
                onChange={onAmountChange}
                placeholder="Например: 1000"
                autoFocus={Boolean(currentUser)}
              />
            </label>
          ) : null}

          {mode !== "reserve" && isFirstContributor ? (
            <div className="donation-role-note">
              <p className="donation-role-note-text">
                Ты первый в сборе, а значит, официально назначен человеком, который "ну давай я всё организую".
                Оставь контакт для связи с остальными.
              </p>
              <label className={isContactInvalid ? "donation-field-invalid" : ""}>
                <input
                  type="text"
                  value={donationContact}
                  onChange={onContactChange}
                  placeholder="Например: @anya или +7..."
                />
              </label>
              <label
                className={`donation-checkbox${isCoordinatorConfirmInvalid ? " donation-checkbox-invalid" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isCoordinatorConfirmed}
                  onChange={onCoordinatorConfirmChange}
                />
                <span className="donation-checkbox-visual" aria-hidden="true" />
                <span className="donation-checkbox-text">Беру командование на себя</span>
              </label>
            </div>
          ) : null}

          {donationError ? <p className="donation-error">{donationError}</p> : null}

          <div className="donation-actions">
            {mode !== "reserve" && target && remaining > 0 ? (
              <button type="button" className="button-secondary" onClick={onDonateFullRemaining} disabled={isDonationSubmitting}>
                {`Закрыть все (${formatMoney(remaining)} руб.)`}
              </button>
            ) : null}
            <button type="submit" className="button-primary" disabled={isDonationSubmitting}>
              {isDonationSubmitting ? "Сохраняем..." : mode === "reserve" ? "Забронировать" : "Добавить"}
            </button>
            <button type="button" className="button-secondary donation-close-action" onClick={onClose} disabled={isDonationSubmitting}>
              Закрыть
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
