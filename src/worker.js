const CABIN_TO_TRAVEL_CLASS = {
  business: "3",
  first: "4"
};

const DEFAULT_SEARCH = {
  departure_id: "MCI",
  arrival_id: "NAP",
  outbound_date: "2027-06-15",
  return_date: "2027-06-27",
  cabin: "business"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function durationLabel(minutes) {
  if (!Number.isFinite(minutes)) return "Unknown";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function routingForFlights(flights) {
  const first = flights[0];
  if (!first?.departure_airport?.id) return "";
  const route = [first.departure_airport.id];
  flights.forEach((flight) => {
    if (flight?.arrival_airport?.id) route.push(flight.arrival_airport.id);
  });
  return unique(route).join("-");
}

function qualityScore(price, stops, durationMinutes) {
  let score = 94;
  if (price > 2000) score -= 8;
  if (price > 3000) score -= 10;
  score -= Math.max(0, stops - 1) * 5;
  if (durationMinutes > 1000) score -= 6;
  if (durationMinutes > 1300) score -= 6;
  return Math.max(50, Math.min(98, score));
}

function normalizeFare(result, cabin, index) {
  const flights = Array.isArray(result.flights) ? result.flights : [];
  const routing = routingForFlights(flights);
  const airlines = unique(flights.map((flight) => flight.airline));
  const aircraft = unique(flights.map((flight) => flight.airplane)).slice(0, 3);
  const durationMinutes = result.total_duration || flights.reduce((total, flight) => total + (flight.duration || 0), 0);
  const price = Number(result.price);
  const stops = routing ? Math.max(0, routing.split("-").length - 2) : Number(result.stops || 0);
  const firstFlight = flights[0] || {};

  return {
    airline: airlines.length ? airlines.join(" + ") : `Google Flights option ${index + 1}`,
    alliance: "Google Flights via SerpAPI",
    routing: routing || "MCI-NAP",
    cabin,
    aircraft: aircraft.length ? aircraft.join(" / ") : "Aircraft TBD",
    duration: durationLabel(durationMinutes),
    stops,
    total: Number.isFinite(price) ? price : 0,
    quality: qualityScore(Number.isFinite(price) ? price : 9999, stops, durationMinutes),
    refundable: "Check fare rules",
    fareClass: cabin,
    airlineLogo: result.airline_logo || firstFlight.airline_logo || "",
    bookingToken: result.booking_token || "",
    departureToken: result.departure_token || "",
    source: "SerpAPI Google Flights"
  };
}

async function handleGoogleFlights(request, env) {
  if (!env.SERPAPI_API_KEY) {
    return json({ error: "SERPAPI_API_KEY is not configured in Cloudflare." }, 500);
  }

  const requestUrl = new URL(request.url);
  const cabin = requestUrl.searchParams.get("cabin") || DEFAULT_SEARCH.cabin;
  const travelClass = CABIN_TO_TRAVEL_CLASS[cabin] || CABIN_TO_TRAVEL_CLASS.business;
  const outboundDate = requestUrl.searchParams.get("departure_date") || DEFAULT_SEARCH.outbound_date;
  const returnDate = requestUrl.searchParams.get("return_date") || DEFAULT_SEARCH.return_date;

  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: requestUrl.searchParams.get("departure_id") || DEFAULT_SEARCH.departure_id,
    arrival_id: requestUrl.searchParams.get("arrival_id") || DEFAULT_SEARCH.arrival_id,
    outbound_date: outboundDate,
    return_date: returnDate,
    travel_class: travelClass,
    adults: requestUrl.searchParams.get("adults") || "2",
    currency: "USD",
    gl: "us",
    hl: "en",
    type: "1",
    stops: "3",
    sort_by: "2",
    api_key: env.SERPAPI_API_KEY
  });

  const serpResponse = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    headers: { accept: "application/json" }
  });
  const payload = await serpResponse.json();

  if (!serpResponse.ok || payload.error) {
    return json({
      error: payload.error || "SerpAPI Google Flights request failed.",
      status: serpResponse.status
    }, 502);
  }

  const rawResults = [
    ...(Array.isArray(payload.best_flights) ? payload.best_flights : []),
    ...(Array.isArray(payload.other_flights) ? payload.other_flights : [])
  ];

  const fares = rawResults
    .filter((result) => Number.isFinite(Number(result.price)))
    .map((result, index) => normalizeFare(result, cabin === "first" ? "First" : "Business", index))
    .filter((fare) => fare.total > 0)
    .slice(0, 12);

  return json({
    source: "SerpAPI Google Flights",
    fetchedAt: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
    search: {
      departure_id: params.get("departure_id"),
      arrival_id: params.get("arrival_id"),
      outbound_date: outboundDate,
      return_date: returnDate,
      travel_class: travelClass,
      adults: params.get("adults")
    },
    googleFlightsUrl: payload.search_metadata?.google_flights_url || "",
    serpapiSearchId: payload.search_metadata?.id || "",
    fares
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/google-flights") {
      return handleGoogleFlights(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
