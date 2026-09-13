import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d111d",
          borderRadius: 8,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#ff6a12",
            fontFamily: "sans-serif",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}
