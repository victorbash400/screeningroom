import { affinityCardCount, type AffinityLayout } from "./affinityLayout";
export type AffinityPoint = { x: number; y: number; rotation: number };
export type AffinityConnection = { source: number; targets: [number, number] };
export function affinityConnections(
  points: AffinityPoint[],
  layout: AffinityLayout,
  cycle: number,
): AffinityConnection[] {
  const visible = (index: number) => {
    const point = points[index],
      margin = -layout.cardWidth * 0.48;
    return (
      point.x > margin &&
      point.x < layout.width - margin &&
      point.y > margin &&
      point.y < layout.height - margin
    );
  };
  const sorted = (start: number) =>
    Array.from({ length: affinityCardCount }, (_, i) => start + i)
      .filter(visible)
      .sort((a, b) =>
        layout.compact ? points[a].x - points[b].x : points[a].y - points[b].y,
      );
  const people = sorted(0),
    media = sorted(affinityCardCount);
  if (!people.length || media.length < 2) return [];
  if (layout.compact) {
    return Array.from({ length: Math.min(2, people.length) }, (_, index) => ({
      source:
        people[
          (Math.floor((index * people.length) / 2) + cycle) % people.length
        ],
      targets: [
        media[(cycle + index) % media.length],
        media[(cycle + index + 1) % media.length],
      ],
    }));
  }
  const clearance = layout.height <= 650 ? 110 : 140;
  const upperLimit = layout.height / 2 - clearance;
  const lowerLimit = layout.height / 2 + clearance;
  return [true, false].flatMap((upper) => {
    const inLobe = (index: number) =>
      upper ? points[index].y < upperLimit : points[index].y > lowerLimit;
    const sources = people.filter(inLobe),
      targets = media.filter(inLobe);
    if (!sources.length || targets.length < 2) return [];
    return [
      {
        source: sources.reduce((closest, index) =>
          Math.abs(
            points[index].y -
              (upper ? layout.height * 0.12 : layout.height * 0.76),
          ) <
          Math.abs(
            points[closest].y -
              (upper ? layout.height * 0.12 : layout.height * 0.76),
          )
            ? index
            : closest,
        ),
        targets: targets.slice(-2) as [number, number],
      },
    ];
  });
}
function anchor(
  point: AffinityPoint,
  width: number,
  direction: number,
  vertical: boolean,
) {
  const angle = (point.rotation * Math.PI) / 180;
  const edge =
    width / 2 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))) -
    2;
  return {
    x: point.x + (vertical ? 0 : direction * edge),
    y: point.y + (vertical ? direction * edge : 0),
  };
}
export function affinityConnectionPaths(
  connection: AffinityConnection,
  points: AffinityPoint[],
  layout: AffinityLayout,
  lane: number,
) {
  const { width, height, cardWidth, compact } = layout;
  const source = anchor(points[connection.source], cardWidth, 1, compact);
  const targets = connection.targets.map((index) =>
    anchor(points[index], cardWidth, -1, compact),
  );
  if (compact) {
    const x = lane % 2 ? width - 12 : 12;
    const y = height / 2;
    const top = height * 0.24,
      bottom = height * 0.76;
    return {
      junction: { x, y },
      trunk: `M ${source.x} ${source.y} C ${source.x} ${top}, ${x} ${top}, ${x} ${y}`,
      branches: targets.map(
        (target) =>
          `M ${x} ${y} C ${x} ${bottom}, ${target.x} ${bottom}, ${target.x} ${target.y}`,
      ),
    };
  }
  const upper = points[connection.source].y < height / 2;
  const junction = { x: source.x + 12, y: source.y };
  const clearance = height <= 650 ? 110 : 140;
  return {
    junction,
    trunk: `M ${source.x} ${source.y} C ${source.x + 4} ${source.y}, ${source.x + 8} ${source.y}, ${junction.x} ${junction.y}`,
    branches: targets.map((target, index) => {
      const bow = Math.min(64, (target.x - junction.x) * 0.08) + index * 12;
      const middleY = upper
        ? Math.min(Math.max(junction.y, target.y) + bow, height / 2 - clearance)
        : Math.max(
            Math.min(junction.y, target.y) - bow,
            height / 2 + clearance,
          );
      const controlY = (middleY - 0.125 * (junction.y + target.y)) / 0.75;
      return `M ${junction.x} ${junction.y} C ${junction.x} ${controlY}, ${target.x} ${controlY}, ${target.x} ${target.y}`;
    }),
  };
}
function pointVisibility(
  point: AffinityPoint,
  layout: AffinityLayout,
  upper: boolean,
) {
  const clearance = layout.height <= 650 ? 110 : 140;
  const lobe = layout.compact
    ? 1
    : upper
      ? (layout.height / 2 - clearance - point.y) / 24
      : (point.y - layout.height / 2 - clearance) / 24;
  return Math.max(
    0,
    Math.min(
      1,
      lobe,
      (point.x + layout.cardWidth * 0.3) / 40,
      (layout.width - point.x + layout.cardWidth * 0.3) / 40,
      (point.y + layout.cardWidth * 0.3) / 40,
      (layout.height - point.y + layout.cardWidth * 0.3) / 40,
    ),
  );
}
export function affinityBranchVisibility(
  connection: AffinityConnection,
  index: number,
  points: AffinityPoint[],
  layout: AffinityLayout,
) {
  return pointVisibility(
    points[connection.targets[index]],
    layout,
    points[connection.source].y < layout.height / 2,
  );
}
export function affinityConnectionVisibility(
  connection: AffinityConnection,
  points: AffinityPoint[],
  layout: AffinityLayout,
) {
  return (
    pointVisibility(
      points[connection.source],
      layout,
      points[connection.source].y < layout.height / 2,
    ) *
    Math.max(
      ...connection.targets.map((_, index) =>
        affinityBranchVisibility(connection, index, points, layout),
      ),
    )
  );
}
