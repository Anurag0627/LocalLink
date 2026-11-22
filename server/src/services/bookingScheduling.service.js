import ApiError from '../utils/ApiError.js';

const weekdayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function parseDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseAppointment(dateValue, timeValue) {
  const date = parseDate(dateValue);
  const [hour, minute] = timeValue.split(':').map(Number);
  const appointment = new Date(date);
  appointment.setUTCHours(hour, minute, 0, 0);
  return appointment;
}

export function validateFutureAppointment(scheduledDate, scheduledTime) {
  const appointment = parseAppointment(scheduledDate, scheduledTime);
  if (Number.isNaN(appointment.getTime())) {
    throw new ApiError(400, 'Invalid appointment date or time');
  }
  if (appointment.getTime() <= Date.now()) {
    throw new ApiError(400, 'Appointment must be scheduled in the future');
  }
  return appointment;
}

export function validateAvailability(service, scheduledDate, scheduledTime) {
  const date = parseDate(scheduledDate);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid appointment date');
  }
  const weekday = weekdayNames[date.getUTCDay()];
  const entry = (service.availability ?? []).find((item) => item.day === weekday);
  if (!entry || !entry.isAvailable || !entry.startTime || !entry.endTime) {
    throw new ApiError(400, 'The service is unavailable on the requested date');
  }

  const requestedStart = timeToMinutes(scheduledTime);
  const availabilityStart = timeToMinutes(entry.startTime);
  const availabilityEnd = timeToMinutes(entry.endTime);
  const duration = service.estimatedDuration ?? 60;
  if (
    requestedStart < availabilityStart
    || requestedStart + duration > availabilityEnd
  ) {
    throw new ApiError(400, 'Appointment is outside the service working hours');
  }
  return duration;
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function intervalsOverlap(startMinutes, duration, otherTime, otherDuration) {
  const otherStart = timeToMinutes(otherTime);
  return startMinutes < otherStart + (otherDuration ?? 60)
    && otherStart < startMinutes + duration;
}

export function isServiceAreaEligible(serviceLocationType, service, customerAddress) {
  if (serviceLocationType === 'REMOTE') return true;
  if (serviceLocationType === 'AT_PROVIDER_LOCATION') return true;
  if (!customerAddress) return false;
  if (!Array.isArray(service.serviceAreas) || service.serviceAreas.length === 0) return true;

  const postalCodes = new Set(
    (customerAddress.postalCode ? [customerAddress.postalCode] : [])
      .map((value) => value.toUpperCase()),
  );
  return service.serviceAreas.some((area) => {
    const cityMatches = area.city?.toLowerCase() === customerAddress.city?.toLowerCase();
    const stateMatches = area.state?.toLowerCase() === customerAddress.state?.toLowerCase();
    const postalMatches = (area.postalCodes ?? []).some((postalCode) =>
      postalCodes.has(postalCode.toUpperCase()));
    return cityMatches || stateMatches || postalMatches;
  });
}
