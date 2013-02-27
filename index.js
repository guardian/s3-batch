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
			var self, next, putObjectRequest, inProgress, total, completed;

			self = this;
			
			self.inProgress = [];
			
			this._queue.forEach( function ( file, i ) {
				
				var params;

				self.inProgress.push( file );

				self.fire( 'start', file );

				params = extend({}, self._defaults, file.params, {
					Key: file.key,
					Body: file.data
				});

				putObjectRequest = self.s3.client.putObject( params );
				
				putObjectRequest.on( 'error', function () {
					self.fire( 'error', file );
				});

				putObjectRequest.on( 'success', function () {
					
					self.completed.files += 1;
					self.completed.bytes += file.data.length;

					self.fire( 'success', file );

					// remove from inProgress
					inProgress.splice( self.inProgress.indexOf( params ), 1 );

					// fire progress event
					self.fire( 'progress', self.completed.bytes / self.total.bytes );

					// if there are no more, fire complete event
					if ( !inProgress.length ) {
						self.fire( 'complete' );
					}
				});

				putObjectRequest.send();
			});
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