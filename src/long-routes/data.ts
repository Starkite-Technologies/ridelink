import type { SeatTemplateId } from "./types";

export const NAMIBIAN_TOWNS = [
  "Windhoek",
  "Oshakati",
  "Ondangwa",
  "Rundu",
  "Katima Mulilo",
  "Swakopmund",
  "Walvis Bay",
  "Keetmanshoop",
  "Mariental",
  "Otjiwarongo",
  "Tsumeb",
  "Grootfontein",
  "Opuwo",
  "Outapi",
  "Eenhana",
  "Lüderitz",
] as const;

export const POPULAR_ROUTES = [
  { from: "Windhoek", to: "Oshakati", fromPrice: 350 },
  { from: "Windhoek", to: "Swakopmund", fromPrice: 280 },
  { from: "Ondangwa", to: "Windhoek", fromPrice: 360 },
  { from: "Windhoek", to: "Rundu", fromPrice: 420 },
];

export const AMENITIES = [
  "Air conditioning",
  "Charging ports",
  "Luggage space",
  "Wi-Fi",
  "Music",
  "Reclining seats",
  "Trailer",
  "Wheelchair support",
] as const;

export const TRIP_RULES = ["No smoking", "No alcohol", "No dangerous items", "Arrive 30 minutes before departure"] as const;

export const SEAT_TEMPLATE_META: Record<SeatTemplateId, { label: string; capacity: number; columns: number }> = {
  SEVEN_SEATER: { label: "Seven-seater", capacity: 6, columns: 3 },
  MINIBUS_2_1: { label: "Minibus 2 + 1", capacity: 15, columns: 4 },
  BUS_2_2: { label: "Coach 2 + 2", capacity: 40, columns: 5 },
  SHUTTLE: { label: "Shuttle / van", capacity: 12, columns: 4 },
};

export function formatNad(amount: number) {
  return `N$${amount.toLocaleString("en-NA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-NA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
