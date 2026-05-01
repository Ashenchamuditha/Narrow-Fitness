export const GYM_HOURS = [
  { day: 'Mon - Fri', time: '5:00 AM - 11:00 PM', days: [1, 2, 3, 4, 5] },
  { day: 'Saturday', time: '7:00 AM - 10:00 PM', days: [6] },
  { day: 'Sunday', time: '6:00 AM - 11:30 PM', days: [0] },
];

export function isGymOpen() {
  const now = new Date();
  const day = now.getDay();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const todayHours = GYM_HOURS.find(h => h.days.includes(day));
  if (!todayHours) return false;

  const [start, end] = todayHours.time.split(' - ');
  
  const parseTime = (timeStr: string) => {
    // Expected format: "5:00 AM" or "11:00 PM"
    const parts = timeStr.split(' ');
    const time = parts[0];
    const modifier = parts[1];
    
    let [h, m] = time.split(':').map(Number);
    if (modifier === 'PM' && h !== 12) h += 12;
    if (modifier === 'AM' && h === 12) h = 0;
    return h * 60 + (m || 0);
  };

  const startTime = parseTime(start);
  const endTime = parseTime(end);

  return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
}
