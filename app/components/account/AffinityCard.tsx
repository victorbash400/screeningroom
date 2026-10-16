import { BookOpen, Clapperboard, Music2 } from "lucide-react";

export default function AffinityCard({
  asset,
  width,
  cropId,
}: {
  asset: string;
  width: number;
  cropId: string;
}) {
  const type = asset.startsWith("film-")
    ? "film"
    : asset.startsWith("album-")
      ? "album"
      : asset.startsWith("book-")
        ? "book"
        : "person";
  const height = width * (type === "film" ? 0.75 : type === "album" ? 1 : 1.24);
  const Icon =
    type === "film" ? Clapperboard : type === "album" ? Music2 : BookOpen;
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
        href={`/auth/${asset}.webp`}
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
