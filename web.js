// dependecies ================================================================
var express			= require('express');
var app				= express();
var fs 				= require('fs');
var sms 			= require('./app/nexmo.js');
var ta 				= require('./app/ta.js');

// configuration ==============================================================
var debugOn 		= true;
var config 			= require('./app/config/config.js');
var database		= require('./app/database.js');

sms.initialize(config.SMS.apiKey, config.SMS.apiSecret, config.SMS.sender, debugOn);
app.use(express.static(__dirname + '/public'));	// Set static file location



// listen =====================================================================

// Process user input, returns output text
function userInputReceived(req){
	// User will be identified by the phone number or random text string
	var userId = req.query.msisdn || req.query.userId,
	type = req.query.type || 'text', // TODO: Handle other types of text messages
	text = req.query.text || '',
	user = ta.getUser(userId),
	output;
	
	if(text.length){
		user.inputText += text;
	}
	user.outputText = '';
	user.run();
	output = user.outputText;
	user.outputText = '';
	return output;
}


// homepage ----------------------------------------------------------------
app.get('/', function(req, res){
	res.sendfile('./public/index.html');
});

// Incoming web messages.
app.get('/ta', function(req, res){
	var output = userInputReceived(req);
	res.send(output);
});

// Incoming sms messages.
app.get('/smsinbound', function(req, res){
	// TODO: Validate query parameters
	// TODO: limit request.connection.remoteAddress to just the SMS server
	// TODO: make the URL less guessable by hackers (who could then hijack and use my sms)
	var output = userInputReceived(req);
	output = output.replace(/\r/g, '\n')
		.trim();
	sms.sendTextMessage(req.query.msisdn, output);
	res.send(200);
});

// sms confirmation
app.get('/smscallback', function(req, res){
	log(req.query)
	res.send(200);
});

// Delete a game
app.get('/quit', function(req, res){
	var userId = req.query.msisdn || req.query.userId;
	delete ta.users[userId];
	log('killing session ' + userId);
	res.send(200);
});


// serve up all other assets -----------------------------------------------
app.get('/:folder/:file', function(req, res){
	res.sendfile('/' + req.params.folder + '/' + req.params.file);
});
app.get('/:file', function(req, res){
	res.sendfile('/' + req.params.file);
});

app.listen(config.port, function() {
	log('Listening on ' + config.port);
});




// Log =====================================================================
//Logging in one place to make it easier to move to a logging library like winston later.
GLOBAL.log = function log(logMsg) {
	if (logMsg instanceof Error) console.log(logMsg.stack);
	if (debugOn) {
		if (typeof logMsg == 'object') {
			console.dir(logMsg);
		} else {
			console.log(logMsg);
		}
	}
};