import { useEffect, useState } from "react";
import {
  celebrationOptions,
  defaultWishlistTheme,
  rules as defaultRules,
  emptyAuthForm,
  emptyForm,
  wishlistThemes
} from "./config/constants";
import {
  createWish,
  createShareToken,
  getRouteFromLocation,
  getUserDisplayName,
  getWishDonated,
  getWishParticipants,
  buildSharedWishlistUrl,
  copyTextToClipboard,
  mapWishToForm,
  normalizeRulesList,
  groupReservationsByWish,
  parseDdMmYyyyToStorageDate,
  parseDonationAmount,
  parseTargetFromPrice,
  sanitizeWishes
} from "./lib/helpers";
import { buildAppUser } from "./lib/authUser";
import {
  createWishRecord,
  createWishlistRecord,
  createWishReservationRecord,
  deleteWishRecord,
  deleteWishlistRecord,
  deleteMyWishReservations,
  fetchCurrentUser,
  getOrCreateGuestSessionId,
  setAuthToken,
  loginUser,
  loginWithGoogleCredential,
  logoutUser,
  registerUser,
  fetchReservationsByWishlist,
  fetchSharedReservationsByToken,
  fetchSharedRulesByToken,
  fetchSharedWishlistMetaByToken,
  fetchSharedWishesByToken,
  fetchRulesByWishlist,
  fetchWishlistsByOwner,
  fetchWishesByWishlist,
  updateRulesByWishlist,
  updateWishlistRecord,
  updateWishRecord
} from "./lib/wishlistApi";
import { AuthPage } from "./components/pages/AuthPage";
import { BirthdayPickerModal } from "./components/BirthdayPickerModal";
import { DashboardPage } from "./components/pages/DashboardPage";
import { WishlistPage } from "./components/pages/WishlistPage";
import { UserBar } from "./components/app/UserBar";
import { DeleteWishlistModal } from "./components/modals/DeleteWishlistModal";
import { DonationModal } from "./components/modals/DonationModal";
import { IdentityModal } from "./components/modals/IdentityModal";
import { ProfileModal } from "./components/modals/ProfileModal";
import { WishDetailsModal } from "./components/modals/WishDetailsModal";
import { useAccountPanel } from "./hooks/useAccountPanel";
export default function App() {
  const initialRoute = getRouteFromLocation();
  const [wishes, setWishes] = useState([]);
  const [contributions, setContributions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [isWishlistsLoading, setIsWishlistsLoading] = useState(false);
  const [wishlistsError, setWishlistsError] = useState("");
  const [isWishlistSubmitting, setIsWishlistSubmitting] = useState(false);
  const [wishlistToDelete, setWishlistToDelete] = useState(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [currentWishlistId, setCurrentWishlistId] = useState(null);
  const [currentShareToken, setCurrentShareToken] = useState(null);
  const [sharedWishes, setSharedWishes] = useState([]);
  const [sharedRules, setSharedRules] = useState(defaultRules);
  const [sharedWishlistMeta, setSharedWishlistMeta] = useState(null);
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
  const [donationMode, setDonationMode] = useState("contribute");
  const [donationAmount, setDonationAmount] = useState("");
  const [donationName, setDonationName] = useState("");
  const [donationError, setDonationError] = useState("");
  const [isDonationSubmitting, setIsDonationSubmitting] = useState(false);
  const [guestSessionId] = useState(() => getOrCreateGuestSessionId());
  const siteOrigin = "https://xn--80ajchdgcktejxc.xn--p1ai";
  const {
    isProfileOpen,
    profileForm,
    profileError,
    isProfileSubmitting,
    isIdentitySubmitting,
    isIdentityModalOpen,
    isProfileBirthdayPickerOpen,
    isDeleteAccountConfirmOpen,
    deleteAccountConfirmation,
    isAccountDeleting,
    setProfileError,
    setIsIdentitySubmitting,
    setIsIdentityModalOpen,
    setIsProfileBirthdayPickerOpen,
    setIsDeleteAccountConfirmOpen,
    setDeleteAccountConfirmation,
    refreshCurrentUserIdentities,
    canUnlinkIdentity,
    handleIdentityUnlink,
    startGoogleLink,
    startYandexLink,
    openProfileModal,
    closeProfileModal,
    onProfileInputChange,
    submitProfile,
    deleteAccount
  } = useAccountPanel({
    currentUser,
    setCurrentUser,
    clearAuthenticatedState,
    navigate
  });

  function navigate(path, options = {}) {
    if (typeof window === "undefined") {
      return;
    }

    const nextPath = path || "/";
    if (window.location.pathname === nextPath) {
      return;
    }

    if (options.replace) {
      window.history.replaceState(null, "", nextPath);
    } else {
      window.history.pushState(null, "", nextPath);
    }

    const route = getRouteFromLocation();
    setPage(route.page);
    setShareToken(route.shareToken);
  }

  async function saveRulesForWishlist(nextRules) {
    if (!currentWishlistId) {
      return;
    }
    const normalized = normalizeRulesList(nextRules);
    const { data, error } = await updateRulesByWishlist(currentWishlistId, normalized);
    if (error) {
      setWishesError("Не удалось сохранить пожелания.");
      return;
    }
    setWishlistRules(normalizeRulesList(data));
  }

  async function loadWishlistsForUser() {
    setIsWishlistsLoading(true);
    setWishlistsError("");

    const { data, error } = await fetchWishlistsByOwner();

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

    const { data, error } = await fetchWishesByWishlist(wishlistId);

    if (error) {
      setWishesError("Не удалось загрузить список подарков.");
      setWishes([]);
      return;
    }

    setWishes(sanitizeWishes(data));
  }

  async function loadReservationsForWishlist(wishlistId) {
    if (!wishlistId) {
      setContributions({});
      return;
    }

    const { data, error } = await fetchReservationsByWishlist(wishlistId);
    if (error) {
      setContributions({});
      return;
    }

    setContributions(groupReservationsByWish(data));
  }

  async function loadRulesForWishlist(wishlistId) {
    if (!wishlistId) {
      setWishlistRules(defaultRules.slice(0, 5));
      return;
    }
    const { data, error } = await fetchRulesByWishlist(wishlistId);
    if (error) {
      setWishlistRules(defaultRules.slice(0, 5));
      return;
    }
    setWishlistRules(normalizeRulesList(data));
  }

  async function loadSharedWishes(token) {
    if (!token) {
      setSharedWishes([]);
      setSharedWishlistMeta(null);
      setSharedRules(defaultRules.slice(0, 5));
      setContributions({});
      setSharedError("Некорректная ссылка.");
      return;
    }

    setSharedError("");
    const [
      { data: meta, error: metaError },
      { data, error },
      { data: rulesData, error: rulesError },
      { data: reservations, error: reservationsError }
    ] = await Promise.all([
      fetchSharedWishlistMetaByToken(token),
      fetchSharedWishesByToken(token),
      fetchSharedRulesByToken(token),
      fetchSharedReservationsByToken(token)
    ]);

    if (metaError || !meta) {
      setSharedWishlistMeta(null);
      setSharedWishes([]);
      setSharedRules(defaultRules.slice(0, 5));
      setContributions({});
      setSharedError("Не удалось открыть вишлист по ссылке.");
      return;
    }

    setSharedWishlistMeta(meta);

    if (error) {
      setSharedError("Не удалось открыть вишлист по ссылке.");
      setSharedWishes([]);
      setSharedRules(defaultRules.slice(0, 5));
      setContributions({});
      return;
    }

    const sanitized = sanitizeWishes(data);
    setSharedWishes(sanitized);
    setSharedRules(rulesError ? defaultRules.slice(0, 5) : normalizeRulesList(rulesData));
    setContributions(reservationsError ? {} : groupReservationsByWish(reservations));
  }

  async function copyShareLink() {
    if (!currentWishlistId) {
      return;
    }

    const currentWishlist = wishlists.find((wishlist) => wishlist.id === currentWishlistId) || null;
    const shareToken = await ensureWishlistShareToken(currentWishlist);
    if (!shareToken) {
      setShareCopied("Не удалось подготовить ссылку");
      setTimeout(() => setShareCopied(""), 2000);
      return;
    }

    const url = buildSharedWishlistUrl(shareToken);

    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) {
        throw new Error("copy_failed");
      }
      setShareCopied("Ссылка скопирована");
      setTimeout(() => setShareCopied(""), 1800);
    } catch {
      setShareCopied("Не удалось скопировать ссылку");
      setTimeout(() => setShareCopied(""), 2000);
    }
  }

  async function copyWishlistShareLink(wishlist) {
    if (!wishlist) {
      return;
    }

    const shareToken = await ensureWishlistShareToken(wishlist);
    if (!shareToken) {
      setShareCopied("Не удалось подготовить ссылку");
      setTimeout(() => setShareCopied(""), 2000);
      return;
    }

    const url = buildSharedWishlistUrl(shareToken);
    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) {
        throw new Error("copy_failed");
      }
      setShareCopied("Ссылка скопирована");
      setTimeout(() => setShareCopied(""), 1800);
    } catch {
      setShareCopied("Не удалось скопировать ссылку");
      setTimeout(() => setShareCopied(""), 2000);
    }
  }

  async function ensureWishlistShareToken(wishlist) {
    if (!wishlist?.id) {
      return null;
    }

    if (wishlist.share_token) {
      return wishlist.share_token;
    }

    const nextToken = createShareToken();
    const { data, error } = await updateWishlistRecord(wishlist.id, { share_token: nextToken });

    if (error || !data?.share_token) {
      return null;
    }

    setWishlists((prev) => prev.map((item) => (item.id === wishlist.id ? data : item)));

    if (currentWishlistId === wishlist.id) {
      setCurrentShareToken(data.share_token);
    }

    return data.share_token;
  }

  async function selectWishlist(wishlist) {
    if (!wishlist?.id) {
      return;
    }
    setCurrentWishlistId(wishlist.id);
    setCurrentShareToken(wishlist.share_token || null);
    await Promise.all([loadWishes(wishlist.id), loadReservationsForWishlist(wishlist.id), loadRulesForWishlist(wishlist.id)]);
  }

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data: sessionUser } = await fetchCurrentUser();

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

      const appUser = buildAppUser(sessionUser);
      setCurrentUser(appUser);

      const lists = await loadWishlistsForUser();
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
      setIsAuthLoading(false);
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleLocationChange() {
      const route = getRouteFromLocation();
      setPage(route.page);
      setShareToken(route.shareToken);
    }

    window.addEventListener("popstate", handleLocationChange);

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (page === "wishlist" && !currentWishlistId) {
      navigate("/dashboard", { replace: true });
    }
  }, [page, currentWishlistId, currentUser]);

  useEffect(() => {
    if (isAuthLoading || currentUser || page === "shared" || page === "landing") {
      return;
    }

    navigate("/", { replace: true });
  }, [currentUser, isAuthLoading, page]);

  useEffect(() => {
    if (page !== "shared") {
      return;
    }
    loadSharedWishes(shareToken);
  }, [page, shareToken]);

  useEffect(() => {
    setIsHeaderMenuOpen(false);
  }, [page]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const seo = {
      title: "Wishlist - вишлист для подарков на день рождения, свадьбу и праздники",
      description:
        "Создайте вишлист подарков для дня рождения, свадьбы, новоселья и других событий. Делитесь одной ссылкой, собирайте совместные подарки и избавьтесь от путаницы с выбором подарков.",
      robots: "index,follow,max-image-preview:large",
      canonical: `${siteOrigin}/`
    };

    if (page === "dashboard") {
      seo.title = "Мои вишлисты - Wishlist";
      seo.description = "Личный кабинет сервиса Wishlist.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/dashboard`;
    } else if (page === "wishlist") {
      seo.title = "Редактирование вишлиста - Wishlist";
      seo.description = "Управление вашим списком подарков в сервисе Wishlist.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/wishlist`;
    } else if (page === "shared") {
      seo.title = sharedWishlistMeta?.title
        ? `${sharedWishlistMeta.title} - Wishlist`
        : "Вишлист по ссылке - Wishlist";
      seo.description = sharedWishlistMeta?.title
        ? `Публичная ссылка на вишлист "${sharedWishlistMeta.title}" в сервисе Wishlist.`
        : "Публичная ссылка на вишлист в сервисе Wishlist.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/shared/${shareToken || ""}`;
    } else if (page === "yandex-callback") {
      seo.title = "Вход через Яндекс - Wishlist";
      seo.description = "Служебная страница авторизации Wishlist.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/auth/yandex/callback`;
    }

    document.title = seo.title;

    const mappings = [
      ['meta[name="description"]', "content", seo.description],
      ['meta[name="robots"]', "content", seo.robots],
      ['link[rel="canonical"]', "href", seo.canonical],
      ['meta[property="og:title"]', "content", seo.title],
      ['meta[property="og:description"]', "content", seo.description],
      ['meta[property="og:url"]', "content", seo.canonical],
      ['meta[name="twitter:title"]', "content", seo.title],
      ['meta[name="twitter:description"]', "content", seo.description]
    ];

    mappings.forEach(([selector, attribute, value]) => {
      const node = document.querySelector(selector);
      if (node && value) {
        node.setAttribute(attribute, value);
      }
    });
  }, [page, shareToken, sharedWishlistMeta, siteOrigin]);

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

  function resetAuthError() {
    setAuthError("");
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

        const { data, error } = await registerUser({
          email,
          password,
          firstName,
          lastName,
          birthday
        });

        if (error) {
          throw new Error(error.message);
        }
        setCurrentUser(buildAppUser(data));
      } else {
        const { data, error } = await loginUser({
          email,
          password
        });
        if (error) {
          throw new Error("Неверный email или пароль.");
        }
        setCurrentUser(buildAppUser(data));
      }

      const current = await fetchCurrentUser();
      const user = current.data ? buildAppUser(current.data) : null;
      if (!user) {
        throw new Error("Не удалось получить пользователя.");
      }
      setCurrentUser(user);

      const lists = await loadWishlistsForUser();
      if (lists.length > 0) {
        await selectWishlist(lists[0]);
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
      }

      navigate("/dashboard");
      setAuthForm(emptyAuthForm);
    } catch (error) {
      setAuthError(error.message || "Ошибка авторизации.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function submitGoogleAuth(credential) {
    setAuthError("");
    setIsAuthSubmitting(true);

    try {
      if (!credential) {
        throw new Error("Google не вернул токен входа.");
      }

      const { error } = await loginWithGoogleCredential(credential);
      if (error) {
        throw new Error("Не удалось войти через Google.");
      }

      const current = await fetchCurrentUser();
      const user = current.data ? buildAppUser(current.data) : null;
      if (!user) {
        throw new Error("Не удалось получить пользователя.");
      }
      setCurrentUser(user);

      const lists = await loadWishlistsForUser();
      if (lists.length > 0) {
        await selectWishlist(lists[0]);
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
      }

      navigate("/dashboard");
      setAuthForm(emptyAuthForm);
    } catch (error) {
      setAuthError(error.message || "Ошибка входа через Google.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function completeYandexAuth(token) {
    setAuthError("");
    setIsAuthSubmitting(true);

    try {
      if (!token) {
        throw new Error("Яндекс не вернул локальную сессию.");
      }

      setAuthToken(token);

      const current = await fetchCurrentUser();
      const user = current.data ? buildAppUser(current.data) : null;
      if (!user) {
        throw new Error("Не удалось получить пользователя.");
      }
      setCurrentUser(user);

      const lists = await loadWishlistsForUser();
      if (lists.length > 0) {
        await selectWishlist(lists[0]);
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
      }

      navigate("/dashboard");
      setAuthForm(emptyAuthForm);
    } catch (error) {
      setAuthError(error.message || "Ошибка входа через Яндекс.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  useEffect(() => {
    if (page !== "yandex-callback" || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    const linked = params.get("linked");

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "wishlist:yandex-auth-result",
          token,
          error,
          linked
        },
        window.location.origin
      );
      window.close();
      return;
    }

    if (token || linked) {
      setAuthError("");
    } else if (error) {
      setAuthError("Не удалось войти через Яндекс.");
    }

    navigate("/dashboard", { replace: true });
  }, [page]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    async function handleAuthMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (payload?.type !== "wishlist:yandex-auth-result" || payload.linked !== "yandex") {
        return;
      }

      setIsIdentitySubmitting(false);

      if (payload.error) {
        setProfileError(
          payload.error === "identity_link_conflict"
            ? "Этот Яндекс-аккаунт уже привязан к другому профилю."
            : "Не удалось привязать Яндекс."
        );
        return;
      }

      try {
        await refreshCurrentUserIdentities();
      } catch (error) {
        setProfileError(error.message || "Не удалось обновить способы входа.");
      }
    }

    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [currentUser]);

  async function logout() {
    await logoutUser();
    clearAuthenticatedState();
    navigate("/", { replace: true });
  }

  function clearAuthenticatedState() {
    setCurrentUser(null);
    setWishlists([]);
    setCurrentWishlistId(null);
    setCurrentShareToken(null);
    setWishes([]);
    setContributions({});
    setWishlistRules(defaultRules.slice(0, 5));
    setSharedWishes([]);
    setSharedWishlistMeta(null);
    setSharedRules(defaultRules.slice(0, 5));
    setShareCopied("");
    setWishesError("");
    setProfileError("");
    setWishlistToDelete(null);
    setIsHeaderMenuOpen(false);
    setIsProfileOpen(false);
    setIsDeleteAccountConfirmOpen(false);
    setDeleteAccountConfirmation("");
    setPage("landing");
    setShareToken(null);
  }

  async function createWishlist(payload) {
    if (!currentUser) {
      return false;
    }

    const title = String(payload?.title || "").trim();
    const celebrationType = String(payload?.celebrationType || "birthday");
    const customCelebration = String(payload?.customCelebration || "").trim();
    const eventDate = String(payload?.eventDate || "").trim();

    if (!title) {
      return false;
    }
    if (celebrationType === "custom" && !customCelebration) {
      setWishlistsError("Укажи свой вариант праздника.");
      return false;
    }
    if (celebrationType !== "birthday" && !eventDate) {
      setWishlistsError("Укажи дату события.");
      return false;
    }

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { data, error } = await createWishlistRecord({
      owner_id: currentUser.id,
      title,
      celebration_type: celebrationType,
      custom_celebration: celebrationType === "custom" ? customCelebration : null,
      event_date: celebrationType === "birthday" ? null : eventDate,
      theme: defaultWishlistTheme
    });

    if (error) {
      setWishlistsError("Не удалось создать вишлист.");
      setIsWishlistSubmitting(false);
      return false;
    }

    const next = [...wishlists, data];
    setWishlists(next);
    await selectWishlist(data);
    setIsWishlistSubmitting(false);
    navigate("/wishlist");
    return true;
  }

  async function updateWishlist(wishlistId, payload) {
    if (!currentUser || !wishlistId) {
      return false;
    }

    const title = String(payload?.title || "").trim();
    const celebrationType = String(payload?.celebrationType || "birthday");
    const customCelebration = String(payload?.customCelebration || "").trim();
    const eventDate = String(payload?.eventDate || "").trim();
    const theme = String(payload?.theme || defaultWishlistTheme).trim();

    if (!title) {
      return false;
    }
    if (celebrationType === "custom" && !customCelebration) {
      setWishlistsError("Укажи свой вариант праздника.");
      return false;
    }
    if (celebrationType !== "birthday" && !eventDate) {
      setWishlistsError("Укажи дату события.");
      return false;
    }

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { data, error } = await updateWishlistRecord(wishlistId, {
      title,
      celebration_type: celebrationType,
      custom_celebration: celebrationType === "custom" ? customCelebration : null,
      event_date: celebrationType === "birthday" ? null : eventDate,
      theme
    });

    if (error || !data) {
      setWishlistsError("Не удалось сохранить вишлист.");
      setIsWishlistSubmitting(false);
      return false;
    }

    setWishlists((prev) => prev.map((item) => (item.id === wishlistId ? { ...item, ...data } : item)));

    if (currentWishlistId === wishlistId) {
      setCurrentShareToken(data.share_token || null);
    }

    setIsWishlistSubmitting(false);
    return true;
  }

  async function saveCurrentWishlistSettings(payload) {
    if (!currentWishlistId) {
      return false;
    }

    return updateWishlist(currentWishlistId, payload);
  }

  async function openWishlistFromDashboard(wishlist) {
    await selectWishlist(wishlist);
    navigate("/wishlist");
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

    const { error } = await deleteWishlistRecord(wishlistToDelete.id);
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
      navigate("/dashboard");
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

        const { data, error } = await updateWishRecord(editingWishId, {
          title: nextWish.title,
          note: nextWish.note,
          tag: nextWish.tag,
          price: nextWish.price,
          url: nextWish.url
        });

        if (error) {
          throw error;
        }

        setWishes((prev) => prev.map((wish) => (wish.id === editingWishId ? sanitizeWishes([data])[0] : wish)));
        setEditingWishId(null);
      } else {
        const nextWish = createWish(form);
        const { data, error } = await createWishRecord({
          ...nextWish,
          wishlist_id: currentWishlistId
        });

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

    const { error } = await deleteWishRecord(id);
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

  function openDonationModal(wish, mode = "contribute") {
    setDonationWish(wish);
    setDonationMode(mode);
    setDonationAmount("");
    setDonationName(currentUser ? getUserDisplayName(currentUser) : "");
    setDonationError("");
  }

  function closeDonationModal() {
    setDonationWish(null);
    setDonationMode("contribute");
    setDonationAmount("");
    setDonationName("");
    setDonationError("");
    setIsDonationSubmitting(false);
  }

  function appendContributionEntry(wishId, entry) {
    setContributions((prev) => ({
      ...prev,
      [wishId]: [
        ...(prev[wishId] || []),
        {
          name: entry.contributor_name,
          userId: entry.contributor_user_id || null,
          guestSessionId: entry.guest_session_id || null,
          amount: Number(entry.amount),
          at: entry.created_at || new Date().toISOString()
        }
      ]
    }));
  }

  async function submitDonation(event) {
    event.preventDefault();

    if (!donationWish) {
      return;
    }

    const contributorName = currentUser ? getUserDisplayName(currentUser) : donationName.trim();
    if (!contributorName) {
      setDonationError("Укажи имя.");
      return;
    }

    const amount = parseDonationAmount(donationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDonationError("Введите корректную сумму больше 0.");
      return;
    }

    setIsDonationSubmitting(true);
    setDonationError("");

    const wishlistId = page === "shared" ? sharedWishlistMeta?.id : currentWishlistId;
    const { data, error } = await createWishReservationRecord({
      wish_id: donationWish.id,
      wishlist_id: wishlistId,
      contributor_name: contributorName,
      contributor_user_id: currentUser?.id || null,
      amount
    });

    if (error || !data) {
      setDonationError("Не удалось сохранить участие.");
      setIsDonationSubmitting(false);
      return;
    }

    appendContributionEntry(donationWish.id, data);

    closeDonationModal();
  }

  async function submitReservation(event) {
    event.preventDefault();

    if (!donationWish) {
      return;
    }

    const contributorName = donationName.trim();
    if (!contributorName) {
      setDonationError("Укажи имя.");
      return;
    }

    const target = parseTargetFromPrice(donationWish.price);
    if (!target) {
      setDonationError("Нельзя забронировать полностью: у подарка не указана сумма.");
      return;
    }

    const donated = getWishDonated(contributions, donationWish.id);
    const remaining = target - donated;
    if (remaining <= 0) {
      setDonationError("Этот подарок уже полностью собран.");
      return;
    }

    setIsDonationSubmitting(true);
    setDonationError("");

    const wishlistId = page === "shared" ? sharedWishlistMeta?.id : currentWishlistId;
    const { data, error } = await createWishReservationRecord({
      wish_id: donationWish.id,
      wishlist_id: wishlistId,
      contributor_name: contributorName,
      contributor_user_id: currentUser?.id || null,
      amount: remaining
    });

    if (error || !data) {
      setDonationError("Не удалось сохранить бронь.");
      setIsDonationSubmitting(false);
      return;
    }

    appendContributionEntry(donationWish.id, data);

    closeDonationModal();
  }

  async function donateFullRemaining() {
    if (!donationWish) {
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

    const contributorName = currentUser ? getUserDisplayName(currentUser) : donationName.trim();
    if (!contributorName) {
      setDonationError("Укажи имя.");
      return;
    }

    setIsDonationSubmitting(true);
    setDonationError("");

    const wishlistId = page === "shared" ? sharedWishlistMeta?.id : currentWishlistId;
    const { data, error } = await createWishReservationRecord({
      wish_id: donationWish.id,
      wishlist_id: wishlistId,
      contributor_name: contributorName,
      contributor_user_id: currentUser?.id || null,
      amount: remaining
    });

    if (error || !data) {
      setDonationError("Не удалось сохранить участие.");
      setIsDonationSubmitting(false);
      return;
    }

    appendContributionEntry(donationWish.id, data);

    closeDonationModal();
  }

  function openDashboardPage() {
    navigate("/dashboard");
  }

  function removeMyParticipation(wishId) {
    if (!currentUser && !guestSessionId) {
      return;
    }

    deleteMyWishReservations(wishId)
      .then(({ error }) => {
        if (error) {
          return;
        }

        setContributions((prev) => {
          const currentEntries = prev[wishId] || [];
          const nextEntries = currentUser
            ? currentEntries.filter((entry) => entry.userId !== currentUser.id)
            : currentEntries.filter((entry) => entry.guestSessionId !== guestSessionId);
          const next = { ...prev };

          if (nextEntries.length > 0) {
            next[wishId] = nextEntries;
          } else {
            delete next[wishId];
          }

          return next;
        });
      })
      .catch(() => {});
  }

  if (isAuthLoading) {
    return null;
  }

  if (page === "yandex-callback") {
    return (
      <div className="page-shell auth-shell landing-shell">
        <main className="layout auth-layout">
          <section className="auth-card">
            <h2 className="auth-title">Вход через Яндекс</h2>
            <p className="auth-subtitle">Можно закрыть это окно.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!currentUser && page !== "shared" && page !== "landing") {
    return (
      <AuthPage
        mode={authMode}
        form={authForm}
        error={authError}
        submitting={isAuthSubmitting}
        onModeChange={onAuthModeChange}
        onErrorReset={resetAuthError}
        onInputChange={onAuthInputChange}
        onSubmit={submitAuth}
        onGoogleAuth={submitGoogleAuth}
        onYandexAuth={completeYandexAuth}
      />
    );
  }

  if (page === "landing") {
    return (
      <AuthPage
        mode={authMode}
        form={authForm}
        error={authError}
        submitting={isAuthSubmitting}
        onModeChange={onAuthModeChange}
        onErrorReset={resetAuthError}
        onInputChange={onAuthInputChange}
        onSubmit={submitAuth}
        onGoogleAuth={submitGoogleAuth}
        onYandexAuth={completeYandexAuth}
      />
    );
  }

  const activeWishes = page === "shared" ? sharedWishes : wishes;
  const currentWishlist = wishlists.find((wishlist) => wishlist.id === currentWishlistId) || null;
  const openedWish = activeWishes.find((wish) => wish.id === openedWishId) || null;
  const openedWishTarget = openedWish ? parseTargetFromPrice(openedWish.price) : null;
  const openedWishDonated = openedWish ? getWishDonated(contributions, openedWish.id) : 0;
  const openedWishParticipants = openedWish ? getWishParticipants(contributions, openedWish.id) : [];
  const currentUserName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ").trim() ||
    getUserDisplayName(currentUser);
  const currentCelebrationType = currentWishlist?.celebration_type || "birthday";
  const sharedCelebrationType = sharedWishlistMeta?.celebration_type || "birthday";
  const celebrationTitle =
    currentCelebrationType === "custom"
      ? currentWishlist?.custom_celebration || "Мой праздник"
      : celebrationOptions.find((item) => item.value === currentCelebrationType)?.label || "Мой день рождения";
  const sharedCelebrationTitle =
    sharedCelebrationType === "custom"
      ? sharedWishlistMeta?.custom_celebration || "Мой праздник"
      : celebrationOptions.find((item) => item.value === sharedCelebrationType)?.label || "Мой день рождения";
  const countdownDate = currentCelebrationType === "birthday" ? currentUser?.birthday || "" : currentWishlist?.event_date || "";
  const sharedCountdownDate =
    sharedCelebrationType === "birthday" ? sharedWishlistMeta?.owner_birthday || "" : sharedWishlistMeta?.event_date || "";
  const sharedOwnerFirstName = sharedWishlistMeta?.owner_first_name || "";
  const activeWishlistThemeId =
    page === "shared"
      ? sharedWishlistMeta?.theme || defaultWishlistTheme
      : page === "wishlist"
        ? currentWishlist?.theme || defaultWishlistTheme
        : defaultWishlistTheme;
  const activeWishlistTheme = wishlistThemes.find((theme) => theme.value === activeWishlistThemeId) || wishlistThemes[0];
  const pageShellStyle = page === "wishlist" || page === "shared" ? activeWishlistTheme.vars : undefined;

  function isCurrentUserParticipant(person) {
    if (currentUser && person.userId && currentUser.id) {
      return person.userId === currentUser.id;
    }

    if (!currentUser && guestSessionId && person.guestSessionId) {
      return person.guestSessionId === guestSessionId;
    }

    return Boolean(currentUser) && person.name === currentUserName;
  }
  const openedWishProgressPercent = openedWishTarget
    ? Math.min(100, Math.round((openedWishDonated / openedWishTarget) * 100))
    : 0;
  const isSharedView = page === "shared";
  const donationWishTarget = donationWish ? parseTargetFromPrice(donationWish.price) : null;
  const donationWishDonated = donationWish ? getWishDonated(contributions, donationWish.id) : 0;
  const donationWishRemaining = donationWishTarget
    ? Math.max(0, donationWishTarget - donationWishDonated)
    : 0;

  const showUserBar = Boolean(currentUser) && page !== "shared";
  const canManage = page === "wishlist";

  return (
    <div className="page-shell" style={pageShellStyle}>
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout">
        {showUserBar ? (
          <UserBar
            canManage={canManage}
            showDashboardLink={page !== "dashboard"}
            currentUserName={currentUserName}
            isHeaderMenuOpen={isHeaderMenuOpen}
            onOpenProfile={() => {
              setIsHeaderMenuOpen(false);
              openProfileModal();
            }}
            onToggleHeaderMenu={() => setIsHeaderMenuOpen((prev) => !prev)}
            onOpenDashboard={() => {
              setIsHeaderMenuOpen(false);
              openDashboardPage();
            }}
            onCopyShareLink={() => {
              setIsHeaderMenuOpen(false);
              copyShareLink();
            }}
            onOpenWishCreate={() => {
              setIsHeaderMenuOpen(false);
              openWishCreateModal();
            }}
            onLogout={() => {
              setIsHeaderMenuOpen(false);
              logout();
            }}
          />
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
            currentWishlist={currentWishlist}
            onOpenWish={openWishModal}
            countdownDate={page === "shared" ? sharedCountdownDate : countdownDate}
            isRecurringEvent={page === "shared" ? sharedCelebrationType === "birthday" : currentCelebrationType === "birthday"}
            eventTitle={page === "shared" ? sharedCelebrationTitle : celebrationTitle}
            ownerFirstName={page === "shared" ? sharedOwnerFirstName : currentUser?.firstName || ""}
            canEdit={page !== "shared"}
            isWishlistSubmitting={isWishlistSubmitting}
            wishlistSettingsError={wishlistsError}
            rules={page === "shared" ? sharedRules : wishlistRules}
            wishForm={form}
            editingWishId={editingWishId}
            isWishEditorOpen={isWishEditorOpen}
            isWishSubmitting={isWishSubmitting}
            onWishlistSettingsSubmit={saveCurrentWishlistSettings}
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
        <WishDetailsModal
          wish={openedWish}
          progressPercent={openedWishProgressPercent}
          target={openedWishTarget}
          donated={openedWishDonated}
          participants={openedWishParticipants}
          isCurrentUserParticipant={isCurrentUserParticipant}
          onRemoveMyParticipation={removeMyParticipation}
          onOpenReservation={() => openDonationModal(openedWish, "reserve")}
          onOpenContribution={() => openDonationModal(openedWish, "contribute")}
          onClose={closeWishModal}
        />
      ) : null}

      <ProfileModal
        isOpen={isProfileOpen}
        profileForm={profileForm}
        profileError={profileError}
        isProfileSubmitting={isProfileSubmitting}
        isAccountDeleting={isAccountDeleting}
        isDeleteAccountConfirmOpen={isDeleteAccountConfirmOpen}
        deleteAccountConfirmation={deleteAccountConfirmation}
        onClose={closeProfileModal}
        onSubmit={submitProfile}
        onInputChange={onProfileInputChange}
        onOpenBirthdayPicker={() => setIsProfileBirthdayPickerOpen(true)}
        onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
        onToggleDeleteConfirm={() => {
          setIsDeleteAccountConfirmOpen((prev) => !prev);
          setDeleteAccountConfirmation("");
          setProfileError("");
        }}
        onDeleteAccountConfirmationChange={(event) => {
          setDeleteAccountConfirmation(event.target.value);
          if (profileError) {
            setProfileError("");
          }
        }}
        onDeleteAccount={deleteAccount}
      />

      <IdentityModal
        isOpen={isIdentityModalOpen}
        currentUser={currentUser}
        profileError={profileError}
        isProfileSubmitting={isProfileSubmitting}
        isAccountDeleting={isAccountDeleting}
        isIdentitySubmitting={isIdentitySubmitting}
        canUnlinkIdentity={canUnlinkIdentity}
        onClose={() => setIsIdentityModalOpen(false)}
        onStartGoogleLink={startGoogleLink}
        onStartYandexLink={startYandexLink}
        onUnlinkGoogle={() => handleIdentityUnlink("google")}
        onUnlinkYandex={() => handleIdentityUnlink("yandex")}
      />

      <BirthdayPickerModal
        isOpen={isProfileBirthdayPickerOpen}
        value={profileForm.birthday}
        onClose={() => setIsProfileBirthdayPickerOpen(false)}
        onConfirm={(nextValue) => {
          onProfileInputChange({ target: { name: "birthday", value: nextValue } });
          setIsProfileBirthdayPickerOpen(false);
        }}
      />

      <DonationModal
        wish={donationWish}
        mode={donationMode}
        currentUser={currentUser}
        donationName={donationName}
        donationAmount={donationAmount}
        donationError={donationError}
        isDonationSubmitting={isDonationSubmitting}
        target={donationWishTarget}
        remaining={donationWishRemaining}
        onNameChange={(event) => {
          setDonationName(event.target.value);
          if (donationError) {
            setDonationError("");
          }
        }}
        onAmountChange={(event) => {
          setDonationAmount(event.target.value);
          if (donationError) {
            setDonationError("");
          }
        }}
        onDonateFullRemaining={donateFullRemaining}
        onSubmitContribution={submitDonation}
        onSubmitReservation={submitReservation}
        onClose={closeDonationModal}
      />

      <DeleteWishlistModal
        wishlist={wishlistToDelete}
        isSubmitting={isWishlistSubmitting}
        onClose={cancelDeleteWishlist}
        onConfirm={confirmDeleteWishlist}
      />

    </div>
  );
}
