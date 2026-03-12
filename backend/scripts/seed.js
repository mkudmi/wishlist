import crypto from "crypto";
import { pool } from "../src/db.js";

const defaultWishes = [
  {
    title: "Наушники с шумоподавлением",
    note: "Для работы, прогулок и путешествий. Люблю минималистичный дизайн и мягкие амбушюры.",
    tag: "Техника",
    price: "15 000-25 000 руб."
  },
  {
    title: "LEGO или красивый конструктор",
    note: "Что-то атмосферное, что можно собрать вечером под музыку и потом оставить как декор.",
    tag: "Хобби",
    price: "5 000-15 000 руб."
  },
  {
    title: "Сертификат в книжный магазин",
    note: "Идеальный вариант, если не хочется угадывать с конкретной книгой.",
    tag: "Книги",
    price: "2 000-5 000 руб."
  }
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

async function run() {
  const { rows: userRows } = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", ["demo@wishlist.local"]);

  let userId = userRows[0]?.id || null;
  if (!userId) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, birthday)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id;`,
      ["demo@wishlist.local", hashPassword("demo12345"), "Demo", "Owner", "1995-05-20"]
    );
    userId = rows[0].id;
  }

  const { rows: wishlistRows } = await pool.query("SELECT id FROM wishlists WHERE owner_id = $1 LIMIT 1", [userId]);

  let wishlistId = wishlistRows[0]?.id || null;
  if (!wishlistId) {
    const { rows } = await pool.query(
      `INSERT INTO wishlists (owner_id, title, celebration_type, is_public)
       VALUES ($1, $2, 'birthday', true)
       RETURNING id;`,
      [userId, "Демо-вишлист"]
    );
    wishlistId = rows[0].id;
  }

  const { rows: wishesCountRows } = await pool.query("SELECT COUNT(*)::int AS count FROM wishes WHERE wishlist_id = $1", [wishlistId]);

  if (wishesCountRows[0].count === 0) {
    for (const wish of defaultWishes) {
      await pool.query(
        `INSERT INTO wishes (wishlist_id, title, note, tag, price, url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [wishlistId, wish.title, wish.note, wish.tag, wish.price, ""]
      );
    }
  }

  await pool.end();
  console.log("Seed completed");
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
