var db = require("../helpers/db.js");
var common = require("../helpers/common.js");
var gridutils = require("../helpers/gridutils.js");
var Q = require("q");
require("date-format-lite");
Date.masks.default = 'YYYY-MM-DD hh:mm';

/*** Render page or redirect to login ***/
exports.index = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      db.runQuery("select username, name from users where isactive=1 and ownerid=? order by name", [user.owner.id]).then(
        function(rows) {
          var useroptions = "<option value='_all_'>Alla</option>";
          for (var i=0; i < rows.length; i++) {
            useroptions += "<option value='" + rows[i].username + "' " + (rows[i].username == user.username ? "selected" : "") + ">" + rows[i].name + "</option>";
          }
          res.render("main", {
            owner:user.owner,
            user:user,
            useroptions:useroptions
          });
        },
        function(err) {
          res.end(err);
        }
      );
    },
    function(err) {
      res.redirect("/login");
    }
  );
};


/*** Ajax calls ***/

exports.getEndedTimes = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var userwhere;
      if (req.query.curruser == "_all_")
        userwhere = "1=1";
      else if (req.query.curruser == "_current_" || !req.query.curruser)
        userwhere = "username='" + user.username + "'";
      else
        userwhere = "username='" + req.query.curruser + "'";
      var to = new Date(req.query.to);
      to.setDate(to.getDate()+1);
      var params = {
        idcol:req.query.idcol,
        cols:req.query.cols,
        sql:"select * from v_endedtimes",
        condition:"ownerid=" + user.owner.id + " and " + userwhere + " and startdate >= '" + req.query.from + "' and startdate < '" + common.formatDate(to) + "'",
        filters:req.query.filters,
        sidx:req.query.sidx,
        sord:req.query.sord,
        page:req.query.page,
        rows:req.query.rows,
        sumcol:'elapsedtime'
      };
      return gridutils.getGridData(params);
    }
  ).then(
    function(data){
      data.userdata = {
        'starttime':'Totalt:',
        'elapsedtime':data.sum
      };
      res.json(data);
    },
    function(err) {
      common.logMessage("Error in getEndTimes", err);
      res.end(err);
    }
  )
}


/*** Save an edited registration from endedgrid or delete a registration ***/
exports.saveTime = function(req, res) {
  if (req.body.oper == "del") {
    db.runQuery("delete from rawtimes where id=?", [req.body.id]).then(
      function(rows) {
        res.json({});
      },
      function(err) {
        res.end(err);
      }
    );
  }
  else if (req.body.oper == "edit") {
    getActivityToSave(req, res).then(
      function(activityid){
        var starttime = new Date(req.body.startdate + " " + req.body.starttime).format();
        var sql = "update rawtimes set activityid=?, comment=?, starttime=?, elapsedtime=? where id=?";
        return db.runQuery(sql, [activityid, req.body.comment, starttime, req.body.elapsedtime, req.body.id]);
      }
    ).then(
      function(rows) {
        res.json({});
      },
      function(err) {
        res.end(err);
      }
    );
  }
};

function getActivityToSave(req, res) {
  var d = Q.defer();
  var activityid = req.body.activity;
  if (!activityid) {
    common.getUser(req, res).then(
      function(user){
        var projectid = parseInt(req.body.project);
        return getEmptyActivity(user.username, projectid);
      }
    ).then(
      function(id){
        d.resolve(id);
      },
      function(err) {
        d.reject(err);
      }
    );
  }
  else
    d.resolve(activityid);
  return d.promise;
}
 
exports.getUsers = function(req, res) {
  common.getUser(req, res).then(function(user){
    var params = {
      idcol:req.query.idcol,
      cols:req.query.cols,
      sql:"select * from users where ownerid=" + user.owner.id,
      filters:req.query.filters,
      sidx:req.query.sidx,
      sord:req.query.sord,
      page:req.query.page,
      rows:req.query.rows
    };
    return gridutils.getGridData(params);
  }).then(
    function(data){
      res.json(data);
    },
    function(err) {
      common.logMessage("Error in getUsers", err);
      res.end(err);
    }
  )
}

exports.editUser = function(req, res) {
  common.getUser(req, res).then(function(user){
    if (req.body.oper == "del") {
      db.runQuery("delete from users where id=?", [req.body.id]).then(
        function() {res.send("");},
        function(err) {res.send(err);}
      );
    }
    else if (req.body.oper == "add") {
      var isadmin = (req.body.isadmin == "Ja" ? "1" : "0");
      var isactive = (req.body.isactive == "Ja" ? "1" : "0");
      db.runQuery("insert into users (username, password, ownerid, name, isadmin, isactive) values(?, ?, ?, ?, ?, ?)", [req.body.username, req.body.password, user.owner.id, req.body.name, isadmin, isactive]).then(
        function() {res.send("");},
        function(err) {
          if (err.indexOf("owneruser") >= 0)
            res.send("Användaren finns redan")
          else if (err.indexOf("userpassword") >= 0)
            res.send("Ange ett annat lösenord")
          else
            res.send(err);
        }
      );
    }
    else if (req.body.oper == "edit") {
      var isadmin = (req.body.isadmin == "Ja" ? "1" : "0");
      var isactive = (req.body.isactive == "Ja" ? "1" : "0");
      db.runQuery("update users set password=?, name=?, isadmin=?, isactive=? where id=?", [req.body.password, req.body.name, isadmin, isactive, req.body.id]).then(
        function() { res.send(""); },
        function(err) {
          if (err.indexOf("userpassword") >= 0)
            res.send("Ange ett annat lösenord")
          else
            res.send(err);
        }
      );
    }
    else
      res.send("Ett fel uppstod");
  });
}

/*** Get the 10 latest activities ***/
exports.getLatestActivities = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var sql = "select distinct rt.id, a.id as aid, a.name as aname, p.id as pid, p.name as pname, c.id as cid, c.name as cname " +
        "from rawtimes rt " +
        "inner join activities a on a.id=rt.activityid " +
        "inner join projects p on p.id=a.projectid " +
        "inner join customers c on c.id=p.customerid " +
        "where a.deleted=0 and rt.username=? and not rt.elapsedtime is null and c.ownerid=? " +
        "order by rt.id desc limit 0, 10";
      return db.runQuery(sql, [user.username, user.owner.id]);
    }
  ).then(
    function(rows) {
      res.json(rows);
    },
    function(err) {
      res.end(err);
    }
  );
}

/*** Get the last registered activity ***/
exports.getLastActivity = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var sql = "select a.name as activity, p.name as project, c.name as customer, rt.comment, rt.starttime, rt.elapsedtime " +
        "from rawtimes rt " +
        "inner join activities a on a.id=rt.activityid " +
        "inner join projects p on p.id=a.projectid " +
        "inner join customers c on c.id=p.customerid " +
        "where a.deleted=0 and rt.username=? and not rt.elapsedtime is null and c.ownerid=? " +
        "order by rt.id desc limit 0, 1";
      return db.runQuery(sql, [user.username, user.owner.id]);
    }
  ).then(
    function(rows) {
      if (rows.length > 0) {
        rows[0].starttime = new Date(rows[0].starttime).format("YYYY-MM-DD hh:mm");
        res.json(rows[0]);
      }
      else
        res.json(null);
    },
    function(err) {
      res.end(err);
    }
  );
}


/*** Get customers data. No parameters **/
exports.getCustomers = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      return db.runQuery("select id as value, name as label from customers where deleted=0 and ownerid=? order by name", [user.owner.id]);
    }
  ).then(
    function(rows) {
      res.json(rows);
    },
    function(err) {
      res.end(err);
    }
  );
};

/*** Get projects data. Parameters: customer ***/
exports.getProjects = function(req, res) {
  var customerid = req.body.customer;
  var sql = "select " +
    "p.id as value, p.name as label " +
    "from projects p " +
    "inner join customers c on " +
    "c.id = p.customerid " +
    "where p.deleted=0 and c.id=? " +
    "order by p.name";
  db.runQuery(sql, [parseInt(customerid)]).then(
    function(rows) {
      res.json(rows);
    },
    function(err) {
      res.end(err);
    }
  );
};


/*** Get activities data. Parameters: project **/
exports.getActivities = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var projectid = req.body.project;
      var sql = "select " +
        "a.id as value, a.name as label " +
        "from activities a " +
        "inner join projects p on " +
        "p.id = a.projectid " +
        "inner join customers c on " +
        "c.id = p.customerid " +
        "where a.deleted=0 and p.id=? and " +
        "a.username = ? and c.ownerid = ? " +
        "order by a.name";
      return db.runQuery(sql, [parseInt(projectid), user.username, user.owner.id]);
    }
  ).then(
    function(rows) {
      res.json(rows);
    },
    function(err) {
      res.end(err);
    }
  );
};


/*** Start time count for an active avtivity ***/
exports.startActivity = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var projectid = req.body.projectid;
      var activityid = req.body.activityid;
      var comment = req.body.comment;
      var starttime = new Date(req.body.starttime);
      if (activityid == 0) { // Use an empty activity if not specified
        getEmptyActivity(user.username, projectid).then(
          function(id){
            activityid = id;
            return doStartActivity(user.owner.id, user.username, activityid, comment, starttime);
          }
        ).then(
          function(result){
            res.json(result);
          },
          function(err) {
            res.end(err);
          }
        );
      }
      else {
        doStartActivity(user.owner.id, user.username, activityid, comment, starttime).then(
          function(result){
            res.json(result);
          },
          function(err) {
            res.end(err);
          }
        );
      }
    },
    function(err) {
      res.end(err);
    }
  );
};


/*** Start activity by adding a rawtimes post ***/
function doStartActivity(ownerid, username, activityid, comment, starttime) {
  var d = Q.defer();
  var sql = "insert into rawtimes " + 
    "(ownerid, username, activityid, comment, starttime) " +
    "values (?, ?, ?, ?, ?)";
  db.runQuery(sql, [ownerid, username, activityid, comment, starttime]).then(
    function(result){
      d.resolve(result.insertId);
    },
    function(err) {
      d.reject(err);
    }
  );
  return d.promise;
};


/*** Get or create an unnamed activity for the project ***/
function getEmptyActivity(username, projectid) {
  var d = Q.defer();
  db.runQuery("select id from activities where projectid=? and username=? and name=''", [projectid, username]).then(
    function(rows) {
      if (rows.length > 0) {
        d.resolve(rows[0].id);
      }
      else {
        db.runQuery("insert into activities (username, projectid, name, deleted) values(?, ?, '', 0)", [username, projectid]).then(
          function(response) {
            d.resolve(response.insertId);
          },
          function(err) {
            d.reject(err);
          }
        );
      }
    },
    function(err) {
      d.reject(err);
    }
  );
  return d.promise;
}


/*** Stop time count for the active avtivity and save elapsed time ***/
exports.stopActivity = function(req, res) {
  var elapsed;
  common.getUser(req, res).then(
    function(user){
      var starttime = new Date(req.body.starttime);
      var stoptime = new Date(req.body.stoptime);
      elapsed = parseInt((stoptime - starttime)/60000, 10);
      if (elapsed != 0) {
        while (elapsed < 0)
          elapsed += 24*60;
        while (elapsed > 24*60)
          elapsed -= 24*60;
        var sql = "update rawtimes set elapsedtime=? where id=?";
        return db.runQuery(sql, [elapsed, req.body.id]);
      }
      else {
        return db.runQuery("delete from rawtimes where id=?", [req.body.id]);
      }
    }
  ).then(
    function(result) {
      res.json({elapsed:elapsed});
    },
    function(err) {
      res.end(err);
    }
  );
}; 


/*** Register an activity ***/
exports.registerActivity = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var projectid = req.body.projectid;
      var activityid = req.body.activityid;
      var comment = req.body.comment;
      var adate = new Date(req.body.activitydate);
      var hours = (req.body.hours.length == 0 ? 0 : parseInt(req.body.hours, 10));
      var minutes = (req.body.minutes.length == 0 ? 0 : parseInt(req.body.minutes));
      var elapsed = hours*60 + minutes;
      if (activityid == 0) { // Use an empty activity if not specified
        getEmptyActivity(user.username, projectid).then(
          function(id){
            activityid = id;
            return doRegisterActivity(user, activityid, comment, adate, elapsed);
          }
        ).then(
          function(){
            res.json({err:null});
          },
          function(err){
            res.json({err:err});
          }
        );
      }
      else {
        doRegisterActivity(user, activityid, comment, adate, elapsed).then(
          function(){
            res.json({err:null});
          },
          function(err){
            res.json({err:err});
          }
        );
      }
    },
    function(err){
      res.json({err:err});
    }
  );
}


/*** Add activity by adding a rawtimes post ***/
function doRegisterActivity(user, activityid, comment, startdate, elapsed) {
  var d = Q.defer();
  var sql = "insert into rawtimes " + 
    "(ownerid, username, activityid, comment, starttime, elapsedtime) " +
    "values (?, ?, ?, ?, ?, ?)"; 
  db.runQuery(sql, [user.owner.id, user.username, activityid, comment, startdate, elapsed]).then(
    function(result) { 
      d.resolve();
    },
    function(err) {
      d.reject(err);
    }
  );
  return d.promise;
}


/*** Get the currently active avtivity from the database ***/
exports.getActiveActivity = function(req, res) {
  var user;
  common.getUser(req, res).then(
    function(auser){
      user = auser;
      var sql = "select c.name as customer, a.id as cid, p.name as project, p.id as pid, a.name as activity, a.id as aid, rt.id as id, rt.starttime, rt.comment " +
        "from rawtimes rt " +
        "inner join activities a on " +
        "a.id=rt.activityid " +
        "inner join projects p on " +
        "p.id=a.projectid " +
        "inner join customers c on " +
        "c.id=p.customerid " +
        "where rt.username=? and rt.elapsedtime is null and c.ownerid=? " +
        "order by rt.id desc";
      return db.runQuery(sql, [user.username, user.owner.id]);
    }
  ).then(
    function(rows) {
      if (rows.length >  0) {
        //rows[0].starttime = new Date(rows[0].starttime.getTime() + rows[0].starttime.getTimezoneOffset()*60*1000);
        res.json(rows[0]);
      }
      else
        res.json(null);
    },
    function(err) {
      res.end(err);
    }
  );
}


/*** Create a new customer. Parameter: name ***/
exports.createCustomer = function(req, res) {
  var aname = req.body.name;
  var user;
  common.getUser(req, res).then(
    function(auser) {
      user = auser;
      return db.runQuery("select * from customers where name=? and ownerid=?", [aname, user.owner.id]);
    }
  ).then(
    function(rows) {
      if (rows.length > 0) {
        var id = rows[0].id;
        db.runQuery("update customers set deleted=0 where id=?", [id]).then(
          function(response) {
            res.json({id:id});
          },
          function(err) {
            res.end(err);
          }
        );
      }
      else {
        db.runQuery("insert into customers (ownerid, name, deleted) values(?, ?, 0)", [user.owner.id, aname]).then(
          function(response) {
            res.json({id:response.insertId});
          },
          function(err) {
            res.end(err);
          }
        );
      }
    },
    function(err) {
      res.end(err);
    }
  );
}


/*** Create a new project. Parameters: customerid, name ***/
exports.createProject = function(req, res) {
  var customerid = req.body.customerid;
  var aname = req.body.name;
  db.runQuery("select * from projects where name=? and customerid=?", [aname, customerid]).then(
    function(rows) {
      if (rows.length > 0) {
        var id = rows[0].id;
        db.runQuery("update projects set deleted=0 where id=?", [id]).then(
          function(response) {
            res.json({id:id});
          },
          function(err) {
            res.end(err);
          }
        );
      }
      else {
        db.runQuery("insert into projects (name, customerid, deleted) values(?, ?, 0)", [aname, customerid]).then(
          function(response) {
            res.json({id:response.insertId});
          },
          function(err) {
            res.end(err);
          }
        );
      }
    },
    function(err) {
      res.end(err);
    }
  );
};

/*** Create a new activity. Parameters: projectid, name ***/
exports.createActivity = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      var projectid = req.body.projectid;
      var aname = req.body.name;
      db.runQuery("select * from activities where username=? and name=? and projectid=?", [user.username, aname, projectid]).then(
        function(rows) {
          if (rows.length > 0) {
            var id = rows[0].id;
            db.runQuery("update activities set deleted=0 where id=?", [id]).then(
              function(response) {
                res.json({id:id});
              },
              function(err) {
                res.end(err);
              }
            );
          }
          else {
            db.runQuery("insert into activities (username, name, projectid, deleted) values(?, ?, ?, 0)", [user.username, aname, projectid]).then(
              function(response) {
                res.json({id:response.insertId});
              },
              function(err) {res.end(err);}
            );
          }
        },
        function(err) {res.end(err);}
      );
    },
    function(err) {res.end(err);}
  );
};

/*** Mark a customer and it's related projects as deleted. Parameter: customerid ***/
exports.deleteCustomer = function(req, res) {
  var id = req.body.customerid;
  db.runQuery("update customers set deleted=1 where id=?", [id]);
  db.runQuery("select id from projects where customerid=?", [id]).then(
    function(rows) {
      for (var i=0; i < rows.length; i++)
        doDeleteProject(rows[i].id);
    }
  );
  res.json({});
};

/*** Mark a project and it's related activities as deleted. Parameter: projectid ***/
exports.deleteProject = function(req, res) {
  doDeleteProject(req.body.projectid);
  res.json({});
};


/*** Mark an activity as deleted. Parameter: activityid ***/
exports.deleteActivity = function(req, res) {
  doDeleteActivity(req.body.activityid);
  res.json({});
};


/*** Local functions ***/

/** Do the database update for marking a project as deleted ***/
function doDeleteProject(id) {
  db.runQuery("update projects set deleted=1 where id=?", [id]);
  db.runQuery("select id from activities where projectid=?", [id]).then(
    function(rows) {
      for (var i=0; i < rows.length; i++)
        doDeleteActivity(rows[i].id);
    }
  );
};


/** Do the database update for marking an activity as deleted ***/
function doDeleteActivity(id) {
  db.runQuery("update activities set deleted=1 where id=?", [id]);
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
 