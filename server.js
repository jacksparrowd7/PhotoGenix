const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Create the Express app
const app = express();

// Middleware setup
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// JWT secret key
const JWT_SECRET = 'b1bb213f2ea08deb82431b6ed1aa9ca8decea7fa9eeb3860590892442e1dcccbdf671d3ce51380b0e5b4bd905e4414223be7fde6a8f0f9553873c435e0edec05';

// Connect to MongoDB Atlas
const connectionString = 'mongodb+srv://jacksparrowd492:Karthi2004@cluster0.zqcv1.mongodb.net/Photogenix';
mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  profilePicture: { type: String },  // Store Base64 or URL of image
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);


const loginSchema = new mongoose.Schema({
  username: { type: String, required: true },
  loginTime: { type: Date, default: Date.now }
});
const Login = mongoose.model('Login', loginSchema);

const imageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  imageData: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', imageSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token.' });
    req.user = user; // Attach user info to request
    next();
  });
};

// Route to handle user registration
app.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.', error: error.message });
  }
});

// Route to handle user login and generate JWT token
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Log the login attempt
    const loginRecord = new Login({ username });
    await loginRecord.save();

    // Generate a JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful!', token });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.', error: error.message });
  }
});

// Route to handle image upload (with token authentication)
app.post('/uploadImage', authenticateToken, async (req, res) => {
  try {
    const { imageData } = req.body;
    const username = req.user.username; // Get username from the token

    if (!imageData) {
      return res.status(400).json({ message: 'Image data is required.' });
    }

    const newImage = new Image({ username, imageData });
    await newImage.save();
    res.status(201).json({ message: 'Image uploaded successfully!' });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'An error occurred while uploading the image.', error: error.message });
  }
});

app.use(express.static('www')); // Serves HTML, CSS, JS from /public folder

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
