// const { Router } = require('express');
const { syncEvents } = require('../services/google-calendar');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { Router } = require('express');
const router = Router();

router.post('/google/calendar', async (req: any, res: any) => {
  const resourceId = req.headers['x-goog-resource-id'];
  const googleCalendar = await prisma.googleCalendar.findFirst({
    where: { resourceId },
  });

  if (googleCalendar) {
    await syncEvents(googleCalendar.id);
  }

  res.sendStatus(200);
});

module.exports = router;

export {};

