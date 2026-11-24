import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const alt = "CPex — Browser-Native C++17 DSA Experimentation Playground";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoBase64 = readFileSync(
  join(process.cwd(), "public", "logo.png"),
  "base64"
);
const logoSrc = `data:image/png;base64,${logoBase64}`;

const BADGES = [
  "Clang 22 WebAssembly",
  "Interactive DSA Lab",
  "Zero Server Compilation",
  "GitHub Bridge",
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          color: "#f4f4f5",
          padding: "56px 64px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="CPex logo"
            width={92}
            height={92}
            style={{ objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#fafafa",
              }}
            >
              CPex
            </div>
            <div
              style={{
                fontSize: 20,
                color: "#7dd3fc",
              }}
            >
              C++17 / C++20 DSA Laboratory
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              color: "#ffffff",
            }}
          >
            Browser-Native C++17 DSA Experimentation Playground
          </div>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.4,
              color: "#a1a1aa",
            }}
          >
            Compile real C++ inside Web Workers, inspect data structures &amp;
            algorithms step-by-step, and push verified commits to GitHub.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {BADGES.map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "#14141b",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 18,
                color: "#d4d4d8",
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
