import express from 'express';
import bcrypt from 'bcrypt';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory database for simplicity
const users = [];

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ username, password: hashedPassword });
        res.status(201).send('User registered successfully');
        console.log('Users:', users);
    } catch (error) {
        res.status(500).send('Error registering user');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);
        if (user && await bcrypt.compare(password, user.password)) {
            res.status(200).send('Login successful');
        } else {
            res.status(400).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
