import { useEffect, useRef, useState } from "react";
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
  formatMoney,
  getRouteFromLocation,
  getBirthdayEventDate,
  getLastActiveWishlistId,
  getWishlistEditPath,
  getWishlistEventDate,
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
  setLastActiveWishlistId,
  sanitizeWishes
} from "./lib/helpers";
import { buildAppUser } from "./lib/authUser";
import {
  AUTH_EXPIRED_EVENT,
  AUTH_TOKEN_KEY,
  copyUnreservedWishesToWishlist,
  createWishRecord,
  createWishlistRecord,
  createWishReservationRecord,
  deleteWishRecord,
  deleteWishlistRecord,
  deleteMyWishReservations,
  fetchCurrentUser,
  fetchWishPreviewImage,
  getOrCreateGuestSessionId,
  resetGuestSessionId,
  setAuthToken,
  loginUser,
  loginWithGoogleCredential,
  logoutUser,
  registerUser,
  changeUserPassword,
  verifyUserPassword,
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
import { AuthFormCard } from "./components/auth/AuthFormCard";
import { AuthModal } from "./components/auth/AuthModal";
import { AuthPage } from "./components/pages/AuthPage";
import { BirthdayPickerModal } from "./components/BirthdayPickerModal";
import { DashboardPage } from "./components/pages/DashboardPage";
import { WishlistPage } from "./components/pages/WishlistPage";
import { UserBar } from "./components/app/UserBar";
import { DeleteWishlistModal } from "./components/modals/DeleteWishlistModal";
import { DonationModal } from "./components/modals/DonationModal";
import { IdentityModal } from "./components/modals/IdentityModal";
import { ProfileModal } from "./components/modals/ProfileModal";
import { ShareSheetModal } from "./components/modals/ShareSheetModal";
import { WishDetailsModal } from "./components/modals/WishDetailsModal";
import { NotFoundPage } from "./components/pages/NotFoundPage";
import { seoLandingPageMap, seoSite } from "./config/seoPages";
import { useAccountPanel } from "./hooks/useAccountPanel";
import { useAuthModalBehavior } from "./hooks/useAuthModalBehavior";
import { useGoogleIdentity } from "./hooks/useGoogleIdentity";
import { useYandexAuth } from "./hooks/useYandexAuth";
export default function App({ initialRouteOverride = null }) {
  const initialRoute = initialRouteOverride || getRouteFromLocation();
  const emptyDashboardStats = [
    { value: "0", label: "Всего списков" },
    { value: "0", label: "Всего подарков" },
    { value: "Нет данных", label: "Самый дорогой подарок" },
    { value: "Нет данных", label: "Средняя цена подарка" },
    { value: "0 ₽", label: "Сколько забронировано денег" },
    { value: "0", label: "Сколько забронировано подарков полностью" }
  ];
  const [wishes, setWishes] = useState([]);
  const [contributions, setContributions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(emptyDashboardStats);
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shareSheetWishlist, setShareSheetWishlist] = useState(null);
  const [shareSheetUrl, setShareSheetUrl] = useState("");
  const [isShareSheetQrVisible, setIsShareSheetQrVisible] = useState(false);
  const [isWishSubmitting, setIsWishSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isSharedAuthModalOpen, setIsSharedAuthModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingWishId, setEditingWishId] = useState(null);
  const [isWishEditorOpen, setIsWishEditorOpen] = useState(false);
  const [wishlistRules, setWishlistRules] = useState(defaultRules);
  const [page, setPage] = useState(initialRoute.page);
  const [shareToken, setShareToken] = useState(initialRoute.shareToken);
  const [wishlistRouteId, setWishlistRouteId] = useState(initialRoute.wishlistId || null);
  const [seoPageKey, setSeoPageKey] = useState(initialRoute.seoPageKey || "home");
  const [wishPreviewImages, setWishPreviewImages] = useState({});

  const [openedWishId, setOpenedWishId] = useState(null);
  const [donationWish, setDonationWish] = useState(null);
  const [donationMode, setDonationMode] = useState("contribute");
  const [donationAmount, setDonationAmount] = useState("");
  const [donationName, setDonationName] = useState("");
  const [donationContact, setDonationContact] = useState("");
  const [isDonationCoordinatorConfirmed, setIsDonationCoordinatorConfirmed] = useState(false);
  const [isDonationNameInvalid, setIsDonationNameInvalid] = useState(false);
  const [isDonationAmountInvalid, setIsDonationAmountInvalid] = useState(false);
  const [isDonationContactInvalid, setIsDonationContactInvalid] = useState(false);
  const [isDonationCoordinatorConfirmInvalid, setIsDonationCoordinatorConfirmInvalid] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [isDonationSubmitting, setIsDonationSubmitting] = useState(false);
  const [guestSessionId, setGuestSessionId] = useState(() => getOrCreateGuestSessionId());
  const toastTimeoutRef = useRef(null);
  const authExpiryHandledRef = useRef(false);
  const sharedAuthModalRef = useRef(null);
  const wishPreviewRequestsRef = useRef(new Set());
  const siteOrigin = seoSite.origin;
  const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
  const yandexClientId = import.meta.env?.VITE_YANDEX_CLIENT_ID || "";
  const { googleButtonRef } = useGoogleIdentity({
    googleClientId,
    onGoogleAuth: submitGoogleAuth,
    isAuthModalOpen: isSharedAuthModalOpen
  });
  const { openYandexAuth } = useYandexAuth({
    onYandexAuth: completeYandexAuth,
    onYandexError: () => onAuthModeChange("login")
  });

  useAuthModalBehavior({
    isOpen: isSharedAuthModalOpen,
    submitting: isAuthSubmitting,
    modalRef: sharedAuthModalRef,
    onClose: closeSharedAuthModal
  });

  useEffect(() => {
    if (page !== "shared" && isSharedAuthModalOpen) {
      setIsSharedAuthModalOpen(false);
    }
  }, [isSharedAuthModalOpen, page]);

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
    setWishlistRouteId(route.wishlistId || null);
    setSeoPageKey(route.seoPageKey || "home");
  }

  function showToast(message, tone = "success", duration = 2000) {
    if (!message) {
      return;
    }

    setToast({ message, tone });

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, duration);
  }

  async function continueAuthenticatedFromLanding() {
    const { data: sessionUser, error } = await fetchCurrentUser();

    if (error || !sessionUser) {
      return false;
    }

    const appUser = buildAppUser(sessionUser);
    setCurrentUser(appUser);

    const lists = await loadWishlistsForUser();
    if (lists.length > 0) {
      await selectWishlist(lists[0]);
    } else {
      setCurrentWishlistId(null);
      setCurrentShareToken(null);
      setWishes([]);
      setWishlistRules(defaultRules.slice(0, 5));
    }

    navigate("/dashboard");
    return true;
  }

  function handleUnauthorizedSession() {
    if (authExpiryHandledRef.current) {
      return;
    }

    authExpiryHandledRef.current = true;
    clearAuthenticatedState();
    navigate("/", { replace: true });
    showToast("Сессия истекла. Войдите снова.", "error", 3000);
  }

  async function hydrateSession({ withWishlistSelection = true } = {}) {
    const { data: sessionUser } = await fetchCurrentUser();

    if (!sessionUser) {
      setCurrentUser(null);
      setWishlists([]);
      setDashboardStats(emptyDashboardStats);
      setCurrentWishlistId(null);
      setCurrentShareToken(null);
      setWishes([]);
      setWishlistRules(defaultRules.slice(0, 5));
      return null;
    }

    const appUser = buildAppUser(sessionUser);
    setCurrentUser(appUser);

    const lists = await loadWishlistsForUser();

    if (page === "wishlist") {
      if (lists.length === 0) {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
        setWishlistRules(defaultRules.slice(0, 5));
      }
    } else if (withWishlistSelection && lists.length > 0) {
      await selectWishlist(lists[0]);
    } else if (lists.length === 0) {
      setCurrentWishlistId(null);
      setCurrentShareToken(null);
      setWishes([]);
      setWishlistRules(defaultRules.slice(0, 5));
    }

    return appUser;
  }

  async function saveRulesForWishlist(nextRules) {
    if (!currentWishlistId) {
      return;
    }
    const normalized = normalizeRulesList(nextRules);
    const { data, error } = await updateRulesByWishlist(currentWishlistId, normalized);
    if (error) {
      showToast("Не удалось сохранить пожелания.", "error");
      return;
    }
    setWishlistRules(normalizeRulesList(data));
  }

  async function loadDashboardStats(nextWishlists = wishlists) {
    if (!currentUser || !Array.isArray(nextWishlists) || nextWishlists.length === 0) {
      setDashboardStats(emptyDashboardStats);
      return;
    }

    const dashboardData = await Promise.all(
      nextWishlists.map(async (wishlist) => {
        const [{ data: wishlistWishes }, { data: wishlistReservations }] = await Promise.all([
          fetchWishesByWishlist(wishlist.id),
          fetchReservationsByWishlist(wishlist.id)
        ]);

        return {
          wishes: sanitizeWishes(wishlistWishes),
          reservations: groupReservationsByWish(wishlistReservations)
        };
      })
    );

    const allWishes = dashboardData.flatMap((item) => item.wishes);
    const allReservations = dashboardData.reduce((acc, item) => {
      Object.entries(item.reservations).forEach(([wishId, entries]) => {
        acc[wishId] = [...(acc[wishId] || []), ...entries];
      });
      return acc;
    }, {});

    const prices = allWishes
      .map((wish) => parseTargetFromPrice(wish.price))
      .filter((value) => Number.isFinite(value) && value > 0);
    const totalReservedMoney = Object.values(allReservations)
      .flat()
      .reduce((sum, entry) => sum + entry.amount, 0);
    const fullyReservedCount = allWishes.reduce((count, wish) => {
      const target = parseTargetFromPrice(wish.price);
      if (!target) {
        return count;
      }

      return getWishDonated(allReservations, wish.id) >= target ? count + 1 : count;
    }, 0);
    const averagePrice = prices.length > 0 ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    setDashboardStats([
      { value: String(nextWishlists.length), label: "Всего списков" },
      { value: String(allWishes.length), label: "Всего подарков" },
      { value: maxPrice ? `${formatMoney(maxPrice)} ₽` : "Нет данных", label: "Самый дорогой подарок" },
      { value: averagePrice ? `${formatMoney(averagePrice)} ₽` : "Нет данных", label: "Средняя цена подарка" },
      { value: `${formatMoney(totalReservedMoney)} ₽`, label: "Сколько забронировано денег" },
      { value: String(fullyReservedCount), label: "Сколько забронировано подарков полностью" }
    ]);
  }

  async function loadWishlistsForUser() {
    setIsWishlistsLoading(true);
    setWishlistsError("");

    const { data, error } = await fetchWishlistsByOwner();

    if (error) {
      if (error.code === "unauthorized" || error.status === 401) {
        setWishlists([]);
        setDashboardStats(emptyDashboardStats);
        setIsWishlistsLoading(false);
        return [];
      }
      setWishlistsError("Не удалось загрузить вишлисты.");
      setWishlists([]);
      setDashboardStats(emptyDashboardStats);
      setIsWishlistsLoading(false);
      return [];
    }

    setWishlists(data || []);
    await loadDashboardStats(data || []);
    setIsWishlistsLoading(false);
    return data || [];
  }

  async function loadWishes(wishlistId) {
    const { data, error } = await fetchWishesByWishlist(wishlistId);

    if (error) {
      if (error.code === "unauthorized" || error.status === 401) {
        setWishes([]);
        return;
      }
      showToast("Не удалось загрузить список подарков.", "error");
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
      showToast("Некорректная ссылка.", "error");
      return;
    }

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
      showToast("Не удалось открыть вишлист по ссылке.", "error");
      return;
    }

    setSharedWishlistMeta(meta);

    if (error) {
      showToast("Не удалось открыть вишлист по ссылке.", "error");
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
      showToast("Не удалось подготовить ссылку", "error");
      return;
    }

    const url = buildSharedWishlistUrl(shareToken);

    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) {
        throw new Error("copy_failed");
      }
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку", "error");
    }
  }

  async function copyWishlistShareLink(wishlist) {
    if (!wishlist) {
      return;
    }

    const shareToken = await ensureWishlistShareToken(wishlist);
    if (!shareToken) {
      showToast("Не удалось подготовить ссылку", "error");
      return;
    }

    const url = buildSharedWishlistUrl(shareToken);
    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) {
        throw new Error("copy_failed");
      }
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку", "error");
    }
  }

  async function openWishlistShareSheet(wishlist) {
    if (!wishlist) {
      return;
    }

    const shareToken = await ensureWishlistShareToken(wishlist);
    if (!shareToken) {
      showToast("Не удалось подготовить ссылку", "error");
      return;
    }

    setShareSheetWishlist(wishlist);
    setShareSheetUrl(buildSharedWishlistUrl(shareToken));
    setIsShareSheetQrVisible(false);
  }

  async function openWishlistByShareLink(event, wishlist) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!wishlist || typeof window === "undefined") {
      return;
    }

    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
      showToast("Браузер заблокировал новую вкладку", "error");
      return;
    }

    const shareToken = await ensureWishlistShareToken(wishlist);
    if (!shareToken) {
      newTab.close();
      showToast("Не удалось подготовить ссылку", "error");
      return;
    }

    const url = buildSharedWishlistUrl(shareToken);
    newTab.location.replace(url);
  }

  function closeShareSheet() {
    setShareSheetWishlist(null);
    setShareSheetUrl("");
    setIsShareSheetQrVisible(false);
  }

  async function copyShareSheetLink() {
    if (!shareSheetUrl) {
      return;
    }

    try {
      const copied = await copyTextToClipboard(shareSheetUrl);
      if (!copied) {
        throw new Error("copy_failed");
      }
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку", "error");
    }
  }

  function openShareRedirect(url) {
    if (!url || typeof window === "undefined") {
      return;
    }

    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.assign(url);
    }
  }

  function shareViaTelegram() {
    if (!shareSheetUrl) {
      return;
    }

    const text = shareSheetWishlist?.title ? `Посмотри мой вишлист: ${shareSheetWishlist.title}` : "Посмотри мой вишлист";
    openShareRedirect(`https://t.me/share/url?url=${encodeURIComponent(shareSheetUrl)}&text=${encodeURIComponent(text)}`);
  }

  function shareViaVk() {
    if (!shareSheetUrl) {
      return;
    }

    const title = shareSheetWishlist?.title ? `Вишлист: ${shareSheetWishlist.title}` : "Вишлист";
    openShareRedirect(`https://vk.com/share.php?url=${encodeURIComponent(shareSheetUrl)}&title=${encodeURIComponent(title)}`);
  }

  function shareViaWhatsapp() {
    if (!shareSheetUrl) {
      return;
    }

    const text = shareSheetWishlist?.title ? `${shareSheetWishlist.title} ${shareSheetUrl}` : shareSheetUrl;
    openShareRedirect(`https://wa.me/?text=${encodeURIComponent(text)}`);
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
      await hydrateSession();
      if (!mounted) {
        return;
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
      setWishlistRouteId(route.wishlistId || null);
      setSeoPageKey(route.seoPageKey || "home");
    }

    window.addEventListener("popstate", handleLocationChange);

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    async function handleStorage(event) {
      if (event.key !== AUTH_TOKEN_KEY) {
        return;
      }

      if (!event.newValue) {
        clearAuthenticatedState();
        return;
      }

      await hydrateSession();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      handleUnauthorizedSession();
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      authExpiryHandledRef.current = false;
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLastActiveWishlistId(null);
      return;
    }

    setLastActiveWishlistId(currentWishlistId);
  }, [currentUser, currentWishlistId]);

  useEffect(() => {
    if (!currentUser || isAuthLoading) {
      return;
    }

    if (page !== "wishlist" || isWishlistsLoading) {
      return;
    }

    if (wishlists.length === 0) {
      if (!currentWishlistId) {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    const resolvedRouteId = wishlistRouteId || getLastActiveWishlistId();
    const matchedWishlist = resolvedRouteId ? wishlists.find((wishlist) => String(wishlist.id) === String(resolvedRouteId)) || null : null;
    const fallbackWishlist = matchedWishlist || wishlists[0];
    const canonicalPath = getWishlistEditPath(fallbackWishlist.id);

    if (wishlistRouteId !== String(fallbackWishlist.id)) {
      navigate(canonicalPath, { replace: true });
    }

    if (currentWishlistId !== fallbackWishlist.id) {
      void selectWishlist(fallbackWishlist);
    }
  }, [currentUser, currentWishlistId, isAuthLoading, isWishlistsLoading, page, wishlistRouteId, wishlists]);

  useEffect(() => {
    if (isAuthLoading || currentUser || page === "shared" || page === "landing" || page === "not-found") {
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
    closeShareSheet();
  }, [page]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const { documentElement, body } = document;
    const prevHtmlBg = documentElement.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    if (page === "dashboard") {
      documentElement.style.backgroundColor = "#eef5fc";
      body.style.backgroundColor = "#eef5fc";
    } else {
      documentElement.style.backgroundColor = "";
      body.style.backgroundColor = "";
    }

    return () => {
      documentElement.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, [page]);

  const activeSeoPage = seoLandingPageMap[seoPageKey] || seoLandingPageMap.home;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const seo = {
      title: activeSeoPage.title,
      description: activeSeoPage.description,
      robots: "index,follow,max-image-preview:large",
      canonical: activeSeoPage.path === "/" ? `${siteOrigin}/` : `${siteOrigin}${activeSeoPage.path}/`
    };

    if (page === "dashboard") {
      seo.title = "Мои вишлисты - Список желаний";
      seo.description = "Личный кабинет сервиса Список желаний.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/dashboard`;
    } else if (page === "wishlist") {
      seo.title = "Редактирование вишлиста - Список желаний";
      seo.description = "Управление вашим списком подарков в сервисе Список желаний.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}${getWishlistEditPath(wishlistRouteId || currentWishlistId)}`;
    } else if (page === "shared") {
      seo.title = sharedWishlistMeta?.title
        ? `${sharedWishlistMeta.title} - Список желаний`
        : "Вишлист по ссылке - Список желаний";
      seo.description = sharedWishlistMeta?.title
        ? `Публичная ссылка на вишлист "${sharedWishlistMeta.title}" в сервисе Список желаний.`
        : "Публичная ссылка на вишлист в сервисе Список желаний.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/shared/${shareToken || ""}`;
    } else if (page === "yandex-callback") {
      seo.title = "Вход через Яндекс - Список желаний";
      seo.description = "Служебная страница авторизации Список желаний.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/auth/yandex/callback`;
    } else if (page === "not-found") {
      seo.title = "404 — Страница не найдена - Список желаний";
      seo.description = "Такой страницы не существует.";
      seo.robots = "noindex,nofollow";
      seo.canonical = `${siteOrigin}/`;
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
  }, [activeSeoPage.description, activeSeoPage.path, activeSeoPage.title, currentWishlistId, page, shareToken, sharedWishlistMeta, siteOrigin, wishlistRouteId]);

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

  function closeSharedAuthModal() {
    if (isAuthSubmitting) {
      return;
    }

    setIsSharedAuthModalOpen(false);
  }

  async function openLandingRegister() {
    if (page === "shared" && currentUser) {
      await continueAuthenticatedFromLanding();
      return;
    }

    setAuthMode("register");
    setAuthError("");
    setAuthForm(emptyAuthForm);

    if (page === "shared") {
      setIsSharedAuthModalOpen(true);
      return;
    }

    navigate("/");
  }

  function resetAuthError() {
    setAuthError("");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function completeAuthSuccess(user) {
    setCurrentUser(user);

    const current = await fetchCurrentUser();
    const normalizedUser = current.data ? buildAppUser(current.data) : null;
    if (!normalizedUser) {
      throw new Error("Не удалось получить пользователя.");
    }
    setCurrentUser(normalizedUser);

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
  }

  async function submitPasswordChange(email) {
    const currentPassword = authForm.currentPassword;
    const nextPassword = authForm.password;
    const confirmPassword = authForm.confirmPassword;

    if (!currentPassword || !nextPassword || !confirmPassword) {
      throw new Error("Заполни все поля для смены пароля.");
    }

    const { error: verifyError } = await verifyUserPassword({
      email,
      currentPassword
    });

    if (verifyError) {
      if (verifyError.code === "user not found") {
        throw new Error("Пользователь с таким email не найден.");
      }
      if (verifyError.code === "password_auth_not_available") {
        throw new Error("Для этого аккаунта вход по паролю не настроен.");
      }
      if (verifyError.code === "invalid current password") {
        throw new Error("Старый пароль указан неверно.");
      }
      throw new Error("Не удалось проверить старый пароль.");
    }

    if (nextPassword.length < 6) {
      throw new Error("Новый пароль должен быть не менее 6 символов.");
    }
    if (currentPassword === nextPassword) {
      throw new Error("Новый пароль должен отличаться от старого.");
    }
    if (nextPassword !== confirmPassword) {
      throw new Error("Новые пароли не совпадают.");
    }

    const { error } = await changeUserPassword({
      email,
      currentPassword,
      newPassword: nextPassword
    });

    if (error) {
      if (error.code === "new password must be at least 6 characters") {
        throw new Error("Новый пароль должен быть не менее 6 символов.");
      }
      if (error.code === "new password must differ from current password") {
        throw new Error("Новый пароль должен отличаться от старого.");
      }
      throw new Error("Не удалось изменить пароль.");
    }

    setAuthMode("login");
    setAuthForm({
      ...emptyAuthForm,
      email
    });
    showToast("Пароль обновлён. Теперь войдите с новым паролем.");
  }

  async function submitAuth(event) {
    event.preventDefault();

    setAuthError("");
    setIsAuthSubmitting(true);

    try {
      const email = authForm.email.trim().toLowerCase();
      const password = authForm.password;

      if (!email) {
        throw new Error("Укажи email.");
      }
      if (!isValidEmail(email)) {
        throw new Error("Укажи корректный email.");
      }
      if (authMode !== "password-change" && !password) {
        throw new Error("Укажи email и пароль.");
      }

      if (authMode === "register") {
        if (password.length < 6) {
          throw new Error("Пароль должен быть не менее 6 символов.");
        }

        const firstName = authForm.firstName.trim();
        const lastName = authForm.lastName.trim();
        const birthday = parseDdMmYyyyToStorageDate(authForm.birthday);
        if (!firstName) {
          throw new Error("Укажи имя.");
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
        await completeAuthSuccess(buildAppUser(data));
      } else if (authMode === "password-change") {
        await submitPasswordChange(email);
      } else {
        const { data, error } = await loginUser({
          email,
          password
        });
        if (error) {
          throw new Error("Неверный email или пароль.");
        }
        await completeAuthSuccess(buildAppUser(data));
      }
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

  useEffect(() => {
    const activeWishesSource = page === "shared" ? sharedWishes : wishes;
    const wishesToPreview = activeWishesSource.filter(
      (wish) =>
        wish?.id &&
        wish?.url &&
        !wish.imageUrl &&
        !Object.prototype.hasOwnProperty.call(wishPreviewImages, wish.id) &&
        !wishPreviewRequestsRef.current.has(wish.id)
    );

    if (wishesToPreview.length === 0) {
      return;
    }

    wishesToPreview.forEach((wish) => {
      wishPreviewRequestsRef.current.add(wish.id);

      void fetchWishPreviewImage(wish.url)
        .then(({ data }) => {
          setWishPreviewImages((prev) => ({ ...prev, [wish.id]: data || null }));
        })
        .finally(() => {
          wishPreviewRequestsRef.current.delete(wish.id);
        });
    });
  }, [page, sharedWishes, wishes, wishPreviewImages]);

  async function logout() {
    await logoutUser();
    clearAuthenticatedState();
    navigate("/", { replace: true });
  }

  function clearAuthenticatedState() {
    setCurrentUser(null);
    setGuestSessionId(resetGuestSessionId());
    setWishlists([]);
    setDashboardStats(emptyDashboardStats);
    setCurrentWishlistId(null);
    setCurrentShareToken(null);
    setWishes([]);
    setContributions({});
    setWishlistRules(defaultRules.slice(0, 5));
    setSharedWishes([]);
    setSharedWishlistMeta(null);
    setSharedRules(defaultRules.slice(0, 5));
    setWishPreviewImages({});
    wishPreviewRequestsRef.current.clear();
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(null);
    setProfileError("");
    setWishlistToDelete(null);
    setIsHeaderMenuOpen(false);
    closeProfileModal();
    setIsDeleteAccountConfirmOpen(false);
    setDeleteAccountConfirmation("");
    setPage("landing");
    setShareToken(null);
    setWishlistRouteId(null);
    setSeoPageKey("home");
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
    const targetEventDate =
      celebrationType === "birthday" ? eventDate || getBirthdayEventDate(currentUser.birthday) : eventDate;

    if (!targetEventDate) {
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
      event_date: targetEventDate,
      theme: defaultWishlistTheme
    });

    if (error) {
      setWishlistsError("Не удалось создать вишлист.");
      setIsWishlistSubmitting(false);
      return false;
    }

    const next = [data, ...wishlists];
    setWishlists(next);
    await loadDashboardStats(next);
    await selectWishlist(data);
    setIsWishlistSubmitting(false);
    navigate(getWishlistEditPath(data.id));
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
    const existingWishlist = wishlists.find((wishlist) => wishlist.id === wishlistId) || null;
    const targetEventDate =
      celebrationType === "birthday"
        ? eventDate || getWishlistEventDate(existingWishlist, currentUser.birthday) || getBirthdayEventDate(currentUser.birthday)
        : eventDate;

    if (!targetEventDate) {
      setWishlistsError("Укажи дату события.");
      return false;
    }

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { data, error } = await updateWishlistRecord(wishlistId, {
      title,
      celebration_type: celebrationType,
      custom_celebration: celebrationType === "custom" ? customCelebration : null,
      event_date: targetEventDate,
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
    navigate(getWishlistEditPath(wishlist?.id));
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

    const deletedWishlistId = wishlistToDelete.id;

    setIsWishlistSubmitting(true);
    setWishlistsError("");

    const { error } = await deleteWishlistRecord(deletedWishlistId);
    if (error) {
      setWishlistsError("Не удалось удалить вишлист.");
      setIsWishlistSubmitting(false);
      return;
    }

    const nextWishlists = wishlists.filter((item) => item.id !== deletedWishlistId);
    setWishlists(nextWishlists);
    await loadDashboardStats(nextWishlists);

    if (shareSheetWishlist?.id === deletedWishlistId) {
      closeShareSheet();
    }

    if (currentWishlistId === deletedWishlistId) {
      setOpenedWishId(null);
      closeDonationModal();
      setEditingWishId(null);
      setForm(emptyForm);
      setIsWishEditorOpen(false);

      if (nextWishlists.length > 0) {
        await selectWishlist(nextWishlists[0]);
        navigate(getWishlistEditPath(nextWishlists[0].id), { replace: true });
      } else {
        setCurrentWishlistId(null);
        setCurrentShareToken(null);
        setWishes([]);
        setWishlistRules(defaultRules.slice(0, 5));
        navigate("/dashboard");
      }
    }

    setWishlistToDelete(null);
    setIsWishlistSubmitting(false);
  }

  async function copyUnreservedWishes(sourceWishlistId, targetWishlistId) {
    if (!sourceWishlistId || !targetWishlistId || sourceWishlistId === targetWishlistId) {
      showToast("Выбери другой вишлист.", "error");
      return false;
    }

    setIsWishlistSubmitting(true);

    const { data, error } = await copyUnreservedWishesToWishlist(sourceWishlistId, targetWishlistId);

    setIsWishlistSubmitting(false);

    if (error) {
      showToast("Не удалось перенести подарки.", "error");
      return false;
    }

    const copied = Number(data?.copied || 0);
    showToast(copied > 0 ? `Перенесено: ${copied}` : "Нет свободных подарков для переноса");
    return true;
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
      showToast("Список подарков еще не готов.", "error");
      return;
    }

    if (!form.title.trim()) {
      return;
    }

    setIsWishSubmitting(true);

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
          url: nextWish.url,
          image_url: form.imageUrl || null
        });

        if (error) {
          throw error;
        }

        setWishes((prev) => prev.map((wish) => (wish.id === editingWishId ? sanitizeWishes([data])[0] : wish)));
        await loadDashboardStats();
        setEditingWishId(null);
      } else {
        const nextWish = createWish(form);
        const { data, error } = await createWishRecord({
          ...nextWish,
          wishlist_id: currentWishlistId,
          image_url: form.imageUrl || null
        });

        if (error) {
          throw error;
        }

        setWishes((prev) => [sanitizeWishes([data])[0], ...prev]);
        await loadDashboardStats();
      }

      setForm(emptyForm);
      setEditingWishId(null);
      setIsWishEditorOpen(false);
    } catch {
      showToast("Не удалось сохранить подарок.", "error");
    } finally {
      setIsWishSubmitting(false);
    }
  }

  async function deleteWish(id) {
    const { error } = await deleteWishRecord(id);
    if (error) {
      showToast("Не удалось удалить подарок.", "error");
      return;
    }

    setWishes((prev) => prev.filter((wish) => wish.id !== id));

    setContributions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await loadDashboardStats();

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

  useEffect(() => {
    if (!openedWishId || typeof document === "undefined") {
      return undefined;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousTouchAction = body.style.touchAction;
    const previousHtmlOverflow = documentElement.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.touchAction = "none";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.touchAction = previousTouchAction;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [openedWishId]);

  function openDonationModal(wish, mode = "contribute") {
    setDonationWish(wish);
    setDonationMode(mode);
    setDonationAmount("");
    setDonationName(currentUser ? getUserDisplayName(currentUser) : "");
    setDonationContact("");
    setIsDonationCoordinatorConfirmed(false);
    setIsDonationNameInvalid(false);
    setIsDonationAmountInvalid(false);
    setIsDonationContactInvalid(false);
    setIsDonationCoordinatorConfirmInvalid(false);
    setDonationError("");
  }

  function closeDonationModal() {
    setDonationWish(null);
    setDonationMode("contribute");
    setDonationAmount("");
    setDonationName("");
    setDonationContact("");
    setIsDonationCoordinatorConfirmed(false);
    setIsDonationNameInvalid(false);
    setIsDonationAmountInvalid(false);
    setIsDonationContactInvalid(false);
    setIsDonationCoordinatorConfirmInvalid(false);
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
          contact: entry.contributor_contact || "",
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
      setDonationError("Назовись, путник.");
      setIsDonationNameInvalid(true);
      return;
    }

    const amount = parseDonationAmount(donationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDonationError("Хотя бы чуть-чуть, но не 0.");
      setIsDonationAmountInvalid(true);
      return;
    }

    const isFirstContribution = (contributions[donationWish.id] || []).length === 0;
    if (isFirstContribution && !donationContact.trim()) {
      setDonationError("Оставь контакт, шеф.");
      setIsDonationContactInvalid(true);
      return;
    }

    if (isFirstContribution && !isDonationCoordinatorConfirmed) {
      setDonationError("Оставь контакт, шеф.");
      setIsDonationCoordinatorConfirmInvalid(true);
      return;
    }

    setIsDonationSubmitting(true);
    setDonationError("");

    const wishlistId = page === "shared" ? sharedWishlistMeta?.id : currentWishlistId;
    const { data, error } = await createWishReservationRecord({
      wish_id: donationWish.id,
      wishlist_id: wishlistId,
      contributor_name: contributorName,
      contributor_contact: donationContact.trim() || null,
      contributor_user_id: currentUser?.id || null,
      amount
    });

    if (error || !data) {
      setDonationError(
        (contributions[donationWish.id] || []).length === 0
          ? "Оставь контакт, шеф."
          : "Не удалось сохранить участие."
      );
      if ((contributions[donationWish.id] || []).length === 0) {
        setIsDonationContactInvalid(!donationContact.trim());
        setIsDonationCoordinatorConfirmInvalid(!isDonationCoordinatorConfirmed);
      }
      setIsDonationSubmitting(false);
      return;
    }

    appendContributionEntry(donationWish.id, data);
    await loadDashboardStats();

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
    await loadDashboardStats();

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
    await loadDashboardStats();

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
        void loadDashboardStats();
      })
      .catch(() => {});
  }

  const pageThemeColor = (() => {
    if (page === "dashboard") return "#eaf2fb";
    if (page === "wishlist" || page === "shared") {
      const themeId =
        page === "shared"
          ? sharedWishlistMeta?.theme || defaultWishlistTheme
          : (wishlists.find((w) => w.id === currentWishlistId)?.theme || defaultWishlistTheme);
      const theme = wishlistThemes.find((t) => t.value === themeId) || wishlistThemes[0];
      return theme.themeColor || "#d7efff";
    }
    return "#d7efff";
  })();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", pageThemeColor);
    document.documentElement.style.backgroundColor = pageThemeColor;
    document.body.style.backgroundColor = pageThemeColor;
  }, [pageThemeColor]);

  if (isAuthLoading && page !== "landing" && page !== "not-found") {
    return null;
  }

  if (page === "not-found") {
    return <NotFoundPage />;
  }

  if (page === "yandex-callback") {
    return (
      <div className="page-shell auth-shell">
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
        currentUser={currentUser}
        onModeChange={onAuthModeChange}
        onErrorReset={resetAuthError}
        onInputChange={onAuthInputChange}
        onSubmit={submitAuth}
        onGoogleAuth={submitGoogleAuth}
        onYandexAuth={completeYandexAuth}
        onContinueAuthenticated={continueAuthenticatedFromLanding}
        seoPage={activeSeoPage}
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
        currentUser={currentUser}
        onModeChange={onAuthModeChange}
        onErrorReset={resetAuthError}
        onInputChange={onAuthInputChange}
        onSubmit={submitAuth}
        onGoogleAuth={submitGoogleAuth}
        onYandexAuth={completeYandexAuth}
        onContinueAuthenticated={continueAuthenticatedFromLanding}
        seoPage={activeSeoPage}
      />
    );
  }

  const activeWishesSource = page === "shared" ? sharedWishes : wishes;
  const activeWishes = activeWishesSource.map((wish) => ({
    ...wish,
    imageUrl: wish.imageUrl || (typeof wishPreviewImages[wish.id] === "string" ? wishPreviewImages[wish.id] : "")
  }));
  const currentWishlist = wishlists.find((wishlist) => wishlist.id === currentWishlistId) || null;
  const openedWish = activeWishes.find((wish) => wish.id === openedWishId) || null;
  const openedWishTarget = openedWish ? parseTargetFromPrice(openedWish.price) : null;
  const openedWishDonated = openedWish ? getWishDonated(contributions, openedWish.id) : 0;
  const openedWishEntries = openedWish ? contributions[openedWish.id] || [] : [];
  const openedWishParticipants = openedWish ? getWishParticipants(contributions, openedWish.id) : [];
  const openedWishCoordinator = openedWishEntries[0]
    ? {
        name: openedWishEntries[0].name,
        contact: openedWishEntries[0].contact || ""
      }
    : null;
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
  const countdownDate = getWishlistEventDate(currentWishlist, currentUser?.birthday || "");
  const sharedCountdownDate = getWishlistEventDate(sharedWishlistMeta, sharedWishlistMeta?.owner_birthday || "");
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

    return false;
  }
  const openedWishProgressPercent = openedWishTarget
    ? Math.min(100, Math.round((openedWishDonated / openedWishTarget) * 100))
    : 0;
  const isSharedView = page === "shared";
  const donationWishTarget = donationWish ? parseTargetFromPrice(donationWish.price) : null;
  const donationWishDonated = donationWish ? getWishDonated(contributions, donationWish.id) : 0;
  const isDonationFirstContributor = donationWish ? (contributions[donationWish.id] || []).length === 0 : false;
  const donationWishRemaining = donationWishTarget
    ? Math.max(0, donationWishTarget - donationWishDonated)
    : 0;

  const showUserBar = Boolean(currentUser) && page !== "shared";
  const canManage = page === "wishlist";

  const isPlainAppShell = page === "dashboard" || page === "wishlist" || page === "shared";

  return (
    <div className={`page-shell${page === "dashboard" ? " dashboard-shell" : ""}${isPlainAppShell ? " app-shell-plain" : ""}`} style={pageShellStyle}>
      {isPlainAppShell ? null : <div className="glow glow-left" />}
      {isPlainAppShell ? null : <div className="glow glow-right" />}

      <main className="layout">
        {showUserBar ? (
          <UserBar
            canManage={canManage}
            showDashboardLink={page !== "dashboard"}
            currentUserName={currentUserName}
            isHeaderMenuOpen={isHeaderMenuOpen}
            onOpenLanding={() => {
              setIsHeaderMenuOpen(false);
              navigate("/");
            }}
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
              if (currentWishlist) {
                openWishlistShareSheet(currentWishlist);
              }
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

        {page === "shared" ? (
          <div className="shared-landing-header">
            <button
              type="button"
              className="shared-landing-brand"
              onClick={() => navigate("/")}
              aria-label="Перейти на главный лендинг"
            >
              <strong>Список желаний</strong>
            </button>
          </div>
        ) : null}

        {page === "dashboard" ? (
          <DashboardPage
            wishlists={wishlists}
            dashboardStats={dashboardStats}
            userBirthday={currentUser?.birthday || ""}
            currentWishlistId={currentWishlistId}
            isLoading={isWishlistsLoading}
            isSubmitting={isWishlistSubmitting}
            error={wishlistsError}
            onCreateWishlist={createWishlist}
            onOpenWishlist={openWishlistFromDashboard}
            onOpenWishlistLink={openWishlistByShareLink}
            onCopyShareLink={openWishlistShareSheet}
            onDeleteWishlist={requestDeleteWishlist}
            onCopyUnreservedWishes={copyUnreservedWishes}
          />
        ) : (
          <WishlistPage
            wishes={activeWishes}
            contributions={contributions}
            currentWishlist={currentWishlist}
            onOpenWish={openWishModal}
            countdownDate={page === "shared" ? sharedCountdownDate : countdownDate}
            isRecurringEvent={false}
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
            onOpenLandingRegister={openLandingRegister}
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
          coordinator={openedWishCoordinator}
          isCurrentUserParticipant={isCurrentUserParticipant}
          onRemoveMyParticipation={removeMyParticipation}
          onOpenReservation={() => openDonationModal(openedWish, "reserve")}
          onOpenContribution={() => openDonationModal(openedWish, "contribute")}
          onClose={closeWishModal}
        />
      ) : null}

      <AuthModal isOpen={isSharedAuthModalOpen} submitting={isAuthSubmitting} modalRef={sharedAuthModalRef} onClose={closeSharedAuthModal}>
        <AuthFormCard
          mode={authMode}
          form={authForm}
          error={authError}
          submitting={isAuthSubmitting}
          isOpen={isSharedAuthModalOpen}
          googleClientId={googleClientId}
          yandexClientId={yandexClientId}
          googleButtonRef={googleButtonRef}
          onModeChange={onAuthModeChange}
          onErrorReset={resetAuthError}
          onInputChange={onAuthInputChange}
          onSubmit={submitAuth}
          onOpenYandexAuth={openYandexAuth}
          onClose={closeSharedAuthModal}
        />
      </AuthModal>

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
        donationContact={donationContact}
        isFirstContributor={isDonationFirstContributor}
        isCoordinatorConfirmed={isDonationCoordinatorConfirmed}
        isNameInvalid={isDonationNameInvalid}
        isAmountInvalid={isDonationAmountInvalid}
        isContactInvalid={isDonationContactInvalid}
        isCoordinatorConfirmInvalid={isDonationCoordinatorConfirmInvalid}
        donationError={donationError}
        isDonationSubmitting={isDonationSubmitting}
        target={donationWishTarget}
        remaining={donationWishRemaining}
        onNameChange={(event) => {
          setDonationName(event.target.value);
          if (event.target.value.trim()) {
            setIsDonationNameInvalid(false);
          }
          if (donationError) {
            setDonationError("");
          }
        }}
        onAmountChange={(event) => {
          setDonationAmount(event.target.value);
          if (parseDonationAmount(event.target.value) > 0) {
            setIsDonationAmountInvalid(false);
          }
          if (donationError) {
            setDonationError("");
          }
        }}
        onContactChange={(event) => {
          setDonationContact(event.target.value);
          if (event.target.value.trim()) {
            setIsDonationContactInvalid(false);
          }
          if (donationError) {
            setDonationError("");
          }
        }}
        onCoordinatorConfirmChange={(event) => {
          setIsDonationCoordinatorConfirmed(event.target.checked);
          if (event.target.checked) {
            setIsDonationCoordinatorConfirmInvalid(false);
          }
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

      <ShareSheetModal
        isOpen={Boolean(shareSheetWishlist && shareSheetUrl)}
        title={shareSheetWishlist?.title || ""}
        shareUrl={shareSheetUrl}
        isQrVisible={isShareSheetQrVisible}
        onClose={closeShareSheet}
        onCopyLink={copyShareSheetLink}
        onShareTelegram={shareViaTelegram}
        onShareVk={shareViaVk}
        onShareWhatsapp={shareViaWhatsapp}
        onToggleQr={() => setIsShareSheetQrVisible((prev) => !prev)}
      />

      {toast ? (
        <div className={`copy-toast copy-toast-${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
