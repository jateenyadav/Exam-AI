import { execSync } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * A MongoDB replica set for one test file (Prisma needs a replica set).
 * CI starts a real `mongo` container and passes TEST_MONGO_URL; locally an
 * in-memory replica set is started, so `npm run test:integration` needs no setup.
 */
export async function startDatabase(dbName: string): Promise<{ uri: string; stop: () => Promise<unknown> }> {
  const external = process.env.TEST_MONGO_URL;
  if (external) {
    const url = new URL(external);
    url.pathname = `/${dbName}`; // one database per test file
    return { uri: url.toString(), stop: async () => undefined };
  }
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  return { uri: replSet.getUri(dbName), stop: () => replSet.stop() };
}

/**
 * Runs a CLI step with a hard timeout. A stuck child process blocks the whole
 * test worker (no Vitest timeout can fire), so it must fail on its own — with
 * its output attached.
 */
export function sh(cmd: string, extraEnv: Record<string, string> = {}, timeoutMs = 120_000): string {
  try {
    return execSync(cmd, {
      env: { ...process.env, ...extraEnv },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
  } catch (err) {
    const e = err as { message: string; stdout?: string; stderr?: string };
    throw new Error([`\`${cmd}\` failed: ${e.message}`, e.stdout, e.stderr].filter(Boolean).join("\n"));
  }
}
