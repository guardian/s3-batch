/*global module, require */

(function () {

	'use strict';

	var S3Batch, extend;

	extend = require( 'extend' );

	S3Batch = function ( s3, defaults ) {
		this.s3 = s3;
		this._defaults = defaults || {};

		this._queue = [];

		this.total = {
			files: 0,
			bytes: 0
		};

		this.completed = {
			files: 0,
			bytes: 0
		};

		this.subscribers = {};
	};

	S3Batch.prototype = {
		add: function ( key, data, params ) {
			var file;

			file = {
				key: key,
				data: data,
				params: params || {}
			};

			this._queue.push( file );

			this.total.files += 1;
			this.total.bytes += data.length;

			this.fire( 'add', file );
		},

		start: function () {
			var self = this;
			var completed = false;
			var maxConnections = 16;//maximum parallel uploads
			
			self.inProgress = [];

			//this function checks there are enough uploads happening. start some more if needed.
			//detect when everything is done.
			var processQueue = function(){
				if((self._queue.length + self.inProgress.length) > 0){
					//there are uploads queued or in progress. start some queued jobs, up to the connection limit
					while(self._queue.length > 0 && self.inProgress.length < maxConnections){
						startNextFile();
					}
				} else {
					//everything is finished
					if(!completed){
						completed = true;
						complete();
					}
				}
			};

			//get next queued file for uploading
			var startNextFile = function(){
				var file = self._queue.pop();
				uploadFile(file);
			};

			//upload a file
			var uploadFile = function(file){
				self.inProgress.push(file.key);
				var params = extend({}, self._defaults, file.params, {
					Key: file.key,
					Body: file.data
				});

				var putObjectRequest = self.s3.client.putObject( params );
			
				putObjectRequest.on( 'error', function (e) {
					self.fire( 'error', file , e);
				});

				putObjectRequest.on( 'success', function () {

					self.completed.files += 1;
					self.completed.bytes += file.data.length;

					// fire progress event
					self.fire( 'progress', self.completed.bytes / self.total.bytes, file );

					fileComplete(file);
					
				});
				putObjectRequest.send();
			};

			//callback when a file is complete. remove it from inProgress list
			//call processQueue to add start more uploads
			var fileComplete = function(file){
				self.inProgress.splice( self.inProgress.indexOf( file.key ), 1 );
				processQueue();
			};


			var complete = function(){
				self.fire( 'complete' );
			};

			//start the upload process
			processQueue();

		},

		on: function ( eventName, callback ) {
			if ( !this.subscribers[ eventName ] ) {
				this.subscribers[ eventName ] = [];
			}

			this.subscribers[ eventName ].push( callback );
		},

		fire: function ( eventName ) {
			var self, args, subscribers;

			self = this;
			args = Array.prototype.slice.call( arguments, 1 );
			subscribers = this.subscribers[ eventName ] || [];

			subscribers.forEach( function ( subscriber ) {
				subscriber.apply( self, args );
			});
		}
	};

	module.exports = S3Batch;

}());