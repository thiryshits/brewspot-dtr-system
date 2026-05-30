const express = require('express');
const router = express.Router();

const { database, serverValue } = require('../config/firebase');
const { requireAdmin, requireDeviceOrAuth } = require('../middleware/authMiddleware');

router.post('/log', requireDeviceOrAuth, async (req, res) => {
    const employee = String(req.body.employee || '').trim();
    const date = String(req.body.date || '').trim();
    const time = String(req.body.time || '').trim();
    const status = String(req.body.status || '').trim();

    try {
        if (!employee || !date || !time || !status) {
            return res.status(400).json({ message: 'Employee, date, time, and status are required' });
        }

        const logRef = database.ref('attendance').push();
        const log = {
            id: logRef.key,
            employee,
            date,
            time,
            status,
            createdAt: serverValue.TIMESTAMP
        };

        await logRef.set(log);

        return res.status(201).json({
            message: 'Attendance saved successfully',
            log
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error saving attendance' });
    }
});

router.get('/all', requireAdmin, async (req, res) => {
    try {
        const snapshot = await database.ref('attendance').orderByChild('createdAt').once('value');
        const logs = [];

        snapshot.forEach((childSnapshot) => {
            logs.push(childSnapshot.val());
        });

        logs.reverse();

        return res.json(logs);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching data' });
    }
});

module.exports = router;
