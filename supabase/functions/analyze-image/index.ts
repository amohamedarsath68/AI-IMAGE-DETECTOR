import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an advanced AI image authenticity analyzer.

Your task is to evaluate whether an input image is AI-generated or a real photograph.

Analyze the image for:
- Texture consistency (skin, surfaces, noise patterns)
- Lighting realism and shadow accuracy
- Anatomical correctness (hands, eyes, symmetry)
- Background coherence and depth
- Artifacts (blurring, warping, strange edges, duplicated elements)

Rules:
- ai_probability + real_probability MUST equal 100.
- If uncertain, reflect that with values closer to 50/50.
- Be honest, avoid overconfidence, do not claim certainty.
- Keep the explanation simple, 2-4 sentences, friendly for a general audience.
- verdict must be one of: "Likely AI-generated", "Likely Real", "Uncertain".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing imageDataUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and return your verdict via the tool." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_authenticity",
              description: "Report the authenticity analysis of the image.",
              parameters: {
                type: "object",
                properties: {
                  ai_probability: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description: "Probability that the image is AI-generated (0-100).",
                  },
                  real_probability: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description: "Probability that the image is a real photograph (0-100).",
                  },
                  verdict: {
                    type: "string",
                    enum: ["Likely AI-generated", "Likely Real", "Uncertain"],
                  },
                  confidence_reason: {
                    type: "string",
                    description: "2-4 sentence plain-language explanation of key visual indicators.",
                  },
                  signals: {
                    type: "array",
                    description: "Short bullet observations the model relied on.",
                    items: { type: "string" },
                  },
                },
                required: ["ai_probability", "real_probability", "verdict", "confidence_reason", "signals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_authenticity" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Model did not return a structured analysis." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return new Response(
        JSON.stringify({ error: "Invalid analysis format." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize so they sum to 100
    let ai = Math.round(Number(parsed.ai_probability) || 0);
    let real = Math.round(Number(parsed.real_probability) || 0);
    const total = ai + real;
    if (total !== 100) {
      if (total === 0) { ai = 50; real = 50; }
      else { ai = Math.round((ai / total) * 100); real = 100 - ai; }
    }

    return new Response(
      JSON.stringify({
        ai_probability: ai,
        real_probability: real,
        verdict: parsed.verdict,
        confidence_reason: parsed.confidence_reason,
        signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
