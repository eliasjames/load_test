var loadTester = require('./loadTester');
var config = require('./config');

// solves error caused by self-signed https cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var user_name_num = 0;

function oneUserCycle(user_name_num) {
  var user_name_num_padded = padWithZeroes(user_name_num, 4);
  //console.log(user_name_num_padded);
  var lt = loadTester(config.password, user_name_num_padded, 23, 2);
  lt.runCycle();
}

function padWithZeroes (some_num, len) {
  var padded = String(some_num);
  while (padded.length < len) {
    padded = "0" + padded;
  }
  return padded;
}

function tenUsers (which_ten) {
  for (var i=1; i<10; i++){
    if (which_ten === 0 && i === 0) i++;
    oneUserCycle(which_ten + i);
  }
}

tenUsers(config.which_ten);

