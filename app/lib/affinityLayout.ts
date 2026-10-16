export const affinityCardCount = 16;
export function affinityLayout(width: number, height: number) {
  const compact = width < 1000;
  const radius = compact ? width * 0.68 : Math.min(height * 0.61, width * 0.32);
  return {
    width,
    height,
    compact,
    radius,
    inset: -radius * 0.3,
    cardWidth: compact ? 64 : Math.min(114, width * 0.087),
  };
}
export type AffinityLayout = ReturnType<typeof affinityLayout>;
export function affinityPosition(
  layout: AffinityLayout,
  index: number,
  right: boolean,
  phase: number,
) {
  const { width, height, radius, inset, compact } = layout;
  const angle =
    (index / affinityCardCount) * Math.PI * 2 + phase * (right ? -1 : 1);
  if (compact) {
    const reach = Math.min(height * (height < 700 ? 0.1 : 0.14), 145);
    return {
      x: width / 2 + Math.sin(angle) * radius * (right ? -1 : 1),
      y: right
        ? height - reach + radius - Math.cos(angle) * radius
        : reach - radius + Math.cos(angle) * radius,
      rotation: ((angle * 180) / Math.PI) * (right ? 1 : -1),
    };
  }
  return {
    x: right
      ? width - inset - Math.cos(angle) * radius
      : inset + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius,
    rotation: ((angle * 180) / Math.PI) * (right ? -1 : 1),
  };
}
