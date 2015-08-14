var frisbee = require('frisby');
var async = require('async');

var server = 'https://njs-brexanshs.saplinglearning.me';

var user_name = 'txmath0001';
// placeholder for DB ID
var user_id;

var password = 'fasterthansixmill';
var assignment_id = 23;
var item_id = 2;

var locals = {};
var attempts_param = 5;

function logStatement (opts) {
  console.log(opts.join(', ') + ', ' + Date.now());
}


function getUserId() {
  var user_sql = ['SELECT id from cms.user where username = "' + user_name + '";'];
  executeSQL(user_sql, function (body) {
    user_id = JSON.parse(body).resultSets[0].id;
    clearAttempts();
  });
}

function clearAttempts() {

  var sql = [
    "DELETE FROM falcon.user_assignment_attempt                    WHERE assignment__id = " + assignment_id + " AND user__id = " + user_id + ";",
    "DELETE FROM falcon.user_assignment_attempt_itemfulfillment    WHERE assignment__id = " + assignment_id + " AND user__id = " + user_id + ";",
    "DELETE FROM falcon.user_item_attempt                          WHERE item__id =  " + item_id + " AND user__id = " + user_id + ";",
    "DELETE FROM falcon.UIA_modchoiceset                           WHERE item__id =  " + item_id + " AND user__id = " + user_id + ";",
    "DELETE FROM falcon.UIA_modnumeric                             WHERE item__id =  " + item_id + " AND user__id = " + user_id + ";",
  ];
  executeSQL(sql, openAssignment);
}  

function executeSQL(sql_array, callback) {
  var j = 0;
  for (i=0; i<sql_array.length; i++) {
    frisbee.create('Execute SQL')
      .post(server + '/sqlquery/', {
        sql: sql_array[i]
      })
      .auth(user_name, password)
      .after(function (err, res, body) {
        j++;
        logStatement(['End', 'Execute SQL', user_name, assignment_id, res.statusCode, sql_array[j]]);
        if (j >= sql_array.length) {
          callback(body);
        }
      })
    .toss();
  }
}

function openAssignment() {
  logStatement(['Begin', 'Open Assignment', user_name, assignment_id]);

  frisbee.create('Open Assignment')
      .post(server + '/v2/assignment/' + assignment_id)
      .auth(user_name, password)
      .after(function (err, res, body) {
        logStatement(['End', 'Open Assignment', user_name, assignment_id, res.statusCode]);
        loadQuestion();
      })
    .toss();
}

function loadQuestion() {
  logStatement(['Begin', 'Load Question', user_name, assignment_id]);

  frisbee.create('Load Question')
      .get(server + '/v2/student/item/' + item_id + '/' + assignment_id)
      .auth(user_name, password)
      .after(function (err, res, body) {
        logStatement(['End', 'Load Question', user_name, assignment_id, res.statusCode]);
        var body_json = JSON.parse(body);
        var task_series = [];

        var incorrect_context_found = false;
        for (i=0; i<body_json.context.length && !incorrect_context_found; i++) {
          if (body_json.context[i].type == "incorrect") {
            locals.context = body_json.context[i];

            for (j=0; j<attempts_param; j++) {
              task_series.push(putAttempt);
              task_series.push(postAttempt);
            }
            incorrect_context_found = true;
          }
        }
        async.series(task_series);
      })
      .toss();
}

function makePayload() {
  var context_answer = locals.context.responseData[0];
  var payload_answer = {
    "assignment_id": assignment_id,
    "item_id": item_id,
    "is_correct": null,
    "gave_up": null,
    "context_id": locals.context.id,
    "raw_score": "0.0000",
    "attempt_num": 1,
    "answers": {}
  };
  payload_answer['answers'][context_answer.module_id] = {
    module_type: context_answer.module_type,
    option_moduleset_id: context_answer.option_moduleset_id,
    parent_moduleset_id: context_answer.parent_moduleset_id,
    selected: "yes"
  };
  return payload_answer;
}

function putAttempt (callback) {

  logStatement(['Begin', 'Put Attempt', user_name, assignment_id]);

  frisbee.create('Put Attempt')
    .put(server + '/v2/useritemattempt/', makePayload(), {json: true})
    .auth(user_name, password)
    .after(function (err, res, body) {
      logStatement(['End', 'Put Attempt', user_name, assignment_id, res.statusCode]);

      var body_json = body;
      if (typeof body == "string") {
        body_json = JSON.parse(body);
      }

      callback(null, body_json);
    })
  .toss();
}

function postAttempt (callback) {
  logStatement(['Begin', 'Post Attempt', user_name, assignment_id]);

  frisbee.create('Post Attempt')
    .put(server + '/v2/useritemattempt/', makePayload(), {json: true})
    .auth(user_name, password)
    .after(function (err, res, body) {
        logStatement(['End', 'Post Attempt', user_name, assignment_id, res.statusCode]);
        console.log('\n\n\n', body);
        var body_json = body;
        if (typeof body == "string") {
          body_json = JSON.parse(body);
        }
        callback(null, body_json);
    })
  .toss();

}

getUserId();


////////////////////////////////////////////////////////////
////
//// start with params: concurrecy, repeat-question, user, assignment_id
//// start timer
//// for each integer in concurrency
////   pick user
////   while timer > 0
////     clear attempts
////     open an assignment
////     load a question
////     loop
////      check state then
////        attempt an answer
////          send correct payload based on module type
////        try again
////    give up
////
//// record start & end time for each call
////
//// NTHs
//// ramp concurrency
