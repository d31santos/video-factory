/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

// PNG frames are limited-range, so the H.264 output is tagged yuv420p (not the
// full-range yuvj420p that JPEG frames produce) — required by RULES.md R1.
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(enableTailwind);
