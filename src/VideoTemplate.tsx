import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Brand, Caption, Scene, VideoProps } from "./schema";

// Canvas + safe-area constants (see RULES.md R8/R9).
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;

const EDGE_SAFE = 120;                       // R8: ≥120px from edges
const BOTTOM_RESERVED = 300;                 // R8: nothing in bottom 300px
const CAPTION_BASELINE = VIDEO_HEIGHT - BOTTOM_RESERVED - 60; // sits above reserved zone

// Total duration in frames from the scene storyboard (source of truth for length).
export const totalDurationInFrames = (props: VideoProps): number => {
  const scenesSec = props.scenes.reduce((a, s) => a + s.durationSec, 0);
  // Ensure captions/audio aren't cut off: extend to the last caption if longer.
  const lastCaptionSec =
    props.captions.length > 0
      ? Math.max(...props.captions.map((c) => c.endMs)) / 1000
      : 0;
  const seconds = Math.max(scenesSec, lastCaptionSec);
  return Math.max(1, Math.round(seconds * VIDEO_FPS));
};

const isImagePath = (v: string) =>
  v.includes("/") || /\.(png|jpe?g|webp|gif|mp4|mov)$/i.test(v);

const isHexColor = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

// ---- Scene background (continuous motion → helps R5) ----
const SceneLayer: React.FC<{ scene: Scene; brand: Brand }> = ({
  scene,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in/out at scene edges for a clear visual change between scenes.
  const fade = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Slow ken-burns zoom so something moves every frame.
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.12], {
    extrapolateRight: "clamp",
  });

  let background: React.ReactNode;
  if (isImagePath(scene.visual)) {
    background = (
      <Img
        src={staticFile(scene.visual)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    );
  } else {
    const base = isHexColor(scene.visual) ? scene.visual : brand.accent2;
    background = (
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          background: `radial-gradient(120% 120% at 50% 30%, ${base}33 0%, ${brand.bg} 70%)`,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: brand.bg }}>
      {background}
      {/* Scene label — kept inside the horizontal safe area, upper third. */}
      {scene.text ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: 620,
            paddingLeft: EDGE_SAFE,
            paddingRight: EDGE_SAFE,
          }}
        >
          <div
            style={{
              color: brand.text,
              fontFamily: brand.fontFamily,
              fontSize: 64,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.1,
              textShadow: "0 4px 24px rgba(0,0,0,0.6)",
            }}
          >
            {scene.text}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---- Hook overlay (visible in the first ~2s → R4) ----
const HookOverlay: React.FC<{ hook: string; brand: Brand }> = ({
  hook,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [-40, 0]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 220,
        paddingLeft: EDGE_SAFE,
        paddingRight: EDGE_SAFE,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity: enter,
          color: brand.accent1,
          fontFamily: brand.fontFamily,
          fontSize: 88,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.05,
          textShadow: "0 6px 30px rgba(0,0,0,0.7)",
        }}
      >
        {hook}
      </div>
    </AbsoluteFill>
  );
};

// ---- Word-timed caption band (R7/R8/R9) ----
const Captions: React.FC<{ captions: Caption[]; brand: Brand }> = ({
  captions,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tMs = (frame / fps) * 1000;

  if (captions.length === 0) return null;

  // Active word = current time falls in [startMs, endMs).
  let active = captions.findIndex((c) => tMs >= c.startMs && tMs < c.endMs);
  if (active === -1) {
    // between words: stick to the most recent word already started
    for (let i = captions.length - 1; i >= 0; i--) {
      if (tMs >= captions[i].startMs) {
        active = i;
        break;
      }
    }
  }
  if (active === -1) active = 0;

  // Sliding window of a few words around the active one so text never overflows.
  const start = Math.max(0, active - 2);
  const end = Math.min(captions.length, active + 4);
  const windowWords = captions.slice(start, end);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingLeft: EDGE_SAFE,
        paddingRight: EDGE_SAFE,
        paddingBottom: VIDEO_HEIGHT - CAPTION_BASELINE,
      }}
    >
      <div
        style={{
          maxWidth: VIDEO_WIDTH - EDGE_SAFE * 2,
          background: brand.captionBackdrop,
          borderRadius: 24,
          padding: "24px 36px",
          display: "flex",
          flexWrap: "wrap",
          gap: "0 18px",
          justifyContent: "center",
        }}
      >
        {windowWords.map((c, i) => {
          const isActive = start + i === active;
          return (
            <span
              key={`${c.word}-${start + i}`}
              style={{
                color: isActive ? brand.accent1 : brand.text,
                fontFamily: brand.fontFamily,
                fontSize: 76, // R9: ≥60px
                fontWeight: isActive ? 900 : 700,
                lineHeight: 1.15,
              }}
            >
              {c.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- CTA end card (last ~2.5s → R6) ----
const CtaCard: React.FC<{ cta: string; brand: Brand }> = ({ cta, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: `${brand.bg}E6`,
        paddingLeft: EDGE_SAFE,
        paddingRight: EDGE_SAFE,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
          opacity: enter,
          color: brand.bg,
          background: brand.accent2,
          fontFamily: brand.fontFamily,
          fontSize: 72,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "40px 56px",
          borderRadius: 32,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

export const VideoTemplate: React.FC<VideoProps> = ({
  hook,
  scenes,
  cta,
  captions,
  audioSrc,
  brand,
}) => {
  const { durationInFrames } = useVideoConfig();

  // CTA occupies the final ~2.5s; hook occupies the first ~2s.
  const ctaFrames = Math.min(Math.round(2.5 * VIDEO_FPS), durationInFrames);
  const hookFrames = Math.min(Math.round(2 * VIDEO_FPS), durationInFrames);

  // Lay scenes back-to-back.
  let cursor = 0;
  const sceneSeqs = scenes.map((scene, i) => {
    const from = cursor;
    const len = Math.max(1, Math.round(scene.durationSec * VIDEO_FPS));
    cursor += len;
    return (
      <Sequence key={i} from={from} durationInFrames={len}>
        <SceneLayer scene={scene} brand={brand} />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg }}>
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}

      {/* Scene backgrounds */}
      {sceneSeqs}

      {/* Hook, only at the start */}
      <Sequence durationInFrames={hookFrames}>
        <HookOverlay hook={hook} brand={brand} />
      </Sequence>

      {/* Captions run until the CTA takes over (so they don't bleed under it) */}
      <Sequence durationInFrames={durationInFrames - ctaFrames}>
        <Captions captions={captions} brand={brand} />
      </Sequence>

      {/* CTA end card */}
      <Sequence from={durationInFrames - ctaFrames} durationInFrames={ctaFrames}>
        <CtaCard cta={cta} brand={brand} />
      </Sequence>
    </AbsoluteFill>
  );
};
