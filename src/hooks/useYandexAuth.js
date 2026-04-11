import { useEffect } from "react";
import { getApiBase, setAuthToken } from "../lib/wishlistApi";

export function useYandexAuth({ onYandexAuth, onYandexError }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    async function handleMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (payload?.type !== "wishlist:yandex-auth-result") {
        return;
      }

      if (payload.token) {
        setAuthToken(payload.token);
        await onYandexAuth(payload.token);
        return;
      }

      if (payload.error) {
        onYandexError?.(payload.error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onYandexAuth, onYandexError]);

  function openYandexAuth() {
    const apiBase = getApiBase();
    const popupUrl = `${apiBase}/api/auth/yandex/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(popupUrl, "wishlist-yandex-auth", "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes");
  }

  return { openYandexAuth };
}
