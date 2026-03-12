export function buildAppUser(sessionUser) {
  if (!sessionUser) {
    return null;
  }

  const firstName = sessionUser.first_name || "";
  const lastName = sessionUser.last_name || "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || sessionUser.email || "Пользователь";

  return {
    id: sessionUser.id,
    name,
    firstName,
    lastName,
    birthday: sessionUser.birthday || "",
    isIncognito: false
  };
}
