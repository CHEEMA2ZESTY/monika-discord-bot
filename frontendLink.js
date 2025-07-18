const cors = require('cors');

module.exports = (app) => {
  const allowedOrigins = ['https://monika-dashboard.vercel.app'];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.get('/', (req, res) => {
    res.send('🌐 Backend is live and CORS-enabled for the frontend!');
  });
};
