import type { ComparisonWidget } from "../lib/researchWidget";

export function performanceOutput(output: ComparisonWidget) {
  return { type: "json" as const, value: {
    evidenceId: output.evidenceId, title: output.title,
    subjects: output.subjects.map(({ id, name, year, website, metrics, links, contributors }) => ({ id, name, ...(year === undefined ? {} : { year }), ...(website ? { website } : {}), ...(links ? { links } : {}), ...(contributors ? { contributors } : {}), metrics })),
    metricComparisons: output.metricComparisons ?? [], basis: output.basis,
    interpretation: {
      imdbRating: "User reception, 0–10; compare only other IMDb user ratings.",
      imdbVotes: "Number of IMDb votes; not audience size, views, reach or engagement over time.",
      metacriticRating: "Critic reception, 0–100; do not compare directly with user ratings on another scale.",
      metacriticUserRating: "User reception, 0–10; a separate source from IMDb.",
      popularity: "Qloo relative catalogue popularity, 0–1; not affinity, measured reach or a historical trend. Tiny gaps do not establish a useful advantage.",
      affinity: "Taste-match strength within this recommendation query; not a performance metric.",
    },
  } };
}
