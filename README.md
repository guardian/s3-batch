# s3-batch

Utility for batch uploading files to S3. This is a rough-and-ready script developed for personal use, YMMV. It assumes you are using the AWS Node SDK - refer to the docs at <http://aws.amazon.com/sdkfornodejs/>

## Usage

```js
var S3Batch, batch;

S3Batch = require( 's3-batch' );

// you need to have your own s3 instance set up
batch = new S3Batch( s3 );

// optionally you can provide default parameters as a second argument
batch = new S3Batch( s3, { Bucket: 'my-bucket', ACL: 'public-read' });
```

## Instance methods
**batch.add( key, data[, params] );**  
Adds a new file to the queue. `params` extend the defaults, and are as per the s3.putObject parameters (http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3/Client.html#putObject-property)

**batch.on( eventName, callback );**  
Adds an event callback (see **Instance events** below)

**batch.start();**  
Starts uploading


## Instance properties
**batch.s3**  
The S3 instance we initialised with

**batch.total.files**  
The number of files in the queue

**batch.total.bytes**  
The number of bytes in the queue

**batch.completed.files**  
The number of files successfully uploaded

**batch.completed.bytes**  
The number of bytes successfully uploaded


## Instance events
Below, `file` as a callback argument refers to an object containing `key`, `data` and `params` objects as originally passed in to `batch.add`

**success**  
Fired when a file is successfully uploaded. Callbacks receive `file`

**progress**  
Fired when a file is successfully uploaded. Callbacks receive a number between 0 and 1, indicating batch progress. The number of bytes or files completed can be accessed using the instance properties listed above

**error**  
Fired when a file fails to upload. Callbacks receive `file`

**complete**  
Fired when all files have successfully uploaded (if any uploads result in an error, this will never fire)

