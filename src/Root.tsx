import "./index.css";
import { Composition } from "remotion";
import { VideoTemplate, VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT, totalDurationInFrames } from "./VideoTemplate";
import { videoSchema, defaultBrand, type VideoProps } from "./schema";

// Self-contained demo props so `remotion render` works with zero setup.
// Real runs overwrite these per topic (WORKFLOW.md steps 2–5).
const demoProps: VideoProps = {
  hook: "AI saves clinicians hours",
  scenes: [
    { text: "AI drafts your visit notes", visual: "#00E0B8", durationSec: 3 },
    { text: "It triages routine messages", visual: "#FFD400", durationSec: 3 },
    { text: "Guidelines, right when you need them", visual: "#3A7BFF", durationSec: 3 },
    { text: "", visual: "#0B0B0F", durationSec: 3 },
  ],
  cta: "Follow for one AI workflow a day",
  captions: [
    { word: "AI", startMs: 0, endMs: 700 },
    { word: "saves", startMs: 700, endMs: 1400 },
    { word: "clinicians", startMs: 1400, endMs: 2200 },
    { word: "hours", startMs: 2200, endMs: 3000 },
    { word: "every", startMs: 3000, endMs: 3700 },
    { word: "single", startMs: 3700, endMs: 4400 },
    { word: "day.", startMs: 4400, endMs: 5200 },
    { word: "Here", startMs: 5200, endMs: 5800 },
    { word: "are", startMs: 5800, endMs: 6300 },
    { word: "three", startMs: 6300, endMs: 7000 },
    { word: "that", startMs: 7000, endMs: 7600 },
    { word: "actually", startMs: 7600, endMs: 8500 },
    { word: "work", startMs: 8500, endMs: 9200 },
    { word: "in", startMs: 9200, endMs: 9600 },
    { word: "your", startMs: 9600, endMs: 10200 },
    { word: "clinic.", startMs: 10200, endMs: 11200 },
  ],
  audioSrc: null,
  brand: defaultBrand,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={VideoTemplate}
        schema={videoSchema}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={demoProps}
        durationInFrames={totalDurationInFrames(demoProps)}
        calculateMetadata={({ props }) => ({
          durationInFrames: totalDurationInFrames(props),
        })}
      />
    </>
  );
};
