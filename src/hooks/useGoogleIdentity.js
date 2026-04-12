import { useEffect, useRef } from "react";

export function useGoogleIdentity({ googleClientId, onGoogleAuth, isAuthModalOpen }) {
  const googleCallbackRef = useRef(onGoogleAuth);
  const googleInitializedClientIdRef = useRef("");
  const googleButtonRef = useRef(null);
  const googleSdkPromiseRef = useRef(null);

  useEffect(() => {
    googleCallbackRef.current = onGoogleAuth;
  }, [onGoogleAuth]);

  function ensureGoogleSdkLoaded() {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Google SDK недоступен."));
    }

    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    if (googleSdkPromiseRef.current) {
      return googleSdkPromiseRef.current;
    }

    googleSdkPromiseRef.current = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-gsi="true"]');

      function cleanup(script) {
        script?.removeEventListener("load", handleLoad);
        script?.removeEventListener("error", handleError);
      }

      function handleLoad() {
        cleanup(existingScript || script);
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        reject(new Error("Google SDK недоступен."));
      }

      function handleError() {
        cleanup(existingScript || script);
        reject(new Error("Не удалось загрузить Google SDK."));
      }

      const script = existingScript || document.createElement("script");
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existingScript) {
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleGsi = "true";
        document.head.appendChild(script);
      }
    }).catch((error) => {
      googleSdkPromiseRef.current = null;
      throw error;
    });

    return googleSdkPromiseRef.current;
  }

  useEffect(() => {
    if (!googleClientId || typeof window === "undefined") {
      return undefined;
    }

    function initializeGoogle() {
      if (!window.google?.accounts?.id) {
        return;
      }

      if (googleInitializedClientIdRef.current === googleClientId) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (response?.credential) {
            await googleCallbackRef.current(response.credential);
          }
        }
      });

      googleInitializedClientIdRef.current = googleClientId;
    }

    ensureGoogleSdkLoaded().then(initializeGoogle).catch(() => {});
    return undefined;
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !isAuthModalOpen || !googleButtonRef.current || typeof window === "undefined") {
      return undefined;
    }

    let isCancelled = false;

    function renderGoogleButton() {
      if (isCancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      const isMobile = window.matchMedia("(max-width: 720px)").matches;
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: isMobile ? "icon" : "standard",
        theme: "outline",
        size: "large",
        text: isMobile ? undefined : "signin_with",
        shape: isMobile ? "circle" : "pill",
        width: isMobile ? 40 : Math.round(googleButtonRef.current.clientWidth || 240),
        locale: "ru"
      });
    }

    ensureGoogleSdkLoaded().then(renderGoogleButton).catch(() => {});
    window.addEventListener("resize", renderGoogleButton);

    return () => {
      isCancelled = true;
      window.removeEventListener("resize", renderGoogleButton);
    };
  }, [googleClientId, isAuthModalOpen]);

  return { googleButtonRef };
}
