/**
 * Module containtng methods for database communication
 * @module helpers/db.js
 */

var Q = require('q');
var mysql = require('mysql');
var common = require("./common.js");  
var config = require("../config.js");  

var pool = mysql.createPool(config.dbparam);

/**
 * Run a database sql expresion
 *
 * @param  {String} sql Parameterized sql expression
 * @param  {Array} parameters  Array of sql parameters
 * @return {Promise} Resolves database result. Rejects string containing sql error
 */
exports.runQuery = function(sql, parameters, debug) {
  var d = Q.defer();
  pool.getConnection(function(err, connection) {
    if (err) {
      common.logError(null, "Connection error", err);
      d.reject("Connection error: " + err);
      return;
    }
    var query = connection.query(sql, parameters, function(sqlerr, response) {
      if (debug) console.log(query.sql);
      if (sqlerr) {
        common.logError(null, "Sql error", sqlerr.message + " - " + query.sql);
        d.reject("Sql error: " + sqlerr.message);
      }
      else {
        d.resolve(response);
      }
      connection.release();
    });
  });
  return d.promise;
}

