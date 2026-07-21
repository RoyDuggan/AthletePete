/**
 * One-off backfill: rename saved sessions to the reference string derived from
 * their AiM header metadata ("<session> - <vehicle> - <YYYY-MM-DD HH:MM>").
 *
 * Sessions stored before reference-naming was added kept the old stripped-filename
 * name. This re-parses each stored file and updates `name` to its reference so the
 * saved-sessions list matches new uploads. Sessions whose file is missing or has no
 * usable metadata are left untouched.
 *
 * Run once with:  npx ts-node src/scripts/backfillSessionNames.ts
 */
import "dotenv/config";
import fs from "fs";
import path from "path";

import { prisma } from "../db";
import { parseAimCsv } from "../services/aimCsvParser";

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

async function main() {
  const sessions = await prisma.session.findMany({
    select: { id: true, name: true, storageKey: true },
  });

  let updated = 0;
  let missing = 0;
  let unchanged = 0;

  for (const session of sessions) {
    const filePath = path.join(UPLOADS_DIR, path.basename(session.storageKey));

    if (!fs.existsSync(filePath)) {
      missing++;
      console.warn(`skip (file missing): ${session.storageKey}`);
      continue;
    }

    let reference = "";
    try {
      reference = parseAimCsv(fs.readFileSync(filePath, "utf-8")).reference.trim();
    } catch (error) {
      console.warn(`skip (parse failed): ${session.storageKey}`, error);
      continue;
    }

    if (!reference || reference === session.name) {
      unchanged++;
      continue;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { name: reference },
    });
    updated++;
    console.log(`${session.name}  ->  ${reference}`);
  }

  console.log(
    `\nDone. ${updated} renamed, ${unchanged} already current, ${missing} file(s) missing, of ${sessions.length} total.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
