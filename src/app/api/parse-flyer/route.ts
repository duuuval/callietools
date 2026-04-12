import { NextRequest, NextResponse } from "next/server";

const OPENAI_MODEL = "gpt-4.1-mini";

function buildSystemPrompt(req: NextRequest) {
  const tz = req.headers.get('x-vercel-ip-timezone') || 'America/New_York';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: tz
  });

  return `You are an event extraction assistant. Today's date is ${today}. The user will provide an image of a flyer, schedule, or calendar. Extract all events you can find and return them as structured JSON.

Rules:
- Split multi-session events into separate event objects
- When an event is described as recurring on a specific day of the week (e.g. "Mondays", "every Wednesday", "Fridays, Saturdays, Sundays") within a named month, expand it into separate events for each occurrence in that month. Set confidence to "medium" on expanded instances.
- Use YYYY-MM-DD for all dates
- Use HH:MM (24-hour) for all times, or null if no time is given
- Set all_day to true only if there is genuinely no time component
- If end time is not specified, set end_time to null (do not guess)
- Preserve location details even if informal (e.g. "gym", "Room 204")
- Infer the year from context if not explicit — assume the nearest upcoming occurrence
- Always populate source_text with the original text this event was parsed from
- Set confidence to "high", "medium", or "low" per event
- If anything is ambiguous across multiple events, note it in parse_notes
- If you cannot find any events, return an empty events array and explain in parse_notes

Return ONLY valid JSON matching this exact schema, no markdown, no explanation:
{
  "calendar_name": "string — inferred from the flyer content",
  "events": [
    {
      "title": "string",
      "start_date": "YYYY-MM-DD",
      "start_time": "HH:MM or null",
      "end_time": "HH:MM or null",
      "all_day": false,
      "location": "string or null",
      "description": "string or null",
      "source_text": "string",
      "confidence": "high | medium | low"
    }
  ],
  "parse_notes": "string or null"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPEG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please upload an image under 10MB." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const userContent = [
      {
        type: "text",
        text: "Please extract all events from this flyer or schedule.",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${file.type};base64,${base64}`,
          detail: "high",
       },
      },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 4000,
        messages: [
          { role: "system", content: buildSystemPrompt(req) },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { error: "Failed to parse the flyer. Please try again." },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse OpenAI JSON response:", raw);
      return NextResponse.json(
        { error: "Couldn't read the response from the parser. Please try again." },
        { status: 502 }
      );
    }

    // Validate we got something useful
    if (!parsed.events || !Array.isArray(parsed.events)) {
      return NextResponse.json(
        { error: "No events could be extracted. Try a sharper image or add events manually." },
        { status: 422 }
      );
    }

    if (parsed.events.length === 0) {
      return NextResponse.json(
        {
          error:
            parsed.parse_notes ||
            "We couldn't find any events in that image. Try a sharper photo, or add your events manually below.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      calendar_name: parsed.calendar_name ?? null,
      events: parsed.events,
      parse_notes: parsed.parse_notes ?? null,
    });
  } catch (err) {
    console.error("parse-flyer error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
