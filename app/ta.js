
var iconv 			= require('iconv-lite'); // Character encoding conversion
var fs 				= require('fs');
var ZVM 			= require('./zvm.js');
var config 			= require('./config/config.js');

//	Manages User objects
//	TODO: Create library of story files, allow users to load whatever ones they want
//	TODO: Manage cache of engines and use save/restore game states to reduce total memory usage
function TextingAdventure(){
	this.users = {};
	this.storyFile = new StoryFile(config.defaultStory, config.defaultStoryPath);
};

// Returns User object for the given user, creating a new object if necessary
TextingAdventure.prototype.getUser = function(userId){
	if(typeof this.users[userId] === 'undefined'){
		this.users[userId] = new User(userId, this.storyFile.data);
	}
	return this.users[userId];
};


/*
	Each user object maintains their own in/out queues and
	game engine.
*/
var User = function(userId, storyData){
	this.userId = userId;
	this.inputText = '';
	this.outputText = '';

	this.engine = new ZVM();
	this.engine.outputEvent = this.outputEvent;
	this.engine.inputEvent({
		code: 'load',
		data: storyData
	});
	this.engine.log = '';
	this.engine.restart();
	this.engine.run();
}

User.prototype.run = function(){
// A basic ZVM runner
	var orders, order, code, i, length, txt;

	while(true){
		orders = this.engine.orders;
		i = 0;
		length = orders.length;

		// Process the orders
		while( i < length ){
			order = orders[i++];
			code = order.code;

			if ( code === 'stream' ){
				// Text output
				if ( order.to === 'status' ){
					// Skip status line updates
					continue;
				}
				this.outputText += order.text || '';
			}else if ( code === 'read' && this.inputText.length ){
				// Line input
				if(this.inputText.indexOf('\n') == -1){
					txt = this.inputText;
					this.inputText = '';
				}else{
					txt = this.inputText.slice(0, this.inputText.indexOf('\n'));
					this.inputText = this.inputText.slice(txt.length + 1);
				}
				order.response = txt.replace(/\n/g, '');
				this.engine.inputEvent( order ); // Calls run
			}else if ( code === 'char' && this.inputText.length ){
				// char input
				// TODO: Probably could do this better with a regexp
				//do{
					if(this.inputText.length == 1){
						txt = this.inputText;
						this.inputText = '';
					}else{
						txt = this.inputText.slice(0,1);
						this.inputText = this.inputText.slice(1);
					}
					// Try again if we got a carrige return
				//}while(this.inputText.length && !txt.length)
				order.response = txt.replace(/\n/g, '');
				this.engine.inputEvent( order ); // Calls run
			}else if ( code === 'find' ){
				continue;
			}else{
				// Return on anything else
				return;
			}
		}
	}
};

//	A story file
// Params: (name, fullPath)
var StoryFile = (function(){
	function StringToByteArray(text) {
		var data = iconv.decode(text, 'latin1'),
			length = data.length,
			array = new Array(length),
			i;

		for(i=0; i < length; ++i){
			array[i] = data.charCodeAt(i); // Faster than push() when using seeded array
		}
		return array;
	}

	return function(name, fullPath){
		var myData = undefined;

		this.name = name;
		this.path = fullPath;

		// lazy loaded binary data
		Object.defineProperty(this, 'data', {
			get: function(){
				if(typeof myData === 'undefined'){
					myData = StringToByteArray(fs.readFileSync( this.path ));
				}
				return myData;
			}
		});
	}
})();


module.exports = new TextingAdventure();