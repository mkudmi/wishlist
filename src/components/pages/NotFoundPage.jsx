export function NotFoundPage() {
  return (
    <div className="page-shell auth-shell snap-landing-shell not-found-shell">
      <div className="snap-landing-bg snap-landing-bg-left" />
      <div className="snap-landing-bg snap-landing-bg-right" />

      <main className="not-found-main">
        <div className="not-found-gift" aria-hidden="true">
          <img src="/branding/gift-box.webp" alt="" width={1022} height={1022} />
        </div>

        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">
          Этот подарок потерялся по дороге.
          <br />
          Может, его забрал кто-то слишком нетерпеливый.
        </p>

        <a href="/" className="button-primary not-found-button">
          На главную
        </a>
      </main>
    </div>
  );
}
