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

export const videoSchema = z.object({
  hook: z.string(),
  scenes: z.array(sceneSchema),
  cta: z.string(),
  captions: z.array(captionSchema),
  audioSrc: z.string().nullable(), // path under public/ (staticFile) or null (silent preview)
  brand: brandSchema,
});

export type VideoProps = z.infer<typeof videoSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Caption = z.infer<typeof captionSchema>;
export type Brand = z.infer<typeof brandSchema>;

// Defaults derived from RULES.md ## Brand (placeholder palette).
export const defaultBrand: Brand = {
  bg: "#0B0B0F",
  text: "#FFFFFF",
  accent1: "#FFD400",
  accent2: "#00E0B8",
  captionBackdrop: "rgba(0,0,0,0.55)",
  fontFamily:
    'Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};
