/** Ajax functions and db access ***/

/*** Initialize database connection ***/
var mysql = require('mysql');
var dbconnection = mysql.createConnection({
  host     : 'localhost',
  user     : 'webuser',
  password : 'n0ll.fyra.n0ll',
  database : 'times'
  //,timezone : 'utc'
});


/*** Get jqgrid data ***/
module.exports.getTimes = function(req, res) {
  var user = req.session.loggedinUser;
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

  var sql = "select t.id, c.name as customer, p.name as project, a.name as activity, t.comment, t.starttime as startdate, t.starttime, t.elapsedtime  " +
    "from times.rawtimes t " +
    "inner join times.activities a on a.id=t.activityid " +
    "inner join times.projects p on p.id=a.projectid " +
    "inner join times.customers c on c.id=p.customerid " +
    "where t.username='" + user + "' and not elapsedtime is null and paused <> 1 " +
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


/*** Save an edited registration from grid or delete a registration ***/
module.exports.saveTime = function(req, res) {
  if (req.body.oper == "del") {
    dbconnection.query("delete from rawtimes where id=" + req.body.id, function(err, rows) {
      if (err) console.log(err);
      res.json({});
    });
  }
  else if (req.body.oper == "edit") {
    var starttime = new Date(req.body.startdate + " " + req.body.starttime);
    var endtime = new Date(starttime.getTime() + req.body.elapsedtime*60000);
    var sql = "update rawtimes set " +
      "activityid=" + req.body.activity + "," +
      "comment='" + req.body.comment + "'," +
      "starttime='" + timeToString(starttime) + "'," +
      "elapsedtime=" + req.body.elapsedtime + " " +
      "where id=" + req.body.id;
    dbconnection.query(sql, function(err, rows) {
      if (err) console.log(err);
      res.json({});
    });
  }
};
 

/*** Get the 10 latest activities ***/
module.exports.getLatestActivities = function(req, res) {
  if (!req.session.loggedinUser) { 
    res.json({data:[], err:"Logged out"});
    return;
  }
  var user = req.session.loggedinUser;
  var sql = "select distinct a.id as aid, a.name as aname, p.id as pid, p.name as pname, c.id as cid, c.name as cname " +
    "from rawtimes rt " +
    "inner join activities a on a.id=rt.activityid " +
    "inner join projects p on p.id=a.projectid " +
    "inner join customers c on c.id=p.customerid " +
    "where a.deleted=0 and rt.username='" + user + "' and not rt.elapsedtime is null " +
    "order by rt.id desc limit 0, 10";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
}

/*** Get customers data. No parameters **/
module.exports.getCustomers = function(req, res) {
  if (!req.session.loggedinUser) { 
    res.json({data:[], err:"Logged out"});
    return;
  }
  dbconnection.query("select id as value, name as label from customers where deleted=0 order by name", function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
};

/*** Get projects data. Parameters: byname, customer ***/
module.exports.getProjects = function(req, res) {
  if (!req.session.loggedinUser) { 
    res.json({data:[], err:"Logged out"});
    return;
  }
  var customer = req.query.customer;
  var sql = "select " +
    "p.id as value, p.name as label " +
    "from projects p " +
    "inner join customers c on " +
    "c.id = p.customerid ";
  if (req.query.byname)
    sql += "where c.name='" + customer + "' ";
  else
    sql += "where p.deleted=0 and c.id=" + customer + " ";
  sql += "order by p.name";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
};


/*** Get activities data. Parameters: byname, project **/
module.exports.getActivities = function(req, res) {
  if (!req.session.loggedinUser) { 
    res.json({data:[], err:"Logged out"});
    return;
  }
  var project = req.query.project;
  var user = req.session.loggedinUser;
  var sql = "select " +
    "a.id as value, a.name as label " +
    "from activities a " +
    "inner join projects p on " +
    "p.id = a.projectid ";
  if (req.query.byname)
    sql += "where p.name='" + project + "' and ";
  else
    sql += "where a.deleted=0 and p.id=" + project + " and ";
  sql += "a.username = '" + user + "' " +
     "order by p.name";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
};


/*** Start time count for an active avtivity ***/
module.exports.startActivity = function(req, res) {
  var projectid = req.query.projectid;
  var activityid = req.query.activityid;
  var comment = req.query.comment;
  var starttime = timeToString(new Date(req.query.starttime));
  var user = req.session.loggedinUser;

  if (activityid == 0) { // Use an empty activity if not specified
    getEmptyActivity(user, projectid, function(id){
      activityid = id;
      doStartActivity(user, activityid, comment, starttime, function(result){
        res.json(result);
      });
    });
  }
  else {
    doStartActivity(user, activityid, comment, starttime, function(result){
      res.json(result);
    });
  }
};

/*** Start activity by adding a rawtimes post ***/
function doStartActivity(user, activityid, comment, starttime, callback) {
  var sql = "insert into times.rawtimes " + 
    "(username, activityid, comment, starttime) " +
    "values ('" + user + "', " + activityid + ", '" + comment + "', '" + starttime + "')"; 
  dbconnection.query(sql, function(err, result) {
    if (err) console.log(err);
    var newid = result.insertId;
    getPausedElapsed(user, activityid, newid, function(elapsed){
      callback({newid:result.insertId, elapsed:elapsed});
    });
  });
};

/*** Get or creata an empty activity for the project ***/
function getEmptyActivity(user, projectid, callback) {
  dbconnection.query("select id from times.activities where projectid=" + projectid + " and username='" + user + "' and name=''", function(err, rows) {
    if (rows.length > 0) {
      callback(rows[0].id);
    }
    else {
      dbconnection.query("insert into times.activities (username, projectid, name, deleted) values('" + user + "', " + projectid + ", '', 0)", function(err, response) {
        callback(response.insertId);
      });
    }
  });
}


/*** Stop time count for the active avtivity and save elapsed time ***/
module.exports.stopActivity = function(req, res) {
  if (req.query.paused != 1) { 
    dbconnection.query("update rawtimes set paused=0 where username='" + req.session.loggedinUser + "'", function(err, result) {
      if (err) console.log(err);
    });
  }
  var starttime = new Date(req.query.starttime);
  var stoptime = new Date(req.query.stoptime);
  var elapsed = parseInt((stoptime - starttime)/60000, 10);
  if (elapsed > 0) {
    var sql = "update rawtimes " + 
      "set elapsedtime=" + elapsed + ", " +
      "paused=" + req.query.paused + " " +
      "where id=" + req.query.id;
    dbconnection.query(sql, function(err, result) {
      if (err) console.log(err);
      res.json({elapsed:elapsed});
    });
  }
  else {
    var sql = "delete from rawtimes where id=" + req.query.id;
    dbconnection.query(sql, function(err, result) {
      if (err) console.log(err);
      res.json({elapsed:elapsed});
    });
  }
}; 


/*** Register an activity ***/
module.exports.registerActivity = function(req, res) {
  var activityid = req.query.activityid;
  var comment = req.query.comment;
  var adate = req.query.activitydate;
  var hours = (req.query.hours.length == 0 ? 0 : parseInt(req.query.hours, 10));
  var minutes = (req.query.minutes.length == 0 ? 0 : parseInt(req.query.minutes));
  var elapsed = hours*60 + minutes;
  var user = req.session.loggedinUser;
  var sql = "insert into rawtimes " + 
    "(username, activityid, comment, starttime, elapsedtime, paused) " +
    "values ('" + user + "', " + activityid + ", '" + comment + "', '" + adate + "', " + elapsed + ", 0)"; 
  dbconnection.query(sql, function(err, result) {
    if (err) console.log(err);
    res.json({err:err});
  });
};


/*** Get the currently active avtivity from the database ***/
module.exports.getActiveActivity = function(req, res) {
  var user = req.session.loggedinUser;
  var sql = "select c.name as customer, a.id as cid, p.name as project, p.id as pid, a.name as activity, a.id as aid, rt.id as id, rt.starttime, rt.comment, rt.paused " +
    "from times.rawtimes rt " +
    "inner join times.activities a on " +
    "a.id=rt.activityid " +
    "inner join projects p on " +
    "p.id=a.projectid " +
    "inner join times.customers c on " +
    "c.id=p.customerid " +
    "where rt.username='" + user + "' and (rt.elapsedtime is null or rt.paused=1) " +
    "order by rt.id desc";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    if (rows.length > 0) {
      rows[0].pausedElapsed = 0;
      if (rows[0].paused == 1) {
        getPausedElapsed(user, rows[0].aid, rows[0].id, function(elapsed){
          rows[0].pausedElapsed = elapsed;
          res.json(rows[0]);
        });
      }
      else 
        res.json(rows[0]);
    }
    else
      res.json(null);
  });
};

function getPausedElapsed(user, actid, rtid, callback) { 
  var sum = 0;
  var sql = "select activityid, elapsedtime from times.rawtimes where username='" + user + "' and id <= " + rtid + " and paused=1 order by id desc limit 0, 50";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    var i = 0;
    while (i < rows.length && rows[i].activityid == actid) {
      sum += (rows[i].elapsedtime == null ? 0 : rows[i].elapsedtime);
      i++;
    }
    callback(sum);
  });

}

module.exports.createCustomer = function(req, res) {
  var aname = req.query.name;
  dbconnection.query("select * from times.customers where name='" + aname + "'", function(err, rows) {
    if (err) console.log(err);
    if (rows.length > 0) {
      var id = rows[0].id;
      dbconnection.query("update times.customers set deleted=0 where id=" + id, function(err, response) {
        res.json({id:id});
      });
    }
    else {
      dbconnection.query("insert into times.customers (name, deleted) values('" + aname + "', 0)", function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};

module.exports.createProject = function(req, res) {
  var customerid = req.query.customerid;
  var aname = req.query.name;
  dbconnection.query("select * from times.projects where name='" + aname + "' and customerid=" + customerid, function(err, rows) {
    if (err) console.log(err);
    if (rows.length > 0) {
      var id = rows[0].id;
      dbconnection.query("update times.projects set deleted=0 where id=" + id, function(err, response) {
        res.json({id:id});
      });
    }
    else {
      dbconnection.query("insert into times.projects (name, customerid, deleted) values('" + aname + "', " + customerid + ", 0)", function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};

module.exports.deleteCustomer = function(req, res) {
  var id = req.query.customerid;
  dbconnection.query("update times.customers set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
  dbconnection.query("select id from times.projects where customerid=" + id, function(err, rows) {
    if (err) console.log(err);
    for (var i=0; i < rows.length; i++)
      doDeleteProject(rows[i].id);
  });
  res.json({});
}

module.exports.deleteProject = function(req, res) {
  doDeleteProject(req.query.projectid);
  res.json({});
}

module.exports.deleteActivity = function(req, res) {
  doDeleteActivity(req.query.activityid);
  res.json({});
}

function doDeleteProject(id) {
  dbconnection.query("update times.projects set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
  dbconnection.query("select id from times.activities where projectid=" + id, function(err, rows) {
    if (err) console.log(err);
    for (var i=0; i < rows.length; i++)
      doDeleteActivity(rows[i].id);
  });
}

function doDeleteActivity(id) {
  dbconnection.query("update times.activities set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
}

/*** Convert a JS Date to database friendly format ****/
function timeToString(atime) {
  if (atime.length == 0) return atime;
  var newtime = new Date(atime.getTime() - atime.getTimezoneOffset()*60000);
  return newtime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}



module.exports.loginUser = function(username, password, callback){
  var sql = "select username from users where username ='" + username + "' AND password = '" + password + "'";
  dbconnection.query(sql, function(err, rows) {
    if (err) console.log(err);
    callback(rows.length > 0);
  });
};