import { useEffect, useState } from "react";
import { emptyProfileForm } from "../config/constants";
import { getProfileFormFromUser, normalizeName, parseDdMmYyyyToStorageDate } from "../lib/helpers";
import {
  deleteCurrentUserAccount,
  fetchCurrentUserIdentities,
  linkGoogleIdentity,
  startYandexIdentityLink,
  unlinkIdentity,
  updateProfileRecord
} from "../lib/wishlistApi";

async function ensureGoogleSdkLoaded() {
  if (typeof window === "undefined") {
    throw new Error("Google SDK недоступен.");
  }

  if (window.google?.accounts?.id) {
    return;
  }

  await new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-gsi="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

export function useAccountPanel({ currentUser, setCurrentUser, clearAuthenticatedState, navigate }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileError, setProfileError] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isIdentitySubmitting, setIsIdentitySubmitting] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isProfileBirthdayPickerOpen, setIsProfileBirthdayPickerOpen] = useState(false);
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [isAccountDeleting, setIsAccountDeleting] = useState(false);

  useEffect(() => {
    setIsProfileOpen(false);
    setProfileForm(emptyProfileForm);
    setProfileError("");
    setIsProfileSubmitting(false);
    setIsIdentitySubmitting(false);
    setIsIdentityModalOpen(false);
    setIsProfileBirthdayPickerOpen(false);
    setIsDeleteAccountConfirmOpen(false);
    setDeleteAccountConfirmation("");
    setIsAccountDeleting(false);
  }, [currentUser?.id]);

  async function refreshCurrentUserIdentities() {
    if (!currentUser) {
      return;
    }

    const { data, error } = await fetchCurrentUserIdentities();
    if (error) {
      throw new Error("Не удалось обновить способы входа.");
    }

    setCurrentUser((prev) => (prev ? { ...prev, identities: data || [] } : prev));
  }

  function canUnlinkIdentity(provider) {
    const identities = currentUser?.identities || [];
    if (!identities.some((identity) => identity.provider === provider)) {
      return false;
    }

    return identities.length > 1;
  }

  async function handleIdentityUnlink(provider) {
    if (!currentUser) {
      return;
    }

    setProfileError("");
    setIsIdentitySubmitting(true);

    try {
      const { data, error } = await unlinkIdentity(provider);

      if (error) {
        if (error.message === "cannot_unlink_last_identity") {
          throw new Error("Нельзя отвязать последний способ входа.");
        }
        if (error.message === "identity_not_found") {
          throw new Error("Этот способ входа уже отвязан.");
        }
        throw new Error("Не удалось отвязать способ входа.");
      }

      setCurrentUser((prev) => (prev ? { ...prev, identities: data || [] } : prev));
    } catch (error) {
      setProfileError(error.message || "Не удалось отвязать способ входа.");
    } finally {
      setIsIdentitySubmitting(false);
    }
  }

  async function startGoogleLink() {
    if (!currentUser) {
      return;
    }

    const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
    if (!googleClientId) {
      setProfileError("Google вход не настроен.");
      return;
    }

    setProfileError("");
    setIsIdentitySubmitting(true);

    try {
      await ensureGoogleSdkLoaded();

      const credential = await new Promise((resolve, reject) => {
        if (!window.google?.accounts?.id) {
          reject(new Error("Google SDK недоступен."));
          return;
        }

        let settled = false;
        const finish = (handler, value) => {
          if (settled) {
            return;
          }
          settled = true;
          handler(value);
        };

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              finish(resolve, response.credential);
              return;
            }
            finish(reject, new Error("Google не вернул токен входа."));
          }
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            finish(reject, new Error("Не удалось открыть вход через Google."));
          }
        });
      });

      const { error } = await linkGoogleIdentity(credential);
      if (error) {
        if (error.message === "identity_link_conflict") {
          throw new Error("Этот Google-аккаунт уже привязан к другому профилю.");
        }
        throw new Error("Не удалось привязать Google.");
      }

      await refreshCurrentUserIdentities();
    } catch (error) {
      setProfileError(error.message || "Не удалось привязать Google.");
    } finally {
      setIsIdentitySubmitting(false);
    }
  }

  async function startYandexLink() {
    if (!currentUser) {
      return;
    }

    setProfileError("");
    setIsIdentitySubmitting(true);

    try {
      const { data, error } = await startYandexIdentityLink(window.location.origin);

      if (error || !data) {
        throw new Error(error?.message || error || "Не удалось открыть вход через Яндекс.");
      }

      const popup = window.open(
        data,
        "wishlist-yandex-link",
        "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes"
      );

      if (!popup) {
        throw new Error("Разрешите всплывающее окно, чтобы привязать Яндекс.");
      }

      popup.focus();
    } catch (error) {
      setProfileError(error.message || "Не удалось открыть вход через Яндекс.");
      setIsIdentitySubmitting(false);
    }
  }

  function openProfileModal() {
    setProfileForm(getProfileFormFromUser(currentUser));
    setProfileError("");
    setIsIdentitySubmitting(false);
    setIsIdentityModalOpen(false);
    setIsDeleteAccountConfirmOpen(false);
    setDeleteAccountConfirmation("");
    setIsProfileOpen(true);
  }

  function closeProfileModal() {
    if (isProfileSubmitting || isAccountDeleting || isIdentitySubmitting) {
      return;
    }
    setIsProfileOpen(false);
    setProfileError("");
    setProfileForm(emptyProfileForm);
    setIsIdentitySubmitting(false);
    setIsIdentityModalOpen(false);
    setIsProfileBirthdayPickerOpen(false);
    setIsDeleteAccountConfirmOpen(false);
    setDeleteAccountConfirmation("");
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

  async function deleteAccount() {
    if (!currentUser) {
      return;
    }

    if (deleteAccountConfirmation.trim().toUpperCase() !== "УДАЛИТЬ") {
      setProfileError("Введи УДАЛИТЬ для подтверждения.");
      return;
    }

    setIsAccountDeleting(true);
    setProfileError("");

    const { error } = await deleteCurrentUserAccount();
    if (error) {
      setProfileError("Не удалось удалить аккаунт.");
      setIsAccountDeleting(false);
      return;
    }

    clearAuthenticatedState();
    navigate("/dashboard");
    setIsAccountDeleting(false);
  }

  return {
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
  };
}
