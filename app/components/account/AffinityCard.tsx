import { BookOpen, Clapperboard, Music2, Camera, Gamepad2 } from "lucide-react";

import type { AffinityAsset } from "../../lib/affinityAssets";

export default function AffinityCard({
  asset,
  width,
  cropId,
}: {
  asset: AffinityAsset;
  width: number;
  cropId: string;
}) {
  const type = asset.kind;
  const height = width;
  const Icon =
    type === "film"
      ? Clapperboard
      : type === "music"
        ? Music2
        : type === "photo"
          ? Camera
          : type === "game"
            ? Gamepad2
            : BookOpen;
  const iconSize = width < 80 ? 12 : 16;
  return (
    <g data-card>
      <defs>
        <clipPath id={cropId}>
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            rx="3"
          />
        </clipPath>
      </defs>
      <image
        href={asset.src}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${cropId})`}
      />
      {type !== "person" && (
        <Icon
          x={width / 2 - iconSize - 7}
          y={height / 2 - iconSize - 7}
          width={iconSize}
          height={iconSize}
          color="#fff"
          strokeWidth={1.6}
          style={{ filter: "drop-shadow(0 1px 2px #0008)" }}
        />
      )}
    </g>
  );
}
