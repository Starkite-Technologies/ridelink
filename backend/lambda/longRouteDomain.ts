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

export type SeatTemplateId = "SEVEN_SEATER" | "MINIBUS_2_1" | "BUS_2_2" | "SHUTTLE";

export type SeatTemplate = {
  id: SeatTemplateId;
  label: string;
  vehicleType: string;
  capacity: number;
  columns: number;
  seats: Array<{ seatNumber: string; row: number; column: number; seatType: "DRIVER" | "PASSENGER"; isBookable: boolean }>;
};

function passengerSeat(seatNumber: string, row: number, column: number) {
  return { seatNumber, row, column, seatType: "PASSENGER" as const, isBookable: true };
}

function numberedRows(rows: number, columns: number, aisleAfter: number, startRow = 1) {
  const seats: SeatTemplate["seats"] = [];
  let number = 1;
  for (let row = startRow; row < startRow + rows; row += 1) {
    for (let visualColumn = 0; visualColumn < columns + 1; visualColumn += 1) {
      if (visualColumn === aisleAfter) continue;
      seats.push(passengerSeat(String(number), row, visualColumn));
      number += 1;
    }
  }
  return seats;
}

export const SEAT_TEMPLATES: Record<SeatTemplateId, SeatTemplate> = {
  SEVEN_SEATER: {
    id: "SEVEN_SEATER",
    label: "Seven-seater",
    vehicleType: "SUV / MPV",
    capacity: 6,
    columns: 3,
    seats: [
      { seatNumber: "DRIVER", row: 0, column: 0, seatType: "DRIVER", isBookable: false },
      passengerSeat("1", 0, 2),
      passengerSeat("2", 1, 0),
      passengerSeat("3", 1, 1),
      passengerSeat("4", 1, 2),
      passengerSeat("5", 2, 0),
      passengerSeat("6", 2, 2),
    ],
  },
  MINIBUS_2_1: {
    id: "MINIBUS_2_1",
    label: "Minibus 2 + 1",
    vehicleType: "Minibus",
    capacity: 15,
    columns: 4,
    seats: [
      { seatNumber: "DRIVER", row: 0, column: 0, seatType: "DRIVER", isBookable: false },
      ...numberedRows(5, 3, 2),
    ],
  },
  BUS_2_2: {
    id: "BUS_2_2",
    label: "Coach 2 + 2",
    vehicleType: "Bus",
    capacity: 40,
    columns: 5,
    seats: [
      { seatNumber: "DRIVER", row: 0, column: 0, seatType: "DRIVER", isBookable: false },
      ...numberedRows(10, 4, 2),
    ],
  },
  SHUTTLE: {
    id: "SHUTTLE",
    label: "Shuttle / van",
    vehicleType: "Shuttle",
    capacity: 12,
    columns: 4,
    seats: [
      { seatNumber: "DRIVER", row: 0, column: 0, seatType: "DRIVER", isBookable: false },
      ...numberedRows(4, 3, 2),
    ],
  },
};

export const TRIP_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "BOOKING_OPEN",
  "BOOKING_CLOSED",
  "BOARDING",
  "DEPARTED",
  "IN_PROGRESS",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export function isTown(value: unknown): value is (typeof NAMIBIAN_TOWNS)[number] {
  return typeof value === "string" && NAMIBIAN_TOWNS.includes(value as (typeof NAMIBIAN_TOWNS)[number]);
}

export function validateRoute(departureTown: unknown, destinationTown: unknown, departureDateTime: unknown) {
  const errors: string[] = [];
  if (!isTown(departureTown)) errors.push("Choose a supported departure town");
  if (!isTown(destinationTown)) errors.push("Choose a supported destination town");
  if (departureTown === destinationTown) errors.push("Departure and destination must be different");
  if (typeof departureDateTime !== "string" || Number.isNaN(Date.parse(departureDateTime))) {
    errors.push("Enter a valid departure date and time");
  } else if (Date.parse(departureDateTime) <= Date.now()) {
    errors.push("Departure must be in the future");
  }
  return errors;
}

export function createBookingReference(now = new Date(), random = Math.random()) {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `RL${date}${Math.floor(random * 9999).toString().padStart(4, "0")}`;
}

export function canSelectSeat(
  seat: { status: string; isBookable: boolean; heldByUserId?: string; holdExpiresAtEpoch?: number },
  userId: string,
  nowEpoch: number
) {
  if (!seat.isBookable) return false;
  if (seat.status === "AVAILABLE") return true;
  return seat.status === "HELD" && (Number(seat.holdExpiresAtEpoch ?? 0) < nowEpoch || seat.heldByUserId === userId);
}

export function calculateBookingTotals(prices: number[], bookingFee: number, luggageFee = 0, insuranceFee = 0) {
  const subtotal = prices.reduce((total, price) => total + price, 0);
  return { subtotal, fees: bookingFee + luggageFee + insuranceFee, totalAmount: subtotal + bookingFee + luggageFee + insuranceFee };
}

export function canCancelBooking(departureDateTime: string, cutoffHours: number, nowMs = Date.now()) {
  return nowMs < Date.parse(departureDateTime) - cutoffHours * 3_600_000;
}

export function validStopOrder(departureTown: string, destinationTown: string, stops: Array<{ town: string; stopOrder: number }>) {
  const towns = [departureTown, ...[...stops].sort((a, b) => a.stopOrder - b.stopOrder).map((stop) => stop.town), destinationTown];
  return towns.every((town) => isTown(town)) && new Set(towns).size === towns.length && stops.every((stop, index) => stop.stopOrder === index + 1);
}

export function validatePassenger(passenger: Record<string, unknown>) {
  const phone = String(passenger.phoneNumber ?? "").replace(/\s/g, "");
  const emergencyContact = String(passenger.emergencyContact ?? "").trim();
  const ageCategory = String(passenger.ageCategory ?? "ADULT");
  return (
    String(passenger.fullName ?? "").trim().length >= 3 &&
    /^(\+264|0)\d{8,9}$/.test(phone) &&
    emergencyContact.length >= 3 &&
    ["ADULT", "CHILD", "INFANT", "SENIOR"].includes(ageCategory)
  );
}

export function recurringDepartureTimes(
  departureDateTime: string,
  daysOfWeek: number[],
  endDate: string,
  excludedDates: string[] = [],
  maximumOccurrences = 12
) {
  const start = Date.parse(departureDateTime);
  const end = Date.parse(`${endDate}T23:59:59+02:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const validDays = new Set(daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  if (!validDays.size) return [];
  const excluded = new Set(excludedDates);
  const results: string[] = [];
  const boundedEnd = Math.min(end, start + 366 * 86_400_000);
  for (let candidate = start; candidate <= boundedEnd && results.length < maximumOccurrences; candidate += 86_400_000) {
    const namibiaTime = new Date(candidate + 2 * 3_600_000);
    const localDate = namibiaTime.toISOString().slice(0, 10);
    if (validDays.has(namibiaTime.getUTCDay()) && !excluded.has(localDate)) results.push(new Date(candidate).toISOString());
  }
  return results;
}

export function canTransitionTrip(status: string, action: string) {
  const allowed: Record<string, string[]> = {
    PUBLISH: ["DRAFT"],
    CLOSE_BOOKING: ["PUBLISHED", "BOOKING_OPEN"],
    BOARDING: ["BOOKING_CLOSED"],
    START: ["BOARDING"],
    IN_PROGRESS: ["DEPARTED"],
    ARRIVE: ["IN_PROGRESS"],
    COMPLETE: ["ARRIVED"],
    CANCEL: TRIP_STATUSES.filter((value) => !["COMPLETED", "CANCELLED"].includes(value)),
  };
  return allowed[action]?.includes(status) ?? false;
}

export function canCreateTripWithVehicle(verificationStatus: unknown) {
  return verificationStatus === "APPROVED";
}
