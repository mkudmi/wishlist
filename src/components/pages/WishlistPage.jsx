import { useEffect, useRef, useState } from "react";
import { celebrationOptions, defaultWishlistTheme, wishlistThemes } from "../../config/constants";
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
  currentWishlist,
  onOpenWish,
  countdownDate,
  isRecurringEvent,
  eventTitle,
  ownerFirstName,
  canEdit,
  isWishlistSubmitting,
  wishlistSettingsError,
  rules,
  wishForm,
  editingWishId,
  isWishEditorOpen,
  isWishSubmitting,
  onWishlistSettingsSubmit,
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
  const wishEditorBackdropPressedRef = useRef(false);
  const celebrationMenuRef = useRef(null);
  const [settingsForm, setSettingsForm] = useState({
    title: "",
    celebrationType: "birthday",
    customCelebration: "",
    eventDate: "",
    theme: defaultWishlistTheme
  });
  const [isCelebrationMenuOpen, setIsCelebrationMenuOpen] = useState(false);
  const [settingsSaveState, setSettingsSaveState] = useState("idle");
  const settingsSaveTimeoutRef = useRef(null);
  const settingsSaveLabelTimeoutRef = useRef(null);
  const lastSubmittedSettingsRef = useRef("");
  const [priceSortDirection, setPriceSortDirection] = useState("desc");

  useEffect(() => {
    if (!isRulesEditorOpen) {
      setRulesDraft(rules.slice(0, 5));
    }
  }, [rules, isRulesEditorOpen]);

  useEffect(() => {
    const nextSettings = {
      title: currentWishlist?.title || "",
      celebrationType: currentWishlist?.celebration_type || "birthday",
      customCelebration: currentWishlist?.custom_celebration || "",
      eventDate: currentWishlist?.event_date || "",
      theme: currentWishlist?.theme || defaultWishlistTheme
    };

    setSettingsForm(nextSettings);
    lastSubmittedSettingsRef.current = JSON.stringify(nextSettings);
    setSettingsSaveState("idle");

    if (settingsSaveTimeoutRef.current) {
      clearTimeout(settingsSaveTimeoutRef.current);
    }
    if (settingsSaveLabelTimeoutRef.current) {
      clearTimeout(settingsSaveLabelTimeoutRef.current);
    }
  }, [currentWishlist]);

  useEffect(() => {
    if (!isCelebrationMenuOpen) {
      return undefined;
    }

    function closeOnOutsideClick(event) {
      const menuNode = celebrationMenuRef.current;
      if (!menuNode || menuNode.contains(event.target)) {
        return;
      }
      setIsCelebrationMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    document.addEventListener("focusin", closeOnOutsideClick, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
      document.removeEventListener("focusin", closeOnOutsideClick, true);
    };
  }, [isCelebrationMenuOpen]);

  useEffect(() => () => {
    if (settingsSaveTimeoutRef.current) {
      clearTimeout(settingsSaveTimeoutRef.current);
    }
    if (settingsSaveLabelTimeoutRef.current) {
      clearTimeout(settingsSaveLabelTimeoutRef.current);
    }
  }, []);

  const needsCustomTitle = settingsForm.celebrationType === "custom";
  const needsEventDate = settingsForm.celebrationType !== "birthday";
  const currentCelebrationOption =
    celebrationOptions.find((option) => option.value === settingsForm.celebrationType) || celebrationOptions[0];
  const sortedWishes = [...wishes].sort((left, right) => {
    const leftPrice = parseTargetFromPrice(left.price) || 0;
    const rightPrice = parseTargetFromPrice(right.price) || 0;

    if (leftPrice === rightPrice) {
      return left.title.localeCompare(right.title, "ru");
    }

    return priceSortDirection === "desc" ? rightPrice - leftPrice : leftPrice - rightPrice;
  });

  useEffect(() => {
    if (!canEdit || !currentWishlist?.id) {
      return undefined;
    }

    const payload = {
      title: settingsForm.title.trim(),
      celebrationType: settingsForm.celebrationType,
      customCelebration: settingsForm.customCelebration.trim(),
      eventDate: settingsForm.eventDate,
      theme: settingsForm.theme
    };
    const serializedPayload = JSON.stringify(payload);

    if (serializedPayload === lastSubmittedSettingsRef.current) {
      setSettingsSaveState("idle");
      return undefined;
    }

    if (!payload.title || (payload.celebrationType === "custom" && !payload.customCelebration) || (payload.celebrationType !== "birthday" && !payload.eventDate)) {
      setSettingsSaveState("invalid");
      return undefined;
    }

    setSettingsSaveState("pending");

    if (settingsSaveTimeoutRef.current) {
      clearTimeout(settingsSaveTimeoutRef.current);
    }
    if (settingsSaveLabelTimeoutRef.current) {
      clearTimeout(settingsSaveLabelTimeoutRef.current);
    }

    settingsSaveTimeoutRef.current = window.setTimeout(async () => {
      setSettingsSaveState("saving");
      const saved = await onWishlistSettingsSubmit(payload);

      if (!saved) {
        setSettingsSaveState("error");
        return;
      }

      lastSubmittedSettingsRef.current = serializedPayload;
      setSettingsSaveState("saved");
      settingsSaveLabelTimeoutRef.current = window.setTimeout(() => {
        setSettingsSaveState("idle");
      }, 1400);
    }, 450);

    return () => {
      if (settingsSaveTimeoutRef.current) {
        clearTimeout(settingsSaveTimeoutRef.current);
      }
    };
  }, [canEdit, currentWishlist?.id, onWishlistSettingsSubmit, settingsForm]);

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

  function updateSettingsField(name, value) {
    setSettingsForm((prev) => ({ ...prev, [name]: value }));
  }

  function selectCelebration(value) {
    setSettingsForm((prev) => ({
      ...prev,
      celebrationType: value,
      customCelebration: value === "custom" ? prev.customCelebration : "",
      eventDate: value === "birthday" ? "" : prev.eventDate
    }));
    setIsCelebrationMenuOpen(false);
  }

  function handleCelebrationSelect(event, value) {
    event.preventDefault();
    event.stopPropagation();
    selectCelebration(value);
  }

  async function submitWishlistSettings(event) {
    event.preventDefault();
    await onWishlistSettingsSubmit({
      title: settingsForm.title,
      celebrationType: settingsForm.celebrationType,
      customCelebration: settingsForm.customCelebration,
      eventDate: settingsForm.eventDate,
      theme: settingsForm.theme
    });
  }

  const settingsStatusLabel =
    settingsSaveState === "saving"
      ? "Сохраняем..."
      : settingsSaveState === "saved"
        ? "Сохранено"
        : settingsSaveState === "invalid"
          ? "Заполни обязательные поля"
          : settingsSaveState === "error"
            ? "Не удалось сохранить"
            : settingsSaveState === "pending"
              ? "Изменения будут сохранены автоматически"
              : "Изменения сохраняются автоматически";

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

      {canEdit ? (
        <section className="wishlist-settings-card">
          <div className="section-head compact">
            <p className="section-label">Editor</p>
            <h2>Настройки вишлиста</h2>
            <p>Открытие из дашборда теперь сразу ведет в режим редактирования. Здесь можно менять событие и оформление страницы.</p>
          </div>

          <form className="wishlist-settings-form" onSubmit={submitWishlistSettings}>
            <label>
              Название
              <input
                type="text"
                value={settingsForm.title}
                onChange={(event) => updateSettingsField("title", event.target.value)}
                placeholder="Например: Праздник 2026"
                required
              />
            </label>

            <div className="form-field">
              <span className="form-field-label">Что празднуем?</span>
              <div className="custom-select" ref={celebrationMenuRef}>
                <button
                  type="button"
                  className="custom-select-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={isCelebrationMenuOpen}
                  onClick={() => setIsCelebrationMenuOpen((prev) => !prev)}
                >
                  <span>{currentCelebrationOption.label}</span>
                  <span className="custom-select-arrow">{isCelebrationMenuOpen ? "▲" : "▼"}</span>
                </button>

                {isCelebrationMenuOpen ? (
                  <div className="custom-select-menu" role="listbox">
                    {celebrationOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`custom-select-item ${option.value === settingsForm.celebrationType ? "custom-select-item-active" : ""}`}
                        role="option"
                        aria-selected={option.value === settingsForm.celebrationType}
                        onMouseDown={(event) => handleCelebrationSelect(event, option.value)}
                        onClick={(event) => handleCelebrationSelect(event, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {needsCustomTitle ? (
              <label>
                Свой вариант
                <input
                  type="text"
                  value={settingsForm.customCelebration}
                  onChange={(event) => updateSettingsField("customCelebration", event.target.value)}
                  placeholder="Например: Выпускной"
                  required
                />
              </label>
            ) : null}

            {needsEventDate ? (
              <label>
                Дата события
                <input
                  type="date"
                  value={settingsForm.eventDate}
                  onChange={(event) => updateSettingsField("eventDate", event.target.value)}
                  required
                />
              </label>
            ) : null}

            <div className="form-field">
              <span className="form-field-label">Оформление страницы</span>
              <div className="theme-palette" role="radiogroup" aria-label="Выбор темы вишлиста">
                {wishlistThemes.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    className={`theme-option ${theme.value === settingsForm.theme ? "theme-option-active" : ""}`}
                    onClick={() => updateSettingsField("theme", theme.value)}
                    aria-pressed={theme.value === settingsForm.theme}
                  >
                    <span className="theme-option-swatches" aria-hidden="true">
                      {theme.preview.map((color) => (
                        <span key={`${theme.value}-${color}`} className="theme-option-swatch" style={{ background: color }} />
                      ))}
                    </span>
                    <span className="theme-option-label">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {wishlistSettingsError ? <p className="donation-error">{wishlistSettingsError}</p> : null}
            <p className={`wishlist-settings-status wishlist-settings-status-${settingsSaveState}`}>{settingsStatusLabel}</p>
          </form>
        </section>
      ) : null}

      <section className="wishlist-section" id="wishlist">
        <div className="section-head section-head-with-action">
          <div>
            <p className="section-label">Wishlist</p>
            <h2>Что можно подарить</h2>
          </div>
          <button
            type="button"
            className="tiny-admin-button wish-sort-button"
            onClick={() => setPriceSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
          >
            {priceSortDirection === "desc" ? "Сначала дороже" : "Сначала дешевле"}
          </button>
        </div>

        <div className="wish-grid">
          {canEdit ? (
            <button type="button" className="wish-card wish-card-create" onClick={onOpenWishCreate}>
              <span className="wishlist-create-plus">+</span>
              <strong>Добавить подарок</strong>
            </button>
          ) : null}

          {sortedWishes.map((wish) => {
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
                  <p className="wish-note">{wish.note}</p>
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
        <div
          className="donation-modal-backdrop"
          onMouseDown={(event) => {
            wishEditorBackdropPressedRef.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            const shouldClose = wishEditorBackdropPressedRef.current && event.target === event.currentTarget;
            wishEditorBackdropPressedRef.current = false;
            if (shouldClose) {
              onCloseWishEditor();
            }
          }}
        >
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
