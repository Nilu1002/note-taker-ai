const { Router } = require('express');
const passportConfig = require('../config/passport');
const { generateToken: createToken } = require('../utils/jwt');

// Removed duplicate imports and initialization
const CLIENT_URL = process.env.CLIENT_URL || 'https://google.com';

const router = Router();

router.get('/google', passportConfig.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passportConfig.authenticate('google', { failureRedirect: '/', session: false }),
  (req: any, res: any) => {
    const user = req.user;
    const token = createToken({ id: user.id });
    // redirect to google.com
    res.redirect(CLIENT_URL);
  }
);

router.get(
  '/google/calendar',
  passportConfig.authenticate('google-calendar', { scope: ['https://www.googleapis.com/auth/calendar.readonly'], session: false })
);

router.get(
  '/google/calendar/callback',
  passportConfig.authenticate('google-calendar', { failureRedirect: '/', session: false }),
  (req: any, res: any) => {
    res.redirect(CLIENT_URL);
  }
);

module.exports = router;

export {};

