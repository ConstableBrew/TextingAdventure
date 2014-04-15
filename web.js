// dependecies ================================================================
var express			= require('express');
var app				= express();
var fs 				= require('fs');
var sms 			= require('./app/nexmo.js');
var ifvms 			= require('./app/bootstrap.js');

// configuration ==============================================================
var debugOn 		= true;
var config 			= require('./app/config/config.js');
var database		= require('./app/database.js');

sms.initialize(config.SMS.apiKey, config.SMS.apiSecret, config.SMS.sender, debugOn);
sms.sendTextMessage('3104205285', 'Server started');



// listen =====================================================================

// homepage ----------------------------------------------------------------
app.get('/', function(req, res){
	res.sendfile('./index.html');
});


// Incoming text messages.
// User will be identified by the phone number
app.get('/smsinbound', function(req, res){
	var user, input, game;
	// only process short text messages
	if( (req.query.type === 'text') 
		&& (typeof req.query.concat === 'undefined') 
		&& (typeof req.query.msisdn !== 'undefined')
	) {

		user = req.query.msisdn || 0;
		input = req.query.text || '';
		game = database.activeGames[user];

		if (typeof game === 'undefined') {
			// Create a new game
			game = ifvms.zvm(config.defaultStoryPath, input);
			database.activeGames[user] = game;
			log('New user ' + user, 'Active users:' + database.activeGames.length);
		}else{
			// Continue an existing game
			ifvms.runner(game, input);
			log('Returning user + ' + user, 'Active users:' + database.activeGames.length);
		}
		sms.sendTextMessage(user, game.log);
		game.log = '';
	}
})

// serve up all other assets -----------------------------------------------
app.get('/:file', function(req, res){
	res.sendfile('/' + req.params.file);
});
app.get('/:folder/:file', function(req, res){
	res.sendfile('/' + req.params.folder + '/' + req.params.file);
});

app.listen(config.port, function() {
	log('Listening on ' + config.port);
});


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