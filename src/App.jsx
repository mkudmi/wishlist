import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  CONTRIBUTIONS_KEY,
  rules as defaultRules,
  emptyAuthForm,
  emptyForm,
  emptyProfileForm
} from "./config/constants";
import {
  createWish,
  formatMoney,
  getProfileFormFromUser,
  getRouteFromHash,
  getUserDisplayName,
  getWishDonated,
  getWishParticipants,
  mapWishToForm,
  normalizeName,
  parseDdMmYyyyToStorageDate,
  parseDonationAmount,
  parseTargetFromPrice,
  readStoredContributions,
  sanitizeWishes
} from "./lib/helpers";
import { readRulesForWishlist, writeRulesForWishlist } from "./lib/rulesStorage";
import { AuthPage } from "./components/pages/AuthPage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { WishlistPage } from "./components/pages/WishlistPage";
export default function App() {
  const initialRoute = getRouteFromHash();
  const [wishes, setWishes] = useState([]);
  const [contributions, setContributions] = useState(() => readStoredContributions(CONTRIBUTIONS_KEY));
  const [currentUser, setCurrentUser] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [isWishlistsLoading, setIsWishlistsLoading] = useState(false);
  const [wishlistsError, setWishlistsError] = useState("");
  const [isWishlistSubmitting, setIsWishlistSubmitting] = useState(false);
  const [wishlistToDelete, setWishlistToDelete] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileError, setProfileError] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [currentWishlistId, setCurrentWishlistId] = useState(null);
  const [currentShareToken, setCurrentShareToken] = useState(null);
  const [sharedWishes, setSharedWishes] = useState([]);
  const [sharedError, setSharedError] = useState("");
  const [shareCopied, setShareCopied] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [wishesError, setWishesError] = useState("");
  const [isWishSubmitting, setIsWishSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingWishId, setEditingWishId] = useState(null);
  const [isWishEditorOpen, setIsWishEditorOpen] = useState(false);
  const [wishlistRules, setWishlistRules] = useState(defaultRules);
  const [page, setPage] = useState(initialRoute.page);
  const [shareToken, setShareToken] = useState(initialRoute.shareToken);

  const [openedWishId, setOpenedWishId] = useState(null);
  const [donationWish, setDonationWish] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [donationError, setDonationError] = useState("");

  function saveRulesForWishlist(nextRules) {
    setWishlistRules(writeRulesForWishlist(currentWishlistId, nextRules));
  }

  async function loadWishlistsForUser(userId) {
    setIsWishlistsLoading(true);
    setWishlistsError("");

    const { data, error } = await supabase
      .from("wishlists")
      .select("id, title, share_token, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setWishlistsError("Не удалось загрузить вишлисты.");
      setWishlists([]);
      setIsWishlistsLoading(false);
      return [];
    }

    setWishlists(data || []);
    setIsWishlistsLoading(false);
    return data || [];
  }

  async function loadWishes(wishlistId) {
    setWishesError("");

    const { data, error } = await supabase
      .from("wishes")
      .select("id, wishlist_id, title, note, tag, price, url, created_at")
      .eq("wishlist_id", wishlistId)
      .order("created_at", { ascending: false });

    if (error) {
      setWishesError("Не удалось загрузить список подарков.");
      setWishes([]);
      return;
    }

    setWishes(sanitizeWishes(data));
  }

  async function loadSharedWishes(token) {
    if (!token) {
      setSharedWishes([]);
      setSharedError("Некорректная ссылка.");
      return;
    }

    setSharedError("");
    const { data, error } = await supabase.rpc("get_shared_wishlist", {
      p_share_token: token
    });

    if (error) {
      setSharedError("Не удалось открыть вишлист по ссылке.");
      setSharedWishes([]);
      return;
    }

    const sanitized = sanitizeWishes(data);
    setSharedWishes(sanitized);
    if (sanitized.length === 0) {
      setSharedError("Список пуст или ссылка недействительна.");
    }
  }

  async function copyShareLink() {
    if (!currentShareToken || typeof window === "undefined") {
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#/shared/${currentShareToken}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied("Ссылка скопирована");
      setTimeout(() => setShareCopied(""), 1800);
    } catch {
      setShareCopied("Не удалось скопировать ссылку");
      setTimeout(() => setShareCopied(""), 2000);
    }
  }

  async function copyWishlistShareLink(wishlist) {
    if (!wishlist?.share_token || typeof window === "undefined") {
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#/shared/${wishlist.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied("Ссылка скопирована");
      setTimeout(() => setShareCopied(""), 1800);
    } catch {
      setShareCopied("Не удалось скопировать ссылку");
      setTimeout(() => setShareCopied(""), 2000);
    }
  }

  async function selectWishlist(wishlist) {
    if (!wishlist?.id) {
      return;
    }
    setCurrentWishlistId(wishlist.id);
    setCurrentShareToken(wishlist.share_token || null);
    setWishlistRules(readRulesForWishlist(wishlist.id));
    await loadWishes(wishlist.id);
  }

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user || null;

      if (!mounted) {
        return;
      }

      if (!sessionUser) {
        setCurrentUser(null);
        setWishlists([]);
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
        setWishlistRules(defaultRules.slice(0, 5));
        setIsAuthLoading(false);
        return;
      }

      const firstName = sessionUser.user_metadata?.first_name || "";
      const lastName = sessionUser.user_metadata?.last_name || "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || sessionUser.email || "Пользователь";

      setCurrentUser({
        id: sessionUser.id,
        name,
        firstName,
        lastName,
        birthday: sessionUser.user_metadata?.birth_date || "",
        isIncognito: false
      });

      const lists = await loadWishlistsForUser(sessionUser.id);
      if (!mounted) {
        return;
      }

      if (lists.length > 0) {
        await selectWishlist(lists[0]);
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
      }

      if (!window.location.hash || window.location.hash === "#/") {
        window.location.hash = "#/dashboard";
      }
      setIsAuthLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;
      if (!sessionUser) {
        setCurrentUser(null);
        setWishlists([]);
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
        setWishlistRules(defaultRules.slice(0, 5));
        return;
      }

      const firstName = sessionUser.user_metadata?.first_name || "";
      const lastName = sessionUser.user_metadata?.last_name || "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || sessionUser.email || "Пользователь";

      setCurrentUser({
        id: sessionUser.id,
        name,
        firstName,
        lastName,
        birthday: sessionUser.user_metadata?.birth_date || "",
        isIncognito: false
      });

      loadWishlistsForUser(sessionUser.id)
        .then((lists) => {
          if (lists.length > 0) {
            return selectWishlist(lists[0]);
          }
          setCurrentWishlistId(null);
          setCurrentShareToken(null);
          setWishes([]);
          return null;
        })
        .catch(() => {
          setWishlistsError("Не удалось загрузить вишлисты.");
          setWishes([]);
        });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    function handleHashChange() {
      const route = getRouteFromHash();
      setPage(route.page);
      setShareToken(route.shareToken);
    }

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.location.hash = "#/";
    }

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (page === "wishlist" && !currentWishlistId) {
      window.location.hash = "#/dashboard";
    }
  }, [page, currentWishlistId, currentUser]);

  useEffect(() => {
    if (page !== "shared") {
      return;
    }
    loadSharedWishes(shareToken);
  }, [page, shareToken]);

  useEffect(() => {
    setIsHeaderMenuOpen(false);
  }, [page]);

  function onAuthInputChange(event) {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
    if (authError) {
      setAuthError("");
    }
  }

  function onAuthModeChange(nextMode) {
    setAuthMode(nextMode);
    setAuthError("");
    setAuthForm(emptyAuthForm);
  }

  async function submitAuth(event) {
    event.preventDefault();

    setAuthError("");
    setIsAuthSubmitting(true);

    try {
      const email = authForm.email.trim().toLowerCase();
      const password = authForm.password;

      if (!email || !password) {
        throw new Error("Укажи email и пароль.");
      }

      if (authMode === "register") {
        const firstName = authForm.firstName.trim();
        const lastName = authForm.lastName.trim();
        const birthday = parseDdMmYyyyToStorageDate(authForm.birthday);
        if (!firstName || !lastName) {
          throw new Error("Укажи имя и фамилию.");
        }
        if (!birthday) {
          throw new Error("Укажи дату рождения в формате ДД-ММ-ГГГГ.");
        }
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error("Пароли не совпадают.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              birth_date: birthday
            }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.session) {
          setAuthError("Проверь email и подтверди регистрацию, затем войди.");
          setAuthMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          throw new Error("Неверный email или пароль.");
        }
      }

      setAuthForm(emptyAuthForm);
    } catch (error) {
      setAuthError(error.message || "Ошибка авторизации.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function logout() {
    supabase.auth.signOut();
    setPage("dashboard");
    window.location.hash = "#/dashboard";
  }

  function openProfileModal() {
    setProfileForm(getProfileFormFromUser(currentUser));
    setProfileError("");
    setIsProfileOpen(true);
  }

  function closeProfileModal() {
    setIsProfileOpen(false);
    setProfileError("");
    setProfileForm(emptyProfileForm);
  }

  function onProfileInputChange(event) {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value
    }));
    if (profileError) {
      setProfileError("");
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    const firstName = normalizeName(profileForm.firstName);
    const lastName = normalizeName(profileForm.lastName);
    const birthday = parseDdMmYyyyToStorageDate(profileForm.birthday);

    if (!firstName || !lastName) {
      setProfileError("Укажи имя и фамилию.");
      return;
    }
    if (!birthday) {
      setProfileError("Укажи дату рождения в формате ДД-ММ-ГГГГ.");
      return;
    }

    setIsProfileSubmitting(true);
    setProfileError("");

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthday
      }
    });

    if (authError) {
      setProfileError("Не удалось обновить профиль.");
      setIsProfileSubmitting(false);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        birthday
      })
      .eq("id", currentUser.id);

    if (profileUpdateError) {
      setProfileError("Профиль auth обновлен, но таблица users не обновилась.");
      setIsProfileSubmitting(false);
      return;
    }

    setCurrentUser((prev) => ({
      ...prev,
      name: [firstName, lastName].join(" "),
      firstName,
      lastName,
      birthday
    }));
    setIsProfileSubmitting(false);
    closeProfileModal();
  }

  async function createWishlist(rawTitle) {
    if (!currentUser) {
      return;
    }

    const title = String(rawTitle || "").trim();
    if (!title) {
      return;
    }

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        owner_id: currentUser.id,
        title
      })
      .select("id, title, share_token, created_at")
      .single();

    if (error) {
      setWishlistsError("Не удалось создать вишлист.");
      setIsWishlistSubmitting(false);
      return;
    }

    const next = [...wishlists, data];
    setWishlists(next);
    await selectWishlist(data);
    setIsWishlistSubmitting(false);
    window.location.hash = "#/wishlist";
  }

  async function openWishlistFromDashboard(wishlist) {
    await selectWishlist(wishlist);
    window.location.hash = "#/wishlist";
  }

  function requestDeleteWishlist(wishlist) {
    if (!wishlist?.id) {
      return;
    }
    setWishlistToDelete(wishlist);
  }

  function cancelDeleteWishlist() {
    if (isWishlistSubmitting) {
      return;
    }
    setWishlistToDelete(null);
  }

  async function confirmDeleteWishlist() {
    if (!wishlistToDelete?.id || !currentUser) {
      return;
    }

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { error } = await supabase.from("wishlists").delete().eq("id", wishlistToDelete.id);
    if (error) {
      setWishlistsError("Не удалось удалить вишлист.");
      setIsWishlistSubmitting(false);
      return;
    }

    const nextWishlists = wishlists.filter((item) => item.id !== wishlistToDelete.id);
    setWishlists(nextWishlists);

    if (currentWishlistId === wishlistToDelete.id) {
      if (nextWishlists.length > 0) {
        await selectWishlist(nextWishlists[0]);
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
        setWishlistRules(defaultRules.slice(0, 5));
      }
      window.location.hash = "#/dashboard";
    }

    setWishlistToDelete(null);
    setIsWishlistSubmitting(false);
  }

  function onWishInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function onFormSubmit(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (!currentWishlistId) {
      setWishesError("Список подарков еще не готов.");
      return;
    }

    if (!form.title.trim() || !form.note.trim()) {
      return;
    }

    setIsWishSubmitting(true);
    setWishesError("");

    try {
      if (editingWishId) {
        const nextWish = {
          ...createWish(form),
          id: editingWishId
        };

        const { data, error } = await supabase
          .from("wishes")
          .update({
            title: nextWish.title,
            note: nextWish.note,
            tag: nextWish.tag,
            price: nextWish.price,
            url: nextWish.url
          })
          .eq("id", editingWishId)
          .select("id, title, note, tag, price, url")
          .single();

        if (error) {
          throw error;
        }

        setWishes((prev) => prev.map((wish) => (wish.id === editingWishId ? sanitizeWishes([data])[0] : wish)));
        setEditingWishId(null);
      } else {
        const nextWish = createWish(form);
        const { data, error } = await supabase
          .from("wishes")
          .insert({
            ...nextWish,
            wishlist_id: currentWishlistId
          })
          .select("id, wishlist_id, title, note, tag, price, url")
          .single();

        if (error) {
          throw error;
        }

        setWishes((prev) => [sanitizeWishes([data])[0], ...prev]);
      }

      setForm(emptyForm);
      setEditingWishId(null);
      setIsWishEditorOpen(false);
    } catch {
      setWishesError("Не удалось сохранить подарок.");
    } finally {
      setIsWishSubmitting(false);
    }
  }

  async function deleteWish(id) {
    setWishesError("");

    const { error } = await supabase.from("wishes").delete().eq("id", id);
    if (error) {
      setWishesError("Не удалось удалить подарок.");
      return;
    }

    setWishes((prev) => prev.filter((wish) => wish.id !== id));

    setContributions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (editingWishId === id) {
      setEditingWishId(null);
      setForm(emptyForm);
      setIsWishEditorOpen(false);
    }

    if (openedWishId === id) {
      setOpenedWishId(null);
    }

    if (donationWish?.id === id) {
      closeDonationModal();
    }

  }

  function openWishEditModal(wish) {
    setEditingWishId(wish.id);
    setForm(mapWishToForm(wish));
    setIsWishEditorOpen(true);
  }

  function openWishCreateModal() {
    setEditingWishId(null);
    setForm(emptyForm);
    setIsWishEditorOpen(true);
  }

  function closeWishEditorModal() {
    if (isWishSubmitting) {
      return;
    }
    setEditingWishId(null);
    setForm(emptyForm);
    setIsWishEditorOpen(false);
  }

  function openWishModal(wishId) {
    setOpenedWishId(wishId);
  }

  function closeWishModal() {
    setOpenedWishId(null);
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

  function openDashboardPage() {
    window.location.hash = "#/dashboard";
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

  if (isAuthLoading) {
    return null;
  }

  if (!currentUser && page !== "shared") {
    return (
      <AuthPage
        mode={authMode}
        form={authForm}
        error={authError}
        submitting={isAuthSubmitting}
        onModeChange={onAuthModeChange}
        onInputChange={onAuthInputChange}
        onSubmit={submitAuth}
      />
    );
  }

  const activeWishes = page === "shared" ? sharedWishes : wishes;
  const openedWish = activeWishes.find((wish) => wish.id === openedWishId) || null;
  const openedWishTarget = openedWish ? parseTargetFromPrice(openedWish.price) : null;
  const openedWishDonated = openedWish ? getWishDonated(contributions, openedWish.id) : 0;
  const openedWishParticipants = openedWish ? getWishParticipants(contributions, openedWish.id) : [];
  const currentUserName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ").trim() ||
    getUserDisplayName(currentUser);

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
  const isSharedView = page === "shared";
  const openedWishCompleted = Boolean(openedWishTarget) && openedWishDonated >= openedWishTarget;
  const donationWishTarget = donationWish ? parseTargetFromPrice(donationWish.price) : null;
  const donationWishDonated = donationWish ? getWishDonated(contributions, donationWish.id) : 0;
  const donationWishRemaining = donationWishTarget
    ? Math.max(0, donationWishTarget - donationWishDonated)
    : 0;

  const showUserBar = Boolean(currentUser) && page !== "shared";
  const canManage = page === "wishlist";

  return (
    <div className="page-shell">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout">
        {showUserBar ? (
          <div className="auth-userbar">
            {canManage ? (
              <button
                type="button"
                className="header-back-button"
                aria-label="Назад к вишлистам"
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  openDashboardPage();
                }}
              >
                <svg
                  className="header-back-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M11 5L4 12L11 19" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                  <path d="M5 12H20" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}

            <button
              type="button"
              className="auth-userbar-name auth-userbar-name-button"
              onClick={() => {
                setIsHeaderMenuOpen(false);
                openProfileModal();
              }}
            >
              {currentUserName}
            </button>

            <div className="header-menu">
              <button
                type="button"
                className="burger-button"
                aria-label="Открыть меню"
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
              >
                ☰
              </button>

              {isHeaderMenuOpen ? (
                <div className="header-menu-dropdown">
                  {canManage ? (
                    <button
                      type="button"
                      className="header-menu-item"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        copyShareLink();
                      }}
                    >
                      Поделиться ссылкой
                    </button>
                  ) : null}
                  {page !== "dashboard" ? (
                    <button
                      type="button"
                      className="header-menu-item"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openDashboardPage();
                      }}
                    >
                      Мои вишлисты
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      className="header-menu-item"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        openWishCreateModal();
                      }}
                    >
                      Добавить подарок
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="header-menu-item"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      logout();
                    }}
                  >
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showUserBar && shareCopied ? <p className="status-banner">{shareCopied}</p> : null}

        {page === "shared" && sharedError ? <p className="status-banner status-banner-error">{sharedError}</p> : null}
        {page !== "shared" && wishesError ? <p className="status-banner status-banner-error">{wishesError}</p> : null}

        {page === "dashboard" ? (
          <DashboardPage
            wishlists={wishlists}
            currentWishlistId={currentWishlistId}
            isLoading={isWishlistsLoading}
            isSubmitting={isWishlistSubmitting}
            error={wishlistsError}
            onCreateWishlist={createWishlist}
            onOpenWishlist={openWishlistFromDashboard}
            onCopyShareLink={copyWishlistShareLink}
            onDeleteWishlist={requestDeleteWishlist}
          />
        ) : (
          <WishlistPage
            wishes={activeWishes}
            contributions={contributions}
            onOpenWish={openWishModal}
            birthday={page === "shared" ? "" : currentUser?.birthday || ""}
            ownerFirstName={page === "shared" ? "" : currentUser?.firstName || ""}
            canEdit={page !== "shared"}
            rules={page === "shared" ? defaultRules : wishlistRules}
            wishForm={form}
            editingWishId={editingWishId}
            isWishEditorOpen={isWishEditorOpen}
            isWishSubmitting={isWishSubmitting}
            onWishFormChange={onWishInputChange}
            onWishFormSubmit={onFormSubmit}
            onOpenWishCreate={openWishCreateModal}
            onOpenWishEdit={openWishEditModal}
            onCloseWishEditor={closeWishEditorModal}
            onDeleteWish={deleteWish}
            onSaveRules={saveRulesForWishlist}
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
                onClick={() => openDonationModal(openedWish)}
                disabled={openedWishCompleted || isSharedView}
              >
                {isSharedView ? "Только просмотр" : openedWishCompleted ? "Собрано" : "Поучаствовать"}
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

      {isProfileOpen ? (
        <div className="donation-modal-backdrop" onClick={closeProfileModal}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Профиль</h3>
            <p className="donation-modal-title">Редактирование данных аккаунта</p>

            <form className="donation-form" onSubmit={submitProfile}>
              <label>
                Имя
                <input
                  type="text"
                  name="firstName"
                  value={profileForm.firstName}
                  onChange={onProfileInputChange}
                  placeholder="Имя"
                />
              </label>

              <label>
                Фамилия
                <input
                  type="text"
                  name="lastName"
                  value={profileForm.lastName}
                  onChange={onProfileInputChange}
                  placeholder="Фамилия"
                />
              </label>

              <label>
                Дата рождения
                <input
                  type="text"
                  name="birthday"
                  value={profileForm.birthday}
                  onChange={onProfileInputChange}
                  placeholder="ДД-ММ-ГГГГ"
                />
              </label>

              {profileError ? <p className="donation-error">{profileError}</p> : null}

              <div className="donation-actions">
                <button type="button" className="button-secondary" onClick={closeProfileModal}>
                  Отмена
                </button>
                <button type="submit" className="button-primary" disabled={isProfileSubmitting}>
                  {isProfileSubmitting ? "Сохраняем..." : "Сохранить"}
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

      {wishlistToDelete ? (
        <div className="donation-modal-backdrop" onClick={cancelDeleteWishlist}>
          <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Удалить вишлист?</h3>
            <p className="donation-modal-title">
              {`Удалить вишлист "${wishlistToDelete.title}"? Это удалит и все подарки внутри.`}
            </p>

            <div className="donation-actions">
              <button type="button" className="button-secondary" onClick={cancelDeleteWishlist} disabled={isWishlistSubmitting}>
                Отмена
              </button>
              <button type="button" className="delete-button" onClick={confirmDeleteWishlist} disabled={isWishlistSubmitting}>
                {isWishlistSubmitting ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}




