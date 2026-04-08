import { formatMoney } from "../../lib/helpers";

export function WishDetailsModal({
  wish,
  progressPercent,
  target,
  donated,
  participants,
  isCurrentUserParticipant,
  onRemoveMyParticipation,
  onOpenReservation,
  onOpenContribution,
  onClose
}) {
  if (!wish) {
    return null;
  }

  const completed = Boolean(target) && donated >= target;

  return (
    <div className="wish-modal-backdrop" onClick={onClose}>
      <div className="wish-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wish-modal-head">
          <span className="wish-tag">{wish.tag}</span>
          <span className="wish-price">{wish.price || "Цена не указана"}</span>
        </div>

        <div className="wish-modal-image-wrap">
          {wish.imageUrl ? (
            <img className="wish-modal-image" src={wish.imageUrl} alt={wish.title} loading="lazy" />
          ) : (
            <div className="wish-image-placeholder-visual" aria-hidden="true">
              <img className="wish-image-placeholder-gift" src="/branding/gift-box.png" alt="" loading="lazy" />
            </div>
          )}
        </div>

        <h3>{wish.title}</h3>
        <p className="wish-modal-note">{wish.note}</p>

        <div className="wish-progress">
          <div className="wish-progress-track">
            <span className="wish-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="wish-progress-text">
            {target ? `${formatMoney(donated)} / ${formatMoney(target)} руб.` : `${formatMoney(donated)} руб. собрано`}
          </p>
        </div>

        <div className="wish-modal-participants">
          <span className="wish-participants-label">Участвуют</span>
          {participants.length === 0 ? (
            <p className="wish-participants-empty">Пока никого</p>
          ) : (
            participants.map((person) => (
              <div className="wish-participants-row" key={person.key}>
                <p className="wish-participants-item">
                  {person.name} - {formatMoney(person.total)} руб.
                </p>
                {isCurrentUserParticipant(person) ? (
                  <button
                    type="button"
                    className="wish-participants-remove"
                    aria-label="Удалить мое участие"
                    onClick={() => onRemoveMyParticipation(wish.id)}
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="wish-actions wish-actions-modal">
          <button
            type="button"
            className="button-secondary"
            onClick={onOpenReservation}
            disabled={completed || !target}
          >
            {completed ? "Собрано" : !target ? "Нет суммы" : "Забронировать"}
          </button>
          <button
            type="button"
            className="wish-donate-button"
            onClick={onOpenContribution}
            disabled={completed}
          >
            {completed ? "Собрано" : "Поучаствовать"}
          </button>
          {wish.url ? (
            <a className="wish-shop-link" href={wish.url} target="_blank" rel="noreferrer">
              В магазин
            </a>
          ) : null}
        </div>

        <div className="wish-actions wish-actions-modal-secondary">
          <button type="button" className="button-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
