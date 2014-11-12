var db = require("./db.js");
var Cookies = require("cookies");
require("date-format-lite");
Date.masks.default = 'YYYY-MM-DD hh:mm';

/*** Render page or redirect to login ***/
exports.index = function(req, res) {
  getUser(req, res, false, function(user){
    if (!user) { 
      res.redirect("/login");
    }
    else {
      if (user.isadmin) {
        db.runQuery("select guid, name from times.users where isactive=1 order by name", {}, function(err, rows) {
          var useroptions = "<option value='_all_'>Alla</option>";
          for (var i=0; i < rows.length; i++) {
            useroptions += "<option value='" + rows[i].guid + "' " + (rows[i].guid == user.guid ? "selected='selected'" : "") + ">" + rows[i].name + "</option>";
          }
          res.render("index", {title:"Boka tider", username:user.username, user_name:user.name, isadmin:user.isadmin, useroptions:useroptions});
        });
      }
      else 
        res.render("index", {title:"Boka tider", username:user.username, user_name:user.name, isadmin:user.isadmin, userguid:user.guid});
    }
  });
};


/*** Ajax calls ***/

exports.getEndedTimes = function(req, res) {
  getUser(req, res, true, function(user){
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

    var sql = "select t.id, c.id as cid, c.name as customer, p.id as pid, p.name as project, a.id as aid, a.name as activity, t.comment, t.starttime as startdate, t.starttime, t.elapsedtime  " +
      "from times.rawtimes t " +
      "inner join times.activities a on a.id=t.activityid " +
      "inner join times.projects p on p.id=a.projectid " +
      "inner join times.customers c on c.id=p.customerid " +
      "where t.username=? and not elapsedtime is null and paused <> 1 " + filter + " " +
      "order by " + sortcol + " " + sortorder;
    db.runQuery(sql, [user.username], function(err, rows) {
      var totpages = (rows.length > 0 ? parseInt(Math.floor(rows.length/maxnof) + 1, 10) : 0);
      var totrows = rows.length;
      var rows2 = rows.splice(start, maxnof);
      for (var i=0; i < rows2.length; i++) { // Convert to strings to avoit timezone problems
        rows2[i].startdate = new Date(rows2[i].startdate).format();
        rows2[i].starttime = new Date(rows2[i].starttime).format();
      }
      res.json({
        page:page,
        total:totpages,
        records:totrows,
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

  var usersnip = (userguid == "_all_" ? "" : "u.guid=" + db.pool.escape(userguid) + " and ");

  var sql = "select c.name as customer, p.name as project, a.name as activity, a.id as activityid, u.username as username, u.name as user, MIN(t.starttime) as mintime, MAX(t.starttime) as maxtime, SUM(t.elapsedtime) as elapsedtime " +
    "from times.rawtimes t " +
    "inner join times.activities a on a.id=t.activityid " +
    "inner join times.projects p on p.id=a.projectid " +
    "inner join times.customers c on c.id=p.customerid " +
    "inner join times.users u on u.username=t.username " +
    "where " + usersnip + "not elapsedtime is null and paused <> 1 and t.starttime >= ? and t.starttime <= ? " + filter + " " +
    "group by c.name, p.name, a.name " +
    "order by " + sortcol + " " + sortorder;

  db.runQuery(sql, [req.query.from, req.query.to], function(err, rows) {

    var totpages = (rows.length > 0 ? parseInt(Math.floor(rows.length/maxnof) + 1, 10) : 0);
    var totrows = rows.length;
    var rows2 = rows.splice(start, maxnof);
    var sum = 0;
    for (var i=0; i < rows2.length; i++) {
      sum += rows2[i].elapsedtime
      rows2[i].span = new Date(rows2[i].mintime).format("D/M") + " - " + new Date(rows2[i].maxtime).format("D/M");
    }
    var userdata = {
      'comment':'Totalt:',
      'elapsedtime':sum
    };
    res.json({
      page:page,
      total:totpages,
      records:totrows,
      rows:rows2,
      userdata: userdata
    });
  });
};

/*** Get compilationgrid details data ***/
exports.getCompilationDetails = function(req, res) {
  var activityid = req.query.activityid;
  var username = req.query.username;
  var mintime = new Date(req.query.mintime);
  var maxtime = new Date(req.query.maxtime);
  var sql = "select starttime as startdate, starttime, comment, elapsedtime from rawtimes where activityid=? and username=? and starttime >= ? and starttime <=? order by starttime desc";
  db.runQuery(sql, [activityid, username, mintime, maxtime], function(err, rows) {
    var items = [];
    for (var i=0; i < rows.length; i++) {
      var h = parseInt(rows[i].elapsedtime/60);
      var min = rows[i].elapsedtime - h*60;
      var selapsed = h + " tim " + min + " min";
      items.push({
        "id":i,
        "cell":[
          new Date(rows[i].startdate).format("YYYY-MM-DD"),
          new Date(rows[i].starttime).format("hh:mm"),
          rows[i].comment,
          selapsed
        ]
      });
    }
    res.json({rows:items});
  });
}

/*** Save an edited registration from endedgrid or delete a registration ***/
exports.saveTime = function(req, res) {
  if (req.body.oper == "del") {
    db.runQuery("delete from rawtimes where id=?", [req.body.id], function(err, rows) {
      res.json({});
    });
  }
  else if (req.body.oper == "edit") {
    var starttime = new Date(req.body.startdate + " " + req.body.starttime).format();
    var sql = "update rawtimes set activityid=?, comment=?, starttime=?, elapsedtime=? where id=?";
    db.runQuery(sql, [req.body.activity, req.body.comment, starttime, req.body.elapsedtime, req.body.id], function(err, rows) {
      res.json({});
    });
  }
};
 

/*** Get the 10 latest activities ***/
exports.getLatestActivities = function(req, res) {
  getUser(req, res, true, function(user){
    var sql = "select distinct a.id as aid, a.name as aname, p.id as pid, p.name as pname, c.id as cid, c.name as cname " +
      "from rawtimes rt " +
      "inner join activities a on a.id=rt.activityid " +
      "inner join projects p on p.id=a.projectid " +
      "inner join customers c on c.id=p.customerid " +
      "where a.deleted=0 and rt.username=? and not rt.elapsedtime is null " +
      "order by rt.id desc limit 0, 10";
    db.runQuery(sql, [user.username], function(err, rows) {
      res.json({data:rows, err:err});
    });
  });
}

/*** Get the last registered activity ***/
exports.getLastActivity = function(req, res) {
  getUser(req, res, true, function(user){
    var sql = "select a.name as activity, p.name as project, c.name as customer, rt.comment, rt.starttime, rt.elapsedtime " +
      "from rawtimes rt " +
      "inner join activities a on a.id=rt.activityid " +
      "inner join projects p on p.id=a.projectid " +
      "inner join customers c on c.id=p.customerid " +
      "where a.deleted=0 and rt.username=? and not rt.elapsedtime is null and rt.paused=0 " +
      "order by rt.id desc limit 0, 1";
    db.runQuery(sql, [user.username], function(err, rows) {
      if (!err && rows.length > 0) {
        rows[0].starttime = new Date(rows[0].starttime).format("YYYY-MM-DD hh:mm");
        res.json(rows[0]);
      }
      else
        res.json(null);
    });
  });
}


/*** Get customers data. No parameters **/
exports.getCustomers = function(req, res) {
  db.runQuery("select id as value, name as label from customers where deleted=0 order by name", [], function(err, rows) {
    res.json({data:rows, err:err});
  });
};

/*** Get projects data. Parameters: customer ***/
exports.getProjects = function(req, res) {
  var customerid = req.query.customer;
  var sql = "select " +
    "p.id as value, p.name as label " +
    "from projects p " +
    "inner join customers c on " +
    "c.id = p.customerid " +
    "where p.deleted=0 and c.id=? " +
    "order by p.name";
  db.runQuery(sql, [parseInt(customerid)], function(err, rows) {
    res.json({data:rows, err:err});
  });
};


/*** Get activities data. Parameters: project **/
exports.getActivities = function(req, res) {
  getUser(req, res, true, function(user){
    var projectid = req.query.project;
    var sql = "select " +
      "a.id as value, a.name as label " +
      "from activities a " +
      "inner join projects p on " +
      "p.id = a.projectid " +
      "where a.deleted=0 and p.id=? and " +
      "a.username = ? " +
      "order by p.name";
    db.runQuery(sql, [parseInt(projectid), user.username], function(err, rows) {
      res.json({data:rows, err:err});
    });
  });
};


/*** Start time count for an active avtivity ***/
exports.startActivity = function(req, res) {
  getUser(req, res, true, function(user){
    var projectid = req.query.projectid;
    var activityid = req.query.activityid;
    var comment = req.query.comment;
    var starttime = new Date(req.query.starttime);

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
    "values (?, ?, ?, ?)";
  db.runQuery(sql, [username, activityid, comment, starttime], function(err, result) {
    var newid = result.insertId;
    getPausedElapsed(username, activityid, newid, function(elapsed){
      callback({newid:result.insertId, elapsed:elapsed});
    });
  });
};


/*** Get or create an unnamed activity for the project ***/
function getEmptyActivity(username, projectid, callback) {
  db.runQuery("select id from times.activities where projectid=? and username=? and name=''", [projectid, username], function(err, rows) {
    if (rows.length > 0) {
      callback(rows[0].id);
    }
    else {
      db.runQuery("insert into times.activities (username, projectid, name, deleted) values(?, ?, '', 0)", [username, projectid], function(err, response) {
        callback(response.insertId);
      });
    }
  });
}


/*** Stop time count for the active avtivity and save elapsed time ***/
exports.stopActivity = function(req, res) {
  getUser(req, res, true, function(user){
    if (req.query.paused != 1) { 
      db.runQuery("update rawtimes set paused=0 where username=?", [user.username], function(err, result) {});
    }
    var starttime = new Date(req.query.starttime);
    var stoptime = new Date(req.query.stoptime);
    var elapsed = parseInt((stoptime - starttime)/60000, 10);
    if (elapsed != 0) {
      while (elapsed < 0)
        elapsed += 24*60;
      while (elapsed > 24*60)
        elapsed -= 24*60;
      var sql = "update rawtimes set elapsedtime=?, paused=? where id=?";
      db.runQuery(sql, [elapsed, req.query.paused, req.query.id], function(err, result) {
        res.json({elapsed:elapsed});
      });
    }
    else {
      var sql = "delete from rawtimes where id=?";
      db.runQuery(sql, [req.query.id], function(err, result) {
        res.json({elapsed:elapsed});
      });
    }
  });
}; 


/*** Register an activity ***/
exports.registerActivity = function(req, res) {
  getUser(req, res, true, function(user){
    var projectid = req.query.projectid;
    var activityid = req.query.activityid;
    var comment = req.query.comment;
    var adate = new Date(req.query.activitydate);
    var hours = (req.query.hours.length == 0 ? 0 : parseInt(req.query.hours, 10));
    var minutes = (req.query.minutes.length == 0 ? 0 : parseInt(req.query.minutes));
    var elapsed = hours*60 + minutes;
    if (activityid == 0) { // Use an empty activity if not specified
      getEmptyActivity(user.username, projectid, function(id){
        activityid = id;
        doRegisterActivity(user.username, activityid, comment, adate, elapsed, function(err){
          res.json({err:err});
        });
      });
    }
    else {
      doRegisterActivity(user.username, activityid, comment, adate, elapsed, function(err){
        res.json({err:err});
      });
    }
  });
}


/*** Add activity by adding a rawtimes post ***/
function doRegisterActivity(username, activityid, comment, startdate, elapsed, callback) {
  var sql = "insert into rawtimes " + 
    "(username, activityid, comment, starttime, elapsedtime, paused) " +
    "values (?, ?, ?, ?, ?, 0)"; 
  db.runQuery(sql, [username, activityid, comment, startdate, elapsed], function(err, result) {
    callback(err);
  });
}


/*** Get the currently active avtivity from the database ***/
exports.getActiveActivity = function(req, res) {
  getUser(req, res, true, function(user){
    var sql = "select c.name as customer, a.id as cid, p.name as project, p.id as pid, a.name as activity, a.id as aid, rt.id as id, rt.starttime, rt.comment, rt.paused " +
      "from times.rawtimes rt " +
      "inner join times.activities a on " +
      "a.id=rt.activityid " +
      "inner join projects p on " +
      "p.id=a.projectid " +
      "inner join times.customers c on " +
      "c.id=p.customerid " +
      "where rt.username=? and (rt.elapsedtime is null or rt.paused=1) " +
      "order by rt.id desc";
    db.runQuery(sql, [user.username], function(err, rows) {
      if (rows.length >  0) {
        rows[0].starttime = new Date(rows[0].starttime.getTime() + rows[0].starttime.getTimezoneOffset()*60*1000);
        rows[0].pausedElapsed = 0;
        getPausedElapsed(user.username, rows[0].aid, rows[0].id, function(elapsed){
          rows[0].pausedElapsed = elapsed;
          res.json(rows[0]);
        });
      }
      else
        res.json(null);
    });
  });
};


/*** Sum elapsed time for all paused instances of the current activity ***/
function getPausedElapsed(username, actid, rtid, callback) { 
  var sum = 0;
  var sql = "select activityid, elapsedtime from times.rawtimes where username=? and id <= ? and paused=1 order by id desc limit 0, 100";
  db.runQuery(sql, [username, rtid], function(err, rows) {
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
  db.runQuery("select * from times.customers where name=?", [aname], function(err, rows) {
    if (rows.length > 0) {
      var id = rows[0].id;
      db.runQuery("update times.customers set deleted=0 where id=?", [id], function(err, response) {
        res.json({id:id});
      });
    }
    else {
      db.runQuery("insert into times.customers (name, deleted) values(?, 0)", [aname], function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};


/*** Create a new project. Parameters: customerid, name ***/
exports.createProject = function(req, res) {
  var customerid = req.query.customerid;
  var aname = req.query.name;
  db.runQuery("select * from times.projects where name=? and customerid=?", [aname, customerid], function(err, rows) {
    if (rows.length > 0) {
      var id = rows[0].id;
      db.runQuery("update times.projects set deleted=0 where id=?", [id], function(err, response) {
        res.json({id:id});
      });
    }
    else {
      db.runQuery("insert into times.projects (name, customerid, deleted) values(?, ?, 0)", [aname, customerid], function(err, response) {
        res.json({id:response.insertId});
      });
    }
  });
};

/*** Create a new activity. Parameters: projectid, name ***/
exports.createActivity = function(req, res) {
  getUser(req, res, true, function(user){
    var projectid = req.query.projectid;
    var aname = req.query.name;
    db.runQuery("select * from times.activities where username=? and name=? and projectid=?", [user.username, aname, projectid], function(err, rows) {
      if (rows.length > 0) {
        var id = rows[0].id;
        db.runQuery("update times.activities set deleted=0 where id=?", [id], function(err, response) {
          res.json({id:id});
        });
      }
      else {
        db.runQuery("insert into times.activities (username, name, projectid, deleted) values(?, ?, ?, 0)", [user.username, aname, projectid], function(err, response) {
          res.json({id:response.insertId});
        });
      }
    });
  });
};

/*** Mark a customer and it's related projects as deleted. Parameter: customerid ***/
exports.deleteCustomer = function(req, res) {
  var id = req.query.customerid;
  db.runQuery("update times.customers set deleted=1 where id=?", [id], function(err, response) {});
  db.runQuery("select id from times.projects where customerid=?", [id], function(err, rows) {
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
  db.runQuery("update times.projects set deleted=1 where id=?", [id], function(err, response) {});
  db.runQuery("select id from times.activities where projectid=?", [id], function(err, rows) {
    for (var i=0; i < rows.length; i++)
      doDeleteActivity(rows[i].id);
  });
};


/** Do the database update for marking an activity as deleted ***/
function doDeleteActivity(id) {
  db.runQuery("update times.activities set deleted=1 where id=?", [id], function(err, response) {});
};

/** Log debug message in console and database ***/
function debug(subject, message) {
  db.runQuery("insert into times.debug (debugdate, subject, message) values(NOW(), ?, ?)", [subject, message], function(err, response) {});
};
 

/*** Get the currently logged in user. If query parameter guid is incorrect, redirect to login page. ***/
function getUser(req, res, ajaxcall, callback) {
  if (!req.session.loggedinUser) { 
    var cookies = new Cookies(req, res);
    var guid = cookies.get("guid");
    db.runQuery("select username, isadmin, name from times.users where guid=?", [guid], function(err, rows) {
      if (rows.length == 0) {
        if (ajaxcall)
          res.json({data:null, error:"No user"});
        else
          callback(null);
      }
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
      sql2 += searchfields[prop] + " like " + db.pool.escape("%" + q[prop] + "%");
    }
  }
  if (sql2.length > 0) 
    sql += " and (" + sql2 + ")";

  return sql;
}

/*** Get sql operator from grid operator ***/
function getSqlOper(op, val) {
  var eval = db.pool.escape(val);
  if (op == "ne") return "<> " + eval;
  else if (op == "lt") return "< " + eval;
  else if (op == "le") return "<= " + eval;
  else if (op == "gt") return "> " + eval;
  else if (op == "ge") return ">= " + eval;
  else if (op == "bw") return "like " + db.pool.escape(val + "%");
  else if (op == "bn") return "not like " + db.pool.escape(val + "%");
  else if (op == "in") return "in (" + eval + ")";
  else if (op == "ni") return "not in (" + eval + ")";
  else if (op == "ew") return "like " + db.pool.escape("%" + val);
  else if (op == "en") return "not like " + db.pool.escape("%" + val);
  else if (op == "cn") return "like " + db.pool.escape("%" + val + "%");
  else if (op == "nc") return "not like " + db.pool.escape("%" + val + "%");
  else return "= " + eval;
}
