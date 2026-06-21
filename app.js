const state = {
  cashTargetPerTraveler: 1000,
  milesTargetTotal: 80000,
  travelers: 2,
  range: 30,
  moonshotMode: false,
  liveFares: null,
  liveFetchedAt: null,
  fares: [
    {
      airline: "United + Lufthansa",
      alliance: "Star Alliance",
      routing: "MCI-ORD-FRA-NAP",
      cabin: "Business",
      aircraft: "787-9 / A320",
      duration: "15h 10m",
      stops: 2,
      total: 2420,
      quality: 88,
      refundable: "Partial",
      fareClass: "P"
    },
    {
      airline: "Delta + ITA",
      alliance: "SkyTeam",
      routing: "MCI-ATL-FCO-NAP",
      cabin: "Business",
      aircraft: "A330neo / A220",
      duration: "14h 25m",
      stops: 2,
      total: 2860,
      quality: 91,
      refundable: "No",
      fareClass: "Z"
    },
    {
      airline: "Air France",
      alliance: "SkyTeam",
      routing: "MCI-JFK-CDG-NAP",
      cabin: "Business",
      aircraft: "777-300ER / A320",
      duration: "16h 05m",
      stops: 2,
      total: 3180,
      quality: 86,
      refundable: "No",
      fareClass: "O"
    },
    {
      airline: "American + BA",
      alliance: "oneworld",
      routing: "MCI-ORD-LHR-NAP",
      cabin: "Business",
      aircraft: "787-8 / A320",
      duration: "17h 40m",
      stops: 2,
      total: 3770,
      quality: 79,
      refundable: "Partial",
      fareClass: "I"
    }
  ],
  awards: [
    {
      program: "United MileagePlus",
      label: "United saver watch",
      miles: 92000,
      taxes: 148,
      seats: 2,
      cabin: "Business",
      bookable: true,
      note: "Above the 80,000-mile baseline, but close enough to monitor."
    },
    {
      program: "United partner award",
      label: "Lufthansa via United",
      miles: 88000,
      taxes: 186,
      seats: 2,
      cabin: "Business",
      bookable: true,
      note: "Partner space exists, but it needs a lower mileage price to beat target."
    },
    {
      program: "Air Canada Aeroplan",
      label: "Transfer option",
      miles: 76000,
      taxes: 212,
      seats: 2,
      cabin: "Business",
      bookable: true,
      note: "Improves value beyond the United baseline if transferable points are available."
    }
  ],
  trend30: [3510, 3380, 3320, 3420, 3290, 3180, 3120, 3070, 3190, 3040, 2990, 2920, 2860, 2810, 2750, 2790, 2680, 2600, 2560, 2510, 2470, 2440, 2490, 2420, 2450, 2390, 2420, 2380, 2410, 2420]
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat("en-US");

const chartState = {
  points: [],
  hoverIndex: null
};

const mapState = {
  map: null,
  layers: []
};

const liveSearchDefaults = {
  departureDate: "2027-06-15",
  returnDate: "2027-06-27",
  cabin: "business"
};

const airlineBrands = {
  "United + Lufthansa": { logo: "UA", theme: "united" },
  "Delta + ITA": { logo: "DL", theme: "delta" },
  "Air France": { logo: "AF", theme: "air-france" },
  "American + BA": { logo: "AA", theme: "american" },
  "United flash fare": { logo: "UA", theme: "united" }
};

function cabinLabelFromClass(travelClass) {
  if (travelClass === "4" || travelClass === 4) return "First";
  return "Business";
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "Unknown";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

const airports = {
  MCI: { name: "Kansas City International", city: "Kansas City", coords: [39.2976, -94.7139], type: "origin" },
  ORD: { name: "Chicago O'Hare", city: "Chicago", coords: [41.9742, -87.9073], type: "connection" },
  ATL: { name: "Hartsfield-Jackson Atlanta", city: "Atlanta", coords: [33.6407, -84.4277], type: "connection" },
  JFK: { name: "John F. Kennedy", city: "New York", coords: [40.6413, -73.7781], type: "connection" },
  EWR: { name: "Newark Liberty", city: "Newark", coords: [40.6895, -74.1745], type: "connection" },
  FRA: { name: "Frankfurt", city: "Frankfurt", coords: [50.0379, 8.5622], type: "connection" },
  FCO: { name: "Rome Fiumicino", city: "Rome", coords: [41.7999, 12.2462], type: "connection" },
  CDG: { name: "Paris Charles de Gaulle", city: "Paris", coords: [49.0097, 2.5479], type: "connection" },
  LHR: { name: "London Heathrow", city: "London", coords: [51.47, -0.4543], type: "connection" },
  MUC: { name: "Munich", city: "Munich", coords: [48.3538, 11.7861], type: "connection" },
  NAP: { name: "Naples International", city: "Naples", coords: [40.8845, 14.2908], type: "destination" }
};

const routeColors = ["#0f9f8f", "#f0b84b", "#d65a4a", "#6251a8", "#17201d"];

function getActiveFares() {
  const baseFares = state.liveFares || state.fares;
  if (!state.moonshotMode) return baseFares;
  return [
    {
      airline: "United flash fare",
      alliance: "Star Alliance",
      routing: "MCI-EWR-MUC-NAP",
      cabin: "Business",
      aircraft: "767-300 / A321",
      duration: "14h 55m",
      stops: 2,
      total: 1880,
      quality: 90,
      refundable: "No",
      fareClass: "P"
    },
    ...baseFares
  ];
}

function getActiveAwards() {
  if (!state.moonshotMode) return state.awards;
  return [
    {
      program: "United MileagePlus",
      label: "United saver found",
      miles: 78000,
      taxes: 164,
      seats: 2,
      cabin: "Business",
      bookable: true,
      note: "Two premium-cabin seats beat the 80,000-mile target. Book with United miles."
    },
    ...state.awards
  ];
}

function bestFare() {
  return [...getActiveFares()].sort((a, b) => a.total - b.total)[0];
}

function bestAward() {
  return [...getActiveAwards()].sort((a, b) => a.miles - b.miles || a.taxes - b.taxes)[0];
}

function airlineInitials(airline) {
  return airlineBrands[airline]?.logo || airline
    .split(/\s|\+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function airlineTheme(airline) {
  return airlineBrands[airline]?.theme || "generic";
}

function airlineLogoMarkup(fare) {
  if (fare.airlineLogo) {
    return `<img class="airline-logo image-logo" src="${fare.airlineLogo}" alt="${fare.airline} logo">`;
  }
  return `<span class="airline-logo ${airlineTheme(fare.airline)}">${airlineInitials(fare.airline)}</span>`;
}

function airlineForTrendPoint(index, dataLength) {
  if (index === dataLength - 1) return bestFare();
  const fares = getActiveFares();
  return fares[index % fares.length];
}

function scoreDeal(fare, award) {
  const perTraveler = fare.total / state.travelers;
  const cashRatio = perTraveler / state.cashTargetPerTraveler;
  const milesRatio = award.miles / state.milesTargetTotal;

  if (perTraveler < state.cashTargetPerTraveler || award.miles < state.milesTargetTotal) return 98;
  if (cashRatio <= 1.25 || milesRatio <= 1.15) return 88;
  if (cashRatio <= 1.5 || milesRatio <= 1.35) return 74;
  return 52;
}

function bandForScore(score) {
  if (score >= 95) return "Drop everything alert";
  if (score >= 80) return "Strong deal, close to target";
  if (score >= 60) return "Monitor only";
  return "Wait";
}

function buyMeter(score, recommendationLabel) {
  if (score >= 95) {
    return {
      label: recommendationLabel,
      width: 96,
      note: "Sample signal says this beats the target."
    };
  }
  if (score >= 80) {
    return {
      label: "Close watch",
      width: 72,
      note: "Mock prices are close, but not under target."
    };
  }
  if (score >= 60) {
    return {
      label: "Monitor",
      width: 46,
      note: "Sample fares need a bigger move before booking."
    };
  }
  return {
    label: "Wait",
    width: 24,
    note: "Sample data is well above the configured target."
  };
}

function recommendation(fare, award) {
  const perTraveler = fare.total / state.travelers;
  const cashBeatsTarget = perTraveler < state.cashTargetPerTraveler;
  const unitedBeatsTarget = award.program.includes("United") && award.miles <= state.milesTargetTotal;
  const transferImproves = !award.program.includes("United") && award.miles < state.milesTargetTotal;

  if (cashBeatsTarget) {
    return {
      label: "Book cash",
      reason: `${currency.format(perTraveler)} per traveler beats the Naples moonshot cash target. This should be treated as a rare drop-everything fare.`
    };
  }

  if (unitedBeatsTarget) {
    return {
      label: "Book with United miles",
      reason: `${number.format(award.miles)} total United miles books 2 premium-cabin seats, with taxes tracked separately.`
    };
  }

  if (transferImproves) {
    return {
      label: "Transfer points",
      reason: `${award.program} improves value beyond the 80,000-mile United baseline, pending transferable points availability.`
    };
  }

  return {
    label: "Wait",
    reason: "Current options are useful to monitor, but none beat the cash or United-mile targets yet."
  };
}

function renderSummary() {
  const fare = bestFare();
  const award = bestAward();
  const perTraveler = fare.total / state.travelers;
  const score = scoreDeal(fare, award);
  const reco = recommendation(fare, award);
  const cashTarget = state.cashTargetPerTraveler;
  const totalTarget = state.cashTargetPerTraveler * state.travelers;
  const cashStatus = perTraveler < cashTarget ? "beats" : "does not beat";
  const awardStatus = award.miles <= state.milesTargetTotal ? "beats" : "does not beat";

  document.querySelector("#targetAnswer").textContent =
    `Best cash is ${currency.format(perTraveler)} per traveler (${currency.format(fare.total)} total), which ${cashStatus} the ${currency.format(cashTarget)} per-traveler target. Best award is ${number.format(award.miles)} total miles, which ${awardStatus} the ${number.format(state.milesTargetTotal)} United-mile baseline.`;
  document.querySelector("#decisionLabel").textContent = reco.label;
  document.querySelector("#decisionReason").textContent = reco.reason;
  document.querySelector("#bestCash").textContent = currency.format(fare.total);
  document.querySelector("#cashPerTraveler").textContent = currency.format(perTraveler);
  document.querySelector("#bestAward").textContent = number.format(award.miles);
  document.querySelector("#awardPerTraveler").textContent = number.format(Math.round(award.miles / state.travelers));
  document.querySelector("#dealScore").textContent = score;
  document.querySelector("#dealBand").textContent = bandForScore(score);
  const meter = buyMeter(score, reco.label);
  document.querySelector("#buyMeterLabel").textContent = meter.label;
  document.querySelector("#buyMeterFill").style.width = `${meter.width}%`;
  document.querySelector("#buyMeterNote").textContent = meter.note;
  document.querySelector("#durationMetric").textContent = fare.duration;
  document.querySelector("#aircraftMetric").textContent = fare.aircraft.split("/")[0].trim();
  document.querySelector("#qualityMetric").textContent = fare.quality;
  renderDataStatus();
}

function renderDataStatus(message) {
  const status = document.querySelector("#dataStatus");
  if (!status) return;

  if (message) {
    status.textContent = message;
    return;
  }

  if (state.liveFares?.length) {
    status.textContent = `Live Google Flights data from SerpAPI loaded at ${state.liveFetchedAt}. Award data remains illustrative.`;
    return;
  }

  status.textContent = "This dashboard is showing illustrative fares until SerpAPI returns live Google Flights data.";
}

function signalForFare(fare) {
  const perTraveler = fare.total / state.travelers;
  if (perTraveler < state.cashTargetPerTraveler) return ["alert", "Drop everything"];
  if (perTraveler < 1500) return ["good", "Strong value"];
  if (fare.quality >= 88) return ["watch", "Quality watch"];
  return ["watch", "Monitor"];
}

function renderFares() {
  const rows = getActiveFares()
    .map((fare) => {
      const [tone, label] = signalForFare(fare);
      const perTraveler = fare.total / state.travelers;
      return `
        <tr>
          <td><strong>${fare.airline}</strong><br><span class="muted">${fare.alliance}</span></td>
          <td>${fare.routing}<br><span class="muted">${fare.duration}</span></td>
          <td>${fare.cabin}<br><span class="muted">${fare.fareClass} / ${fare.refundable}</span></td>
          <td><strong>${currency.format(fare.total)}</strong></td>
          <td>${currency.format(perTraveler)}</td>
          <td>${fare.quality}</td>
          <td><span class="status-pill ${tone}">${label}</span></td>
        </tr>`;
    })
    .join("");
  document.querySelector("#fareRows").innerHTML = rows;
}

function renderRouteLegend() {
  const routes = getActiveFares().map((fare) => fare.routing);
  const connections = [...new Set(routes.map((route) => route.split("-").slice(1, -1)).flat())];

  document.querySelector("#routeLegend").innerHTML = connections
    .map((airport) => `<span>${airport}</span>`)
    .join("") +
    `<div class="route-line-list">${routes.map((route) => `<b>${route.replaceAll("-", " to ")}</b>`).join("")}</div>`;
}

function routeForFare(fare, index) {
  const codes = fare.routing.split("-");
  return {
    ...fare,
    color: routeColors[index % routeColors.length],
    codes,
    coords: codes.map((code) => airports[code]?.coords).filter(Boolean),
    moonshot: fare.airline === "United flash fare"
  };
}

function airportIcon(code, type) {
  const className = `airport-marker ${type || "connection"}`;
  return L.divIcon({
    className,
    html: `<span>${code}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18]
  });
}

function clearMapLayers() {
  mapState.layers.forEach((layer) => layer.remove());
  mapState.layers = [];
}

function initializeLeafletMap() {
  const mapElement = document.querySelector("#leafletMap");
  if (!mapElement) return false;

  if (typeof L === "undefined") {
    mapElement.innerHTML = `<div class="map-fallback">Leaflet map assets could not load. Check the network connection or CDN access.</div>`;
    return false;
  }

  if (mapState.map) return true;

  mapElement.innerHTML = "";
  mapState.map = L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: false,
    worldCopyJump: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapState.map);

  return true;
}

function renderLeafletMap() {
  if (!initializeLeafletMap()) return;

  clearMapLayers();

  const routes = getActiveFares().map(routeForFare);
  const activeAirportCodes = [...new Set(routes.map((route) => route.codes).flat())];
  const bounds = [];

  routes.forEach((route) => {
    if (route.coords.length < 2) return;
    bounds.push(...route.coords);

    const routeLine = L.polyline(route.coords, {
      color: route.color,
      weight: route.moonshot ? 5 : 4,
      opacity: route.moonshot ? 0.9 : 0.72,
      dashArray: route.moonshot ? "7 7" : null
    }).bindPopup(`
      <strong>${route.airline}</strong><br>
      ${route.codes.join(" to ")}<br>
      ${currency.format(route.total)} total / ${currency.format(route.total / state.travelers)} each
    `);

    routeLine.addTo(mapState.map);
    mapState.layers.push(routeLine);
  });

  activeAirportCodes.forEach((code) => {
    const airport = airports[code];
    if (!airport) return;
    bounds.push(airport.coords);
    const marker = L.marker(airport.coords, {
      icon: airportIcon(code, airport.type),
      keyboard: true,
      title: `${code} - ${airport.name}`
    }).bindPopup(`<strong>${code}</strong><br>${airport.name}<br>${airport.city}`);
    marker.addTo(mapState.map);
    mapState.layers.push(marker);
  });

  if (bounds.length) {
    mapState.map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 4
    });
  }
}

function awardStatus(award) {
  if (award.miles <= state.milesTargetTotal && award.program.includes("United")) return ["good", "Book with United"];
  if (award.miles < state.milesTargetTotal) return ["good", "Transfer candidate"];
  if (award.miles <= state.milesTargetTotal * 1.15) return ["watch", "Close to target"];
  return ["watch", "Monitor"];
}

function renderAwards() {
  document.querySelector("#awardList").innerHTML = getActiveAwards()
    .map((award) => {
      const [tone, label] = awardStatus(award);
      return `
        <article class="award-item">
          <header>
            <div>
              <strong>${award.label}</strong>
              <p>${award.program} · ${award.cabin} · ${award.seats} seats</p>
            </div>
            <span class="status-pill ${tone}">${label}</span>
          </header>
          <div class="award-metrics">
            <div><span>Total miles</span><b>${number.format(award.miles)}</b></div>
            <div><span>Per traveler</span><b>${number.format(Math.round(award.miles / state.travelers))}</b></div>
            <div><span>Taxes and fees</span><b>${currency.format(award.taxes)}</b></div>
          </div>
          <p>${award.note}</p>
        </article>`;
    })
    .join("");
}

function renderSignals() {
  const fare = bestFare();
  const award = bestAward();
  const perTraveler = fare.total / state.travelers;
  const signals = [
    {
      title: perTraveler < state.cashTargetPerTraveler ? "Moonshot cash fare detected" : "Cash fare remains above moonshot target",
      body: perTraveler < state.cashTargetPerTraveler
        ? `${fare.airline} is pricing at ${currency.format(perTraveler)} per traveler. This beats the premium-cabin Naples target.`
        : `Best cash fare is ${currency.format(perTraveler)} per traveler. Monitor unless routing quality becomes exceptional.`,
      badge: perTraveler < state.cashTargetPerTraveler ? "Immediate" : "Monitor",
      tone: perTraveler < state.cashTargetPerTraveler ? "alert" : "watch",
      actionable: perTraveler < state.cashTargetPerTraveler
    },
    {
      title: award.miles <= state.milesTargetTotal ? "Award option beats United target" : "United award watch active",
      body: award.miles <= state.milesTargetTotal
        ? `${number.format(award.miles)} total miles is within the 80,000-mile baseline for 2 premium seats.`
        : `Best award is ${number.format(award.miles)} miles total. Taxes and fees remain separate.`,
      badge: award.miles <= state.milesTargetTotal ? "Actionable" : "Monitor",
      tone: award.miles <= state.milesTargetTotal ? "good" : "watch",
      actionable: award.miles <= state.milesTargetTotal
    },
    {
      title: "Routing quality improved",
      body: `${fare.routing} is currently the strongest observed route at ${fare.duration} with a quality score of ${fare.quality}.`,
      badge: fare.quality >= 90 ? "Actionable" : "Context",
      tone: fare.quality >= 90 ? "good" : "watch",
      actionable: fare.quality >= 90
    }
  ];

  const actionableOnly = document.querySelector("#onlyActionable").checked;
  document.querySelector("#signalList").innerHTML = signals
    .filter((signal) => !actionableOnly || signal.actionable)
    .map((signal) => `
      <article class="signal-item" data-actionable="${signal.actionable}">
        <header>
          <div>
            <strong>${signal.title}</strong>
            <p>${signal.body}</p>
          </div>
          <span class="status-pill ${signal.tone}">${signal.badge}</span>
        </header>
      </article>`)
    .join("");
}

function drawChart() {
  const canvas = document.querySelector("#fareChart");
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  context.scale(scale, scale);

  const width = rect.width;
  const height = rect.height;
  const pad = { top: 24, right: 28, bottom: 40, left: 58 };
  const data = state.trend30.slice(-state.range);
  const targetTotal = state.cashTargetPerTraveler * state.travelers;
  if (state.liveFares?.length) data[data.length - 1] = bestFare().total;
  if (state.moonshotMode) data[data.length - 1] = 1880;

  const min = Math.min(targetTotal, ...data) - 220;
  const max = Math.max(...data) + 260;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (index) => pad.left + (index / Math.max(1, data.length - 1)) * plotW;
  const y = (value) => pad.top + ((max - value) / (max - min)) * plotH;
  chartState.points = data.map((value, index) => ({
    x: x(index),
    y: y(value),
    value,
    fare: airlineForTrendPoint(index, data.length)
  }));

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#e5e0d4";
  context.lineWidth = 1;
  context.fillStyle = "#64716c";
  context.font = "12px Inter, sans-serif";
  for (let i = 0; i < 5; i += 1) {
    const value = min + ((max - min) / 4) * i;
    const lineY = y(value);
    context.beginPath();
    context.moveTo(pad.left, lineY);
    context.lineTo(width - pad.right, lineY);
    context.stroke();
    context.fillText(currency.format(value), 10, lineY + 4);
  }

  const targetY = y(targetTotal);
  context.strokeStyle = "#d65a4a";
  context.setLineDash([7, 7]);
  context.beginPath();
  context.moveTo(pad.left, targetY);
  context.lineTo(width - pad.right, targetY);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#9d2e22";
  context.fillText("Cash target", width - pad.right - 82, targetY - 8);

  const gradient = context.createLinearGradient(pad.left, 0, width - pad.right, 0);
  gradient.addColorStop(0, "#0f9f8f");
  gradient.addColorStop(0.55, "#f0b84b");
  gradient.addColorStop(1, "#d65a4a");
  context.strokeStyle = gradient;
  context.lineWidth = 4;
  context.beginPath();
  data.forEach((value, index) => {
    if (index === 0) context.moveTo(x(index), y(value));
    else context.lineTo(x(index), y(value));
  });
  context.stroke();

  data.forEach((value, index) => {
    context.fillStyle = index === data.length - 1 ? "#17201d" : "#0f9f8f";
    context.beginPath();
    context.arc(x(index), y(value), index === data.length - 1 ? 5 : 3, 0, Math.PI * 2);
    context.fill();
  });

  if (chartState.hoverIndex !== null && chartState.points[chartState.hoverIndex]) {
    const point = chartState.points[chartState.hoverIndex];
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#17201d";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  context.fillStyle = "#17201d";
  context.font = "700 12px Inter, sans-serif";
  context.fillText(`${state.range}-day fare trend`, pad.left, height - 14);
}

function renderAll() {
  renderSummary();
  renderFares();
  renderRouteLegend();
  renderLeafletMap();
  renderAwards();
  renderSignals();
  drawChart();
}

function showChartTooltip(index) {
  const tooltip = document.querySelector("#chartTooltip");
  const point = chartState.points[index];
  if (!point) return;

  tooltip.innerHTML = `
    <span class="tooltip-airline">
      ${airlineLogoMarkup(point.fare)}
      ${point.fare.airline}
    </span>
    <strong>${currency.format(point.value)}</strong>
    <small>${point.fare.routing}</small>`;
  tooltip.style.left = `${point.x}px`;
  tooltip.style.top = `${point.y}px`;
  tooltip.classList.add("is-visible");
}

function hideChartTooltip() {
  chartState.hoverIndex = null;
  document.querySelector("#chartTooltip").classList.remove("is-visible");
  drawChart();
}

function handleChartPointer(event) {
  const canvas = document.querySelector("#fareChart");
  const rect = canvas.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  chartState.points.forEach((point, index) => {
    const distance = Math.abs(point.x - pointerX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  chartState.hoverIndex = nearestIndex;
  drawChart();
  showChartTooltip(nearestIndex);
}

async function loadLiveFares() {
  const button = document.querySelector("#liveSearchButton");
  const params = new URLSearchParams({
    departure_date: liveSearchDefaults.departureDate,
    return_date: liveSearchDefaults.returnDate,
    cabin: liveSearchDefaults.cabin
  });

  button.disabled = true;
  button.textContent = "Checking...";
  renderDataStatus("Checking SerpAPI for live Google Flights fares...");

  try {
    const response = await fetch(`/api/google-flights?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "Live fare request failed.");
    }

    if (!Array.isArray(payload.fares) || payload.fares.length === 0) {
      throw new Error("SerpAPI returned no premium-cabin fares for this route.");
    }

    state.liveFares = payload.fares;
    state.liveFetchedAt = payload.fetchedAt || new Date().toLocaleString();
    state.moonshotMode = false;
    document.querySelector("#simulateButton").textContent = "Simulate deal";
    renderAll();
  } catch (error) {
    renderDataStatus(`${error.message} Showing sample fares for now.`);
  } finally {
    button.disabled = false;
    button.textContent = "Check live fares";
  }
}

document.querySelector("#simulateButton").addEventListener("click", () => {
  state.moonshotMode = !state.moonshotMode;
  document.querySelector("#simulateButton").textContent = state.moonshotMode ? "Reset sample" : "Simulate deal";
  renderAll();
});

document.querySelector("#refreshButton").addEventListener("click", () => {
  renderAll();
  document.querySelector("#refreshButton").animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 420, easing: "ease-out" }
  );
});

document.querySelector("#liveSearchButton").addEventListener("click", loadLiveFares);

document.querySelector("#cashTarget").addEventListener("input", (event) => {
  state.cashTargetPerTraveler = Number(event.target.value) || 1000;
  renderAll();
});

document.querySelector("#milesTarget").addEventListener("input", (event) => {
  state.milesTargetTotal = Number(event.target.value) || 80000;
  renderAll();
});

document.querySelector("#onlyActionable").addEventListener("change", renderSignals);

document.querySelector("#fareChart").addEventListener("pointermove", handleChartPointer);
document.querySelector("#fareChart").addEventListener("pointerleave", hideChartTooltip);

document.querySelectorAll("[data-range]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-range]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.range = Number(button.dataset.range);
    drawChart();
  });
});

document.querySelectorAll(".provider").forEach((button) => {
  button.addEventListener("click", () => button.classList.toggle("active"));
});

window.addEventListener("resize", drawChart);
window.addEventListener("resize", () => {
  if (mapState.map) mapState.map.invalidateSize();
});
renderAll();
