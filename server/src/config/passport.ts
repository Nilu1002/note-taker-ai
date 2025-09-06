const passportLib = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SERVER_CALLBACK_URL = process.env.SERVER_CALLBACK_URL;
const SERVER_CALENDAR_CALLBACK_URL = process.env.SERVER_CALENDAR_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SERVER_CALLBACK_URL || !SERVER_CALENDAR_CALLBACK_URL) {
  throw new Error('Google OAuth credentials are not defined in .env file');
}

passportLib.use(
  'google',
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: SERVER_CALLBACK_URL,
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (user) {
          return done(null, user);
        }

        const newUser = await prisma.user.create({
          data: {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0].value || '',
            profilePictureUrl: profile.photos?.[0].value,
          },
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passportLib.use(
  'google-calendar',
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: SERVER_CALENDAR_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log('google-calendar', profile);
        const user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          return done(new Error('User not found'), false);
        }

        await prisma.googleCalendar.upsert({
          where: { userId: user.id },
          update: { refreshToken },
          create: {
            userId: user.id,
            refreshToken,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);


module.exports = passportLib;

export {};
