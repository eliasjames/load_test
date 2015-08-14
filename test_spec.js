var frisbee = require('frisby');
var 

var server = 'https://njs-brexanshs.saplinglearning.me';

var user_name = 'txmath0001';
// placeholder for DB ID
var user_id;

var password = 'fasterthansixmill';
var assignment_id = 23;
var item_id = 2;

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
        for (i=0; i<body_json.context.length; i++) {
          if (body_json.context[i].type == "incorrect") {
            // TODO amend loop to make x number of attempts
            postAttempt(body_json.context[i]);
          }
        }
      })
      .toss();
}

function makePayload(context, attempt_num) {
  var context_answer = context.responseData[0];
  var payload_answer = {
    "assignment_id": assignment_id,
    "item_id": item_id,
    "is_correct": null,
    "gave_up": null,
    "context_id": context.id,
    "raw_score": "0.0000",
    "attempt_num": attempt_num,
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

function putAttempt (context, attempt_num) {

  logStatement(['Begin', 'Put Attempt', user_name, assignment_id]);

  frisbee.create('Put Attempt')
    .put(server + '/v2/useritemattempt/', makePayload(context, attempt_num), {json: true})
    .auth(user_name, password)
    .after(function (err, res, body) {
      logStatement(['End', 'Put Attempt', user_name, assignment_id, res.statusCode]);
    })
  .toss();
}

function postAttempt (context) {
  logStatement(['Begin', 'Post Attempt', user_name, assignment_id]);

  frisbee.create('Post Attempt')
    .put(server + '/v2/useritemattempt/', makePayload(context, null), {json: true})
    .auth(user_name, password)
    .after(function (err, res, body, waitingForResponse) {
      logStatement(['End', 'Post Attempt', user_name, assignment_id, res.statusCode]);
      console.log('\n\n\nbad ', body);
        waitingForResponse();
        var body_json = JSON.parse(body);
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
