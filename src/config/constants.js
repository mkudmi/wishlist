export const CONTRIBUTIONS_KEY = "birthday-wishlist-contributions-v1";

export const celebrationOptions = [
  { value: "birthday", label: "Мой день рождения" },
  { value: "housewarming", label: "Новоселье" },
  { value: "wedding", label: "Свадьба" },
  { value: "anniversary", label: "Годовщина" },
  { value: "new_year", label: "Новый год" },
  { value: "custom", label: "Свой вариант" }
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
  url: ""
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
