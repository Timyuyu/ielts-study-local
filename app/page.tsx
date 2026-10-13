import { StudyApp } from "./StudyApp";
import {
  getChatGPTUser,
  requireChatGPTUser,
  type ChatGPTUser,
} from "./chatgpt-auth";

export const dynamic = "force-dynamic";

const LOCAL_USER: ChatGPTUser = {
  displayName: "本地学习者",
  email: "local@ielts-route.test",
  fullName: "本地学习者",
};

async function getAccountId(email: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export default async function Home() {
  const localMode = process.env.REQUIRE_LOGIN !== "true";
  const user = localMode
    ? (await getChatGPTUser()) ?? LOCAL_USER
    : await requireChatGPTUser("/");
  return (
    <StudyApp
      accountId={await getAccountId(user.email)}
      accountName={user.displayName}
      localMode={localMode}
    />
  );
}
