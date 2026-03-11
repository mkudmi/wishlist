import { supabase } from "../supabase";

export function fetchWishlistsByOwner(ownerId) {
  return supabase
    .from("wishlists")
    .select("id, title, celebration_type, custom_celebration, event_date, share_token, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
}

export function fetchWishesByWishlist(wishlistId) {
  return supabase
    .from("wishes")
    .select("id, wishlist_id, title, note, tag, price, url, created_at")
    .eq("wishlist_id", wishlistId)
    .order("created_at", { ascending: false });
}

export function fetchSharedWishesByToken(token) {
  return supabase.rpc("get_shared_wishlist", { p_share_token: token });
}

export function createWishlistRecord(payload) {
  return supabase
    .from("wishlists")
    .insert(payload)
    .select("id, title, celebration_type, custom_celebration, event_date, share_token, created_at")
    .single();
}

export function deleteWishlistRecord(wishlistId) {
  return supabase.from("wishlists").delete().eq("id", wishlistId);
}

export function createWishRecord(payload) {
  return supabase
    .from("wishes")
    .insert(payload)
    .select("id, wishlist_id, title, note, tag, price, url")
    .single();
}

export function updateWishRecord(wishId, payload) {
  return supabase
    .from("wishes")
    .update(payload)
    .eq("id", wishId)
    .select("id, title, note, tag, price, url")
    .single();
}

export function deleteWishRecord(wishId) {
  return supabase.from("wishes").delete().eq("id", wishId);
}

export function updateProfileRecord(userId, payload) {
  return supabase.from("users").update(payload).eq("id", userId);
}
