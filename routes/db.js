/*** Database functionality ***/

var mysql = require('mysql');
var config = require("../config.js")

module.exports.pool = mysql.createPool(config.database);

module.exports.runQuery = function(sql, parameters, callback) {
  var obj = this;
  obj.pool.getConnection(function(err, connection) {
    if (err) {
      console.log("Connection error: " + err);
      callback("Connection error: " + err);
      return;
    }
    var query = connection.query(sql, parameters, function(sqlerr, response) {
      if (sqlerr) {
        console.log(query.sql);
        obj.logError("Sql error", sqlerr);
      }
      connection.release();
      callback(sqlerr, response);
    });
  });
}

module.exports.logError = function(subject, err) {
  this.pool.getConnection(function(err2, connection) {
    if (err2) return;
    connection.query("insert into times.debug (debugdate, subject, message) values(NOW(), ?, ?)", [subject, err.message], function(err3, response) {
      if (err3) console.log(err3);
      connection.release();
    });
  });
}