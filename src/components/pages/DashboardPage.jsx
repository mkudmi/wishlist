import { useState } from "react";

export function DashboardPage({
  wishlists,
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

  function openCreateModal() {
    setNewWishlistTitle("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setNewWishlistTitle("");
  }

  async function submitCreate(event) {
    event.preventDefault();
    const title = newWishlistTitle.trim();
    if (!title || isSubmitting) {
      return;
    }
    await onCreateWishlist(title);
    closeCreateModal();
  }

  return (
    <section className="admin-section" id="dashboard">
      <div className="admin-card">
        <div className="section-head compact">
          <p className="section-label">Dashboard</p>
          <h2>Твои вишлисты</h2>
          <p>
            Нажми на карточку <strong>+</strong>, чтобы создать новый вишлист.
          </p>
        </div>

        {isLoading ? <p className="status-banner">Загружаем вишлисты...</p> : null}
        {error ? <p className="status-banner status-banner-error">{error}</p> : null}

        <div className="admin-list">
          <p className="section-label">Мои вишлисты</p>

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
                  <p>{wishlist.id === currentWishlistId ? "Активный" : "Готов к работе"}</p>
                </div>
                <div className="wishlist-tile-actions">
                  <button
                    type="button"
                    className="tiny-admin-button"
                    onClick={() => onOpenWishlist(wishlist)}
                    disabled={isSubmitting}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="tiny-admin-button"
                    onClick={() => onCopyShareLink(wishlist)}
                    disabled={isSubmitting}
                  >
                    Ссылка
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
            <p className="donation-modal-title">Введите название</p>

            <form className="donation-form" onSubmit={submitCreate}>
              <label>
                Название
                <input
                  type="text"
                  value={newWishlistTitle}
                  onChange={(event) => setNewWishlistTitle(event.target.value)}
                  placeholder="Например: День рождения 2026"
                  required
                  autoFocus
                />
              </label>

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeCreateModal}>
                  Отмена
                </button>
                <button type="submit" className="button-primary" disabled={isSubmitting || !newWishlistTitle.trim()}>
                  {isSubmitting ? "Создаем..." : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
