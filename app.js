var express = require('express'); 
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var staticFolder = require('static');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var db = require("./routes/db.js");
var login = require("./routes/login.js");
var mainpage = require("./routes/mainpage.js");

var app = express(); 

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
 
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('layout', 'layout');
//app.enable('view cache');
app.engine('html', require('hogan-express')); 

app.use(bodyParser());            
app.use(methodOverride());
app.use(cookieParser());
app.use(session({secret:'En hemlighet'}));
app.use(express.static(__dirname + '/public'));

app.get("/login", login.index); 
app.post("/login", login.post);

app.get("/", mainpage.index);  

app.get("/gettimes", db.getTimes);

app.get("/importusers", db.importUsers);
app.get("/importtimes", db.importTimes);

 
/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404; 
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {  
    message: err.message,
    error: {}
  });
});
