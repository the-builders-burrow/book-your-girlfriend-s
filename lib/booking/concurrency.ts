import { BookingError } from "@/lib/booking/errors";

let activeMissions = 0;

function missionLimit(): number {
  const parsed = Number.parseInt(
    process.env.BOOKING_MAX_CONCURRENCY ?? "1",
    10,
  );
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 3) : 1;
}

export function acquireBookingSlot(): () => void {
  if (activeMissions >= missionLimit()) {
    throw new BookingError(
      "BOOKING_BUSY",
      "The booking agent is already running. Try again in a moment.",
      429,
    );
  }
  activeMissions += 1;
  let released = false;
  return () => {
    if (!released) {
      activeMissions = Math.max(0, activeMissions - 1);
      released = true;
    }
  };
}
