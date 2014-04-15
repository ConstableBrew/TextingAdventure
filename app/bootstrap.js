/*

ZVM bootstrap
=============
Copyright 2014 Michael Brewer <constablebrew@gmail.com>
Copyright 2013 The ifvms.js contributors (see CONTRIBUTORS)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice,
    this list of conditions, and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions, and the following disclaimer in the
    documentation and/or other materials provided with the distribution.
  * Neither the name of the author of this software nor the name of
    contributors to this software may be used to endorse or promote products
    derived from this software without specific prior written consent.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.



CONTRIBUTORS
The ifvms.js team
=================

Dannii Willis <curiousdannii@gmail.com>


http://github.com/curiousdannii/ifvms.js

*/

/*

This module allows you to load a file and run a list of commands.
Once the list is complete, the VM is handed back to you, and you can do what you like with it.

*/

(function(){
	'use strict';

	// Convert text into an array
	function text_to_array( text, array ) {
		var i = 0, len;
		array = array || [];
		for ( len = text.length % 8; i < len; ++i ) {
			array.push( text.charCodeAt( i ) );
		}
		for ( len = text.length; i < len; ){
			// Unfortunately unless text is cast to a String object there is no shortcut for charCodeAt,
			// and if text is cast to a String object, it's considerably slower.
			array.push(
				text.charCodeAt( i++ ), text.charCodeAt( i++ ), text.charCodeAt( i++ ), text.charCodeAt( i++ ),
				text.charCodeAt( i++ ), text.charCodeAt( i++ ), text.charCodeAt( i++ ), text.charCodeAt( i++ )
			);
		}
		return array;
	}

	// A basic ZVM runner
	function runner( vm, inputCommands )	{
		var orders, order, code, i, len;
		inputCommands = inputCommands || [];
		
		vm.run();
		
		while ( true ) {
			orders = vm.orders;
			i = 0;
			len = orders.length;
			
			// Process the orders
			while ( i < len ) {
				order = orders[i++];
				code = order.code;
				
				// Text output
				// We don't do much, just add it to a string on the vm object
				if ( code === 'stream' ) {
					// Skip status line updates
					if ( order.to === 'status' )
					{
						continue;
					}
					vm.log += order.text || '';
				}
				
				// Line input
				else if ( code === 'read' && inputCommands.length ) {
					order.response = inputCommands.shift();
					vm.inputEvent( order ); // Calls run
				}
				
				else if ( code === 'find' ) {
					continue;
				}
				
				// Return on anything else
				else
				{
					return;
				}
			}
		}
	}

	// A simple function to run a particular story, optionally with a list of commands
	exports.zvm = function( path, inputCommands )
	{
		var fs = require( 'fs' );
		var iconv = require( 'iconv-lite' );
		var ZVM = require( './zvm.js' );
		
		var data = iconv.decode( fs.readFileSync( path ), 'latin1' );
		
		var vm = new ZVM();
		vm.inputEvent({
			code: 'load',
			data: text_to_array( data )
		});
		vm.restart();
		vm.log = '';
		runner( vm, inputCommands );
		return vm;
	};

	exports.runner = runner;

})();