import createBareServer from "@tomphttp/bare-server-node";
import express from "express";
const router = express.Router()
import { createServer, get } from "node:http";
//import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join, resolve } from "node:path";
import { readFile } from 'fs/promises';
import { hostname } from "node:os";
import basicAuth from 'express-basic-auth';
import networkInterfaces from 'os';
const publicPath = resolve('./src/static/public');

const bare = createBareServer("/bare/");
const app = express();

console.log("Starting server")

console.log("Retrieving public IP...")
get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
  resp.on('data', function(ip) {
    console.log("My public IP address is: " + ip);
  });
});

console.log(networkInterfaces);

const json = JSON.parse(
  await readFile(
    new URL('./users.json', import.meta.url)
  )
);
console.log(json)
app.use(basicAuth({
    users: json,
	challenge: true,
	authorizer: myAuthorizer,
    unauthorizedResponse: getUnauthorizedResponse	
}))

function myAuthorizer(username, password) {
	let keys  = Object.keys(json)
	// iterate over each element in the array
	for (var i = 0; i < keys.length; i++){
	  // look for the entry with a matching `code` value
		const userMatches = basicAuth.safeCompare(username, keys[i])
		if (userMatches){
			// we found it
	    	// obj[i].name is the matched result
			const passwordMatches = basicAuth.safeCompare(password, json[username])
			if (userMatches && passwordMatches){
				// console.log(username, "  ", password, " has logged in")
			}
    		return userMatches & passwordMatches
		}
	}
    
}



function getUnauthorizedResponse(req) {
    return req.auth
        ? ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected')
        : 'No credentials provided'
}


// Load our publicPath first and prioritize it over UV.
app.use(express.static(publicPath));
// Load vendor files last.
// The vendor's uv.config.js won't conflict with our uv.config.js inside the publicPath directory.
app.use("/uv/", express.static(uvPath));

// Error for everything else
app.use((req, res) => {
  res.status(404);
  res.sendFile(join(publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

let port = parseInt(process.env.PORT || NaN);
let ip = process.env.IP || "127.0.0.1"

if (isNaN(port)) port = 8080;

console.log(port, " is the specified port")
console.log(ip, " is the specified listening address")

server.on("listening", () => {
  const address = server.address();

  // by default we are listening on 0.0.0.0 (every interface)
  // we just need to list a few
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

// https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
//process.on("SIGINT", shutdown)
//process.on("SIGTERM", shutdown)

function shutdown() {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('Server closed.');
    console.log('Exiting...');
    process.exit(0);
  });
}

//SOCKETIO
//import { Server } from "socket.io";
//const io = new Server(server);
//io.on('connection', (socket) => {
//  console.log('a user connected');
//});

server.listen({
  host: ip.toString(),
  port: port,
  exclusive: true,
});
