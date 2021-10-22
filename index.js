// express stuff 
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');

var app = express();

// Socket.io
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);



app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true },));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
let port = 3000;

const { MongoClient } = require('mongodb');

app.use(express.static(__dirname));
app.use(express.static("public"));

let incorrect = false;
let errPageChange = 1;

// local mongo db url
let url = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false";

//Whole mongo connection in method
MongoClient.connect(url, async function (err, db) {
	if (err) throw (err);
	var currentUsers = db.db("data").collection("users");

	io.on('connection', (socket) => {
		socket.on('chat message', (data) => {
			io.emit('chat message', data);
		});
		socket.on("pfp", function (username, pfp) {
			updatePfp(username, pfp);
		});
		socket.on("password", function (username, password) {
			updatePassword(username, password);
		});
	});

	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/index.html');
	});

	app.get('/ourpolicies', function (req, res) {
		res.sendFile(__dirname + '/pages/aboutus.html');
	});
	app.get('/login', function (req, res) {
		if (!incorrect) {
			res.sendFile(__dirname + '/pages/login.html');
		}
		else {
			incorrect = false;
			res.sendFile(__dirname + '/pages/errorPages/errlogin.html');
		}
	});

	// 
	app.get('/home', async function (req, res) {
		if (req.session.loggedin) {
			req.session.username = await currentUsers.findOne({ username: req.session.username }).then(data => data.username);;
			req.session.pfp = await currentUsers.findOne({ username: req.session.username }).then(data => data.pfp);

			res.render(__dirname + "/pages/home.html", { data: { username: req.session.username, pfp: req.session.pfp } });
		} else {
			res.redirect('/login');
		}
	});

	app.get('/signup', function (req, res) {
		if (errPageChange == 1) res.sendFile(__dirname + '/pages/signup.html');
		else if (errPageChange == 2) res.sendFile(__dirname + '/pages/errorPages/errsignup1.html')
		else if (errPageChange == 3) res.sendFile(__dirname + '/pages/errorPages/errsignup2.html')
		else if (errPageChange == 4) res.sendFile(__dirname + '/pages/completedPages/comsignup.html')
		errPageChange = 1
	});

	function updatePfp(username, pfp) {
		currentUsers.findOneAndUpdate({ username: username }, { $set: { pfp: pfp } })
	}
	function updatePassword(username, password) {
		currentUsers.findOneAndUpdate({ username: username }, { $set: { password: password } })
	}

	function updateUser(username, password, pfp) {
		if (err) throw err;
		var newUser = { username: username, password: password, pfp: pfp };

		if (currentUsers.findOne({ username: username, password: password })) {
			console.log("created new user")
			currentUsers.insertOne(newUser);
		}
		else {
			console.log("updated user");
			currentUsers.findOneAndUpdate({ username: username }, { $set: newUser })
		}
	}
	// logging in authorization
	app.post('/auth', async function (req, res) {
		var username = req.body.username.trim();
		var password = req.body.password;
		var remember = req.body.remb == "remb" ? true : false;
		if (remember) {
			var hour = 3600000;
			req.session.cookie.maxAge = 14 * 24 * hour; //2 weeks
		} else {
			req.session.cookie.expires = false;
		}
		if (username && password) {
			if (await currentUsers.findOne({ username: username, password: password }) != null) {
				let user = await currentUsers.findOne({ username: username, password: password });
				req.session.loggedin = true;
				req.session.username = username;
				req.session.pfp = user.pfp;
				res.redirect('/home');
			}
			else {
				res.redirect('/login');
				incorrect = true;
			}
		}
		res.end();
	});

	// sign up authorazation
	app.post('/auth0', async function (req, res) {
		var username = req.body.username.trim();
		var password = req.body.password;
		var rePassword = req.body.rePassword;
		var pfp = req.body.pfp;


		if (username && password && rePassword) {
			if (password == rePassword) {
				if (await users.findOne({ username: username }) == null) {
					updateUser(username, password, pfp);
					res.redirect('/signup');
					errPageChange = 4;
				}
				else {
					res.redirect('/signup');
					errPageChange = 3;
				}
			}
			else {
				res.redirect('/signup');
				errPageChange = 2;
			}
		}
		res.end()
	})

	app.set('view engine', 'ejs');

	app.engine('html', require('ejs').renderFile);

	server.listen(port, () => {
		console.log("Up and Runnning in 'Localhost:" + port + "'");
	});
})

// all get's and directioning for all html's
