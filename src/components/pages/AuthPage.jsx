import { useCallback, useRef, useState } from "react";
import * as gsapBundle from "gsap";
import { useGSAP } from "@gsap/react";
import * as scrollTriggerBundle from "gsap/ScrollTrigger";
import { seoLandingPages } from "../../config/seoPages";
import { getApiBase, setAuthToken } from "../../lib/wishlistApi";
import { AuthFormCard } from "../auth/AuthFormCard";
import { AuthModal } from "../auth/AuthModal";
import { featureList, flowSteps, legalLinks } from "../auth/authContent";
import { useAuthModalBehavior } from "../../hooks/useAuthModalBehavior";
import { useGoogleIdentity } from "../../hooks/useGoogleIdentity";
import { useYandexAuth } from "../../hooks/useYandexAuth";

const gsap = gsapBundle.gsap || gsapBundle.default?.gsap || gsapBundle.default || gsapBundle;
const ScrollTrigger = scrollTriggerBundle.ScrollTrigger || scrollTriggerBundle.default;
const LANDING_DESKTOP_QUERY = "(min-width: 721px)";
const AUTH_GIFT_SCALE = 1.38;

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
  const landingShellRef = useRef(null);
  const scrollRef = useRef(null);
  const giftRef = useRef(null);
  const benefitsGiftTargetRef = useRef(null);
  const flowGiftTargetRef = useRef(null);
  const authGiftTargetRef = useRef(null);
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

  const closeAuthModal = useCallback(() => {
    if (submitting) {
      return;
    }

    setIsAuthModalOpen(false);
  }, [submitting]);

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

  useGSAP(() => {
    const container = scrollRef.current;
    const gift = giftRef.current;
    const giftTargets = [
      { ref: benefitsGiftTargetRef, label: "benefits", scale: 1 },
      { ref: flowGiftTargetRef, label: "flow", scale: 1 },
      { ref: authGiftTargetRef, label: "auth", scale: AUTH_GIFT_SCALE }
    ];

    if (!container || !gift || giftTargets.some((target) => !target.ref.current)) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) {
      return undefined;
    }

    const media = gsap.matchMedia();

    media.add(LANDING_DESKTOP_QUERY, () => {
      let states = [];

      function getCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }

      function collectStates() {
        gsap.set(gift, { x: 0, y: 0, yPercent: -50, scale: 1, rotation: 0 });
        const baseCenter = getCenter(gift);
        const currentScrollTop = container.scrollTop;
        states = [
          { x: 0, y: 0, scale: 1 },
          ...giftTargets.map((target) => {
            const section = target.ref.current.closest("[data-snap-section]");
            const sectionOffset = section?.offsetTop || 0;
            const center = getCenter(target.ref.current);
            return {
              x: center.x - baseCenter.x,
              y: center.y + currentScrollTop - sectionOffset - baseCenter.y,
              scale: target.scale
            };
          })
        ];
      }

      function stateAt(index, key) {
        return states[index]?.[key] ?? (key === "scale" ? 1 : 0);
      }

      collectStates();

      const refreshHandler = () => collectStates();
      ScrollTrigger.addEventListener("refreshInit", refreshHandler);

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: container,
          scroller: container,
          start: "top top",
          end: () => `+=${Math.max(container.scrollHeight - container.clientHeight, 1)}`,
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      timeline.addLabel("hero", 0).set(gift, {
        x: () => stateAt(0, "x"),
        y: () => stateAt(0, "y"),
        yPercent: -50,
        scale: () => stateAt(0, "scale"),
        rotation: 0
      });

      giftTargets.forEach((target, index) => {
        const stateIndex = index + 1;
        timeline
          .to(gift, {
            x: () => stateAt(stateIndex, "x"),
            y: () => stateAt(stateIndex, "y"),
            scale: () => stateAt(stateIndex, "scale"),
            duration: 1
          })
          .addLabel(target.label);
      });

      ScrollTrigger.refresh();

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", refreshHandler);
        timeline.scrollTrigger?.kill();
        timeline.kill();
        gsap.set(gift, { clearProps: "transform" });
      };
    });

    return () => media.revert();
  }, { scope: landingShellRef });

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
    <div className="page-shell auth-shell snap-landing-shell" ref={landingShellRef}>
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
        ref={giftRef}
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
            <span className="snap-gift-target snap-gift-target-benefits" ref={benefitsGiftTargetRef} aria-hidden="true" />
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
            <span className="snap-gift-target snap-gift-target-flow" ref={flowGiftTargetRef} aria-hidden="true" />
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
                <div className="snap-auth-gift-slot" aria-hidden="true">
                  <span className="snap-gift-target snap-gift-target-auth" ref={authGiftTargetRef} />
                </div>
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
