var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var staticFolder = require('static');
var cookieParser = require('cookie-parser');
var session = require('express-session');

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
app.disable('etag'); // Prevent caching


var db = require("./routes/db.js");
var login = require("./routes/login.js");
var mainpage = require("./routes/mainpage.js");

app.get("/login", login.index);
app.post("/login", login.post);
app.get("/", mainpage.index);


/*** Ajax functions ***/
app.get("/gettimes", db.getTimes);
app.post("/saveedittime", db.saveTime);

app.get("/getcustomers", db.getCustomers);
app.get("/getprojects", db.getProjects);
app.get("/getactivities", db.getActivities);

app.get("/startactivity", db.startActivity);
app.get("/stopactivity", db.stopActivity);
app.get("/registeractivity", db.registerActivity);
app.get("/getactiveactivity", db.getActiveActivity);
app.get("/getlatestactivities", db.getLatestActivities);

app.get("/createcustomer", db.createCustomer);
app.get("/createproject", db.createProject);
app.get("/deletecustomer", db.deleteCustomer);
app.get("/deleteproject", db.deleteProject);
app.get("/deleteactivity", db.deleteActivity);


/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


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
