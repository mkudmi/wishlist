export const celebrationOptions = [
  { value: "birthday", label: "Мой день рождения" },
  { value: "housewarming", label: "Новоселье" },
  { value: "wedding", label: "Свадьба" },
  { value: "anniversary", label: "Годовщина" },
  { value: "new_year", label: "Новый год" },
  { value: "custom", label: "Свой вариант" }
];

export const defaultWishlistTheme = "sand";

export const wishlistThemes = [
  {
    value: "sand",
    label: "Песок",
    preview: ["#f8d2a8", "#ec9552", "#fffaf2"],
    vars: {
      "--color-ink": "#241f1a",
      "--color-muted": "#54483d",
      "--color-border": "rgba(125, 88, 43, 0.12)",
      "--color-surface": "rgba(255, 252, 247, 0.72)",
      "--color-surface-strong": "rgba(255, 250, 242, 0.92)",
      "--color-accent": "#c96a2c",
      "--color-accent-strong": "#ec9552",
      "--color-accent-deep": "#944717",
      "--color-emerald": "#1c6b59",
      "--color-emerald-soft": "#21463d",
      "--page-background":
        "radial-gradient(circle at top left, rgba(248, 210, 168, 0.55), transparent 38%), radial-gradient(circle at top right, rgba(195, 214, 255, 0.45), transparent 34%), linear-gradient(180deg, #fffaf2 0%, #f5efe5 52%, #efe7db 100%)",
      "--glow-left-color": "rgba(255, 183, 120, 0.7)",
      "--glow-right-color": "rgba(149, 181, 255, 0.55)"
    }
  },
  {
    value: "sage",
    label: "Шалфей",
    preview: ["#c9dcc8", "#7aa88f", "#f3f8f1"],
    vars: {
      "--color-ink": "#1f261f",
      "--color-muted": "#4e5f53",
      "--color-border": "rgba(79, 116, 88, 0.14)",
      "--color-surface": "rgba(244, 249, 241, 0.74)",
      "--color-surface-strong": "rgba(241, 248, 238, 0.92)",
      "--color-accent": "#6f9d7f",
      "--color-accent-strong": "#91bea0",
      "--color-accent-deep": "#446955",
      "--color-emerald": "#5d7a67",
      "--color-emerald-soft": "#2f4739",
      "--page-background":
        "radial-gradient(circle at top left, rgba(201, 220, 200, 0.62), transparent 36%), radial-gradient(circle at top right, rgba(224, 232, 205, 0.42), transparent 34%), linear-gradient(180deg, #f5fbf1 0%, #edf5ea 52%, #e4eee1 100%)",
      "--glow-left-color": "rgba(168, 206, 172, 0.72)",
      "--glow-right-color": "rgba(196, 221, 178, 0.58)"
    }
  },
  {
    value: "berry",
    label: "Ягоды",
    preview: ["#f0c8d2", "#d16d8f", "#fff5f7"],
    vars: {
      "--color-ink": "#271a22",
      "--color-muted": "#6b4b58",
      "--color-border": "rgba(153, 89, 111, 0.14)",
      "--color-surface": "rgba(255, 246, 248, 0.76)",
      "--color-surface-strong": "rgba(255, 243, 246, 0.94)",
      "--color-accent": "#cb6b8d",
      "--color-accent-strong": "#e58dab",
      "--color-accent-deep": "#8d3d5f",
      "--color-emerald": "#7b5864",
      "--color-emerald-soft": "#513641",
      "--page-background":
        "radial-gradient(circle at top left, rgba(240, 200, 210, 0.64), transparent 38%), radial-gradient(circle at top right, rgba(220, 205, 238, 0.36), transparent 34%), linear-gradient(180deg, #fff7f9 0%, #f9edf1 52%, #f1e3e8 100%)",
      "--glow-left-color": "rgba(232, 160, 186, 0.7)",
      "--glow-right-color": "rgba(197, 182, 232, 0.54)"
    }
  },
  {
    value: "sky",
    label: "Небо",
    preview: ["#cde6ff", "#74a7df", "#f4f9ff"],
    vars: {
      "--color-ink": "#1b2430",
      "--color-muted": "#506072",
      "--color-border": "rgba(83, 120, 158, 0.14)",
      "--color-surface": "rgba(246, 250, 255, 0.74)",
      "--color-surface-strong": "rgba(242, 248, 255, 0.94)",
      "--color-accent": "#6c9fd7",
      "--color-accent-strong": "#8db9ec",
      "--color-accent-deep": "#3f6eaa",
      "--color-emerald": "#53799d",
      "--color-emerald-soft": "#2f4c67",
      "--page-background":
        "radial-gradient(circle at top left, rgba(205, 230, 255, 0.62), transparent 38%), radial-gradient(circle at top right, rgba(221, 232, 255, 0.44), transparent 35%), linear-gradient(180deg, #f8fbff 0%, #eef4fb 52%, #e5edf8 100%)",
      "--glow-left-color": "rgba(155, 198, 244, 0.7)",
      "--glow-right-color": "rgba(177, 202, 255, 0.58)"
    }
  },
  {
    value: "midnight",
    label: "Ночь",
    preview: ["#23324a", "#7eb6ff", "#101827"],
    vars: {
      "--color-ink": "#f4f3ef",
      "--color-muted": "rgba(236, 235, 230, 0.76)",
      "--color-border": "rgba(126, 182, 255, 0.18)",
      "--color-surface": "rgba(18, 25, 40, 0.72)",
      "--color-surface-strong": "rgba(16, 23, 36, 0.92)",
      "--color-accent": "#7eb6ff",
      "--color-accent-strong": "#a7cbff",
      "--color-accent-deep": "#dbeaff",
      "--color-emerald": "#89d7c4",
      "--color-emerald-soft": "#c7fff2",
      "--page-background":
        "radial-gradient(circle at top left, rgba(59, 96, 157, 0.42), transparent 34%), radial-gradient(circle at top right, rgba(49, 70, 121, 0.54), transparent 33%), linear-gradient(180deg, #0f1726 0%, #131d2f 50%, #172335 100%)",
      "--glow-left-color": "rgba(74, 130, 214, 0.44)",
      "--glow-right-color": "rgba(89, 142, 224, 0.34)"
    }
  }
];

export const rules = [
  "Если выбираешь вещь сам, лучше в спокойных цветах и без слишком ярких принтов.",
  "Если подарок крупный, можно скооперироваться с кем-то и подарить вместе.",
  "Если сомневаешься, сертификат или просто вклад в мечту всегда работают."
];

export const emptyForm = {
  title: "",
  note: "",
  tag: "",
  price: "",
  url: "",
  imageUrl: ""
};

export const emptyAuthForm = {
  email: "",
  password: "",
  confirmPassword: "",
  birthday: "",
  firstName: "",
  lastName: ""
};

export const emptyProfileForm = {
  firstName: "",
  lastName: "",
  birthday: ""
};
