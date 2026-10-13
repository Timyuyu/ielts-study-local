import { eq } from "drizzle-orm";
import { studySnapshots } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const MAX_SNAPSHOT_BYTES = 1_000_000;

async function getUserEmail(): Promise<string | null> {
  const user = await getChatGPTUser();
  return user?.email.trim().toLowerCase() ?? null;
}

async function getStudyDb() {
  const { getDb } = await import("../../../db");
  return getDb();
}

function isSnapshotPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return (
    snapshot.version === 1 &&
    (snapshot.profile === null || typeof snapshot.profile === "object") &&
    Boolean(snapshot.daily) &&
    typeof snapshot.daily === "object" &&
    Array.isArray(snapshot.attempts) &&
    Boolean(snapshot.vocabulary) &&
    typeof snapshot.vocabulary === "object" &&
    Array.isArray(snapshot.savedWords) &&
    Boolean(snapshot.drafts) &&
    typeof snapshot.drafts === "object"
  );
}

export async function GET() {
  const userEmail = await getUserEmail();
  if (!userEmail) {
    return Response.json({ error: "请先登录后再读取学习记录。" }, { status: 401 });
  }

  try {
    const db = await getStudyDb();
    const [row] = await db
      .select({
        snapshot: studySnapshots.snapshot,
        updatedAt: studySnapshots.updatedAt,
      })
      .from(studySnapshots)
      .where(eq(studySnapshots.userEmail, userEmail))
      .limit(1);

    return Response.json({
      snapshot: row ? JSON.parse(row.snapshot) : null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取学习记录失败";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userEmail = await getUserEmail();
  if (!userEmail) {
    return Response.json({ error: "请先登录后再保存学习记录。" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { snapshot?: unknown };
    if (!isSnapshotPayload(payload.snapshot)) {
      return Response.json({ error: "学习记录格式无效。" }, { status: 400 });
    }

    const serialized = JSON.stringify(payload.snapshot);
    if (new TextEncoder().encode(serialized).byteLength > MAX_SNAPSHOT_BYTES) {
      return Response.json({ error: "学习记录超过可保存大小。" }, { status: 413 });
    }

    const updatedAt = new Date().toISOString();
    const db = await getStudyDb();
    await db
      .insert(studySnapshots)
      .values({ userEmail, snapshot: serialized, updatedAt })
      .onConflictDoUpdate({
        target: studySnapshots.userEmail,
        set: { snapshot: serialized, updatedAt },
      });

    return Response.json({ updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存学习记录失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
