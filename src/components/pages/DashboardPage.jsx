import { useEffect, useMemo, useRef, useState } from "react";
import { BirthdayPickerModal } from "../BirthdayPickerModal";
import { celebrationOptions } from "../../config/constants";
import { formatDateToDdMmYyyy, normalizeStorageDate } from "../../lib/helpers";

export function DashboardPage({
  wishlists,
  dashboardStats,
  userBirthday,
  currentWishlistId,
  isLoading,
  isSubmitting,
  error,
  onCreateWishlist,
  onOpenWishlist,
  onOpenWishlistLink,
  onCopyShareLink,
  onDeleteWishlist
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWishlistTitle, setNewWishlistTitle] = useState("");
  const [celebrationType, setCelebrationType] = useState("birthday");
  const [customCelebration, setCustomCelebration] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isCelebrationMenuOpen, setIsCelebrationMenuOpen] = useState(false);
  const [isEventDatePickerOpen, setIsEventDatePickerOpen] = useState(false);
  const [openWishlistMenuId, setOpenWishlistMenuId] = useState(null);
  const celebrationMenuRef = useRef(null);
  const wishlistMenuRef = useRef(null);

  const needsCustomTitle = celebrationType === "custom";
  const needsEventDate = celebrationType !== "birthday";
  const currentCelebrationOption = celebrationOptions.find((option) => option.value === celebrationType) || celebrationOptions[0];
  const todayStorageDate = new Date().toISOString().slice(0, 10);

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

  useEffect(() => {
    if (!openWishlistMenuId) {
      return undefined;
    }

    function closeWishlistMenuOnOutsideClick(event) {
      const menuNode = wishlistMenuRef.current;
      if (!menuNode || menuNode.contains(event.target)) {
        return;
      }
      setOpenWishlistMenuId(null);
    }

    document.addEventListener("pointerdown", closeWishlistMenuOnOutsideClick, true);
    document.addEventListener("focusin", closeWishlistMenuOnOutsideClick, true);

    return () => {
      document.removeEventListener("pointerdown", closeWishlistMenuOnOutsideClick, true);
      document.removeEventListener("focusin", closeWishlistMenuOnOutsideClick, true);
    };
  }, [openWishlistMenuId]);

  useEffect(() => {
    if (typeof document === "undefined" || !isCreateModalOpen) {
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
  }, [isCreateModalOpen]);

  function getCelebrationLabel(wishlist) {
    if (!wishlist) {
      return "Мой день рождения";
    }
    if (wishlist.celebration_type === "custom" && wishlist.custom_celebration) {
      return wishlist.custom_celebration;
    }
    const match = celebrationOptions.find((item) => item.value === wishlist.celebration_type);
    return match?.label || "Мой день рождения";
  }

  function getDaysWord(value) {
    const abs = Math.abs(value);
    const mod10 = abs % 10;
    const mod100 = abs % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return "день";
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return "дня";
    }
    return "дней";
  }

  function getTimeLeftLabel(wishlist) {
    const eventSourceDate = wishlist?.celebration_type === "birthday" ? userBirthday : wishlist?.event_date;
    const normalizedDate = normalizeStorageDate(eventSourceDate);
    if (!normalizedDate) {
      return "Без даты";
    }

    const [year, month, day] = normalizedDate.split("-").map(Number);
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    if (wishlist?.celebration_type === "birthday") {
      const thisYearTargetUtc = Date.UTC(now.getFullYear(), month - 1, day);
      const nextTargetUtc = thisYearTargetUtc >= todayUtc ? thisYearTargetUtc : Date.UTC(now.getFullYear() + 1, month - 1, day);
      const diffDays = Math.round((nextTargetUtc - todayUtc) / dayMs);

      if (diffDays === 0) {
        return "Сегодня";
      }
      return `${diffDays} ${getDaysWord(diffDays)}`;
    }

    const targetUtc = Date.UTC(year, month - 1, day);
    const diffDays = Math.round((targetUtc - todayUtc) / dayMs);

    if (diffDays === 0) {
      return "Сегодня";
    }
    if (diffDays > 0) {
      return `${diffDays} ${getDaysWord(diffDays)}`;
    }
    const elapsedDays = Math.abs(diffDays);
    return `${elapsedDays} ${getDaysWord(elapsedDays)} назад`;
  }

  function openCreateModal() {
    setNewWishlistTitle("");
    setCelebrationType("birthday");
    setCustomCelebration("");
    setEventDate("");
    setIsCelebrationMenuOpen(false);
    setIsEventDatePickerOpen(false);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCelebrationMenuOpen(false);
    setIsEventDatePickerOpen(false);
    setIsCreateModalOpen(false);
  }

  function selectCelebration(value) {
    setCelebrationType(value);
    setIsCelebrationMenuOpen(false);
    if (value !== "custom") {
      setCustomCelebration("");
    }
    if (value === "birthday") {
      setEventDate("");
      setIsEventDatePickerOpen(false);
    }
  }

  function handleCelebrationSelect(event, value) {
    event.preventDefault();
    event.stopPropagation();
    selectCelebration(value);
  }

  const isCreateDisabled = useMemo(() => {
    if (!newWishlistTitle.trim()) {
      return true;
    }
    if (needsCustomTitle && !customCelebration.trim()) {
      return true;
    }
    if (needsEventDate && !eventDate) {
      return true;
    }
    return isSubmitting;
  }, [newWishlistTitle, needsCustomTitle, customCelebration, needsEventDate, eventDate, isSubmitting]);

  async function submitWishlist(event) {
    event.preventDefault();

    if (isCreateDisabled) {
      return;
    }

    const payload = {
      title: newWishlistTitle.trim(),
      celebrationType,
      customCelebration: customCelebration.trim(),
      eventDate
    };

    const success = await onCreateWishlist(payload);

    if (success) {
      closeCreateModal();
    }
  }

  return (
    <section className="admin-section dashboard-workspace" id="dashboard">
      <div className="admin-card dashboard-card">
        <div className="dashboard-overview">
          <div className="section-head compact dashboard-overview-copy">
            <div className="dashboard-overview-title-row">
              <h2>Твои вишлисты</h2>
              <span className="dashboard-overview-title-box" aria-hidden="true">
                <img src="/branding/gift-box.webp" alt="" className="dashboard-overview-title-gift" loading="lazy" width={48} height={48} />
              </span>
            </div>
            <p>Создай, добавь подарки, отправь друзьям!</p>
          </div>

          <div className="dashboard-stats" aria-label="Статистика по вишлистам">
            {dashboardStats.map((stat) => (
              <article className="dashboard-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>

        {isLoading ? <p className="status-banner">Загружаем вишлисты...</p> : null}
        {error ? <p className="status-banner status-banner-error">{error}</p> : null}

        <div className="admin-list dashboard-list">
          <div className="wishlist-matrix">
            <button type="button" className="wishlist-tile wishlist-tile-create" onClick={openCreateModal}>
              <span className="wishlist-create-plus">+</span>
              <span>Создать вишлист</span>
            </button>

            {wishlists.map((wishlist) => (
              <article
                className={`wishlist-tile ${wishlist.id === currentWishlistId ? "wishlist-tile-active" : ""}`}
                key={wishlist.id}
              >
                <div className="wishlist-tile-menu" ref={openWishlistMenuId === wishlist.id ? wishlistMenuRef : null}>
                  <button
                    type="button"
                    className="wishlist-tile-menu-trigger"
                    aria-label="Открыть меню вишлиста"
                    aria-expanded={openWishlistMenuId === wishlist.id}
                    onClick={() => setOpenWishlistMenuId((prev) => (prev === wishlist.id ? null : wishlist.id))}
                    disabled={isSubmitting}
                  >
                    <span />
                    <span />
                    <span />
                  </button>

                  {openWishlistMenuId === wishlist.id ? (
                    <div className="wishlist-tile-menu-dropdown">
                      <button
                        type="button"
                        className="wishlist-tile-menu-item wishlist-tile-menu-item-danger"
                        onClick={() => {
                          setOpenWishlistMenuId(null);
                          onDeleteWishlist(wishlist);
                        }}
                        disabled={isSubmitting}
                      >
                        Удалить
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="wishlist-tile-head">
                  <div className="wishlist-tile-headline">
                    <strong>{wishlist.title}</strong>
                    <span className="wishlist-tile-date wishlist-tile-countdown">{getTimeLeftLabel(wishlist)}</span>
                  </div>
                  <p>{getCelebrationLabel(wishlist)}</p>
                </div>

                <div className="wishlist-tile-actions">
                  <button
                    type="button"
                    className="tiny-admin-button"
                    onClick={(event) => onOpenWishlistLink(event, wishlist)}
                    disabled={isSubmitting}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="tiny-admin-button"
                    onClick={() => onOpenWishlist(wishlist)}
                    disabled={isSubmitting}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="tiny-admin-button"
                    onClick={() => onCopyShareLink(wishlist)}
                    disabled={isSubmitting}
                  >
                    Поделиться
                  </button>
                </div>
              </article>
            ))}
          </div>

          {wishlists.length === 0 ? <p className="wish-participants-empty">Пока нет ни одного списка.</p> : null}
        </div>
      </div>

      {isCreateModalOpen ? (
        <div className="donation-modal-backdrop" onClick={closeCreateModal}>
          <div className="donation-modal wishlist-create-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Новый вишлист</h3>
            <p className="donation-modal-title">Собери список того, что действительно хочется</p>

            <form className="donation-form" onSubmit={submitWishlist}>
              <label>
                Название
                <input
                  type="text"
                  value={newWishlistTitle}
                  onChange={(event) => setNewWishlistTitle(event.target.value)}
                  placeholder="Например: Праздник 2026"
                  required
                  autoFocus
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
                          className={`custom-select-item ${option.value === celebrationType ? "custom-select-item-active" : ""}`}
                          role="option"
                          aria-selected={option.value === celebrationType}
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
                    value={customCelebration}
                    onChange={(event) => setCustomCelebration(event.target.value)}
                    placeholder="Например: Выпускной"
                    required
                  />
                </label>
              ) : null}

              {needsEventDate ? (
                <label>
                  Дата события
                  <input
                    type="text"
                    value={formatDateToDdMmYyyy(eventDate)}
                    onClick={() => setIsEventDatePickerOpen(true)}
                    onFocus={() => setIsEventDatePickerOpen(true)}
                    placeholder="ДД-ММ-ГГГГ"
                    readOnly
                    required
                    className="birthday-picker-trigger"
                  />
                </label>
              ) : null}

              <div className="donation-actions">
                <button type="submit" className="button-primary" disabled={isCreateDisabled}>
                  {isSubmitting ? "Создаем..." : "Создать"}
                </button>
                <button type="button" className="button-secondary" onClick={closeCreateModal}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <BirthdayPickerModal
        isOpen={isCreateModalOpen && isEventDatePickerOpen}
        value={eventDate || todayStorageDate}
        onClose={() => setIsEventDatePickerOpen(false)}
        onConfirm={(nextValue) => {
          setEventDate(nextValue);
          setIsEventDatePickerOpen(false);
        }}
        kicker="Дата события"
        title="Выбери день, месяц и год события"
        outputFormat="storage"
        defaultYearOffset={0}
        maxYear={new Date().getFullYear() + 10}
      />
    </section>
  );
}
