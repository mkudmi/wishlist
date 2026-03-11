export function buildAppUser(sessionUser) {
  if (!sessionUser) {
    return null;
  }

  const firstName = sessionUser.user_metadata?.first_name || "";
  const lastName = sessionUser.user_metadata?.last_name || "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || sessionUser.email || "Пользователь";

  return {
    id: sessionUser.id,
    name,
    firstName,
    lastName,
    birthday: sessionUser.user_metadata?.birth_date || "",
    isIncognito: false
  };
}
