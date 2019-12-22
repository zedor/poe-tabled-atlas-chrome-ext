chrome.runtime.onInstalled.addListener(function() {
	chrome.contextMenus.create({
		title: 'Reload extension',
		id: 'reset', // you'll use this in the handler function to identify this context menu item
		contexts: ['all'],
	});

	chrome.contextMenus.create({
		title: "Github - No updates/error",
		id: 'update', // you'll use this in the handler function to identify this context menu item
		contexts: ['all'],
	});

	chrome.runtime.onMessageExternal.addListener( function(request, sender, sendResponse) {
		var response = {};

		if( request.event == "handshake" ) {
			response.result = "success";
			response.curVersion = curVersion;
			response.update = canUpdate;
			response.updVersion = updVersion;
			response.url = updateUrl;
		}

		if( request.event == "sendQuery" ) {
			// sendQuery, token, data
			// response.result ( "failed" || "success" ), response.token, response.eta
			if( evaluateData( request.data ) ) {
				response.result = "success";
				response.token = UUID();

				startNewRequest(response.token, request.data);

				resolveData(response.token, request.data);
				let buff = calculateETA(response.token);

				if( !busy ) {
					busy = true;
					processQueue(response.token);
				}

				response.eta = buff.eta;

			} else response.result = "failed";
		}

		if( request.event == "getProgress" ) {
			// response.result ( "waiting" || "ongoing" || "finished" || "failed" || "noQuery" ), response.progress, response.total, response.eta, response.token
			//console.log('getProgress');
			if( requestState[request.token] != undefined ) {
				response = calculateETA(request.token);
			} else response.result = "noQuery";
		}

		if( request.event == "cancelQuery" ) {
			// response.result ( "failed" || "success" ), response.token
			if( requestState[request.token] != undefined ) {
				cancelRequest(request.token);
				response.token = "success";
			} else response.result = "failed";
		}

		if( request.event == "resolveQuery" ) {
			// response.result ( "failed" || "success" ), response.data, response.token
			if( requestState[request.token] != undefined && requestState[request.token].state == "finished" ) {
				response.result = "success";
				response.token = request.token;
				response.data = requestState[request.token].data;
				requestState[request.token] = {};
			} else response.result = "failed";
		}

		sendResponse(response);
	});

	let buff = chrome.runtime.getManifest();
	curVersion = buff.version;
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.menuItemId === "reset") {
		chrome.runtime.reload();
	} else if ( info.menuItemId === "update" ) {
		let GHubURL = "https://github.com/zedor/poe-tabled-atlas-chrome-ext/releases";
  		chrome.tabs.create({ url: GHubURL });
	}
});

var updateUrl = "https://github.com/zedor/poe-tabled-atlas-chrome-ext/releases";
var updVersion = "";
var canUpdate = false;
var curVersion = "";
var requestState = {};
var tokenQ = [];
var busy = false;
var queriesInProgress = 0;
var cleanQueue = 0;

//generate uuids, https://gist.github.com/jed/982883#file-index-js
function UUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,UUID)}

function checkForUpdates() {
	let xhr = new XMLHttpRequest();

	xhr.onloadend = function() {
		if (xhr.status == 200) {
			// xhr.response.name is the ver
			xhr.response.name

			if( xhr.response.name > curVersion ) {
				chrome.contextMenus.update(update, {
        			title: 'Update available',
        			contexts: ["all"],
    			});
    		} else {
    			chrome.contextMenus.update(update, {
        			title: 'Up to date',
        			contexts: ["all"],
    			});
    		}
		} else {
			console.log("error " + this.status);
		}
	};

	xhr.open('GET', `https://api.github.com/repos/zedor/poe-map-grabber/releases/latest`, true);
	xhr.send();
}

function evaluateData(data) {
	if( data['account'] == undefined ) return false;
	if( data['league'] == undefined ) return false;
	if( data['map_series'] == undefined ) return false;
	if( data['maps'] == undefined || !Array.isArray(data['maps']) ) return false;

	for (var key in data) {
		// skip loop if the property is from prototype
		if (!data.hasOwnProperty(key)) continue;

		var obj = data[key];
		for (var prop in obj) {
			// skip loop if the property is from prototype
			if (!obj.hasOwnProperty(prop)) continue;

			if( key == "maps" ) {
				if( obj[prop].name == undefined ) return false;
				if( obj[prop].tiers == undefined || !Array.isArray(obj[prop].tiers) || obj[prop].tiers.length == 0 ) return false;
			} else if( key != "account" && key != "league" && key != "map_series" ) return false;
		}
	}

	return true;
}

function calculateETA(token) {
	// returns object
	// response.result ( "waiting" || "ongoing" || "finished" || "failed" || "noQuery" ), response.progress, response.total, response.eta, response.token

	let response = {};
	response.progress = requestState[token].progress;
	response.total = requestState[token].total;
	response.token = token;
	response.result = requestState[token].state;

	if( tokenQ.length == 0 || tokenQ[0] == token ) {
		// calc onyl eta of this
		response.eta = ( requestState[token].total - requestState[token].progress ) * 375;
	} else {
		let i = 0;
		response.eta = ( requestState[token].total - requestState[token].progress ) * 375;
		do {
			response.eta += ( requestState[tokenQ[i]].total - requestState[tokenQ[i]].progress ) * 375;
			i++;
		} while ( i < tokenQ.length && tokenQ[i] != token );
	}

	return response;
}

function startNewRequest(token) {
	tokenQ.push(token);
	requestState[token] = {};
	requestState[token].state = "waiting";
	requestState[token].progress = 0;
	requestState[token].total = 0;
	requestState[token].data = [];
}

function addToQueue(token, data) {
	requestState[token].query.maps.push(data);
}

function resolveQueue(token) {
	if( requestState[token].query.maps != undefined && requestState[token].query.maps.length > 0 ) {
		queryTheAPI(token, requestState[token].query.account, requestState[token].query.maps[0].tier, requestState[token].query.maps[0].name, requestState[token].query.league, requestState[token].query.map_series);
		requestState[token].query.maps.shift();
	}

	return requestState[token].query.maps.length;
}

function cleanUp (token) {
	if( --cleanQueue == 0 ) requestState = {};
	else requestState[token] = {};
}

async function processQueue(token) {
	if( requestState[token].query == undefined || requestState[token].query.cancelled ) {
		tokenQ.shift();
		++cleanQueue;
		setTimeout(function() {
			cleanUp(token)
		}, 300000);
	}

	if( requestState[token].query != undefined && tokenQ.length > 0 && tokenQ[0] == token && resolveQueue(token) == 0 && queriesInProgress == 0 ) {
		//finished query, return data to contact
		tokenQ.shift();

		//check if there are more requests in the token queue
		if( tokenQ.length > 0 ) {
			token = tokenQ[0];
		}
	}

	if( requestState[token].query != undefined && (tokenQ.length>0 || queriesInProgress > 0) ) {
		await new Promise(r => setTimeout(r, 375));
		processQueue(token);
	} else busy = false;
}

function resolveData(token, data) {
	requestState[token].query = {};
	requestState[token].query.account = data.account;
	requestState[token].query.league = data.league;
	requestState[token].query.map_series = data.map_series;
	requestState[token].query.maps = [];
	requestState[token].query.cancelled = false;

	for( let i = 0; i < data.maps.length; i++ ) {
		for( let j = 0; j < data.maps[i].tiers.length; j++ ) {
			addToQueue(token, { name: data.maps[i].name, tier:data.maps[i].tiers[j] } );
			++requestState[token].total;
		}
	}
}

function cancelRequest(token, response) {
	requestState[token].query.cancelled = true;
	requestState[token].query.maps.data = [];
	requestState[token].state = "failed";
	requestState[token].error = response.error;
	requestState[token].data = [];

	//fire cancel event, whether by user request or error
}

function acceptResult(token, response) {
	if( !requestState[token].query.cancelled ) {
		
		requestState[token].state = response.status;
		requestState[token].error = response.error;

		if( response.status == "error" ) {
			if( response.error == "429" ) {
				addToQueue(token, { name: response.data.name, tier:response.data.tier });
				//should actually directly fire queryTheApi after a time delay given by 429
			} else cancelRequest(token, response);
		} else {
			requestState[token].data.push( { name: response.data.name, tier: response.data.tier, owned: response.data.total } );

			++requestState[token].progress;

			if( requestState[token].progress == requestState[token].total ) requestState[token].state = "finished";
		}
	}

	--queriesInProgress;
}

function queryTheAPI(token, account, tier, name, league, map_series) {

	var response = {};

	var query =
	{ 
		"query":{ 
			"status":{ 
				"option":"any"
			},
			"type":{ 
				"option":name
			},
			"stats":[ 
			{ 
				"type":"and",
				"filters":[ 

				]
			}
			],
			"filters":{ 
				"type_filters":{ 
					"filters":{ 
						"category":{ 
							"option":"map"
						}
					}
				},
				"map_filters":{ 
					"disabled":false,
					"filters":{ 
						"map_tier":{ 
							"min":tier,
							"max":tier
						},
						"map_series":{
							"option":map_series
						}
					}
				},
				"trade_filters":{ 
					"disabled":false,
					"filters":{ 
						"account":{ 
							"input":account
						}
					}
				}
			}
		},
		"sort":{ 
			"price":"asc"
		}
	}

	let xhr = new XMLHttpRequest();
	xhr.responseType = 'json';

	xhr.onloadend = function() {
		if (xhr.status == 200) {
			//response.status = "success";
			response.data = xhr.response;
			response.data.account = account;
			response.data.name = name;
			response.data.league = league;
			response.data.map_series = map_series;
			response.data.tier = tier;
		} else {
			response.status = "error";
			response.error = this.status;
			console.log("error " + this.status);
		}
		
		acceptResult(token, response);
	};

	response.status = "ongoing";
	response.error = "none";

	xhr.open('POST', `https://www.pathofexile.com/api/trade/search/${league}`);
	xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
	xhr.send(JSON.stringify(query));

	++queriesInProgress;
}