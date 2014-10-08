var db = require("./db.js");
require("date-format-lite");
Date.masks.default = 'YYYY-MM-DD hh:mm:ss';

/*** Render page or redirect to login ***/
exports.index = function(req, res) {
  getUser(req, res, function(user){
    if (user.isadmin) {
      db.connection.query("select guid, name from times.users where isactive=1 order by name", function(err, rows) {
        var useroptions = "<option value='_all_'>Alla</option>";
        for (var i=0; i < rows.length; i++) {
          useroptions += "<option value='" + rows[i].guid + "' " + (rows[i].guid == user.guid ? "selected='selected'" : "") + ">" + rows[i].name + "</option>";
        }
        res.render("index", {title:"Boka tider", username:user.username, user_name:user.name, isadmin:user.isadmin, useroptions:useroptions});
      });
    }
    else 
      res.render("index", {title:"Boka tider", username:user.username, user_name:user.name, isadmin:user.isadmin, userguid:user.guid});
  });
};


/*** Ajax calls ***/

exports.getEndedTimes = function(req, res) {
  getUser(req, res, function(user){
    var page = req.query.page;
    var maxnof = req.query.rows;
    var sortcol = req.query.sidx;;
    var sortorder = req.query.sord;
    var cols = req.query.cols.split(',');
    var searchfields = {
      'customer' : 'c.name',
      'project'  : 'p.name',
      'activity' : 'a.name',
      'comment' : 'comment',
      'startdate': 't.starttime'
    };
    var filter = getFilterSql(req.query, searchfields);
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
      "where t.username='" + user.username + "' and not elapsedtime is null and paused <> 1 " + filter + " " +
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


/*** Get compilationgrid data ***/
exports.getCompilationTimes = function(req, res) {
  var page = req.query.page;
  var maxnof = req.query.rows;
  var sortcol = req.query.sidx;
  var sortorder = req.query.sord;
  var userguid = req.query.userguid;
  var cols = req.query.cols.split(',');
  var searchfields = {
    'customer' : 'c.name',
    'project'  : 'p.name',
    'activity' : 'a.name',
    'comment'  : 'comment',
    'user'     : 'u.name'
  };
  var filter = getFilterSql(req.query, searchfields);
  var start = maxnof*(page - 1);

  var usersnip = (userguid == "_all_" ? "" : "u.guid='" + userguid + "' and ");

  var sql = "select c.name as customer, p.name as project, a.name as activity, t.comment, u.name as user, SUM(t.elapsedtime) as elapsedtime " +
    "from times.rawtimes t " +
    "inner join times.activities a on a.id=t.activityid " +
    "inner join times.projects p on p.id=a.projectid " +
    "inner join times.customers c on c.id=p.customerid " +
    "inner join times.users u on u.username=t.username " +
    "where " + usersnip + "not elapsedtime is null and paused <> 1 and t.starttime >= '" + req.query.from + "' and t.starttime <= '" + req.query.to + "' " + filter + " " +
    "group by c.name, p.name, a.name, t.comment " +
    "order by " + sortcol + " " + sortorder;

  db.connection.query(sql, function(err, rows) {
    if (err) console.log(err);
    var totpages = (rows.length > 0 ? parseInt(Math.floor(rows.length/maxnof), 10) : 0);
    var rows2 = rows.splice(start, maxnof);
    var sum = 0;
    for (var i=0; i < rows2.length; i++)
      sum += rows2[i].elapsedtime
    var userdata = {
      'comment':'Totalt:',
      'elapsedtime':sum
    };
    res.json({
      page:page,
      total:totpages,
      records:rows.length,
      rows:rows2,
      userdata: userdata
    });
  });
};


/*** Save an edited registration from endedgrid or delete a registration ***/
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
      "starttime='" + starttime.format() + "'," +
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
      "where a.deleted=0 and rt.username='" + user.username + "' and not rt.elapsedtime is null " +
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
    sql += "a.username = '" + user.username + "' " +
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
    var starttime = new Date(req.query.starttime).format();

    if (activityid == 0) { // Use an empty activity if not specified
      getEmptyActivity(user.username, projectid, function(id){
        activityid = id;
        doStartActivity(user.username, activityid, comment, starttime, function(result){
          res.json(result);
        });
      });
    }
    else {
      doStartActivity(user.username, activityid, comment, starttime, function(result){
        res.json(result);
      });
    }
  });
};


/*** Start activity by adding a rawtimes post ***/
function doStartActivity(username, activityid, comment, starttime, callback) {
  var sql = "insert into times.rawtimes " + 
    "(username, activityid, comment, starttime) " +
    "values ('" + username + "', " + activityid + ", '" + comment + "', '" + starttime + "')"; 
  db.connection.query(sql, function(err, result) {
    if (err) console.log(err);
    var newid = result.insertId;
    getPausedElapsed(username, activityid, newid, function(elapsed){
      callback({newid:result.insertId, elapsed:elapsed});
    });
  });
};


/*** Get or create an unnamed activity for the project ***/
function getEmptyActivity(username, projectid, callback) {
  db.connection.query("select id from times.activities where projectid=" + projectid + " and username='" + username + "' and name=''", function(err, rows) {
    if (rows.length > 0) {
      callback(rows[0].id);
    }
    else {
      db.connection.query("insert into times.activities (username, projectid, name, deleted) values('" + username + "', " + projectid + ", '', 0)", function(err, response) {
        callback(response.insertId);
      });
    }
  });
}


/*** Stop time count for the active avtivity and save elapsed time ***/
exports.stopActivity = function(req, res) {
  getUser(req, res, function(user){
    if (req.query.paused != 1) { 
      db.connection.query("update rawtimes set paused=0 where username='" + user.username + "'", function(err, result) {
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
      "values ('" + user.username + "', " + activityid + ", '" + comment + "', '" + adate + "', " + elapsed + ", 0)"; 
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
      "where rt.username='" + user.username + "' and (rt.elapsedtime is null or rt.paused=1) " +
      "order by rt.id desc";
    db.connection.query(sql, function(err, rows) {
      if (err) console.log(err);
      if (rows.length > 0) {
        rows[0].pausedElapsed = 0;
        if (rows[0].paused == 1) {
          getPausedElapsed(user.username, rows[0].aid, rows[0].id, function(elapsed){
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
function getPausedElapsed(username, actid, rtid, callback) { 
  var sum = 0;
  var sql = "select activityid, elapsedtime from times.rawtimes where username='" + username + "' and id <= " + rtid + " and paused=1 order by id desc limit 0, 50";
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


/*** Local functions ***/

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


/*** Get the currently logged in user. If query parameter guid is incorrect, redirect to login page. ***/
function getUser(req, res, callback) {
  if (!req.session.loggedinUser) {
    var guid = req.query.guid;
    db.connection.query("select username, isadmin, guid, name from times.users where guid='" + req.query.guid + "'", function(err, rows) {
      if (rows.length == 0)
        res.redirect("/login");
      else {
        req.session.loggedinUser = rows[0];
        callback(req.session.loggedinUser);
      }
    });
  }
  else
    callback(req.session.loggedinUser);
};


/*** Generate sql from filter parameters from grid ***/
function getFilterSql(q, searchfields) {
  var sql = "";
  if (q.filters) {
    var json = JSON.parse(q.filters);  
    sql = "and (";
    for (var i=0; i < json.rules.length; i++) {
      if (i > 0) sql += " " + json.groupOp + " ";
      sql += searchfields[json.rules[i].field] + " " + getSqlOper(json.rules[i].op, json.rules[i].data);
    }
    sql += ")";
  }
  var sql2 = "";
  for(var prop in q) {
    if (searchfields[prop] != null) {
      if (sql2.length > 0) sql2 += " and ";
      sql2 += searchfields[prop] + " like '%" + q[prop] + "%'";
    }
  }
  if (sql2.length > 0) 
    sql += " and (" + sql2 + ")";

  return sql;
}

/*** Get sql operator from grid operator ***/
function getSqlOper(op, val) {
  if (op == "ne") return "<> '" + val + "'";
  else if (op == "lt") return "< " + val;
  else if (op == "le") return "<= " + val;
  else if (op == "gt") return "> " + val;
  else if (op == "ge") return ">= " + val;
  else if (op == "bw") return "like '" + val + "%'";
  else if (op == "bn") return "not like '" + val + "%'";
  else if (op == "in") return "in ('" + val + "')";
  else if (op == "ni") return "not in ('" + val + "')";
  else if (op == "ew") return "like '%" + val + "'";
  else if (op == "en") return "not like '%" + val + "'";
  else if (op == "cn") return "like '%" + val + "%'";
  else if (op == "nc") return "not like '%" + val + "%'";
  else return "= '" + val + "'";
}
