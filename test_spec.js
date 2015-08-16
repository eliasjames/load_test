var loadTester = require('./loadTester');
// solves error caused by self-signed https cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var duration_minutes = 60;
var number_users = 100;
var user_name_num = 1;
var ramp_coefficient = duration_minutes / number_users;
var one_min_millisecs = 60000;
var delay_ramp = ramp_coefficient * one_min_millisecs;

function oneUser(user_name_num) {
  var user_name_num_padded = padWithZeroes(user_name_num, 4);
console.log(user_name_num_padded);
  var lt = loadTester(user_name_num_padded, 23, 2);
  user_name_num++;
  lt.runCycle();
}

function padWithZeroes (some_num, len) {
  var padded = String(some_num);
  while (padded.length < len) {
    padded = "0" + padded;
  }
  return padded;
}

oneUser(1);