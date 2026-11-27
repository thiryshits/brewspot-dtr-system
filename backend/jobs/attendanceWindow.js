function attendanceFieldForTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const clockMinutes = hours * 60 + minutes;
  if (clockMinutes >= 12 * 60 && clockMinutes < 22 * 60) return 'timeIn';
  if (clockMinutes >= 22 * 60 || clockMinutes <= 5 * 60) return 'timeOut';
  return null;
}

function startAttendanceWindowReconciliation() {
  const { database } = require('../config/firebase');
  const recordsRef = database.ref('timeRecords');
  let previousRecords = null;

  recordsRef.on('value', (snapshot) => {
    const records = snapshot.val() || {};
    if (previousRecords === null) {
      previousRecords = records;
      return;
    }

    const updates = {};

    for (const [uid, userRecords] of Object.entries(records)) {
      for (const [date, record] of Object.entries(userRecords || {})) {
        const previous = previousRecords[uid]?.[date] || {};
        if (record?.autoTimeOut && record.autoTimeOutAt !== previous.autoTimeOutAt) continue;

        const changedFields = ['timeIn', 'timeOut'].filter((field) =>
          typeof record?.[field] === 'string' && record[field] !== previous[field]
        );
        if (changedFields.length !== 1) continue;

        const sourceField = changedFields[0];
        const targetField = attendanceFieldForTime(record[sourceField]);
        const eventDate = sourceField === 'timeIn' ? record.dateIn : record.dateOut;
        if (!targetField || targetField === sourceField || !eventDate) continue;

        const path = `timeRecords/${uid}/${date}`;
        updates[`${path}/${targetField}`] = record[sourceField];
        updates[`${path}/${sourceField}`] = previous[sourceField] || null;

        if (targetField === 'timeOut') {
          updates[`${path}/dateOut`] = eventDate;
          updates[`${path}/dateIn`] = previous.dateIn || null;
          updates[`${path}/status`] = 'CLOSED';
        } else {
          updates[`${path}/dateIn`] = eventDate;
          updates[`${path}/dateOut`] = previous.dateOut || null;
          updates[`${path}/status`] = 'OPEN';
        }
      }
    }

    previousRecords = records;
    if (Object.keys(updates).length > 0) {
      database.ref().update(updates).catch((error) => {
        console.error('Attendance window reconciliation failed:', error);
      });
    }
  }, (error) => {
    console.error('Attendance window listener failed:', error);
  });
}

module.exports = {
  attendanceFieldForTime,
  startAttendanceWindowReconciliation
};