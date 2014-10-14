/*** Initialize database connection ***/
var mysql = require('mysql');
module.exports.pool = mysql.createPool({
  connectionLimit: 20,
  host     : 'localhost',
  user     : 'root',
  password : 'n0ll.fyra.n0ll',
  database : 'times'
  ,timezone : 'utc'
});

module.exports.runQuery = function(sql, parameters, callback) {
  var obj = this;
  obj.pool.getConnection(function(err, connection) {
    if (err) {
      console.log("Connection error: " + err);
      callback(err);
      return;
    }
    connection.on('error', function(err) {
      console.log("Connection error: " + err);
    });    
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