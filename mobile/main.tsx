import React from "react";
import { createRoot } from "react-dom/client";
import { toIPA } from "phonemize";
import { StudyApp } from "../app/StudyApp";
import { installOfflineSpeech } from "./speech.mjs";
import "../app/globals.css";
import "./mobile.css";

const localFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (url.origin !== window.location.origin) throw new TypeError("本版本使用内置离线资源");
  if (url.pathname === "/api/phonetic") {
    const text = url.searchParams.get("text")?.trim() ?? "";
    if (!text || text.length > 120) return Response.json({ error: "Invalid text" }, { status: 400 });
    try {
      const result = toIPA(text, "en-US").trim().replace(/^\/+|\/+$/g, "");
      return Response.json({ phonetic: result ? `/${result}/` : "/—/" });
    } catch { return Response.json({ phonetic: "/—/" }); }
  }
  return localFetch(input, init);
};
installOfflineSpeech(window);
createRoot(document.getElementById("root")!).render(
  <StudyApp accountId="android-offline" accountName="本地学习者" localMode />,
);
