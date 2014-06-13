//mongod --dbpath=d:\nodejs\tidbokning\data

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/BookTimes');

var UserSchema = new mongoose.Schema({
  username:String,
  password:String,
  name:String,
  isadmin:Boolean
});

var TimeSchema = new mongoose.Schema({
  activity: { type:mongoose.Schema.Types.ObjectId, ref:'Activities' },
  description:String,
  starttime: Date,
  endtime: Date,
  elapsedtime: Number
});
TimeSchema.methods.test = function(){
  return "testres";
}

var ActivitySchema = new mongoose.Schema({
  project: { type:mongoose.Schema.Types.ObjectId, ref:'Projects' },
  name:String,
  user:String,
  active:Boolean,
  times: [{ type:mongoose.Schema.Types.ObjectId, ref:'Times' }]
});

var ProjectSchema = new mongoose.Schema({
  customer: { type:mongoose.Schema.Types.ObjectId, ref:'Customers' },
  name:String,
  activities: [{ type:mongoose.Schema.Types.ObjectId, ref:'Activities' }]
});

var CustomerSchema = new mongoose.Schema({
  name:String,
  projects: [{ type:mongoose.Schema.Types.ObjectId, ref:'Projects' }]
});

var Users = mongoose.model("Users", UserSchema);
var Customers = mongoose.model("Customers", CustomerSchema);
var Projects = mongoose.model("Projects", ProjectSchema);
var Activities = mongoose.model("Activities", ActivitySchema);
var Times = mongoose.model("Times", TimeSchema);

module.exports.loginUser = function(username, password, callback) {
  Users.find({username:username, password:password}, function(err, docs){
    if (docs.length > 0) 
      callback("");
    else
      callback("Not accepted");
  });
};


function sortTimes(a, b, col, dir) {
  var colsplit = col.split('.');
  var acol = a[colsplit[0]];
  var bcol = b[colsplit[0]];
  for (var i=1; i < colsplit.length;i++) {
    acol = acol[colsplit[i]];
    bcol = bcol[colsplit[i]];
  }
  var col1 = (dir == 'desc' ? bcol : acol);
  var col2 = (dir == 'desc' ? acol : bcol); 
  return ((col1 < col2) ? -1 : ((col1 > col2) ? 1 : 0));
}

module.exports.getTimes = function(req, res) {
  var page = req.query.page;
  var maxnof = req.query.rows;
  var sortcol = req.query.sidx;
  var sortorder = req.query.sord;
  var cols = req.query.cols.split(',');
  var filters = (req.query.filters ? JSON.parse(req.query.filters) : null);
  if (sortcol == "_id") {
    sortcol = "starttime";
    sortorder = "desc";
  }

  Times.find({}).populate('activity', "name project").exec(function(err, times1){
    var start = maxnof*(page - 1);
    var totpages = (times1.length > 0 ? parseInt(Math.floor(times1.length/maxnof), 10) : 0);
    Projects.populate(times1, {
      path:'activity.project', 
      model:'Projects', 
      select:'name customer' 
    }, function(err, times2){
      Customers.populate(times2, {path:'activity.project.customer', model:'Customers', select:'name'}, function(err, times3){
        times3 = times3.filter(function(atime) {
          return filterRow(req.query, cols, filters, atime);
        }).sort(function(a, b){
          return sortTimes(a, b, sortcol, sortorder);
        }).splice(start, maxnof);
        res.json({
          page:page,
          total:totpages,
          records:times3.length,
          rows:times3
        });
      });
    });
  });
};


module.exports.getCustomers = function(req, res) {
  Customers.find({}, "name", function(err, docs) {
    var customers = [];
    for (var i=0; i < docs.length; i++)
      customers.push(docs[i].name);
    res.json(customers);
  });
};

module.exports.getProjects = function(req, res) {
  var customer = req.query.customer;

  Customers.findOne({'name':customer}).populate('projects').exec(function(err, docs) { 
    var projects = [];
    if (docs) {
      for (var i=0; i < docs.projects.length; i++)
        projects.push(docs.projects[i].name);
    }
    res.json(projects);
  });
};

module.exports.getActivities = function(req, res) {
  var project = req.query.project;

  Projects.findOne({'name':project}).populate('activities').exec(function(err, docs) { 
    var activities = [];
    if (docs) {
      for (var i=0; i < docs.activities.length; i++)
        activities.push(docs.activities[i].name);
    }
    res.json(activities);
  });
};

function filterRow(query, cols, filters, arow) {
  var ok1 = true;
  for (var i=0; i < cols.length; i++) {
    if (query[cols[i]]) { 
      var colval = eval("arow." + cols[i]).toLowerCase(); 
      ok1 = ok1 && (colval.indexOf(query[cols[i]].toLowerCase()) >= 0);
    }
  }
  var ok2 = true;
  if (filters) {
    var groupOp = filters.groupOp;
    for (var i=0; i < filters.rules.length; i++) {
      var colval = eval("arow." + filters.rules[i].field).toLowerCase(); 
      var filterval = filters.rules[i].data.toLowerCase();
      var ok3 = true;
      switch(filters.rules[i].op) {
        case "ne": ok3 = (colval != filterval); break;
        case "cn": ok3 = (colval.indexOf(filterval) >= 0); break;
        case "nc": ok3 = (colval.indexOf(filterval) < 0); break;
        default: ok3 = (colval == filterval);
      } 
      if (groupOp == "OR")
        ok2 = ok2 || ok3;
      else
        ok2 = ok2 && ok3;
    }
  }
  return ok1 && ok2;
}




module.exports.importUsers = function(req, res) {
  Users.remove({}, function(err) {
    console.log("Dropped users: " + err);
  });

  var fs = require("fs");
  fs.readFile('./doc/oldusers.csv', function(err, data) {
    if (err) res.send("Fel: " + err);
    console.log(err);
    if (!data) res.send("Ingen data");
    var lines = data.toString().split('\n');    

    for (var i=0; i < lines.length; i++) {
      var values = lines[i].split(';');
      new Users({
        username: values[0],
        password: values[1],
        name: values[2],
        isadmin: parseInt(values[3], 10)
      }).save(function(err, user){
        if (err) res.send("Fel: " + err);
      });
    }

    res.send("OK");
  });

}

/*

select top 100
  c.customer,
  p.project,
  i.userid, a.activity,
  r.message, r.starttime, r.endtime, r.elapsedtime
from rawtimes r
inner join activities a on 
  a.id = r.activity
inner join projects p on
  p.id = a.project
inner join customers c on
  c.id = p.customer
inner join userids i on
  i.username = a.username

*/


module.exports.importTimes = function(req, res) {
  Times.remove({}, function(err) {
    console.log("Dropped times: " + err);
  });
  Activities.remove({}, function(err) {
    console.log("Dropped activities: " + err);
  });
  Projects.remove({}, function(err) {
    console.log("Dropped projects: " + err);
  });
  Customers.remove({}, function(err) {
    console.log("Dropped customers: " + err);
  });

  var fs = require("fs");
  fs.readFile('./doc/olddata.csv', function(err, data) {
    if (err) res.send("Fel: " + err);
    var lines = data.toString().split('\n');    
    processLine(lines, 1);
    res.send("OK");
  });
}

function processLine(lines, idx) {
  if (idx == lines.length)
    return; 
  
  var arr = lines[idx].split(';');
  if (arr[0].length == 0)
    return;
  
  var values = {
    customer: arr[0],
    project: arr[1],
    username: arr[2],
    activity: arr[3],
    description: (arr[4] == 'NULL' ? '' : arr[4]),
    starttime: (arr[5] == 'NULL' ? '' : arr[5]),
    endtime: (arr[6] == 'NULL' ? '' : arr[6]),
    elapsedtime: (arr[7] == 'NULL' || arr[7] == '' ? 0 : parseInt(arr[7]))
  };
  
  addCustomer(values, function(){
    processLine(lines, idx+1);
  });
}

function addCustomer(values, callback) {
  Customers.findOne({ 'name': values.customer }, function (err, customer) {
    if (!customer) {
      customer = new Customers ({
        name:values.customer,
        projects:[]
      });
    }
    addProject(values, customer, function(){
      customer.save(function(err, docs){
        callback();
      });
    });
  });
}


function addProject(values, customer, callback) {
  Projects.findOne({ 'customer': customer._id, 'name': values.project }, function (err, project) {
    if (!project) {
      project = new Projects ({
        customer:customer._id,
        name:values.project,
        activities:[]
      });
    }
    addActivity(values, project, function(){
      project.save(function(err, docs){
        customer.projects.push(project._id);
        callback();
      });
    });
  });
}

function addActivity(values, project, callback) {
  Activities.findOne({ 'project': project._id, 'name': values.activity }, function (err, activity) {
    if (!activity) {
      activity = new Activities ({
        project:project._id,
        name:values.activity,
        user:values.username,
        active:false,
        times:[]
      });
    }
    addTime(values, activity, function(){
      activity.save(function(err, docs){
        project.activities.push(activity._id);
        callback();
      });
    });
  });
}

function addTime(values, activity, callback) {
  var time = new Times ({
    activity: activity._id,
    description:values.description,
    starttime: values.starttime,
    endtime: values.endtime,
    elapsedtime: values.elapsedtime
  });
  time.save(function(err, docs){
    activity.times.push(time._id);
    callback();
  });
}
