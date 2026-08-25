import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = "MARVEL - Timeline del UCM";

const PHASE_DOT_COLORS = [
  "#dc2626",
  "#2563eb",
  "#7c3aed",
  "#16a34a",
  "#d97706",
  "#e7e5e4",
];

const antonFont = readFile(path.join(process.cwd(), "src/lib/fonts/Anton-Regular.ttf"));

export async function renderOgImage() {
  const fontData = await antonFont;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          backgroundImage: "radial-gradient(circle at 50% 38%, #1c1c1c 0%, #000000 68%)",
          fontFamily: "Anton",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ED1D24",
            fontSize: 176,
            letterSpacing: -3,
            transform: "skewX(-6deg)",
          }}
        >
          MARVEL
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 4,
            color: "#f4f4f5",
            fontSize: 38,
            letterSpacing: 12,
          }}
        >
          TIMELINE DEL UCM
        </div>
        <div style={{ display: "flex", marginTop: 48, gap: 20 }}>
          {PHASE_DOT_COLORS.map((color) => (
            <div
              key={color}
              style={{
                display: "flex",
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: color,
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: [{ name: "Anton", data: fontData, style: "normal", weight: 400 }],
    },
  );
}
