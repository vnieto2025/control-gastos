export function getCycleRange(payDay, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  if (day >= payDay) {
    return {
      start: new Date(year, month, payDay),
      end: new Date(year, month + 1, payDay - 1)
    };
  }
  return {
    start: new Date(year, month - 1, payDay),
    end: new Date(year, month, payDay - 1)
  };
}

export function getPreviousCycleRange(payDay, referenceDate = new Date()) {
  const { start } = getCycleRange(payDay, referenceDate);
  const dayBeforeStart = new Date(start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  return getCycleRange(payDay, dayBeforeStart);
}
