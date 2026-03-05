const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const winston = require('winston');
const jwt = require('jsonwebtoken');

// --------------------
// Express App Setup
// --------------------
const app = express();
app.use(bodyParser.json());
app.use(cors());

// --------------------
// Winston Logger
// --------------------
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// --------------------
// MongoDB Connection
// --------------------
mongoose.connect('mongodb://localhost:27017/userdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB connected'))
.catch(err => logger.error('MongoDB connection error:', err));

// --------------------
// User Schema & Model
// --------------------
const userSchema = new mongoose.Schema({
  fullName: String,
  contact: String,
  email: { type: String, unique: true },
  playerType: String,
  password: String
});

const User = mongoose.model('User', userSchema);

// --------------------
// JWT Middleware
// --------------------
const JWT_SECRET = 'your_jwt_secret65ase';
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).send('Unauthorized');

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Forbidden');
    req.user = user;
    next();
  });
};

// --------------------
// Register Route
// --------------------
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, contact, email, playerType, password } = req.body;

    logger.info('Received data for registration', { fullName, contact, email, playerType });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      contact,
      email,
      playerType,
      password: hashedPassword
    });

    await newUser.save();
    logger.info('User registered successfully', { fullName, email });
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    logger.error('Error saving user', { message: error.message });
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

// --------------------
// Login Route
// --------------------
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
      }
    });

  } catch (error) {
    logger.error('Login error:', { message: error.message });
    res.status(500).json({ message: 'Login failed' });
  }
});

// --------------------
// Example Protected Route
// --------------------
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});