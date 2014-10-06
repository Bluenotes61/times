var db = require("./db.js");

/*** Render page or redirect to login ***/
exports.index = function(req, res) {
  if (getUserFromGuid(req.query.guid, function(user){
    if (user.length == 0) {
      res.redirect("/login");
    }
    else {
      req.session.loggedinUser = user;
      res.render("index", {title:"Boka tider", username:user});
    }
  }));
};


/*** Ajax calls ***/

/*** Get jqgrid data ***/
exports.getTimes = function(req, res) {
  getUser(req, res, function(user){
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

    db.connection.query(sql, function(err, rows) {
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
  });
};


/*** Save an edited registration from grid or delete a registration ***/
exports.saveTime = function(req, res) {
  if (req.body.oper == "del") {
    db.connection.query("delete from rawtimes where id=" + req.body.id, function(err, rows) {
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
    db.connection.query(sql, function(err, rows) {
      if (err) console.log(err);
      res.json({});
    });
  }
};
 

/*** Get the 10 latest activities ***/
exports.getLatestActivities = function(req, res) {
  getUser(req, res, function(user){
    var sql = "select distinct a.id as aid, a.name as aname, p.id as pid, p.name as pname, c.id as cid, c.name as cname " +
      "from rawtimes rt " +
      "inner join activities a on a.id=rt.activityid " +
      "inner join projects p on p.id=a.projectid " +
      "inner join customers c on c.id=p.customerid " +
      "where a.deleted=0 and rt.username='" + user + "' and not rt.elapsedtime is null " +
      "order by rt.id desc limit 0, 10";
    db.connection.query(sql, function(err, rows) {
      if (err) console.log(err);
      res.json({data:rows, err:err});
    });
  });
}

/*** Get customers data. No parameters **/
exports.getCustomers = function(req, res) {
  db.connection.query("select id as value, name as label from customers where deleted=0 order by name", function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
};

/*** Get projects data. Parameters: byname, customer ***/
exports.getProjects = function(req, res) {
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
  db.connection.query(sql, function(err, rows) {
    if (err) console.log(err);
    res.json({data:rows, err:err});
  });
};


/*** Get activities data. Parameters: byname, project **/
exports.getActivities = function(req, res) {
  getUser(req, res, function(user){
    var project = req.query.project;
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
    db.connection.query(sql, function(err, rows) {
      if (err) console.log(err);
      res.json({data:rows, err:err});
    });
  });
};


/*** Start time count for an active avtivity ***/
exports.startActivity = function(req, res) {
  getUser(req, res, function(user){
    var projectid = req.query.projectid;
    var activityid = req.query.activityid;
    var comment = req.query.comment;
    var starttime = timeToString(new Date(req.query.starttime));

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
  });
};


/*** Start activity by adding a rawtimes post ***/
function doStartActivity(user, activityid, comment, starttime, callback) {
  var sql = "insert into times.rawtimes " + 
    "(username, activityid, comment, starttime) " +
    "values ('" + user + "', " + activityid + ", '" + comment + "', '" + starttime + "')"; 
  db.connection.query(sql, function(err, result) {
    if (err) console.log(err);
    var newid = result.insertId;
    getPausedElapsed(user, activityid, newid, function(elapsed){
      callback({newid:result.insertId, elapsed:elapsed});
    });
  });
};


/*** Get or create an unnamed activity for the project ***/
function getEmptyActivity(user, projectid, callback) {
  db.connection.query("select id from times.activities where projectid=" + projectid + " and username='" + user + "' and name=''", function(err, rows) {
    if (rows.length > 0) {
      callback(rows[0].id);
    }
    else {
      db.connection.query("insert into times.activities (username, projectid, name, deleted) values('" + user + "', " + projectid + ", '', 0)", function(err, response) {
        callback(response.insertId);
      });
    }
  });
}


/*** Stop time count for the active avtivity and save elapsed time ***/
exports.stopActivity = function(req, res) {
  getUser(req, res, function(user){
    if (req.query.paused != 1) { 
      db.connection.query("update rawtimes set paused=0 where username='" + user + "'", function(err, result) {
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
      db.connection.query(sql, function(err, result) {
        if (err) console.log(err);
        res.json({elapsed:elapsed});
      });
    }
    else {
      var sql = "delete from rawtimes where id=" + req.query.id;
      db.connection.query(sql, function(err, result) {
        if (err) console.log(err);
        res.json({elapsed:elapsed});
      });
    }
  });
}; 


/*** Register an activity ***/
exports.registerActivity = function(req, res) {
  getUser(req, res, function(user){
    var activityid = req.query.activityid;
    var comment = req.query.comment;
    var adate = req.query.activitydate;
    var hours = (req.query.hours.length == 0 ? 0 : parseInt(req.query.hours, 10));
    var minutes = (req.query.minutes.length == 0 ? 0 : parseInt(req.query.minutes));
    var elapsed = hours*60 + minutes;
    var sql = "insert into rawtimes " + 
      "(username, activityid, comment, starttime, elapsedtime, paused) " +
      "values ('" + user + "', " + activityid + ", '" + comment + "', '" + adate + "', " + elapsed + ", 0)"; 
    db.connection.query(sql, function(err, result) {
      if (err) console.log(err);
      res.json({err:err});
    });
  });
};


/*** Get the currently active avtivity from the database ***/
exports.getActiveActivity = function(req, res) {
  getUser(req, res, function(user){
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
    db.connection.query(sql, function(err, rows) {
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
  });
};


/*** Sum elapsed time for all paused instances of the current activity ***/
function getPausedElapsed(user, actid, rtid, callback) { 
  var sum = 0;
  var sql = "select activityid, elapsedtime from times.rawtimes where username='" + user + "' and id <= " + rtid + " and paused=1 order by id desc limit 0, 50";
  db.connection.query(sql, function(err, rows) {
    if (err) console.log(err);
    var i = 0;
    while (i < rows.length && rows[i].activityid == actid) {
      sum += (rows[i].elapsedtime == null ? 0 : rows[i].elapsedtime);
      i++;
    }
    callback(sum);
  });

}

/*** Create a new customer. Parameter: name ***/
exports.createCustomer = function(req, res) {
  var aname = req.query.name;
  db.connection.query("select * from times.customers where name='" + aname + "'", function(err, rows) {
    if (err) console.log(err);
    if (rows.length > 0) {
      var id = rows[0].id;
      db.connection.query("update times.customers set deleted=0 where id=" + id, function(err, response) {
        res.json({id:id});
      });
    }
    else {
      db.connection.query("insert into times.customers (name, deleted) values('" + aname + "', 0)", function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};


/*** Create a new project. Parameters: customerid, name ***/
exports.createProject = function(req, res) {
  var customerid = req.query.customerid;
  var aname = req.query.name;
  db.connection.query("select * from times.projects where name='" + aname + "' and customerid=" + customerid, function(err, rows) {
    if (err) console.log(err);
    if (rows.length > 0) {
      var id = rows[0].id;
      db.connection.query("update times.projects set deleted=0 where id=" + id, function(err, response) {
        res.json({id:id});
      });
    }
    else {
      db.connection.query("insert into times.projects (name, customerid, deleted) values('" + aname + "', " + customerid + ", 0)", function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};

/*** Mark a customer and it's related projects as deleted. Parameter: customerid ***/
exports.deleteCustomer = function(req, res) {
  var id = req.query.customerid;
  db.connection.query("update times.customers set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
  db.connection.query("select id from times.projects where customerid=" + id, function(err, rows) {
    if (err) console.log(err);
    for (var i=0; i < rows.length; i++)
      doDeleteProject(rows[i].id);
  });
  res.json({});
};

/*** Mark a project and it's related activities as deleted. Parameter: projectid ***/
exports.deleteProject = function(req, res) {
  doDeleteProject(req.query.projectid);
  res.json({});
};


/*** Mark an activity as deleted. Parameter: activityid ***/
exports.deleteActivity = function(req, res) {
  doDeleteActivity(req.query.activityid);
  res.json({});
};


/** Do the database update for marking a project as deleted ***/
function doDeleteProject(id) {
  db.connection.query("update times.projects set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
  db.connection.query("select id from times.activities where projectid=" + id, function(err, rows) {
    if (err) console.log(err);
    for (var i=0; i < rows.length; i++)
      doDeleteActivity(rows[i].id);
  });
};


/** Do the database update for marking an activity as deleted ***/
function doDeleteActivity(id) {
  db.connection.query("update times.activities set deleted=1 where id=" + id, function(err, response) {
    if (err) console.log(err);
  });
};


/*** Subtract the time offset from a given js Date and it to database friendly format ****/
function timeToString(atime) {
  if (atime.length == 0) return atime;
  var newtime = new Date(atime.getTime() - atime.getTimezoneOffset()*60000);
  return newtime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
};


/*** Get the currently logged in user. If query parameter guid is incorrect, redirect to login page. ***/
function getUser(req, res, callback) {
  if (!req.session.loggedinUser) {
    var guid = req.query.guid;
    db.connection.query("select username from times.users where guid='" + req.query.guid + "'", function(err, rows) {
      if (rows.length == 0)
        res.redirect("/login");
      else
        req.session.loggedinUser = rows[0].username;
      callback(req.session.loggedinUser);
    });
  }
  else
    callback(req.session.loggedinUser);
}


/*** Returns the username given the user guid ***/
function getUserFromGuid(guid, callback){
  db.connection.query("select username from times.users where guid='" + guid + "'", function(err, rows) {
    if (err) console.log(err);
    if (rows.length == 0) {
      callback("");
    }
    else {
      callback(rows[0].username);
    }
  });
};
