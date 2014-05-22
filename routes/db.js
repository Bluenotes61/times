//mongod --dbpath=d:\nodejs\tidbokning\data

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Tidbokning');

var UserSchema = new mongoose.Schema({
  username:String,
  password:String,
  name:String,
  isadmin:Boolean
});

var TimeSchema = new mongoose.Schema({
  activityid: String,
  description:String,
  starttime: Date,
  endtime: Date,
  elapsedtime: Number
});

var ActivitySchema = new mongoose.Schema({
  name:String,
  user:String,
  active:Boolean
});

var ProjectSchema = new mongoose.Schema({
  name:String,
  activities: [ActivitySchema]
});

var CustomerSchema = new mongoose.Schema({
  name:String,
  projects: [ProjectSchema]
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


module.exports.getTimes = function(req, res) {
  var page = req.query.page;
  var maxnof = req.query.rows;
  //skip start

  Times.find({}, function(err, times){
    var start = maxnof*(page - 1);
    var totpages = (times.length > 0 ? parseInt(Math.floor(times.length/maxnof), 10) : 0);
    var pagetimes = times.splice(start, maxnof);
    res.json({
      page:page,
      total:totpages,
      records:times.length,
      rows:pagetimes
    });
  });
};


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
  Customers.remove({}, function(err) {
    console.log("Dropped customers: " + err);
  });
  Times.remove({}, function(err) {
    console.log("Dropped times: " + err);
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
  Customers.findOne({ 'name': values.customer }, function (err, customer) {
    if (!customer) {
      customer = new Customers ({
        name:values.customer,
        projects:[]
      });
    }
    var activity = addProject(values, customer);
    customer.save(function(err, docs){
      addTime(values, activity._id);
      processLine(lines, idx+1);
    });
  });
}


function addProject(values, customer) {
  var project = null;
  for (var i=0; i < customer.projects.length && !project; i++) {
    if (customer.projects[i].name === values.project)
      project = customer.projects[i];
  }
  if (!project) {
    project = new Projects ({
      name:values.project,
      activities:[]
    });
    customer.projects.push(project);
  }
  return addActivity(values, project);
}

function addActivity(values, project) {
  var activity = null;
  for (var i=0; i < project.activities.length && !activity; i++) {
    if (project.activities[i].name === values.activity)
      activity = project.activities[i];
  }
  if (!activity) {
    activity = new Activities ({
      name:values.activity,
      user:values.username,
      active:0
    });
    project.activities.push(activity);
  }
  return activity;
}

function addTime(values, activityid) {
  var time = new Times ({
    activityid: activityid,
    description:values.description,
    starttime: values.starttime,
    endtime: values.endtime,
    elapsedtime: values.elapsedtime
  });
  time.save();
}
