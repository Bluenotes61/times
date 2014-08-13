/** Ajax functions and db access ***/

var mysql = require('mysql');
var dbconnection = mysql.createConnection({
  host     : 'localhost',
  user     : 'webuser',
  password : 'webuser',
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

  var sql = "select t.id, c.name as customer, p.name as project, a.name as activity, t.description, t.starttime, t.endtime, t.elapsedtime  " + 
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
  if (!customer) customer = 0;
  dbconnection.query("select id as value, name as label from projects where customerid=" + customer + " order by name", function(err, rows) {
    if (err) console.log(err);
    res.json(rows);
  });
};



/*** Get activities list. Parameter project **/
module.exports.getActivities = function(req, res) {
  var project = req.query.project;
  if (!project) project = 0;
  var user = req.session.loggedinUser;
  if (!user) user='me';
  console.log("select id as value, name as label from activities where projectid=" + project + " and username='" + user + "' order by name");
  dbconnection.query("select id as value, name as label from activities where projectid=" + project + " and username='" + user + "' order by name", function(err, rows) {
    if (err) console.log(err);
    res.json(rows);
  });
};
