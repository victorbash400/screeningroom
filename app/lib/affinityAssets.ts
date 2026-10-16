export type AffinityAsset = {
  src: string;
  kind: "person" | "music" | "film" | "book" | "photo" | "game";
};
export const affinityPeople: AffinityAsset[] = Array.from(
  { length: 8 },
  (_, index) => ({
    src: `/auth/people-${String(index + 1).padStart(2, "0")}.webp`,
    kind: "person",
  }),
);
export const affinityMedia: AffinityAsset[] = [
  { src: "/auth/media-01.webp", kind: "music" },
  { src: "/auth/media-02.webp", kind: "film" },
  { src: "/auth/media-03.webp", kind: "film" },
  { src: "/auth/media-04.webp", kind: "music" },
  { src: "/auth/media-05.webp", kind: "book" },
  { src: "/auth/media-06.webp", kind: "music" },
  { src: "/auth/media-07.webp", kind: "photo" },
  { src: "/auth/media-08.webp", kind: "game" },
];
