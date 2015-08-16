var loadTester = require('./loadTester');
// solves error caused by self-signed https cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var user_name_num = 0;

function oneUserCycle() {
  if (user_name_num < 100) {
    user_name_num++;
  } else {
    user_name_num = 1;
  }
  var user_name_num_padded = padWithZeroes(user_name_num, 4);
  console.log(user_name_num_padded);
  var lt = loadTester(user_name_num_padded, 23, 2);
  var that = this;
  lt.runCycle(function() {
    that.call();
  });
}

function padWithZeroes (some_num, len) {
  var padded = String(some_num);
  while (padded.length < len) {
    padded = "0" + padded;
  }
  return padded;
}

function burstAnswers () {
  for (var i=0; i<10; i++){
    oneUserCycle();
  }
}

burstAnswers();