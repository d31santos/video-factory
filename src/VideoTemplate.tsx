import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Brand, Caption, Scene, VideoProps } from "./schema";

export const VIDEO_FPS = 30;

// Safe-area + sizing derived from the actual composition dimensions, so one component
// serves all three formats (landscape/vertical/square) while satisfying R8/R9.
const layout = (width: number, height: number) => {
  const isVertical = height > width;
  return {
    edge: Math.round(width * 0.11), // ~120px @1080w (R8: >=120px from edges)
    // Vertical platforms reserve the bottom ~300px for UI; landscape/square less.
    bottomReserved: isVertical ? 300 : Math.round(height * 0.14),
    hookSize: Math.max(72, Math.round(width * 0.082)),
    sceneSize: Math.max(52, Math.round(width * 0.06)),
    captionSize: Math.max(60, Math.round(width * 0.07)), // R9: >=60px @1080w
    ctaSize: Math.max(56, Math.round(width * 0.066)),
    hookTop: Math.round(height * 0.09),
  };
};

export const totalDurationInFrames = (props: VideoProps): number => {
  const scenesSec = props.scenes.reduce((a, s) => a + s.durationSec, 0);
  const lastCaptionSec =
    props.captions.length > 0
      ? Math.max(...props.captions.map((c) => c.endMs)) / 1000
      : 0;
  const seconds = Math.max(scenesSec, lastCaptionSec);
  return Math.max(1, Math.round(seconds * VIDEO_FPS));
};

const isVideoPath = (v: string) => /\.(mp4|mov|webm|m4v)$/i.test(v);
const isImagePath = (v: string) =>
  /\.(png|jpe?g|webp|gif)$/i.test(v) || (v.includes("/") && !isVideoPath(v));
const isHexColor = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

const SceneLayer: React.FC<{
  scene: Scene;
  brand: Brand;
  globalFrom: number;
  hideLabelBeforeFrame: number;
}> = ({ scene, brand, globalFrom, hideLabelBeforeFrame }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const L = layout(width, height);
  // Hide this scene's label while the hook overlay owns the opening.
  const showLabel = globalFrom + frame >= hideLabelBeforeFrame;

  const fade = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.12], {
    extrapolateRight: "clamp",
  });

  let background: React.ReactNode;
  if (isVideoPath(scene.visual)) {
    // HyperFrames-generated scene (or any B-roll clip) embedded in the composition.
    background = (
      <OffthreadVideo
        src={staticFile(scene.visual)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  } else if (isImagePath(scene.visual)) {
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
          // Flat brand-surface fill (swiss look); scene-to-scene color change carries R5.
          background: `radial-gradient(140% 140% at 50% 30%, ${base} 0%, ${base} 55%, ${brand.bg} 100%)`,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: brand.bg }}>
      {background}
      {scene.text && showLabel ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            paddingLeft: L.edge,
            paddingRight: L.edge,
          }}
        >
          <div
            style={{
              color: brand.text,
              fontFamily: brand.fontFamily,
              fontSize: L.sceneSize,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.1,
              letterSpacing: "-0.01em", // swiss: flat type, no glow
            }}
          >
            {scene.text}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const HookOverlay: React.FC<{ hook: string; brand: Brand }> = ({
  hook,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [-40, 0]);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: L.hookTop,
        paddingLeft: L.edge,
        paddingRight: L.edge,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity: enter,
          color: brand.accent1,
          fontFamily: brand.fontFamily,
          fontSize: L.hookSize,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.05,
          letterSpacing: "-0.02em", // swiss: flat display type

        }}
      >
        {hook}
      </div>
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ captions: Caption[]; brand: Brand }> = ({
  captions,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const tMs = (frame / fps) * 1000;

  if (captions.length === 0) return null;

  let active = captions.findIndex((c) => tMs >= c.startMs && tMs < c.endMs);
  if (active === -1) {
    for (let i = captions.length - 1; i >= 0; i--) {
      if (tMs >= captions[i].startMs) {
        active = i;
        break;
      }
    }
  }
  if (active === -1) active = 0;

  const start = Math.max(0, active - 2);
  const end = Math.min(captions.length, active + 4);
  const windowWords = captions.slice(start, end);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingLeft: L.edge,
        paddingRight: L.edge,
        paddingBottom: L.bottomReserved + 40,
      }}
    >
      <div
        style={{
          maxWidth: width - L.edge * 2,
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
                fontSize: L.captionSize,
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

const CtaCard: React.FC<{ cta: string; brand: Brand }> = ({ cta, brand }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = layout(width, height);
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: `${brand.bg}E6`,
        paddingLeft: L.edge,
        paddingRight: L.edge,
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
          opacity: enter,
          color: brand.bg,
          background: brand.accent2,
          fontFamily: brand.fontFamily,
          fontSize: L.ctaSize,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "40px 56px",
          borderRadius: 32,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
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

  const ctaFrames = Math.min(Math.round(2.5 * VIDEO_FPS), durationInFrames);
  const hookFrames = Math.min(Math.round(2 * VIDEO_FPS), durationInFrames);

  let cursor = 0;
  const sceneSeqs = scenes.map((scene, i) => {
    const from = cursor;
    const len = Math.max(1, Math.round(scene.durationSec * VIDEO_FPS));
    cursor += len;
    return (
      <Sequence key={i} from={from} durationInFrames={len}>
        <SceneLayer
          scene={scene}
          brand={brand}
          globalFrom={from}
          hideLabelBeforeFrame={hookFrames}
        />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg }}>
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      {sceneSeqs}
      <Sequence durationInFrames={hookFrames}>
        <HookOverlay hook={hook} brand={brand} />
      </Sequence>
      <Sequence durationInFrames={durationInFrames - ctaFrames}>
        <Captions captions={captions} brand={brand} />
      </Sequence>
      <Sequence from={durationInFrames - ctaFrames} durationInFrames={ctaFrames}>
        <CtaCard cta={cta} brand={brand} />
      </Sequence>
    </AbsoluteFill>
  );
};
