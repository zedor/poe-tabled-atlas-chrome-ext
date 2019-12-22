// handshake
// response.result ( "success" ) response.update ( "true || false" ) response.url response.curVersion response.updVersion
// check if extension responds and if it has updates on github. it always returns releases url and current version

chrome.runtime.sendMessage(extID, {event: "handshake"}, function(response) {
	//your handshake code
});

// sendQuery, data
// response.result ( "failed" || "success" ), response.token, response.eta
// query the extension, fails if query is invalid, returns identifying token

chrome.runtime.sendMessage(extID, {event: "sendQuery", data: myData }, function(response) {
	//your data code
});

// getProgress, token
// response.result ( "waiting" || "ongoing" || "finished" || "failed" || "noQuery" ), response.progress, response.total, response.eta, response.token, response.error
// use to find out progress of your query. fails if error on request towards poe api in which case it returns error

chrome.runtime.sendMessage(extID, {event: "getProgress", token: myToken }, function(response) {
	//your progress code
});

// cancelQuery, token
// response.result ( "failed" || "success" ), response.token
// use to cancel an ongoing query, fails if no query found

chrome.runtime.sendMessage(extID, {event: "cancelQuery", token: myToken }, function(response) {
	//your progress code
});

// resolveQuery, token
// response.result ( "failed" || "success" ), response.data, response.token
// use if getProgress result is "finished" to grab the data
// the data is kept for five minutes after finishing. fails if no query is found

chrome.runtime.sendMessage(extID, {event: "resolveQuery", token: myToken }, function(response) {
	//your grabbing code
});