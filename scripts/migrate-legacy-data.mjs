// One-off, idempotent migration for data written before the v2 schema.
//
//   1. JSON that was stored as strings            → native JSON values
//   2. Empty report lists (null)                   → []
//   3. Enum fields with off-list values            → normalised (e.g. "Hard" → "hard", "numerical" → "integer")
//   4. Duplicate answers for the same question     → keep the latest (needed for the new unique index)
//   5. AppSettings collection (old in-DB API keys)  → dropped; secrets now live only in env vars
//
// Usage:
//   DRY_RUN=1 DATABASE_URL=... node scripts/migrate-legacy-data.mjs   # report only, no writes
//   DATABASE_URL=... node scripts/migrate-legacy-data.mjs             # apply
//   DATABASE_URL=... npx prisma db push                               # then create the new indexes
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = Boolean(process.env.DRY_RUN);
const PAGE = 500;

const run = (cmd) => prisma.$runCommandRaw(cmd);
const write = (cmd) => (DRY ? Promise.resolve() : run(cmd));
const idOf = (doc) => doc._id?.$oid ?? doc._id;

/** Iterate every document matching `filter`, paginated by _id so large collections are fully covered. */
async function* scan(collection, filter, projection) {
  let lastId = null;
  for (;;) {
    const q = lastId ? { $and: [filter, { _id: { $gt: { $oid: lastId } } }] } : filter;
    const res = await run({ find: collection, filter: q, projection, sort: { _id: 1 }, limit: PAGE });
    const docs = res.cursor.firstBatch;
    if (docs.length === 0) return;
    for (const doc of docs) yield doc;
    lastId = idOf(docs[docs.length - 1]);
  }
}

const setField = (collection, doc, field, value) =>
  write({ update: collection, updates: [{ q: { _id: { $oid: idOf(doc) } }, u: { $set: { [field]: value } } }] });

async function convertStrings(collection, field) {
  let seen = 0;
  let converted = 0;
  for await (const doc of scan(collection, { [field]: { $type: "string" } }, { [field]: 1 })) {
    seen++;
    let value;
    try {
      value = JSON.parse(doc[field]);
    } catch {
      continue; // not JSON — a plain string is still a valid Json value
    }
    await setField(collection, doc, field, value);
    converted++;
  }
  console.log(`${collection}.${field}: ${converted}/${seen} string → JSON`);
}

async function fillEmptyLists(collection, fields) {
  for (const field of fields) {
    const filter = { $or: [{ [field]: null }, { [field]: { $exists: false } }] };
    const res = DRY
      ? await run({ count: collection, query: filter })
      : await run({ update: collection, updates: [{ q: filter, u: { $set: { [field]: [] } }, multi: true }] });
    console.log(`${collection}.${field}: ${res.n ?? 0} empty → []`);
  }
}

const slug = (v) => String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

async function normaliseEnum(collection, field, allowed, { aliases = {}, fallback }) {
  const counts = {};
  for await (const doc of scan(collection, { [field]: { $nin: allowed } }, { [field]: 1 })) {
    const s = slug(doc[field]);
    const next = aliases[s] ?? (allowed.includes(s) ? s : fallback);
    const label = `${JSON.stringify(doc[field] ?? null)} → ${next ?? "UNRESOLVED"}`;
    counts[label] = (counts[label] ?? 0) + 1;
    if (next) await setField(collection, doc, field, next);
  }
  const entries = Object.entries(counts);
  console.log(`${collection}.${field}: ${entries.length ? entries.map(([k, n]) => `${k} ×${n}`).join(", ") : "ok"}`);
  return entries.some(([k]) => k.endsWith("UNRESOLVED"));
}

async function dedupeAnswers() {
  const res = await run({
    aggregate: "StudentAnswer",
    pipeline: [
      { $sort: { submittedAt: -1, _id: -1 } },
      { $group: { _id: { s: "$sessionId", q: "$questionId" }, ids: { $push: "$_id" }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ],
    cursor: { batchSize: 100_000 },
  });
  const extra = res.cursor.firstBatch.flatMap((g) => g.ids.slice(1)); // keep the newest
  if (extra.length) await write({ delete: "StudentAnswer", deletes: [{ q: { _id: { $in: extra } }, limit: 0 }] });
  console.log(`StudentAnswer: ${extra.length} duplicate answers removed`);
}

async function dropAppSettings() {
  const res = await run({ listCollections: 1, filter: { name: "AppSettings" }, nameOnly: true });
  const exists = res.cursor.firstBatch.length > 0;
  if (exists) await write({ drop: "AppSettings" });
  console.log(`AppSettings: ${exists ? "dropped (old in-database API keys)" : "not present"}`);
}

async function main() {
  console.log(DRY ? "DRY RUN — nothing will be written\n" : "Applying migration\n");

  await convertStrings("ExamSession", "chapters");
  await convertStrings("Question", "options");
  await convertStrings("Question", "subParts");
  for (const f of ["sectionBreakdown", "chapterBreakdown", "strengths", "weaknesses", "recommendations"]) {
    await convertStrings("ExamResult", f);
  }
  await fillEmptyLists("ExamResult", ["strengths", "weaknesses", "recommendations"]);

  const unresolved = [
    await normaliseEnum("Question", "difficulty", ["easy", "medium", "hard"], { fallback: "medium" }),
    await normaliseEnum(
      "Question",
      "type",
      ["mcq", "assertion_reason", "integer", "multiple_correct", "short_answer", "long_answer", "case_based"],
      {
        aliases: {
          numerical: "integer", numeric: "integer", assertion: "assertion_reason", assertion_reasoning: "assertion_reason",
          single_correct: "mcq", multiple_choice: "mcq", multi_correct: "multiple_correct", short: "short_answer",
          long: "long_answer", case_study: "case_based",
        },
        fallback: "short_answer",
      },
    ),
    await normaliseEnum("ExamSession", "status", ["active", "auto_submitted", "completed"], { fallback: "completed" }),
    await normaliseEnum("ExamSession", "mode", ["class11", "class12", "jee_mains", "jee_advanced"], {
      aliases: { class_11: "class11", class_12: "class12", jee_main: "jee_mains", jee: "jee_mains" },
    }),
  ].some(Boolean);

  await dedupeAnswers();
  await dropAppSettings();

  if (unresolved) {
    console.error("\nSome values could not be mapped (marked UNRESOLVED above). Fix them by hand before `prisma db push`.");
    process.exitCode = 2;
  } else {
    console.log(DRY ? "\nDry run complete." : "\nDone. Next: npx prisma db push");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
