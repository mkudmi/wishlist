import { useEffect, useMemo, useRef, useState } from "react";
import { BirthdayPickerModal } from "../BirthdayPickerModal";
import { celebrationOptions } from "../../config/constants";
import { formatDateToDdMmYyyy } from "../../lib/helpers";

export function DashboardPage({
  wishlists,
  dashboardStats,
  currentWishlistId,
  isLoading,
  isSubmitting,
  error,
  onCreateWishlist,
  onOpenWishlist,
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
  const [isMobile, setIsMobile] = useState(false);
  const celebrationMenuRef = useRef(null);

  const needsCustomTitle = celebrationType === "custom";
  const needsEventDate = celebrationType !== "birthday";
  const currentCelebrationOption = celebrationOptions.find((option) => option.value === celebrationType) || celebrationOptions[0];

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncIsMobile = () => setIsMobile(mediaQuery.matches);
    syncIsMobile();

    mediaQuery.addEventListener("change", syncIsMobile);
    return () => mediaQuery.removeEventListener("change", syncIsMobile);
  }, []);

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
            <h2>Твои вишлисты</h2>
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
                <div className="wishlist-tile-head">
                  <strong>{wishlist.title}</strong>
                  <p>{getCelebrationLabel(wishlist)}</p>
                </div>

                <div className="wishlist-tile-actions">
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
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => onDeleteWishlist(wishlist)}
                    disabled={isSubmitting}
                  >
                    Удалить
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
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Новый вишлист</h3>
            <p className="donation-modal-title">Заполни параметры события, а оформление выберем уже внутри страницы</p>

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
                  {isMobile ? (
                    <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
                  ) : (
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
                  )}
                </label>
              ) : null}

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeCreateModal}>
                  Отмена
                </button>
                <button type="submit" className="button-primary" disabled={isCreateDisabled}>
                  {isSubmitting ? "Создаем..." : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <BirthdayPickerModal
        isOpen={isCreateModalOpen && isEventDatePickerOpen && !isMobile}
        value={eventDate}
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
