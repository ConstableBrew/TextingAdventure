/* Simplified version of https://github.com/pvela/nexmo/blob/master/lib/nexmo.js */
/*
The MIT License (MIT)

Copyright (c) 2014 Michael Brewer
Copyright (c) 2011 Prabhu Velayutham

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
var https = require('https');
var http = require('http');
var querystring = require('querystring');

var headers = {'Content-Type':'application/x-www-form-urlencoded','accept':'application/json'};
var initialized = false;
var apiKey = '';
var apiSecret = '';
var fromAddress = '';
var msgpath = '/sms/json?';
var debugOn = false;

//Error message resources are maintained globally in one place for easy management
var ERROR_MESSAGES = { 
	sender: 'Invalid from address',
	to: 'Invalid to address',
	msg: 'Invalid Text Message',
	countrycode: 'Invalid Country Code',
	msisdn: 'Invalid MSISDN passed',
};

// debugon is optional
exports.initialize = function(userKey, userSecret, sender, debugon) {
	if (!userKey || !userSecret || !sender) {
		throw 'key, secret, and sender cannot be empty, set valid values';
	}
	apiKey = userKey;
	apiSecret = userSecret;
	fromAddress = sender;
	var authentication = {
		"api_key": apiKey,
		"api_secret": apiSecret
	};
	msgpath += querystring.stringify(authentication);
	debugOn = debugon;
	initialized = true;
}

exports.sendTextMessage = function(recipient, message, opts, callback) {
	if (!message) {
		sendError(callback, new Error(ERROR_MESSAGES.msg));
	} else {
		if (!opts) { opts = {}; }
		opts.from = fromAddress;
		opts.to = recipient;
		opts.text = message;
		sendMessage(opts, callback);
	}
}

function sendMessage(data, callback) {
	if (!data.from ){
		sendError(callback, new Error(ERROR_MESSAGES.sender));
	} else if (!data.to) {
		sendError(callback, new Error(ERROR_MESSAGES.to));
	} else {
		var path = msgpath + '&' + querystring.stringify(data);
		log('sending message from ' + data.from + ' to ' + data.to);
		sendRequest(path, 'POST', function(err, apiResponse) {
			if (!err && apiResponse.status && apiResponse.messages[0].status > 0) {
				sendError(callback, new Error(apiResponse.messages[0]['error-text']), apiResponse);
			} else {
				if (callback) { callback(err,apiResponse); }
			}
		});
	}
}

function sendRequest(path, method, callback) {
	if (!initialized) {
		throw 'nexmo not initialized, call nexmo.initialize() first before calling any nexmo API';
	}
	if (typeof method == 'function') {
		callback = method;
		method='GET';
	}
	var options = {
		host: 'rest.nexmo.com',
		port: 443,
		path: path,
		method: method,
		headers: headers
	},
	request = https.request(options),
	responseReturn='';

	request.end();
	request.on('response', function(response){
		response.setEncoding('utf8'); 
		response.on('data', function(chunk){
			responseReturn += chunk;
		});
		response.on('end',function(){
			if (callback) {
				var retJson = responseReturn,
					err = null;
				try {
				   retJson = JSON.parse(responseReturn);
				} catch (parsererr) {
					// ignore parser error for now and send raw response to client
					err = parsererr;
				}
				callback(err, retJson);
			}
		});
		response.on('close', function(e) {
			callback(e);
		});
	});
	request.on('error', function(e) {
		callback(e);
	});
}

function sendError(callback, err, returnData) {
	// Throw the error in case if there is no callback passed
	if (callback) {
		callback(err, returnData);
	} else {
		throw err;
	}
}

//Logging in one place to make it easier to move to a logging library like winston later.
function log(logMsg) {
	if (logMsg instanceof Error) console.log(logMsg.stack);
	if (debugOn) {
		if (typeof logMsg == 'object') {
			console.dir(logMsg);
		} else {
			console.log(logMsg);
		}
	}
}