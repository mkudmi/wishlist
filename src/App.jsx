import { useEffect, useState } from "react";

const STORAGE_KEY = "birthday-wishlist-items-v1";
const CONTRIBUTIONS_KEY = "birthday-wishlist-contributions-v1";
const USER_KEY = "birthday-wishlist-user-v1";
const ADMIN_AUTH_KEY = "birthday-wishlist-admin-auth-v1";
const ADMIN_LOGIN = "admin";
const ADMIN_PASSWORD = "admin";

const defaultWishes = [
  {
    id: "wish-headphones",
    title: "Наушники с шумоподавлением",
    note: "Для работы, прогулок и путешествий. Люблю минималистичный дизайн и мягкие амбушюры.",
    tag: "Техника",
    price: "15 000-25 000 руб."
  },
  {
    id: "wish-lego",
    title: "LEGO или красивый конструктор",
    note: "Что-то атмосферное, что можно собрать вечером под музыку и потом оставить как декор.",
    tag: "Хобби",
    price: "5 000-15 000 руб."
  },
  {
    id: "wish-books",
    title: "Сертификат в книжный магазин",
    note: "Идеальный вариант, если не хочется угадывать с конкретной книгой.",
    tag: "Книги",
    price: "2 000-5 000 руб."
  },
  {
    id: "wish-game",
    title: "Настольная игра для компании",
    note: "Люблю игры, которые быстро объясняются и реально собирают всех за столом.",
    tag: "Вечера с друзьями",
    price: "2 500-7 000 руб."
  },
  {
    id: "wish-desk",
    title: "Аксессуар для рабочего стола",
    note: "Лампа, подставка, органайзер или что-то, что делает стол удобнее и аккуратнее.",
    tag: "Комфорт",
    price: "1 500-8 000 руб."
  },
  {
    id: "wish-donate",
    title: "Донат на мечту",
    note: "Если хочется подарить свободу выбора, можно поддержать мою большую цель.",
    tag: "Гибкий вариант",
    price: "Любая сумма"
  }
];

const rules = [
  "Если выбираешь вещь сам, лучше в спокойных цветах и без слишком ярких принтов.",
  "Если подарок крупный, можно скооперироваться с кем-то и подарить вместе.",
  "Если сомневаешься, сертификат или просто вклад в мечту всегда работают."
];

const emptyForm = {
  title: "",
  note: "",
  tag: "",
  price: "",
  url: ""
};

const emptyRegistrationForm = {
  firstName: "",
  lastName: "",
  isIncognito: false
};

const emptyAdminAuthForm = {
  login: "",
  password: ""
};

function readStoredWishes() {
  if (typeof window === "undefined") {
    return defaultWishes;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultWishes;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultWishes;
    }

    const sanitized = parsed
      .filter((item) => item && typeof item.title === "string" && typeof item.note === "string")
      .map((item) => ({
        id: item.id || `wish-${Date.now()}-${Math.random()}`,
        title: item.title,
        note: item.note,
        tag: typeof item.tag === "string" ? item.tag : "Без категории",
        price:
          typeof item.price === "string"
            ? item.price
            : typeof item.accent === "string"
              ? item.accent
              : "",
        url: typeof item.url === "string" ? item.url : ""
      }));

    return sanitized.length > 0 ? sanitized : defaultWishes;
  } catch {
    return defaultWishes;
  }
}

function readStoredContributions() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(CONTRIBUTIONS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [wishId, value]) => {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        acc[wishId] = [{ name: "Инкогнито", amount: value, at: new Date().toISOString() }];
        return acc;
      }

      if (!Array.isArray(value)) {
        return acc;
      }

      const entries = value.filter(
        (entry) =>
          entry &&
          typeof entry.name === "string" &&
          typeof entry.amount === "number" &&
          Number.isFinite(entry.amount) &&
          entry.amount > 0
      );

      if (entries.length > 0) {
        acc[wishId] = entries;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.name !== "string") {
      return null;
    }

    return {
      id:
        typeof parsed.id === "string" && parsed.id
          ? parsed.id
          : typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `user-${Date.now()}`,
      name: parsed.name,
      isIncognito: Boolean(parsed.isIncognito)
    };
  } catch {
    return null;
  }
}

function createWish(form) {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `wish-${Date.now()}`,
    title: form.title.trim(),
    note: form.note.trim(),
    tag: form.tag.trim() || "Без категории",
    price: form.price.trim(),
    url: form.url.trim()
  };
}

function mapWishToForm(wish) {
  return {
    title: wish.title || "",
    note: wish.note || "",
    tag: wish.tag || "",
    price: wish.price || "",
    url: wish.url || ""
  };
}

function parseTargetFromPrice(price) {
  if (!price) {
    return null;
  }

  const matches = [...price.matchAll(/\d[\d\s]*/g)];
  if (matches.length === 0) {
    return null;
  }

  const values = matches
    .map((match) => Number(match[0].replace(/\s/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    return null;
  }

  return values[values.length - 1];
}

function getWishDonated(contributions, wishId) {
  const entries = contributions[wishId] || [];
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getWishParticipants(contributions, wishId) {
  const entries = contributions[wishId] || [];
  const totalsByPerson = entries.reduce((acc, entry) => {
    const key = entry.userId ? `id:${entry.userId}` : `name:${entry.name}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        name: entry.name,
        userId: entry.userId || null,
        total: 0
      };
    }
    acc[key].total += entry.amount;
    return acc;
  }, {});

  return Object.values(totalsByPerson)
    .sort((a, b) => b.total - a.total);
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function parseDonationAmount(value) {
  return Number(value.replace(/[^\d.,]/g, "").replace(",", "."));
}

function getUserDisplayName(user) {
  if (!user) {
    return "";
  }

  return user.isIncognito ? "Инкогнито" : user.name;
}

function getPageFromHash() {
  if (typeof window === "undefined") {
    return "wishlist";
  }

  return window.location.hash === "#/admin" ? "admin" : "wishlist";
}

function WishlistPage({ wishes, contributions, onOpenWish, onOpenAdmin }) {
  return (
    <>
      <section className="hero-card">
        <p className="eyebrow">Birthday wishlist</p>
        <div className="hero-grid">
          <div>
            <p className="hero-kicker">Мой день рождения</p>
            <h1>Вишлист, чтобы не гадать с подарком</h1>
            <p className="hero-copy">
              Я собрал список вещей, которые меня правда порадуют. Здесь есть и конкретные идеи,
              и более гибкие варианты, если хочется выбрать что-то удобное.
            </p>

            <div className="hero-actions">
              <a href="#wishlist" className="button-primary">
                Смотреть желания
              </a>
              <a href="#gift-guide" className="button-secondary">
                Как лучше подарить
              </a>
            </div>
          </div>

          <aside className="date-panel">
            <span className="date-label">Дата</span>
            <strong>День рождения скоро</strong>
            <p>Буду рад любому вниманию, а этот список просто помогает выбрать проще.</p>
            <p className="date-note">
              Так как мой выбор сильно бьет по карману, при желании вы можете поучаствовать в моем подарке.
            </p>
          </aside>
        </div>
      </section>

      <section className="wishlist-section" id="wishlist">
        <div className="section-head">
          <p className="section-label">Wishlist</p>
          <h2>Что можно подарить</h2>
          <p>
            Ниже собраны варианты от самых конкретных до универсальных. Можно выбрать один пункт
            или использовать список как ориентир.
          </p>
        </div>

        <div className="wish-grid">
          {wishes.map((wish) => {
            const target = parseTargetFromPrice(wish.price);
            const donated = getWishDonated(contributions, wish.id);
            const progressPercent = target ? Math.min(100, Math.round((donated / target) * 100)) : 0;

            return (
              <button
                type="button"
                className="wish-card wish-card-open"
                key={wish.id}
                onClick={() => onOpenWish(wish.id)}
              >
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
                      {target
                        ? `${formatMoney(donated)} / ${formatMoney(target)} руб.`
                        : `${formatMoney(donated)} руб. собрано`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="guide-section" id="gift-guide">
        <div className="guide-card">
          <div className="section-head compact">
            <p className="section-label">Gift guide</p>
            <h2>Небольшие пожелания</h2>
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
          <p>
            Даже если ты выберешь что-то вне списка, мне будет приятно. Этот сайт нужен только для
            того, чтобы сделать выбор легче.
          </p>
          <div className="contact-note">
            <span>Подсказка</span>
            <p>Можно добавить сюда свой Telegram, карту или ссылку на маркетплейс.</p>
          </div>
        </div>
      </section>

      <div className="bottom-admin-nav">
        <button type="button" className="tiny-admin-button" onClick={onOpenAdmin}>
          Админка
        </button>
      </div>
    </>
  );
}

function AdminPage({
  wishes,
  form,
  editingWishId,
  onInputChange,
  onFormSubmit,
  onDeleteWish,
  onStartEdit,
  onCancelEdit,
  onReset,
  onOpenWishlist
}) {
  return (
    <section className="admin-section" id="admin">
      <div className="admin-card">
        <div className="section-head compact">
          <p className="section-label">Admin</p>
          <h2>Управление вишлистом</h2>
          <p>Добавляй новые подарки, и они сразу появятся в основном списке.</p>
        </div>

        <div className="admin-top-actions">
          <button type="button" className="button-secondary" onClick={onOpenWishlist}>
            Вернуться на главную
          </button>
        </div>

        <form className="admin-form" onSubmit={onFormSubmit}>
          <label>
            Название подарка*
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={onInputChange}
              placeholder="Например: Сертификат в Steam"
              required
            />
          </label>

          <label>
            Описание*
            <textarea
              name="note"
              value={form.note}
              onChange={onInputChange}
              placeholder="Коротко: что это и почему хочется"
              rows={4}
              required
            />
          </label>

          <div className="admin-form-row">
            <label>
              Тег
              <input
                type="text"
                name="tag"
                value={form.tag}
                onChange={onInputChange}
                placeholder="Категория"
              />
            </label>

            <label>
              Цена
              <input
                type="text"
                name="price"
                value={form.price}
                onChange={onInputChange}
                placeholder="Например: 3 500 руб."
              />
            </label>
          </div>

          <label>
            Ссылка на подарок
            <input
              type="url"
              name="url"
              value={form.url}
              onChange={onInputChange}
              placeholder="https://..."
            />
          </label>

          <div className="admin-actions">
            <button type="submit" className="button-primary">
              {editingWishId ? "Сохранить изменения" : "Добавить подарок"}
            </button>
            {editingWishId ? (
              <button type="button" className="button-secondary" onClick={onCancelEdit}>
                Отмена редактирования
              </button>
            ) : null}
            <button type="button" className="button-secondary" onClick={onReset}>
              Сбросить к шаблону
            </button>
          </div>
        </form>

        <div className="admin-list">
          <p className="section-label">Текущий список</p>
          {wishes.map((wish) => (
            <div className="admin-list-item" key={wish.id}>
              <div>
                <strong>{wish.title}</strong>
                <p>{wish.note}</p>
                {wish.url ? (
                  <a className="admin-item-link" href={wish.url} target="_blank" rel="noreferrer">
                    {wish.url}
                  </a>
                ) : null}
              </div>
              <div className="admin-item-actions">
                <button type="button" className="edit-button" onClick={() => onStartEdit(wish)}>
                  Редактировать
                </button>
                <button type="button" className="delete-button" onClick={() => onDeleteWish(wish.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [wishes, setWishes] = useState(readStoredWishes);
  const [contributions, setContributions] = useState(readStoredContributions);
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [form, setForm] = useState(emptyForm);
  const [editingWishId, setEditingWishId] = useState(null);
  const [page, setPage] = useState(getPageFromHash);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === "1";
  });
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [adminAuthForm, setAdminAuthForm] = useState(emptyAdminAuthForm);
  const [adminAuthError, setAdminAuthError] = useState("");

  const [openedWishId, setOpenedWishId] = useState(null);
  const [donationWish, setDonationWish] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [donationError, setDonationError] = useState("");

  const [registeringWish, setRegisteringWish] = useState(null);
  const [registrationForm, setRegistrationForm] = useState(emptyRegistrationForm);
  const [registrationError, setRegistrationError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
  }, [wishes]);

  useEffect(() => {
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    function handleHashChange() {
      const nextPage = getPageFromHash();
      if (nextPage === "admin" && !isAdminAuthorized) {
        setPage("wishlist");
        window.location.hash = "#/";
        openAdminAuthModal();
        return;
      }
      setPage(nextPage);
    }

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.location.hash = "#/";
    }

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isAdminAuthorized]);

  function onInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function onFormSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.note.trim()) {
      return;
    }

    if (editingWishId) {
      setWishes((prev) =>
        prev.map((wish) =>
          wish.id === editingWishId
            ? {
                ...wish,
                ...createWish(form),
                id: wish.id
              }
            : wish
        )
      );
      setEditingWishId(null);
    } else {
      const nextWish = createWish(form);
      setWishes((prev) => [nextWish, ...prev]);
    }

    setForm(emptyForm);
  }

  function deleteWish(id) {
    setWishes((prev) => prev.filter((wish) => wish.id !== id));

    setContributions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (editingWishId === id) {
      setEditingWishId(null);
      setForm(emptyForm);
    }

    if (openedWishId === id) {
      setOpenedWishId(null);
    }

    if (donationWish?.id === id) {
      closeDonationModal();
    }

    if (registeringWish?.id === id) {
      closeRegistrationModal();
    }
  }

  function startEditWish(wish) {
    setEditingWishId(wish.id);
    setForm(mapWishToForm(wish));
  }

  function cancelEditWish() {
    setEditingWishId(null);
    setForm(emptyForm);
  }

  function resetDefaultWishes() {
    setWishes(defaultWishes);
    setEditingWishId(null);
    setForm(emptyForm);
  }

  function openWishModal(wishId) {
    setOpenedWishId(wishId);
  }

  function closeWishModal() {
    setOpenedWishId(null);
  }

  function openRegistrationModal(wish) {
    setRegisteringWish(wish);
    setRegistrationError("");
    setRegistrationForm(emptyRegistrationForm);
  }

  function closeRegistrationModal() {
    setRegisteringWish(null);
    setRegistrationError("");
    setRegistrationForm(emptyRegistrationForm);
  }

  function openDonationModal(wish) {
    setDonationWish(wish);
    setDonationAmount("");
    setDonationError("");
  }

  function closeDonationModal() {
    setDonationWish(null);
    setDonationAmount("");
    setDonationError("");
  }

  function participateInWish(wish) {
    if (!currentUser) {
      openRegistrationModal(wish);
      return;
    }

    openDonationModal(wish);
  }

  function onRegistrationInput(event) {
    const { name, value } = event.target;
    setRegistrationForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function onRegistrationToggle() {
    setRegistrationForm((prev) => ({
      ...prev,
      isIncognito: !prev.isIncognito
    }));
  }

  function submitRegistration(event) {
    event.preventDefault();

    let user;
    if (registrationForm.isIncognito) {
      user = { name: "Инкогнито", isIncognito: true };
    } else {
      const firstName = normalizeName(registrationForm.firstName);
      const lastName = normalizeName(registrationForm.lastName);

      if (!firstName) {
        setRegistrationError("Укажи имя или выбери режим инкогнито.");
        return;
      }

      user = {
        name: [firstName, lastName].filter(Boolean).join(" "),
        isIncognito: false
      };
    }

    setCurrentUser(user);

    if (registeringWish) {
      openDonationModal(registeringWish);
    }

    closeRegistrationModal();
  }

  function submitDonation(event) {
    event.preventDefault();

    if (!donationWish || !currentUser) {
      return;
    }

    const amount = parseDonationAmount(donationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDonationError("Введите корректную сумму больше 0.");
      return;
    }

    setContributions((prev) => {
      const wishEntries = prev[donationWish.id] || [];
      const nextEntry = {
        name: getUserDisplayName(currentUser),
        userId: currentUser.id || null,
        amount,
        at: new Date().toISOString()
      };

      return {
        ...prev,
        [donationWish.id]: [...wishEntries, nextEntry]
      };
    });

    closeDonationModal();
  }

  function donateFullRemaining() {
    if (!donationWish || !currentUser) {
      return;
    }

    const target = parseTargetFromPrice(donationWish.price);
    if (!target) {
      return;
    }

    const donated = getWishDonated(contributions, donationWish.id);
    const remaining = target - donated;
    if (remaining <= 0) {
      return;
    }

    setContributions((prev) => {
      const wishEntries = prev[donationWish.id] || [];
      const nextEntry = {
        name: getUserDisplayName(currentUser),
        userId: currentUser.id || null,
        amount: remaining,
        at: new Date().toISOString()
      };

      return {
        ...prev,
        [donationWish.id]: [...wishEntries, nextEntry]
      };
    });

    closeDonationModal();
  }

  function openAdminPage() {
    if (isAdminAuthorized) {
      window.location.hash = "#/admin";
      return;
    }
    openAdminAuthModal();
  }

  function openWishlistPage() {
    window.location.hash = "#/";
  }

  function openAdminAuthModal() {
    setIsAdminAuthOpen(true);
    setAdminAuthError("");
    setAdminAuthForm(emptyAdminAuthForm);
  }

  function closeAdminAuthModal() {
    setIsAdminAuthOpen(false);
    setAdminAuthError("");
    setAdminAuthForm(emptyAdminAuthForm);
  }

  function onAdminAuthInputChange(event) {
    const { name, value } = event.target;
    setAdminAuthForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function submitAdminAuth(event) {
    event.preventDefault();

    if (adminAuthForm.login !== ADMIN_LOGIN || adminAuthForm.password !== ADMIN_PASSWORD) {
      setAdminAuthError("Неверный логин или пароль.");
      return;
    }

    setIsAdminAuthorized(true);
    sessionStorage.setItem(ADMIN_AUTH_KEY, "1");
    closeAdminAuthModal();
    window.location.hash = "#/admin";
  }

  function removeMyParticipation(wishId) {
    if (!currentUser) {
      return;
    }

    const ownName = getUserDisplayName(currentUser);

    setContributions((prev) => {
      const currentEntries = prev[wishId] || [];
      const nextEntries = currentEntries.filter((entry) => {
        if (currentUser.id && entry.userId) {
          return entry.userId !== currentUser.id;
        }

        return entry.name !== ownName;
      });

      if (nextEntries.length === currentEntries.length) {
        return prev;
      }

      const next = { ...prev };
      if (nextEntries.length > 0) {
        next[wishId] = nextEntries;
      } else {
        delete next[wishId];
      }
      return next;
    });
  }

  const openedWish = wishes.find((wish) => wish.id === openedWishId) || null;
  const openedWishTarget = openedWish ? parseTargetFromPrice(openedWish.price) : null;
  const openedWishDonated = openedWish ? getWishDonated(contributions, openedWish.id) : 0;
  const openedWishParticipants = openedWish ? getWishParticipants(contributions, openedWish.id) : [];
  const currentUserName = getUserDisplayName(currentUser);

  function isCurrentUserParticipant(person) {
    if (!currentUser) {
      return false;
    }

    if (person.userId && currentUser.id) {
      return person.userId === currentUser.id;
    }

    return person.name === currentUserName;
  }
  const openedWishProgressPercent = openedWishTarget
    ? Math.min(100, Math.round((openedWishDonated / openedWishTarget) * 100))
    : 0;
  const openedWishCompleted = Boolean(openedWishTarget) && openedWishDonated >= openedWishTarget;
  const donationWishTarget = donationWish ? parseTargetFromPrice(donationWish.price) : null;
  const donationWishDonated = donationWish ? getWishDonated(contributions, donationWish.id) : 0;
  const donationWishRemaining = donationWishTarget
    ? Math.max(0, donationWishTarget - donationWishDonated)
    : 0;

  return (
    <div className="page-shell">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout">
        {page === "admin" ? (
          <AdminPage
            wishes={wishes}
            form={form}
            editingWishId={editingWishId}
            onInputChange={onInputChange}
            onFormSubmit={onFormSubmit}
            onDeleteWish={deleteWish}
            onStartEdit={startEditWish}
            onCancelEdit={cancelEditWish}
            onReset={resetDefaultWishes}
            onOpenWishlist={openWishlistPage}
          />
        ) : (
          <WishlistPage
            wishes={wishes}
            contributions={contributions}
            onOpenWish={openWishModal}
            onOpenAdmin={openAdminPage}
          />
        )}
      </main>

      {openedWish ? (
        <div className="wish-modal-backdrop" onClick={closeWishModal}>
          <div className="wish-modal" onClick={(event) => event.stopPropagation()}>
            <div className="wish-modal-head">
              <span className="wish-tag">{openedWish.tag}</span>
              <span className="wish-price">{openedWish.price || "Цена не указана"}</span>
            </div>

            <h3>{openedWish.title}</h3>
            <p className="wish-modal-note">{openedWish.note}</p>

            <div className="wish-progress">
              <div className="wish-progress-track">
                <span className="wish-progress-fill" style={{ width: `${openedWishProgressPercent}%` }} />
              </div>
              <p className="wish-progress-text">
                {openedWishTarget
                  ? `${formatMoney(openedWishDonated)} / ${formatMoney(openedWishTarget)} руб.`
                  : `${formatMoney(openedWishDonated)} руб. собрано`}
              </p>
            </div>

            <div className="wish-modal-participants">
              <span className="wish-participants-label">Участвуют</span>
              {openedWishParticipants.length === 0 ? (
                <p className="wish-participants-empty">Пока никого</p>
              ) : (
                openedWishParticipants.map((person) => (
                  <div className="wish-participants-row" key={person.key}>
                    <p className="wish-participants-item">
                      {person.name} - {formatMoney(person.total)} руб.
                    </p>
                    {isCurrentUserParticipant(person) ? (
                      <button
                        type="button"
                        className="wish-participants-remove"
                        aria-label="Удалить мое участие"
                        onClick={() => removeMyParticipation(openedWish.id)}
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
                className="wish-donate-button"
                onClick={() => participateInWish(openedWish)}
                disabled={openedWishCompleted}
              >
                {openedWishCompleted ? "Собрано" : "Поучаствовать"}
              </button>
              {openedWish.url ? (
                <a className="wish-shop-link" href={openedWish.url} target="_blank" rel="noreferrer">
                  В магазин
                </a>
              ) : null}
              <button type="button" className="button-secondary" onClick={closeWishModal}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {registeringWish ? (
        <div className="donation-modal-backdrop" onClick={closeRegistrationModal}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Кто участвует</h3>
            <p className="donation-modal-title">{registeringWish.title}</p>

            <form className="donation-form" onSubmit={submitRegistration}>
              <label>
                Имя
                <input
                  type="text"
                  name="firstName"
                  value={registrationForm.firstName}
                  onChange={onRegistrationInput}
                  placeholder="Имя"
                  disabled={registrationForm.isIncognito}
                />
              </label>

              <label>
                Фамилия (необязательно)
                <input
                  type="text"
                  name="lastName"
                  value={registrationForm.lastName}
                  onChange={onRegistrationInput}
                  placeholder="Фамилия"
                  disabled={registrationForm.isIncognito}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={registrationForm.isIncognito}
                  onChange={onRegistrationToggle}
                />
                Участвовать как инкогнито
              </label>

              {registrationError ? <p className="donation-error">{registrationError}</p> : null}

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeRegistrationModal}>
                  Отмена
                </button>
                <button type="submit" className="button-primary">
                  Продолжить
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {donationWish ? (
        <div className="donation-modal-backdrop" onClick={closeDonationModal}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Поучаствовать в подарке</h3>
            <p className="donation-modal-title">{donationWish.title}</p>
            <p className="donation-modal-subtitle">Участвует: {getUserDisplayName(currentUser)}</p>

            <form className="donation-form" onSubmit={submitDonation}>
              <label>
                Сумма
                <input
                  type="text"
                  inputMode="decimal"
                  value={donationAmount}
                  onChange={(event) => {
                    setDonationAmount(event.target.value);
                    if (donationError) {
                      setDonationError("");
                    }
                  }}
                  placeholder="Например: 1000"
                  autoFocus
                />
              </label>

              {donationError ? <p className="donation-error">{donationError}</p> : null}

              <div className="donation-actions">
                {donationWishTarget && donationWishRemaining > 0 ? (
                  <button type="button" className="button-secondary" onClick={donateFullRemaining}>
                    Закрыть все ({formatMoney(donationWishRemaining)} руб.)
                  </button>
                ) : null}
                <button type="submit" className="button-primary">
                  Добавить
                </button>
                <button type="button" className="button-secondary" onClick={closeDonationModal}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAdminAuthOpen ? (
        <div className="donation-modal-backdrop" onClick={closeAdminAuthModal}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Вход в админку</h3>
            <p className="donation-modal-title">Введите логин и пароль</p>

            <form className="donation-form" onSubmit={submitAdminAuth}>
              <label>
                Логин
                <input
                  type="text"
                  name="login"
                  value={adminAuthForm.login}
                  onChange={onAdminAuthInputChange}
                  placeholder="Логин"
                  autoFocus
                />
              </label>

              <label>
                Пароль
                <input
                  type="password"
                  name="password"
                  value={adminAuthForm.password}
                  onChange={onAdminAuthInputChange}
                  placeholder="Пароль"
                />
              </label>

              {adminAuthError ? <p className="donation-error">{adminAuthError}</p> : null}

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeAdminAuthModal}>
                  Отмена
                </button>
                <button type="submit" className="button-primary">
                  Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
