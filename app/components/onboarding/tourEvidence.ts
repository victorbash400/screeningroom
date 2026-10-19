import { venueResultsSchema } from "../../lib/audienceWidget";
import { comparisonWidgetSchema, digitalAudienceSchema } from "../../lib/researchWidget";
import { exampleArea, exampleMap } from "./tourExample";

export const exampleArtist = { id: "00000000-0000-4000-8000-000000000001", name: "Radiohead", score: .62 };
export const exampleFilm = { id: "00000000-0000-4000-8000-000000000002", name: "Stop Making Sense", score: .38 };
const basis = "Scripted walkthrough data. Scores and contributions are illustrative, not a live Qloo result or a forecast.";
export const exampleVenues = venueResultsSchema.parse({
  kind: "venues", source: "Qloo", basis: "taste", area: exampleArea,
  searches: [{ endpoint: "/v2/insights", parameters: { "filter.type": "urn:entity:place", "filter.location.radius": "5000", "signal.interests.entities": `${exampleArtist.id},${exampleFilm.id}` }, resultCount: 3 }],
  venues: exampleMap.presentation.locations.map((place, index) => ({
    ...place, id: `walkthrough:venue:${index}`, source: "Qloo", affinity: [.74, .69, .66][index],
    description: "Sample shortlist for a music documentary screening and discussion.",
    contributions: [exampleArtist, exampleFilm],
    audienceProfile: "Illustrative profile: independent music, concert films and documentary cinema. Confirm programming, hire terms and availability with the venue.",
  })),
});
export const examplePlatforms = comparisonWidgetSchema.parse({
  kind: "comparison", subjectLabel: "Platform", evidenceId: "walkthrough:platforms", title: "Platform affinity · sample", source: "Sample data", retrievedAt: "2026-10-01T12:00:00Z", basis,
  commonTags: ["Independent music", "Documentary", "Live performance"],
  subjects: [
    { id: "youtube", name: "YouTube", website: "https://www.youtube.com", value: .81 },
    { id: "vimeo", name: "Vimeo", website: "https://vimeo.com", value: .73 },
    { id: "mubi", name: "MUBI", website: "https://mubi.com", value: .68 },
  ].map(({ value, ...platform }) => ({ ...platform, tags: ["Independent music", "Documentary", "Live performance"], contributors: [exampleArtist, exampleFilm], metrics: [{ key: "affinity", label: "Sample affinity", value, unit: "index", source: "Scripted example" }] })),
  searches: [{ endpoint: "/v2/insights", parameters: { "filter.type": "urn:entity:brand", "signal.interests.entities": `${exampleArtist.id},${exampleFilm.id}` }, resultCount: 3 }],
});
export const exampleComparables = comparisonWidgetSchema.parse({
  kind: "comparison", evidenceId: "walkthrough:comparables", title: "Comparable films · sample", source: "Sample data", retrievedAt: "2026-10-01T12:00:00Z", basis,
  commonTags: ["Concert film", "Alternative music"],
  subjects: ["Meeting People Is Easy", "Shut Up and Play the Hits"].map((name, index) => ({ id: `walkthrough:film:${index}`, name, tags: ["Concert film", "Alternative music"], metrics: [{ key: "affinity", label: "Sample affinity", value: [.77, .71][index], unit: "index", source: "Scripted example" }, { key: "rating", label: "Sample reception", value: [7.6, 7.2][index], unit: "rating10", source: "Scripted example" }] })),
});
export const exampleDigital = digitalAudienceSchema.parse({ kind: "digital", evidenceId: "walkthrough:digital", title: "Digital audience · sample", source: "Qloo", retrievedAt: "2026-10-01T12:00:00Z", platforms: examplePlatforms, comparables: exampleComparables, errors: [], basis });
