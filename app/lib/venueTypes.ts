import { z } from "zod";

export const venueTypeSchema = z.enum(["cinema", "theatre", "music", "concert"]);
export type VenueType = z.infer<typeof venueTypeSchema>;
export const venueTypes = [
  { id: "cinema", label: "Cinemas", tag: "urn:tag:category:place:movie_theater" },
  { id: "theatre", label: "Theatres", tag: "urn:tag:category:place:performing_arts_theater" },
  { id: "music", label: "Live music", tag: "urn:tag:category:place:live_music_venue" },
  { id: "concert", label: "Concert halls", tag: "urn:tag:category:place:concert_hall" },
] as const;
