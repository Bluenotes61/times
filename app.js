var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var staticFolder = require('static');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var app = express();

var server = app.listen(process.env.PORT, function() {
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


var loginpage = require("./routes/loginpage.js");
var mainpage = require("./routes/mainpage.js");

app.get("/login", loginpage.index);
app.post("/login", loginpage.post);

app.get("/", mainpage.index);


/*** Mainpage ajax functions ***/
app.get("/getendedtimes", mainpage.getEndedTimes);
app.get("/getcompilationtimes", mainpage.getCompilationTimes);
app.post("/saveedittime", mainpage.saveTime);

app.get("/getcustomers", mainpage.getCustomers);
app.get("/getprojects", mainpage.getProjects);
app.get("/getactivities", mainpage.getActivities);

app.get("/startactivity", mainpage.startActivity);
app.get("/stopactivity", mainpage.stopActivity);
app.get("/registeractivity", mainpage.registerActivity);
app.get("/getactiveactivity", mainpage.getActiveActivity);
app.get("/getlatestactivities", mainpage.getLatestActivities);

app.get("/createcustomer", mainpage.createCustomer);
app.get("/createproject", mainpage.createProject);
app.get("/createactivity", mainpage.createActivity);
app.get("/deletecustomer", mainpage.deleteCustomer);
app.get("/deleteproject", mainpage.deleteProject);
app.get("/deleteactivity", mainpage.deleteActivity);


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
