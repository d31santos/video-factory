import { z } from "zod";
import { zColor } from "@remotion/zod-types";

// One spoken/визуальная scene in the storyboard.
export const sceneSchema = z.object({
  text: z.string(),                 // on-screen scene text / label
  visual: z.string(),               // asset path under public/, OR a hex color / "gradient"
  durationSec: z.number().min(0.5), // how long this scene is on screen
});

// One word with its timing, produced by Whisper (--word_timestamps True).
export const captionSchema = z.object({
  word: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().min(0),
});

// Brand palette — defaults mirror RULES.md `## Brand`. All overridable per-video.
export const brandSchema = z.object({
  bg: zColor(),
  text: zColor(),
  accent1: zColor(),   // hook + active caption word
  accent2: zColor(),   // CTA
  captionBackdrop: z.string(), // rgba() string, kept as plain string for alpha control
  fontFamily: z.string(),
});

export const formatKeySchema = z.enum(["landscape", "vertical", "square"]);

export const videoSchema = z.object({
  hook: z.string(),
  scenes: z.array(sceneSchema),
  cta: z.string(),
  captions: z.array(captionSchema),
  audioSrc: z.string().nullable(), // path under public/ (staticFile) or null (silent preview)
  brand: brandSchema,
  format: formatKeySchema.default("vertical"),
});

// Canonical format dimensions (RULES.md Formats table). 30fps, h264, yuv420p for all.
export type FormatKey = z.infer<typeof formatKeySchema>;
export const FORMATS: Record<FormatKey, { width: number; height: number }> = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

export type VideoProps = z.infer<typeof videoSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Caption = z.infer<typeof captionSchema>;
export type Brand = z.infer<typeof brandSchema>;

// Clinic of AI brand (RULES.md ## Brand) — light/cream theme from the company site,
// swiss grotesque type. Contrast-verified: #a14000 on #fff8f3 = 6.15:1 (R9 ok);
// #ff7a32 fails 4.5:1 and is decoration-only, never text.
export const defaultBrand: Brand = {
  bg: "#fff8f3",              // warm cream surface
  text: "#000000",            // primary ink
  accent1: "#a14000",         // deep orange — hook + active caption word
  accent2: "#000000",         // CTA pill (black pill, cream text — like site buttons)
  captionBackdrop: "rgba(255,255,255,0.88)", // white card on cream
  fontFamily:
    '"Helvetica Neue", Helvetica, "Neue Haas Grotesk Text", Arial, sans-serif',
};

// Scene surface rotation (build_brief + defaults): the site's accent surfaces.
export const brandSceneSurfaces = [
  "#dde8dc", // mint
  "#fde4d0", // peach
  "#dce8ee", // sky
  "#e3dceb", // lilac
  "#fcd6cf", // blush
];
