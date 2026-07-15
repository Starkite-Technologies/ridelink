import {
  SEAT_TEMPLATES,
  calculateBookingTotals,
  canCreateTripWithVehicle,
  canCancelBooking,
  canSelectSeat,
  canTransitionTrip,
  createBookingReference,
  recurringDepartureTimes,
  validStopOrder,
  validatePassenger,
  validateRoute,
} from "../lambda/longRouteDomain";

describe("Long Route domain", () => {
  test("vehicle templates expose unique bookable seats matching capacity", () => {
    for (const template of Object.values(SEAT_TEMPLATES)) {
      const bookable = template.seats.filter((seat) => seat.isBookable);
      expect(bookable).toHaveLength(template.capacity);
      expect(new Set(bookable.map((seat) => seat.seatNumber)).size).toBe(template.capacity);
      expect(template.seats.some((seat) => seat.seatType === "DRIVER" && !seat.isBookable)).toBe(true);
    }
  });

  test("rejects invalid dates and matching towns", () => {
    expect(validateRoute("Windhoek", "Windhoek", "2020-01-01T08:00:00Z")).toEqual(
      expect.arrayContaining(["Departure and destination must be different", "Departure must be in the future"])
    );
  });

  test("validates ordered unique Namibian stops", () => {
    const stops = [{ town: "Otjiwarongo", stopOrder: 1 }, { town: "Tsumeb", stopOrder: 2 }];
    expect(validStopOrder("Windhoek", "Oshakati", stops)).toBe(true);
    expect(stops.map((stop) => stop.town)).toEqual(["Otjiwarongo", "Tsumeb"]);
    expect(validStopOrder("Windhoek", "Oshakati", [{ town: "Otjiwarongo", stopOrder: 2 }])).toBe(false);
    expect(validStopOrder("Windhoek", "Oshakati", [{ town: "Windhoek", stopOrder: 1 }])).toBe(false);
  });

  test("validates operational passenger details on the server", () => {
    expect(validatePassenger({ fullName: "Maria Amutenya", phoneNumber: "+264 81 123 4567", emergencyContact: "Paulus 0815551234", ageCategory: "ADULT" })).toBe(true);
    expect(validatePassenger({ fullName: "M", phoneNumber: "123", emergencyContact: "", ageCategory: "UNKNOWN" })).toBe(false);
  });

  test("creates capped independent recurring departure times and honors exclusions", () => {
    expect(recurringDepartureTimes("2026-07-17T06:00:00.000Z", [5, 0], "2026-07-26", ["2026-07-19"])).toEqual([
      "2026-07-17T06:00:00.000Z",
      "2026-07-24T06:00:00.000Z",
      "2026-07-26T06:00:00.000Z",
    ]);
    expect(recurringDepartureTimes("2026-07-17T06:00:00.000Z", [5], "2027-12-31", [], 2)).toHaveLength(2);
  });

  test("allows available, expired, or same-user held seats only", () => {
    expect(canSelectSeat({ status: "AVAILABLE", isBookable: true }, "user-a", 100)).toBe(true);
    expect(canSelectSeat({ status: "HELD", isBookable: true, heldByUserId: "user-b", holdExpiresAtEpoch: 99 }, "user-a", 100)).toBe(true);
    expect(canSelectSeat({ status: "HELD", isBookable: true, heldByUserId: "user-a", holdExpiresAtEpoch: 200 }, "user-a", 100)).toBe(true);
    expect(canSelectSeat({ status: "HELD", isBookable: true, heldByUserId: "user-b", holdExpiresAtEpoch: 200 }, "user-a", 100)).toBe(false);
    expect(canSelectSeat({ status: "BOOKED", isBookable: true }, "user-a", 100)).toBe(false);
  });

  test("calculates multi-seat totals on the server", () => {
    expect(calculateBookingTotals([350, 350], 15, 20, 50)).toEqual({ subtotal: 700, fees: 85, totalAmount: 785 });
  });

  test("enforces cancellation cutoff", () => {
    const departure = "2030-01-03T08:00:00.000Z";
    expect(canCancelBooking(departure, 24, Date.parse("2030-01-01T08:00:00.000Z"))).toBe(true);
    expect(canCancelBooking(departure, 24, Date.parse("2030-01-02T09:00:00.000Z"))).toBe(false);
  });

  test("enforces trip lifecycle transitions", () => {
    expect(canTransitionTrip("DRAFT", "PUBLISH")).toBe(true);
    expect(canTransitionTrip("DRAFT", "START")).toBe(false);
    expect(canTransitionTrip("BOARDING", "START")).toBe(true);
    expect(canTransitionTrip("COMPLETED", "CANCEL")).toBe(false);
  });

  test("only approved vehicles can create Driver trips", () => {
    expect(canCreateTripWithVehicle("APPROVED")).toBe(true);
    expect(canCreateTripWithVehicle("PENDING")).toBe(false);
    expect(canCreateTripWithVehicle("SUSPENDED")).toBe(false);
  });

  test("generates predictable Namibia booking references", () => {
    expect(createBookingReference(new Date("2026-07-14T10:00:00.000Z"), 0.1234)).toBe("RL2607141233");
  });
});
