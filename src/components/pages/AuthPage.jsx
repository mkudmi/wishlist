import { useEffect, useRef, useState } from "react";
import { seoLandingPages } from "../../config/seoPages";
import { getApiBase, setAuthToken } from "../../lib/wishlistApi";
import { AuthFormCard } from "../auth/AuthFormCard";
import { AuthModal } from "../auth/AuthModal";
import { featureList, flowSteps, legalLinks } from "../auth/authContent";
import { useAuthModalBehavior } from "../../hooks/useAuthModalBehavior";
import { useGoogleIdentity } from "../../hooks/useGoogleIdentity";
import { useYandexAuth } from "../../hooks/useYandexAuth";

export function AuthPage({
  mode,
  form,
  error,
  submitting,
  currentUser,
  onModeChange,
  onErrorReset,
  onInputChange,
  onSubmit,
  onGoogleAuth,
  onYandexAuth,
  onContinueAuthenticated,
  seoPage = seoLandingPages[0]
}) {
  const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
  const yandexClientId = import.meta.env?.VITE_YANDEX_CLIENT_ID || "";
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPrimaryCtaLoading, setIsPrimaryCtaLoading] = useState(false);
  const [giftScene, setGiftScene] = useState({ scrollTop: 0, width: 0, height: 0, offsets: [] });
  const scrollRef = useRef(null);
  const snapScrollLockRef = useRef(false);
  const snapScrollTimeoutRef = useRef(null);
  const authModalRef = useRef(null);
  const { googleButtonRef } = useGoogleIdentity({
    googleClientId,
    onGoogleAuth,
    isAuthModalOpen
  });
  const { openYandexAuth } = useYandexAuth({
    onYandexAuth,
    onYandexError: () => onModeChange("login")
  });

  function closeAuthModal() {
    if (submitting) {
      return;
    }

    setIsAuthModalOpen(false);
  }

  useAuthModalBehavior({
    isOpen: isAuthModalOpen,
    submitting,
    modalRef: authModalRef,
    onClose: closeAuthModal
  });

  function scrollToSection(sectionId) {
    if (typeof document === "undefined") {
      return;
    }

    const section = document.getElementById(sectionId);
    const container = scrollRef.current;
    if (section && container) {
      container.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    }
  }

  function clampValue(min, value, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  function smoothstep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function getGiftBaseMetrics(width, height) {
    const containerWidth = Math.min(1180, width - 40);
    const containerLeft = (width - containerWidth) / 2;

    if (width >= 1440) {
      return {
        containerWidth,
        containerLeft,
        giftWidth: clampValue(460, width * 0.35, 720),
        baseRight: Math.max(0, (width - Math.min(1180, width - 40)) / 2 - 10),
        baseCenterY: height * 0.4
      };
    }

    if (width >= 721 && width <= 1024) {
      return {
        containerWidth,
        containerLeft,
        giftWidth: clampValue(340, width * 0.41, 480),
        baseRight: clampValue(-4, width * 0.008, 8),
        baseCenterY: height * 0.42
      };
    }

    return {
      containerWidth,
      containerLeft,
      giftWidth: clampValue(400, width * 0.39, 650),
      baseRight: Math.max(-10, (width - Math.min(1180, width - 40)) / 2 - 10),
      baseCenterY: height * 0.41
    };
  }

  function getGiftTarget(section, width, height) {
    if (width > 720 && (section === 1 || section === 2)) {
      const { containerWidth, containerLeft, giftWidth, baseRight, baseCenterY } = getGiftBaseMetrics(width, height);
      const safeWidth = clampValue(180, width * 0.2, 320);
      const scale = 1;
      const visualGiftWidth = giftWidth * scale;
      const desiredCenterX =
        section === 1
          ? containerLeft + containerWidth - safeWidth / 2
          : containerLeft + safeWidth / 2 - clampValue(24, width * 0.035, 56);

      return {
        shiftX: desiredCenterX - (width - baseRight - visualGiftWidth / 2),
        shiftY: height / 2 - baseCenterY,
        rotate: 0,
        scale
      };
    }

    if (width > 720 && section === 3) {
      const { containerWidth, containerLeft, giftWidth, baseRight, baseCenterY } = getGiftBaseMetrics(width, height);
      const scale = 1.38;
      const visualGiftWidth = giftWidth * scale;
      const textColumnWidth = Math.min(464, containerWidth * 0.48);
      const gap = clampValue(20, width * 0.03, 48);
      const rightColumnWidth = Math.max(containerWidth - textColumnWidth - gap, 280);
      const opticalOffsetX = Math.min(rightColumnWidth * 0.08, 40);
      const opticalOffsetY = Math.min(giftWidth * (scale - 1) * 0.08, 22);
      const desiredCenterX = containerLeft + textColumnWidth + gap + rightColumnWidth / 2 - opticalOffsetX;

      return {
        shiftX: desiredCenterX - (width - baseRight - visualGiftWidth / 2),
        shiftY: height / 2 - baseCenterY - opticalOffsetY,
        rotate: 0,
        scale
      };
    }

    switch (section) {
      case 1:
        return { shiftX: width * 0.11, shiftY: -height * 0.075, rotate: 0, scale: 1 };
      case 2:
        return { shiftX: width * -0.43, shiftY: height * 0.12, rotate: 0, scale: 1 };
      case 3:
        return { shiftX: width * 0.07, shiftY: height * 0.09, rotate: 0, scale: 1.5 };
      default:
        return { shiftX: 0, shiftY: 0, rotate: 0, scale: 1 };
    }
  }

  function getGiftMotion(scrollTop, width, height, offsets) {
    if (!offsets?.length) {
      return getGiftTarget(0, width, height);
    }

    const lastIndex = offsets.length - 1;
    let currentIndex = lastIndex;

    for (let index = 0; index < lastIndex; index += 1) {
      if (scrollTop < offsets[index + 1]) {
        currentIndex = index;
        break;
      }
    }

    if (currentIndex === lastIndex) {
      return getGiftTarget(lastIndex, width, height);
    }

    const startOffset = offsets[currentIndex];
    const endOffset = offsets[currentIndex + 1];
    const rawProgress = (scrollTop - startOffset) / Math.max(endOffset - startOffset, 1);
    const progress = smoothstep(clampValue(0, rawProgress, 1));
    const from = getGiftTarget(currentIndex, width, height);
    const to = getGiftTarget(currentIndex + 1, width, height);

    return {
      shiftX: lerp(from.shiftX, to.shiftX, progress),
      shiftY: lerp(from.shiftY, to.shiftY, progress),
      rotate: lerp(from.rotate, to.rotate, progress),
      scale: lerp(from.scale, to.scale, progress)
    };
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const sections = Array.from(container.querySelectorAll("[data-snap-section]"));
    if (sections.length === 0) {
      return undefined;
    }

    function updateGiftScene() {
      const scrollTop = container.scrollTop;
      const offsets = sections.map((section) => section.offsetTop);
      setGiftScene((prev) => {
        if (
          prev.scrollTop === scrollTop &&
          prev.width === container.clientWidth &&
          prev.height === container.clientHeight &&
          prev.offsets.length === offsets.length &&
          prev.offsets.every((offset, index) => offset === offsets[index])
        ) {
          return prev;
        }

        return {
          scrollTop,
          width: container.clientWidth,
          height: container.clientHeight,
          offsets
        };
      });
    }

    updateGiftScene();
    container.addEventListener("scroll", updateGiftScene, { passive: true });
    window.addEventListener("resize", updateGiftScene);

    return () => {
      container.removeEventListener("scroll", updateGiftScene);
      window.removeEventListener("resize", updateGiftScene);
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function clearSnapScrollLock() {
      if (snapScrollTimeoutRef.current) {
        window.clearTimeout(snapScrollTimeoutRef.current);
      }

      snapScrollLockRef.current = false;
      snapScrollTimeoutRef.current = null;
    }

    function getSectionOffsets() {
      return Array.from(container.querySelectorAll("[data-snap-section]")).map((section) => section.offsetTop);
    }

    function handleWheel(event) {
      if (mediaQuery.matches || reducedMotionQuery.matches) {
        return;
      }

      if (Math.abs(event.deltaY) < 24 || snapScrollLockRef.current) {
        return;
      }

      const offsets = getSectionOffsets();
      if (offsets.length < 2) {
        return;
      }

      const currentTop = container.scrollTop;
      const direction = Math.sign(event.deltaY);
      const threshold = container.clientHeight * 0.18;
      const currentIndex = offsets.findIndex((offset, index) => {
        const nextOffset = offsets[index + 1] ?? Number.POSITIVE_INFINITY;
        return currentTop >= offset - threshold && currentTop < nextOffset - threshold;
      });
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const targetIndex = Math.max(0, Math.min(offsets.length - 1, safeIndex + direction));
      const targetTop = offsets[targetIndex];

      if (targetTop === undefined || Math.abs(targetTop - currentTop) < 8) {
        return;
      }

      event.preventDefault();
      snapScrollLockRef.current = true;
      container.scrollTo({ top: targetTop, behavior: "smooth" });
      snapScrollTimeoutRef.current = window.setTimeout(clearSnapScrollLock, 820);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      clearSnapScrollLock();
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  function openAuthModal(nextMode) {
    onModeChange(nextMode);
    setIsAuthModalOpen(true);
  }

  async function handlePrimaryCta(nextMode = "login") {
    if (isPrimaryCtaLoading) {
      return;
    }

    if (!currentUser) {
      openAuthModal(nextMode);
      return;
    }

    setIsPrimaryCtaLoading(true);

    try {
      const shouldContinue = await onContinueAuthenticated?.();
      if (shouldContinue) {
        return;
      }

      openAuthModal(nextMode);
    } finally {
      setIsPrimaryCtaLoading(false);
    }
  }

  const giftMotion = getGiftMotion(giftScene.scrollTop, giftScene.width, giftScene.height, giftScene.offsets);

  function renderLegalPage() {
    return (
      <div className="page-shell auth-shell snap-landing-shell snap-legal-shell">
        <div className="snap-landing-bg snap-landing-bg-left" />
        <div className="snap-landing-bg snap-landing-bg-right" />

        <header className="snap-fixed-header">
          <div className="snap-fixed-header-inner">
            <a className="snap-brand" href="/">
              <div>
                <strong>Список желаний</strong>
              </div>
            </a>

            <div className="snap-nav snap-nav-desktop">
              <a className="snap-nav-link" href="/">
                На главную
              </a>
              <a className="snap-nav-link snap-nav-link-accent" href="/">
                Создать вишлист
              </a>
            </div>
          </div>
        </header>

        <main className="snap-legal-main">
          <section className="snap-legal-card">
            <p className="snap-legal-kicker">{seoPage.navLabel}</p>
            <h1 className="snap-legal-title">{seoPage.documentTitle || seoPage.title}</h1>
            {seoPage.documentUpdatedAt ? <p className="snap-legal-updated">{seoPage.documentUpdatedAt}</p> : null}
            {seoPage.documentLead ? <p className="snap-legal-lead">{seoPage.documentLead}</p> : null}

            <div className="snap-legal-sections">
              {(seoPage.documentSections || []).map((section) => (
                <section className="snap-legal-section" key={section.title}>
                  <h2>{section.title}</h2>
                  {(section.paragraphs || []).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list?.length ? (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <footer className="snap-legal-footer" aria-label="Навигация по служебным страницам">
              <div className="snap-legal-footer-brand">
                <strong>Список желаний</strong>
              </div>
              <nav className="snap-legal-footer-links">
                {legalLinks.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </footer>
          </section>
        </main>
      </div>
    );
  }

  if (seoPage.layout === "legal") {
    return renderLegalPage();
  }

  return (
    <div className="page-shell auth-shell snap-landing-shell">
      <div className="snap-landing-bg snap-landing-bg-left" />
      <div className="snap-landing-bg snap-landing-bg-right" />

      <header className="snap-fixed-header">
        <div className="snap-fixed-header-inner">
          <button type="button" className="snap-brand" onClick={() => scrollToSection("landing-hero")}>
            <div>
              <strong>Список желаний</strong>
            </div>
          </button>

          <div className="snap-nav">
            <div className="snap-nav-desktop">
              <button type="button" className="snap-nav-link" onClick={() => handlePrimaryCta("login")}>
                Вход
              </button>
              <button type="button" className="snap-nav-link snap-nav-link-accent" onClick={() => handlePrimaryCta("register")}>
                Регистрация
              </button>
            </div>

            <div className="snap-mobile-nav">
              <button
                type="button"
                className="snap-mobile-nav-toggle"
                aria-label="Вход или переход в аккаунт"
                onClick={() => handlePrimaryCta("login")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Zm0 2.25c-4.07 0-7.5 2.08-7.5 4.55 0 .52.43.95.95.95h13.1c.52 0 .95-.43.95-.95 0-2.47-3.43-4.55-7.5-4.55Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className="snap-hero-image-card"
        aria-hidden="true"
        style={{
          "--gift-shift-x": `${giftMotion.shiftX.toFixed(1)}px`,
          "--gift-shift-y": `${giftMotion.shiftY.toFixed(1)}px`,
          "--gift-rotate": `${giftMotion.rotate.toFixed(2)}deg`,
          "--gift-scale": `${giftMotion.scale.toFixed(3)}`
        }}
      >
        <img className="snap-hero-gift-image" src="/branding/gift-box.png" alt="" />
      </div>

      <div className="snap-landing-scroll" ref={scrollRef}>
        <section className="snap-panel snap-panel-hero" id="landing-hero" data-snap-section>
          <div className="snap-panel-inner snap-hero-simple">
            <div className="snap-copy">
              <h1 className="snap-title">Если ты сюда зашел, значит у тебя скоро праздник!</h1>

              <div className="snap-actions">
                <button
                  type="button"
                  className={`button-primary${isPrimaryCtaLoading ? " landing-cta-loading" : ""}`}
                  onClick={() => handlePrimaryCta("login")}
                  disabled={isPrimaryCtaLoading}
                >
                  Создать вишлист
                </button>
              </div>
            </div>

            <p className="snap-hero-side-note">А мы поможем тебе ответить на вопрос "Что подарить?"</p>
          </div>
        </section>

        <section className="snap-panel snap-panel-benefits" id="landing-benefits" data-snap-section>
          <div className="snap-panel-inner snap-panel-grid snap-panel-grid-gift-safe">
            <div className="snap-heading">
              <h2>
                Дорогой подарок можно собрать <span className="snap-accent-word">вместе</span>
              </h2>
            </div>

            <div className="snap-feature-list">
              {featureList.map((item, index) => (
                <article className="snap-feature-card" key={item}>
                  <strong>0{index + 1}</strong>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="snap-panel snap-panel-flow" id="landing-flow" data-snap-section>
          <div className="snap-panel-inner snap-panel-grid snap-panel-grid-gift-safe snap-panel-grid-gift-safe-mirror">
            <div className="snap-step-list">
              {flowSteps.map((step) => (
                <article className="snap-step-card" key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="snap-flow-side">
              <h2 className="snap-flow-gift-title">
                Твой путь от <span className="snap-accent-word">желания</span> до подарка
              </h2>
            </div>
          </div>
        </section>

        <section className="snap-panel snap-panel-auth" id="landing-auth" data-snap-section>
          <div className="snap-panel-inner snap-auth-panel">
            <div className="snap-auth-stage">
              <div className="snap-auth-layout">
                <div className="snap-heading snap-auth-copy">
                  <h2>
                    {seoPage.authTitle === "Желания сбываются чаще, когда ими делятся" ? (
                      <>
                        Желания <span className="snap-accent-word">сбываются</span> чаще, когда ими делятся
                      </>
                    ) : (
                      seoPage.authTitle
                    )}
                  </h2>

                  <div className="snap-actions">
                    <button
                      type="button"
                      className={`button-primary${isPrimaryCtaLoading ? " landing-cta-loading" : ""}`}
                      onClick={() => handlePrimaryCta("register")}
                      disabled={isPrimaryCtaLoading}
                    >
                      {seoPage.authText || "Создать вишлист"}
                    </button>
                  </div>
                </div>
                <div className="snap-auth-gift-slot" aria-hidden="true" />
              </div>
            </div>

            <footer className="snap-legal-footer" aria-label="Юридическая информация">
              <div className="snap-legal-footer-brand">
                <strong>Список желаний</strong>
              </div>
              <nav className="snap-legal-footer-links">
                {legalLinks.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </footer>
          </div>
        </section>
      </div>

      <AuthModal isOpen={isAuthModalOpen} submitting={submitting} modalRef={authModalRef} onClose={closeAuthModal}>
        <AuthFormCard
          mode={mode}
          form={form}
          error={error}
          submitting={submitting}
          isOpen={isAuthModalOpen}
          googleClientId={googleClientId}
          yandexClientId={yandexClientId}
          googleButtonRef={googleButtonRef}
          onModeChange={onModeChange}
          onErrorReset={onErrorReset}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          onOpenYandexAuth={openYandexAuth}
          onClose={closeAuthModal}
        />
      </AuthModal>
    </div>
  );
}
