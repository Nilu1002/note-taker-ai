const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);

app.get('/', (req: any, res: any) => {
  res.status(200).send('Hello from the server!');
});

app.listen(Number(PORT), () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
