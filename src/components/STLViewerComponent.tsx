import type { CSSProperties } from "react";
import { StlViewer } from "react-stl-viewer";

type STLViewerComponentProps = {
  url: string;
};

const style: CSSProperties = {
  width: "100%",
  height: "420px",
  backgroundColor: "#f0f0f0",
  borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.12)",
};

export default function STLViewerComponent({ url }: STLViewerComponentProps) {
  return (
    <StlViewer
      url={url}
      style={style}
      orbitControls
      shadows
      showAxes
      modelProps={{
        color: "#f4ab22",
        scale: 1,
      }}
      cameraProps={{
        initialPosition: {
          latitude: 0.9,
          longitude: 0.2,
          distance: 3,
        },
      }}
    />
  );
}
