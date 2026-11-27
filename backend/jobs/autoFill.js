const cron = require('node-cron');
const { database, serverValue } = require('../config/firebase');

const AUTO_FILL_GRACE_MINUTES = 30;
const AUTO_FILL_TIMEZONE = process.env.AUTO_FILL_TIMEZONE || 'Asia/Shanghai';

function isoFromParts(parts) {
  const yyyy = String(parts.year).padStart(4, '0');
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDatePartsInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.formatToParts(date).reduce((parts, part) => {
    if (part.type === 'year') parts.year = Number(part.value);
    if (part.type === 'month') parts.month = Number(part.value);
    if (part.type === 'day') parts.day = Number(part.value);
    return parts;
  }, {});
}

function getAutoFillCutoffDateISO(date = new Date(), timezone = AUTO_FILL_TIMEZONE) {
  return isoFromParts(getDatePartsInTimezone(date, timezone));
}

function clockMinutesToHHMM(mins) {
  const normalized = ((parseInt(mins || '0', 10) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseHHMM(value) {
  if (!value) return null;

  const parts = String(value).trim().split(':');
  if (parts.length !== 2) return null;

  const hh = Number(parts[0]);
  const mm = Number(parts[1]);

  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh === 24 && mm === 0) return 1440;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  return hh * 60 + mm;
}

function findAreaSchedule(areaSchedules, area) {
  const areaKey = String(area || '').trim();
  if (!areaKey || !areaSchedules) return null;

  const schedule =
    areaSchedules[areaKey] ||
    areaSchedules[areaKey.toUpperCase()] ||
    areaSchedules[areaKey.toLowerCase()];

  if (!schedule) return null;

  const start = parseHHMM(schedule.start);
  let end = parseHHMM(schedule.end);

  if (start === null || end === null) return null;
  if (end <= start) end += 1440;

  return { start, end };
}

async function autoFillMissedTimeouts(now = new Date()) {
  const cutoffDate = getAutoFillCutoffDateISO(now);

  const [recordsSnap, schedulesSnap, usersSnap] = await Promise.all([
    database.ref('timeRecords').get(),
    database.ref('settings/areaSchedules').get(),
    database.ref('users').get()
  ]);

  const records = recordsSnap.val() || {};
  const areaSchedules = schedulesSnap.val() || {};
  const users = usersSnap.val() || {};
  const updates = {};
  let filledCount = 0;

  for (const [uid, userRecords] of Object.entries(records)) {
    for (const [date, record] of Object.entries(userRecords || {})) {
      if (date >= cutoffDate || !record?.timeIn || record?.timeOut) continue;

      const area = record.area || users[uid]?.area || '';
      const schedule = findAreaSchedule(areaSchedules, area);
      if (!schedule) continue;

      const autoTimeOut = clockMinutesToHHMM(schedule.end - AUTO_FILL_GRACE_MINUTES);
      const path = `timeRecords/${uid}/${date}`;

      updates[`${path}/timeOut`] = autoTimeOut;
      updates[`${path}/autoTimeOut`] = true;
      updates[`${path}/autoTimeOutAt`] = serverValue.TIMESTAMP;
      updates[`${path}/autoTimeOutReason`] = 'missed-out';

      if (!record.area && area) {
        updates[`${path}/area`] = area;
      }

      filledCount += 1;
    }
  }

  if (Object.keys(updates).length > 0) {
    await database.ref().update(updates);
  }

  return filledCount;
}

cron.schedule('0 3 * * *', async () => {
  try {
    const filledCount = await autoFillMissedTimeouts();
    console.log(`Auto-fill job completed: ${filledCount} missed timeout(s) filled.`);
  } catch (err) {
    console.error('Auto-fill job failed:', err);
  }
}, {
  timezone: AUTO_FILL_TIMEZONE
});

module.exports = {
  AUTO_FILL_GRACE_MINUTES,
  autoFillMissedTimeouts,
  clockMinutesToHHMM,
  findAreaSchedule,
  getAutoFillCutoffDateISO,
  parseHHMM
};
