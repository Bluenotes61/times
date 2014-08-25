/** Ajax functions and db access ***/

var mysql = require('mysql');
var dbconnection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'times'
});


/*** Get jqgrid data ***/

module.exports.getTimes = function(req, res) {
  var username = "me";
  var page = req.query.page;
  var maxnof = req.query.rows;
  var sortcol = req.query.sidx;
  var sortorder = req.query.sord;
  var cols = req.query.cols.split(',');
  var filters = (req.query.filters ? JSON.parse(req.query.filters) : null);
  if (sortcol == "id") {
    sortcol = "starttime";
    sortorder = "desc";
  }
  var start = maxnof*(page - 1);

  var sql = "select t.id, c.name as customer, p.name as project, a.name as activity, t.description, t.starttime as startdate, t.starttime, t.endtime, t.elapsedtime  " +
    "from times.rawtimes t " +
    "inner join times.activities a on a.id=t.activityid " +
    "inner join times.projects p on p.id=a.projectid " +
    "inner join times.customers c on c.id=p.customerid " +
    "where t.username='" + username + "'" +
    "order by " + sortcol + " " + sortorder;

  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    var totpages = (rows.length > 0 ? parseInt(Math.floor(rows.length/maxnof), 10) : 0);
    var rows2 = rows.splice(start, maxnof);
    res.json({
      page:page,
      total:totpages,
      records:rows.length,
      rows:rows2
    });
  });
};


//customer=162&project=1417&activity=9676&description=&startdate=2014-05-12&starttime=22%3A00&endtime=22%3A00&elapsedtime=540&oper=edit&id=15083

module.exports.saveTime = function(req, res) {
/*  var sql = "update rawtimes set " +
    "activityid=" + req.query.activity + "," +
    "description='" + req.query.description + "'," +
    ""
  dbconnection.query("select id as value, name as label from customers order by name", function(err, rows) {
    if (err) console.log(err);

  });*/
};



/*** Get customers list. No parameters **/
module.exports.getCustomers = function(req, res) {
  dbconnection.query("select id as value, name as label from customers order by name", function(err, rows) {
    if (err) console.log(err);
    res.json(rows);
  });
};


/*** Get projects list. Parameter customer **/
module.exports.getProjects = function(req, res) {
  var customer = req.query.customer;
  var sql = "select " +
     "p.id as value, p.name as label " +
     "from projects p " +
     "inner join customers c on " +
     "c.id = p.customerid " +
     "where c.name='" + customer + "' " +
     "order by p.name";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json(rows);
  });
};



/*** Get activities list. Parameter project **/
module.exports.getActivities = function(req, res) {
  var project = req.query.project;
  var user = req.session.loggedinUser;
  user = 'me';
  var sql = "select " +
     "a.id as value, a.name as label " +
     "from activities a " +
     "inner join projects p on " +
     "p.id = a.projectid " +
     "where p.name='" + project + "' and " +
     "a.username = '" + user + "' " +
     "order by p.name";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json(rows);
  });
};

module.exports.loginUser = function(username, password, callback){
  var sql = "select username from users where username ='" + username + "' AND password = '" + password + "'";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    callback(rows.length > 0);
  });
};