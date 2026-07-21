import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing using Node's built-in scrypt (no native dependency, so it
 * builds cleanly in the Docker image). Stored as `scrypt$<salt>$<hashHex>`.
 */
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, salt, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;

  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");

  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  );
}
