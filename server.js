const http = require('http');
const mongoose = require('mongoose');

// 1. DATABASE CONNECTION
const dbURI = 'mongodb+srv://sas_db_user:Emmajamjoh1234@cluster0.jmt4otn.mongodb.net/myDatabase?retryWrites=true&w=majority';

mongoose.connect(dbURI)
    .then(() => console.log('Status: Connected to MongoDB Cloud!'))
    .catch((err) => console.error('Status: Connection Failed!', err.message));

// 2. SCHEMAS
const userSchema = new mongoose.Schema({
    fullName: String,
    regNo: { type: String, unique: true },
    password: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. SERVER LOGIC
const server = http.createServer((req, res) => {
    // Ruhusu request kutoka kwenye HTML files (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.end(); return; }

    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
        body = Buffer.concat(body).toString();
        const url = req.url;

        res.setHeader('Content-Type', 'application/json');

        try {
            // A: REGISTER ROUTE
            if (url === '/api/register' && req.method === 'POST') {
                const data = JSON.parse(body);
                const newUser = new User(data);
                await newUser.save();
                res.end(JSON.stringify({ message: "Account Created!" }));
            } 
            
            // B: LOGIN ROUTE
            else if (url === '/api/login' && req.method === 'POST') {
                const { regNo, password } = JSON.parse(body);
                const user = await User.findOne({ regNo, password });

                if (user) {
                    res.end(JSON.stringify({ fullName: user.fullName, regNo: user.regNo }));
                } else {
                    res.statusCode = 401;
                    res.end(JSON.stringify({ error: "Invalid Reg No or Password" }));
                }
            }
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Server Error: " + error.message }));
        }
    });
});

server.listen(3000, () => console.log('Backend running on port 3000'));