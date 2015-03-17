var http = require('http');
var config = require('./config');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
}).listen(config.server.port, '127.0.0.1');
console.log('Server running at http://127.0.0.1:%s/', config.server.port);