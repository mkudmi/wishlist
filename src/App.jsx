import { useEffect, useState } from "react";
import {
  celebrationOptions,
  rules as defaultRules,
  emptyAuthForm,
  emptyForm,
  emptyProfileForm
} from "./config/constants";
import {
  createWish,
  createShareToken,
  formatMoney,
  getProfileFormFromUser,
  getRouteFromHash,
  getUserDisplayName,
  getWishDonated,
  getWishParticipants,
  buildSharedWishlistUrl,
  copyTextToClipboard,
  mapWishToForm,
  normalizeName,
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
  loginUser,
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
  updateProfileRecord,
  updateRulesByWishlist,
  updateWishlistRecord,
  updateWishRecord
} from "./lib/wishlistApi";
import { AuthPage } from "./components/pages/AuthPage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { WishlistPage } from "./components/pages/WishlistPage";
export default function App() {
  const initialRoute = getRouteFromHash();
  const [wishes, setWishes] = useState([]);
  const [contributions, setContributions] = useState({});
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

      if (!window.location.hash || window.location.hash === "#/") {
        window.location.hash = "#/dashboard";
      }
      setIsAuthLoading(false);
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

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

      window.location.hash = "#/dashboard";
      setAuthForm(emptyAuthForm);
    } catch (error) {
      setAuthError(error.message || "Ошибка авторизации.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function logout() {
    await logoutUser();
    setCurrentUser(null);
    setWishlists([]);
    setCurrentWishlistId(null);
    setCurrentShareToken(null);
    setWishes([]);
    setWishlistRules(defaultRules.slice(0, 5));
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

    const { error: profileUpdateError } = await updateProfileRecord({
      first_name: firstName,
      last_name: lastName,
      birthday
    });

    if (profileUpdateError) {
      setProfileError("Не удалось обновить профиль.");
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
      event_date: celebrationType === "birthday" ? null : eventDate
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
    window.location.hash = "#/wishlist";
    return true;
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
    window.location.hash = "#/dashboard";
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
            countdownDate={page === "shared" ? sharedCountdownDate : countdownDate}
            isRecurringEvent={page === "shared" ? sharedCelebrationType === "birthday" : currentCelebrationType === "birthday"}
            eventTitle={page === "shared" ? sharedCelebrationTitle : celebrationTitle}
            ownerFirstName={page === "shared" ? sharedOwnerFirstName : currentUser?.firstName || ""}
            canEdit={page !== "shared"}
            rules={page === "shared" ? sharedRules : wishlistRules}
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
                className="button-secondary"
                onClick={() => openDonationModal(openedWish, "reserve")}
                disabled={openedWishCompleted || !openedWishTarget}
              >
                {openedWishCompleted ? "Собрано" : !openedWishTarget ? "Нет суммы" : "Забронировать"}
              </button>
              <button
                type="button"
                className="wish-donate-button"
                onClick={() => openDonationModal(openedWish, "contribute")}
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
            <h3>{donationMode === "reserve" ? "Забронировать подарок" : "Поучаствовать в подарке"}</h3>
            <p className="donation-modal-title">{donationWish.title}</p>
            <p className="donation-modal-subtitle">
              {donationMode === "reserve" ? "Кто бронирует подарок" : `Участвует: ${currentUser ? getUserDisplayName(currentUser) : donationName.trim() || "Гость"}`}
            </p>

            <form className="donation-form" onSubmit={donationMode === "reserve" ? submitReservation : submitDonation}>
              {donationMode === "reserve" || !currentUser ? (
                <label>
                  Твое имя
                  <input
                    type="text"
                    value={donationName}
                    onChange={(event) => {
                      setDonationName(event.target.value);
                      if (donationError) {
                        setDonationError("");
                      }
                    }}
                    placeholder="Например: Аня"
                    autoFocus
                  />
                </label>
              ) : null}

              {donationMode !== "reserve" ? (
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
                    autoFocus={Boolean(currentUser)}
                  />
                </label>
              ) : null}

              {donationError ? <p className="donation-error">{donationError}</p> : null}

              <div className="donation-actions">
                {donationMode !== "reserve" && donationWishTarget && donationWishRemaining > 0 ? (
                  <button type="button" className="button-secondary" onClick={donateFullRemaining} disabled={isDonationSubmitting}>
                    Закрыть все ({formatMoney(donationWishRemaining)} руб.)
                  </button>
                ) : null}
                <button type="submit" className="button-primary" disabled={isDonationSubmitting}>
                  {isDonationSubmitting ? "Сохраняем..." : donationMode === "reserve" ? "Забронировать" : "Добавить"}
                </button>
                <button type="button" className="button-secondary" onClick={closeDonationModal} disabled={isDonationSubmitting}>
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
