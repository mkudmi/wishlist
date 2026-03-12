import { useEffect, useState } from "react";
import {
  formatMoney,
  getEventCountdownInfo,
  getWishDonated,
  parseTargetFromPrice,
  toGenitiveFirstName
} from "../../lib/helpers";

export function WishlistPage({
  wishes,
  contributions,
  onOpenWish,
  countdownDate,
  isRecurringEvent,
  eventTitle,
  ownerFirstName,
  canEdit,
  rules,
  wishForm,
  editingWishId,
  isWishEditorOpen,
  isWishSubmitting,
  onWishFormChange,
  onWishFormSubmit,
  onOpenWishCreate,
  onOpenWishEdit,
  onCloseWishEditor,
  onDeleteWish,
  onSaveRules
}) {
  function scrollToSection(sectionId) {
    if (typeof document === "undefined") {
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const eventInfo = getEventCountdownInfo(countdownDate, { recurring: isRecurringEvent });
  const genitiveName = toGenitiveFirstName(ownerFirstName);
  const normalizedEventTitle = String(eventTitle || "").replace(/^Мой\s+/i, "").trim();
  const fallbackBirthday = genitiveName ? `День рождения ${genitiveName}` : "Мой день рождения";
  const heroKicker = normalizedEventTitle
    ? genitiveName
      ? `${normalizedEventTitle} ${genitiveName}`
      : normalizedEventTitle
    : fallbackBirthday;

  const [isRulesEditorOpen, setIsRulesEditorOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(() => rules.slice(0, 5));

  useEffect(() => {
    if (!isRulesEditorOpen) {
      setRulesDraft(rules.slice(0, 5));
    }
  }, [rules, isRulesEditorOpen]);

  function openRulesEditor() {
    setRulesDraft(rules.slice(0, 5));
    setIsRulesEditorOpen(true);
  }

  function closeRulesEditor() {
    setIsRulesEditorOpen(false);
  }

  function updateRule(index, value) {
    setRulesDraft((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  }

  function removeRule(index) {
    setRulesDraft((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addRule() {
    if (rulesDraft.length >= 5) {
      return;
    }
    setRulesDraft((prev) => [...prev, ""]);
  }

  function saveRules(event) {
    event.preventDefault();
    onSaveRules(rulesDraft);
    setIsRulesEditorOpen(false);
  }

  return (
    <>
      <section className="hero-card">
        <div className="hero-grid">
          <div>
            <p className="hero-kicker">{heroKicker}</p>
            <h1>Вишлист, чтобы не гадать с подарком</h1>
            <p className="hero-copy">
              Здесь собраны идеи от конкретных подарков до гибких вариантов. Можно выбрать один пункт или использовать
              список как ориентир.
            </p>

            <div className="hero-actions">
              <button type="button" className="button-primary" onClick={() => scrollToSection("wishlist")}>
                Смотреть желания
              </button>
              <button type="button" className="button-secondary" onClick={() => scrollToSection("gift-guide")}>
                Как лучше подарить
              </button>
            </div>
          </div>

          <aside className="date-panel">
            <span className="date-label">{eventInfo.label}</span>
            <strong>{eventInfo.remaining}</strong>
            <p className="date-note">При желании можно поучаствовать в одном подарке вместе с друзьями.</p>
          </aside>
        </div>
      </section>

      <section className="wishlist-section" id="wishlist">
        <div className="section-head">
          <p className="section-label">Wishlist</p>
          <h2>Что можно подарить</h2>
        </div>

        <div className="wish-grid">
          {canEdit ? (
            <button type="button" className="wish-card wish-card-create" onClick={onOpenWishCreate}>
              <span className="wishlist-create-plus">+</span>
              <strong>Добавить подарок</strong>
            </button>
          ) : null}

          {wishes.map((wish) => {
            const target = parseTargetFromPrice(wish.price);
            const donated = getWishDonated(contributions, wish.id);
            const progressPercent = target ? Math.min(100, Math.round((donated / target) * 100)) : 0;

            return (
              <article className="wish-card" key={wish.id}>
                <button type="button" className="wish-card-open-area" onClick={() => onOpenWish(wish.id)}>
                  <div className="wish-topline">
                    <span className="wish-tag">{wish.tag}</span>
                    <span className="wish-price">{wish.price || "Цена не указана"}</span>
                  </div>
                  <h3>{wish.title}</h3>
                  <p>{wish.note}</p>
                  <div className="wish-footer">
                    <div className="wish-progress">
                      <div className="wish-progress-track">
                        <span className="wish-progress-fill" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <p className="wish-progress-text">
                        {target ? `${formatMoney(donated)} / ${formatMoney(target)} руб.` : `${formatMoney(donated)} руб. собрано`}
                      </p>
                    </div>
                  </div>
                </button>

                {canEdit ? (
                  <div className="wish-card-tools">
                    <button type="button" className="tiny-admin-button" onClick={() => onOpenWishEdit(wish)}>
                      Редактировать
                    </button>
                    <button type="button" className="delete-button" onClick={() => onDeleteWish(wish.id)}>
                      Удалить
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-section" id="gift-guide">
        <div className="guide-card">
          <div className="section-head compact">
            <p className="section-label">Gift guide</p>
            <h2>Небольшие пожелания</h2>
            {canEdit ? (
              <div className="rules-edit-actions">
                <button type="button" className="tiny-admin-button" onClick={openRulesEditor}>
                  Редактировать пожелания
                </button>
              </div>
            ) : null}
          </div>

          <div className="rules-list">
            {rules.map((rule) => (
              <div className="rule-item" key={rule}>
                <span className="rule-index">+</span>
                <p>{rule}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="contact-card">
          <p className="section-label">Сюрприз тоже ок</p>
          <h2>Главное, чтобы от души</h2>
          <p>Даже если выберешь что-то вне списка, мне будет приятно.</p>
        </div>
      </section>

      {canEdit && isRulesEditorOpen ? (
        <div className="donation-modal-backdrop" onClick={closeRulesEditor}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Пожелания</h3>
            <p className="donation-modal-title">Можно указать до 5 пунктов</p>

            <form className="donation-form" onSubmit={saveRules}>
              {rulesDraft.map((rule, index) => (
                <label key={`rule-${index}`}>
                  Пожелание {index + 1}
                  <div className="rules-draft-row">
                    <input
                      type="text"
                      value={rule}
                      onChange={(event) => updateRule(index, event.target.value)}
                      placeholder="Например: Спокойные цвета"
                    />
                    {rulesDraft.length > 1 ? (
                      <button type="button" className="delete-button" onClick={() => removeRule(index)}>
                        Удалить
                      </button>
                    ) : null}
                  </div>
                </label>
              ))}

              {rulesDraft.length < 5 ? (
                <button type="button" className="tiny-admin-button" onClick={addRule}>
                  + Добавить пожелание
                </button>
              ) : null}

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeRulesEditor}>
                  Отмена
                </button>
                <button type="submit" className="button-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {canEdit && isWishEditorOpen ? (
        <div className="donation-modal-backdrop" onClick={onCloseWishEditor}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{editingWishId ? "Редактирование подарка" : "Новый подарок"}</h3>
            <p className="donation-modal-title">Заполни поля и сохрани изменения</p>

            <form className="donation-form" onSubmit={onWishFormSubmit}>
              <label>
                Название*
                <input
                  type="text"
                  name="title"
                  value={wishForm.title}
                  onChange={onWishFormChange}
                  placeholder="Например: Сертификат в Steam"
                  required
                />
              </label>

              <label>
                Описание*
                <textarea
                  name="note"
                  value={wishForm.note}
                  onChange={onWishFormChange}
                  placeholder="Коротко: что это и почему хочется"
                  rows={4}
                  required
                />
              </label>

              <label>
                Тег
                <input
                  type="text"
                  name="tag"
                  value={wishForm.tag}
                  onChange={onWishFormChange}
                  placeholder="Категория"
                />
              </label>

              <label>
                Цена
                <input
                  type="text"
                  name="price"
                  value={wishForm.price}
                  onChange={onWishFormChange}
                  placeholder="Например: 3 500 руб."
                />
              </label>

              <label>
                Ссылка
                <input
                  type="url"
                  name="url"
                  value={wishForm.url}
                  onChange={onWishFormChange}
                  placeholder="https://..."
                />
              </label>

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={onCloseWishEditor} disabled={isWishSubmitting}>
                  Отмена
                </button>
                <button type="submit" className="button-primary" disabled={isWishSubmitting}>
                  {isWishSubmitting ? "Сохраняем..." : editingWishId ? "Сохранить" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
