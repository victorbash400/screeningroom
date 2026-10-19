import { mapHomeResponseSchema } from "../../lib/mapHome";
import { exampleMap, exampleArea } from "./tourExample";

export function createTourRequests() {
  let home = mapHomeResponseSchema.parse({ home: { name: exampleArea.name, latitude: exampleArea.latitude, longitude: exampleArea.longitude }, revision: 0 });
  const fetchExample: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "https://example.invalid");
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (init?.signal?.aborted) throw new DOMException("Example request cancelled.", "AbortError");
    if (url.pathname === "/api/locations/search" && method === "GET") {
      const query = (url.searchParams.get("q") ?? "").toLocaleLowerCase();
      const places = [exampleArea, ...exampleMap.presentation.locations].filter(place => place.name.toLocaleLowerCase().includes(query));
      return Response.json({ places: places.map(place => ({ name: place.name, latitude: place.latitude, longitude: place.longitude, detail: "London · walkthrough example" })) });
    }
    if (url.pathname === "/api/locations/venues" && method === "POST") return Response.json(exampleMap.presentation);
    if (url.pathname === "/api/locations/home") {
      if (method === "GET") return Response.json(home);
      if (method === "PUT" && typeof init?.body === "string") {
        const next = mapHomeResponseSchema.parse(JSON.parse(init.body));
        if (next.revision !== home.revision) return Response.json({ error: "Example home location changed." }, { status: 409 });
        home = { home: next.home, revision: home.revision + 1 };
        return Response.json(home);
      }
    }
    return Response.json({ error: "This action is unavailable in the walkthrough." }, { status: 400 });
  };
  return { fetch: fetchExample, request: async (input: string, init?: RequestInit) => {
    const response = await fetchExample(input, init);
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    return value;
  } };
}
