var frisbee = require('frisby');
var async = require('async');

var loadTester = function(password, user_num, assignment_id, item_id) {
  var locals = {
    server: 'https://njs-brexanshs.saplinglearning.me',
  
    user_name: 'txmath' + user_num,
    user_id: 0,
  
    password: password,
    assignment_id: assignment_id,
    item_id: item_id,
  
    attempt_num: 1
  };

  function logStatement (opts) {
    var response = opts[opts.length - 1];
    if (response) {
      if (response.statusCode) {
        opts[opts.length - 1] = response.statusCode;
      }
      if (response.statusCode !== 200) {
        opts[opts.length] = response.body;
      }
    }
    console.log(opts.join(', ') + ', ' + Date.now());
  }

  function getUserId(callback) {
    var user_sql = ['SELECT id from cms.user where username = "' + locals.user_name + '";'];
    return executeSQL(user_sql, function (body) {
      locals.user_id = JSON.parse(body).resultSets[0].id;
      if (typeof callback === "function") {
        callback();
      }
    });
  }

  function clearAttempts(callback) {

    var sql = [
      "DELETE FROM falcon.user_assignment_attempt                    WHERE assignment__id = " + locals.assignment_id + " AND user__id = " + locals.user_id + ";",
      "DELETE FROM falcon.user_assignment_attempt_itemfulfillment    WHERE assignment__id = " + locals.assignment_id + " AND user__id = " + locals.user_id + ";",
      "DELETE FROM falcon.user_item_attempt                          WHERE item__id =  " + locals.item_id + " AND user__id = " + locals.user_id + ";",
      "DELETE FROM falcon.UIA_modchoiceset                           WHERE item__id =  " + locals.item_id + " AND user__id = " + locals.user_id + ";",
      "DELETE FROM falcon.UIA_modnumeric                             WHERE item__id =  " + locals.item_id + " AND user__id = " + locals.user_id + ";",
    ];
    executeSQL(sql, callback);
  }

  function executeSQL(sql_array, callback) {
    var j = 0;
    for (i=0; i<sql_array.length; i++) {
      frisbee.create('Execute SQL')
        .post(locals.server + '/sqlquery/', {
          sql: sql_array[i]
        })
        .auth(locals.user_name, locals.password)
        .after(function (err, res, body) {
          j++;
          logStatement(['End', 'Execute SQL', locals.user_name, locals.assignment_id, sql_array[j], res]);
          if (j >= sql_array.length) {
            if (typeof callback === "function") {
              callback(body);
            }
          }
        })
      .toss();
    }
  }

  function openAssignment() {
    logStatement(['Begin', 'Open Assignment', locals.user_name, locals.assignment_id, null]);

    frisbee.create('Open Assignment')
        .post(locals.server + '/v2/assignment/' + locals.assignment_id)
        .auth(locals.user_name, locals.password)
        .after(function (err, res, body) {
          logStatement(['End', 'Open Assignment', locals.user_name, locals.assignment_id, res]);
          loadQuestion();
        })
      .toss();
  }

  function loadQuestion() {
    logStatement(['Begin', 'Load Question', locals.user_name, locals.assignment_id, null]);

    frisbee.create('Load Question')
        .get(locals.server + '/v2/student/item/' + locals.item_id + '/' + locals.assignment_id)
        .auth(locals.user_name, locals.password)
        .after(function (err, res, body) {
          console.log(err);
          locals.attempts_param = locals.attempts_param || 3;
          var body_json = JSON.parse(body);
          var task_series = [];

          var incorrect_context_found = false;
          for (i=0; i<body_json.context.length && !incorrect_context_found; i++) {
            if (body_json.context[i].type == "incorrect") {
              locals.context = body_json.context[i];
              for (j=0; j<locals.attempts_param; j++) {
                task_series.push(putAttempt);
                task_series.push(postAttempt);
              }
              incorrect_context_found = true;
            }
          }
          async.series(task_series, function() {
            openAssignment();
          });
          logStatement(['End', 'Load Question', locals.user_name, locals.assignment_id, res]);
        })
        .toss();
  }

  function makePayload() {
    var context_answer = locals.context.responseData[0];
    var payload_answer = {
      "assignment_id": locals.assignment_id,
      "item_id": locals.item_id,
      "is_correct": null,
      "gave_up": null,
      "context_id": locals.context.id,
      "raw_score": "0.0000",
      "attempt_num": locals.attempt_num,
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

    logStatement(['Begin', 'Put Attempt', locals.user_name, locals.assignment_id, null]);

    frisbee.create('Put Attempt')
      .put(locals.server + '/v2/useritemattempt/', makePayload(), {json: true})
      .auth(locals.user_name, locals.password)
      .after(function (err, res, body) {
        logStatement(['End', 'Put Attempt', locals.user_name, locals.assignment_id, res]);

        var body_json = body;
        if (res && res.statusCode === 200 && body === "string") {
          body_json = JSON.parse(body);
        }

        callback(null, body_json);
      })
    .toss();
  }

  function postAttempt (callback) {
    logStatement(['Begin', 'Post Attempt', locals.user_name, locals.assignment_id, null]);
    locals.attempt_num++;

    frisbee.create('Post Attempt')
      .post(locals.server + '/v2/useritemattempt/', makePayload(), {json: true})
      .auth(locals.user_name, locals.password)
      .after(function (err, res, body) {
          logStatement(['End', 'Post Attempt', locals.user_name, locals.assignment_id, res]);

          var body_json = body;
          if (res && res.statusCode === 200 && body === "string") {
            body_json = JSON.parse(body);
          }
          callback(null, body_json);
      })
    .toss();

  }

  function runCycle () {
    getUserId();
    clearAttempts(openAssignment);
  }

  return {
    clearAttempts: clearAttempts,
    getUserId: getUserId,
    executeSQL: executeSQL,
    loadQuestion: loadQuestion,
    openAssignment: openAssignment,
    putAttempt: putAttempt,
    postAttempt: postAttempt,
    returnLocals: function () { return locals; },
    setLocals: function (key, val) { locals[key] = val; },
    runCycle: runCycle
  }

}

module.exports = loadTester;