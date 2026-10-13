import { toIPA } from "phonemize";

export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get("text")?.trim() ?? "";
  if (!text || text.length > 120) {
    return Response.json({ error: "Invalid text" }, { status: 400 });
  }

  try {
    const transcription = toIPA(text, "en-US").trim().replace(/^\/+|\/+$/g, "");
    return Response.json({ phonetic: transcription ? `/${transcription}/` : "/—/" });
  } catch {
    return Response.json({ phonetic: "/—/" });
  }
}
