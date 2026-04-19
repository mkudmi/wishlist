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
        <h3>{mode === "reserve" ? "Забронировать подарок" : "Поучаствовать в подарке"}</h3>
        <p className="donation-modal-title">{wish.title}</p>
        <p className="donation-modal-subtitle">
          {mode === "reserve"
            ? "Кто бронирует подарок"
            : `Участвует: ${currentUser ? getUserDisplayName(currentUser) : donationName.trim() || "Гость"}`}
        </p>

        <form className="donation-form" onSubmit={mode === "reserve" ? onSubmitReservation : onSubmitContribution}>
          {mode === "reserve" || !currentUser ? (
            <label>
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
            <label>
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
                Ты будешь первым дарителем и станешь координатором этого подарка. Следующие участники будут
                ориентироваться на тебя как на Распределителя подарка.
              </p>
              <label>
                Контакт для связи
                <input
                  type="text"
                  value={donationContact}
                  onChange={onContactChange}
                  placeholder="Например: @anya или +7..."
                />
              </label>
              <label className="donation-checkbox">
                <input
                  type="checkbox"
                  checked={isCoordinatorConfirmed}
                  onChange={onCoordinatorConfirmChange}
                />
                <span>Подтверждаю, что беру координацию подарка на себя</span>
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
            <button type="button" className="button-secondary" onClick={onClose} disabled={isDonationSubmitting}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
