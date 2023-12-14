const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;
const jwtSecret = 'anything';

const dotenv = require("dotenv")
dotenv.config()
const morgan = require("morgan")
const cookieParser = require("cookie-parser")
const sessions = require("express-session")
const { apiV1 } = require("./routes")
const { connectDb } = require("./db")
const { UserModel } = require("./models/user")
const { BookModel } = require("./models/book")
const { Expense } =  require("./models/expense")

const { Server } = require("socket.io");
const http = require("http");

app.use(morgan("dev"))
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))

app.use(cors());
app.use(bodyParser.json());

const corsOptions = {
  origin: 'http://localhost:3000', // Adjust this based on your frontend's URL
  credentials: true,
};

app.use(cors(corsOptions));

// const server = http.createServer(app);
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
}
);

io.on("connection", (socket) => {
  // console.log(`User Connected: ${socket.id}`);

  // socket.on("join_room", (data) => {
  //   socket.join(data);
  // });

  socket.on("send_message", (data) => {
    io.emit("receive_message_ad", data);
  });

  socket.on("send_message_ad",(data) =>{
    io.emit("receive_message", data);
  })

  // socket.on("send_message", (data) =>{
  //   io.emit("admin recive",data);
  // })
});

connectDb()
  .then(async () => {
    const admin = await UserModel.findOne({ username: "admin" })
    if (admin == null) {
      await UserModel.create({ username: "admin", password: "admin", role: "admin" })
    }
    const guest = await UserModel.findOne({ username: "guest" })
    if (guest == null) {
      await UserModel.create({ username: "guest", password: "guest", role: "guest" })
    }
  })

  app.get('/api/book', async (req, res) => {
    try {
      const book = await BookModel.find();
      res.status(200).json(book);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get boxes' });
    }
  });

// Middleware to authenticate user

const authenticateUser = (req, res, next) => {
  const token = req.header('x-auth-token');
  console.log('Received token:', token);

  if (!token) {
    return res.status(401).json({ error: 'Authorization denied' });
  }

try {
    // Decode the token without verification
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    console.log('Decoded user:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

app.post('/api/login',async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserModel.findOne({ username });

    if (user && bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error in login endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

  // const { username, password } = req.body;

  // // Check credentials
  // if (username === dummyUser.username && bcrypt.compareSync(password, dummyUser.password)) {
  //   // Generate a token
  //   const token = jwt.sign({ userId: dummyUser.id, username: dummyUser.username, role: dummyUser.role}, jwtSecret, { expiresIn: '1h' });
  //   res.json({ token });
  // } else {
  //   res.status(401).json({ error: 'Invalid credentials' });
  // }
});
// })
app.get('/api/admin-action', authenticateUser, (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    return res.status(403).json({ msg: 'Permission denied' });
  }

  res.json({ role: user.role, message: 'Admin action successful!' });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  // Hash the password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Save the user (in a real app, you'd store this information in a database)
  const newUser = {
    id: 2,
    username,
    password: hashedPassword,
  };

  res.status(201).json({ message: 'User registered successfully', user: newUser });
});

// Protected endpoint to get user information
app.get('/api/user', authenticateUser, (req, res) => {
    try {
     console.log('Decoded user%:', req.user);
      const { userId, username, role} = req.user;
      res.json({ userId, username, role});
    } catch (error) {
      console.error('Error in /api/user endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get('/api/expenses', async (req, res) => {
    try {
      const expenses = await Expense.find();
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Endpoint to add a new expense
  app.post('/api/expenses', async (req, res) => {
    try {
      const newExpense = req.body;
      
      // Check if all required fields are present
      // if (!newExpense.name || !newExpense.isbn || !newExpense.category || !newExpense.price || !newExpense.quantity) {
      //   return res.status(400).json({ error: 'All fields are required' });
      // }
  
      const createdExpense = await Expense.create(newExpense);
      res.json(createdExpense);
    } catch (error) {
      console.error('Error adding expense:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const newBook = new BookModel(req.body);
      const savedBook = await newBook.save();
      res.status(201).json(savedBook);
    } catch (error) {
      console.error("Error adding book:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  app.delete('/api/books/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
      const deletedBook = await BookModel.findByIdAndDelete(bookId);
  
      if (!deletedBook) {
        res.status(404).json({ error: 'Book not found' });
        return;
      }
  
      res.status(200).json(deletedBook);
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
