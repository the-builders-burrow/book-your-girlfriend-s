import { ImageResponse } from "next/og";

export const alt = "Book Your Girlfriend romantic experience concierge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#fbf3f1",
        color: "#101d2f",
        padding: "58px 64px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          right: -130,
          top: -150,
          borderRadius: "50%",
          background: "#e5aeb5",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          right: 130,
          bottom: -190,
          borderRadius: "50%",
          background: "#e85d4a",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
      }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "#b6264f",
              color: "white",
              border: "3px solid #101d2f",
              boxShadow: "7px 7px 0 #101d2f",
              fontSize: 28,
            }}
          >
            BYG
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            BOOK YOUR GIRLFRIEND
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#b6264f",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            ONE BRIEF · AN UNFORGETTABLE GESTURE
          </div>
          <div
            style={{
              maxWidth: 920,
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              fontSize: 80,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: -4,
              textTransform: "uppercase",
            }}
          >
            Make her feel chosen.
            <span style={{ color: "#e85d4a" }}>
              We orchestrate the details.
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {["DAYTONA", "FIREWORKS", "COPILOTKIT", "BRAINTRUST", "ELEVENLABS"].map(
            (label) => (
              <span
                key={label}
                style={{
                  display: "flex",
                  padding: "10px 15px",
                  border: "2px solid #101d2f",
                  background: "#fffdf8",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {label}
              </span>
            ),
          )}
        </div>
      </div>
    </div>,
    size,
  );
}
