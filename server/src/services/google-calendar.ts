const { google } = require('googleapis');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SERVER_URL = process.env.SERVER_URL;

const getGoogleOauth2Client = () => {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${SERVER_URL}/auth/google/calendar/callback`
  );
};

const watchCalendar = async (userId: string) => {
  const googleCalendar = await prisma.googleCalendar.findUnique({
    where: { userId },
  });

  if (!googleCalendar) {
    throw new Error('Google calendar not found');
  }

  const oauth2Client = getGoogleOauth2Client();
  oauth2Client.setCredentials({ refresh_token: googleCalendar.refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const res = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: googleCalendar.id,
      type: 'web_hook',
      address: `${SERVER_URL}/webhook/google/calendar`,
    },
  });

  await prisma.googleCalendar.update({
    where: { id: googleCalendar.id },
    data: {
      resourceId: res.data.resourceId,
      expiration: res.data.expiration,
    },
  });
};

const syncEvents = async (googleCalendarId: string) => {
  const googleCalendar = await prisma.googleCalendar.findUnique({
    where: { id: googleCalendarId },
  });

  if (!googleCalendar) {
    throw new Error('Google calendar not found');
  }

  const oauth2Client = getGoogleOauth2Client();
  oauth2Client.setCredentials({ refresh_token: googleCalendar.refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  let syncToken = googleCalendar.syncToken;
  let events;

  if (syncToken) {
    const res = await calendar.events.list({
      calendarId: 'primary',
      syncToken,
    });
    events = res.data.items;
    syncToken = res.data.nextSyncToken;
  } else {
    const res = await calendar.events.list({
      calendarId: 'primary',
    });
    events = res.data.items;
    syncToken = res.data.nextSyncToken;
  }

  if (events) {
    for (const event of events) {
      if (event.conferenceData?.conferenceSolution?.key?.type === 'hangoutsMeet') {
        await prisma.calendarEvent.upsert({
          where: { googleEventId: event.id },
          update: {
            summary: event.summary,
            description: event.description,
            startTime: event.start.dateTime,
            endTime: event.end.dateTime,
            meetLink: event.hangoutLink,
          },
          create: {
            googleEventId: event.id,
            summary: event.summary,
            description: event.description,
            startTime: event.start.dateTime,
            endTime: event.end.dateTime,
            meetLink: event.hangoutLink,
            calendarId: googleCalendar.id,
          },
        });
      }
    }
  }

  await prisma.googleCalendar.update({
    where: { id: googleCalendar.id },
    data: { syncToken },
  });
};

module.exports = {
  watchCalendar,
  syncEvents,
};
