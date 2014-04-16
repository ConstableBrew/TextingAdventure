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
sms.sendTextMessage('13104205285', 'Server started');



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
		&& (typeof req.query.text   !== 'undefined')
	) {

		user = req.query.msisdn || 0;
		input = (req.query.text || '').split('\n');
		game = database.activeGames[user];

		if (typeof game === 'undefined') {
			// Create a new game
			log('New user ' + user + ', Active users:' + database.activeGames.length);
			game = ifvms.zvm(config.defaultStoryPath, input);
			game.outputEvent = console.log;
			database.activeGames[user] = game;
			
		}else{
			// Continue an existing game
			log('Returning user + ' + user + ', Active users:' + database.activeGames.length);
			//ifvms.runner(game, input);
			game.inputEvent(input);
			
		}
		//sms.sendTextMessage(user, game.log.slice(-160));
		log(game.log.slice(-160));
		game.log = '';
	}
})

// serve up all other assets -----------------------------------------------
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