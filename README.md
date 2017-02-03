Tappy Communication Messaging Protocol (TCMP) commany family for
performing basic tag detection, reading, and writing operations. 

## Installation
Bower
```
bower install tappy-basicnfcfamily
```

NPM
```
npm install @taptrack/tappy-basicnfcfamily
```
## Commands
```javascript
var BasicNfc = require('tappy-basicnfcfamily');
var Commands = BasicNfc.Commands;

// Tag Detection Commands

// All scan/stream commands take two parameters:
// timeout: number of seconds to scan for, 0 disables max 255
// pollingMode: one of BasicNfc.PollingModes, defaults to MODE_GENERAL
//     it is necessary to change to MODE_TYPE1 to detect NFC Forum Type 1
//     tags, while MODE_GENERAL covers Type 2 and 4.
// Scan commands detect a single tag then quit, stream continue until
// manually stopped or a fatal error occurs

// Tag detection only detects the UID and type of the tag entering the field
var scanTag = new Commands.ScanTag(timeout,BasicNfc.PollingModes.MODE_TYPE1);
var streamTags = new Commands.StreamTags(timeout);

// Ndef detection only reports tags containing an NFC Forum compilant NDEF 
// message
var scanNdef = new Commands.ScanNdef(timeout,BasicNfc.PollingModes.MODE_GENERAL);
var streamNdef = new Commands.StreamNdef(timeout);

// Tag Writing Commands

// All write commands have the same first two parameters:
// timeout: number of seconds to wait for a tag to be presented, 0->255
// lock: boolean determining if the tag should be locked after writing

// Writes a custom ndef message to the tag. The data parameter should
// be a Uint8Array containing the bytes of a full NDEF message, excluding
// any tag technology-specific information
var writeCustom = new Commands.WriteNdefCustom(timeout,lockTag, ndefData);

// Writes an ndef message with a single text record to the tag. The data 
// be a string containing the text to be written.
var writeText = new Commands.WriteNdefText(timeout,lockTag,textData);

// Writes an ndef message with a single text record to the tag. The data 
// be a string containing the text to be written.
// The last data parameter is an NDEF URI record prefix code, while
// the uri data parameter contains the full uri without the prefix
var writeUri = new Commands.WriteNdefUri(timeout,lockTag,uri,uriCode);

// Tag Emulation Commands

// Emulation commands cause the Tappy to emulate a type 4 tag containing
// user-specified NDEF data.
// All emulate commands have the same first two parameters:
// timeout: number of seconds to emulate for, 0->255 (0 disables)
// maxScans: number of scans to emulate for, 0->255 (0 disables)

// Causes the Tappy to emulate a type 4 tag containing a user-defined
// NDEF message. The ndefData parameter should be a Uint8Array containing
// all the bytes of a full NDEF message, excluding any tag technology-specific
// information
var emulateCustom = new Commands.EmulateNdefCustom(timeout,maxScans, ndefData);

// Causes the Tappy to emulate a type 4 tag containing an NDEF message
// with a single text record. 
// The textData should be a string containing the text you wish the
// emulated record to contain
var emulateText = new Commands.EmulateNdefText(timeout,maxScans,textData);

// Causes the Tappy to emulate a type 4 tag containing an NDEF message
// with a single URI record. 
// The last data parameter is an NDEF URI record prefix code, while
// the uri data parameter contains the full uri without the prefix
var emulateUri = new Commands.EmulateNdefUri(timeout,maxScans,uri,uriCode);

// Utility Commands

// Cancel any operation. Primarily used for stopping operations with a 
// long timeout or indefinite timeout
var stop = new Commands.Stop();

// Request that the tappy return the version of the BasicNfc
// library that it supports
var getLibraryVersion = new Commands.GetLibraryVersion();


```

## Responses
Note, you should only manually construct responses as below for testing 
purposes. in practise, please use the resolver described later to convert 
raw tcmp messages received from the tappy into their corresponding concrete
response types with the payloads parsed appropriately.
```javascript
// Utility Responses

// An error occured during a BasicNfc operation, has methods
var applicationError = new Responses.ApplicationError();
// retrieve the command family-specific error code as per BasicNfc.ErrorCodes 
applicationError.getErrorCode();
// retrieve the internal-use error code 
applicationError.getInternalErrorCode();
// retrieve the status reported by the Tappy's NFC Controller
applicationError.getReaderStatusCode();
// retrieve the text message describing the error (may be empty string)
applicationError.getErrorMessage();

// Response reporting the version of the BasicNfc command family on
// the tappy
var libVersion = new Responses.LibraryVersion();
libVersion.getMajorVersion();
libVersion.getMinorVersion();

// Tag Detection Responses

// Response notifying the client of an Ndef-containing tag being detected
var ndefFound = new Responses.NdefFound();
// retrieve Tappy standard tag type code
ndefFound.getTagType();
// retrieve Uint8Array of the tag's UID
ndefFound.getTagCode();
// retrieve Uint8Array of the tag's Ndef message
ndefFound.getNdefMessage();

// Response notifying the client that an operation timed out without detecting
// a tag
var scanTimeout = new Responses.ScanTimeout();

// Response notifying the client of a tag being detected
var tagFound = new Responses.TagFound();
// retrieve Tappy standard tag type code
tagFound.getTagType();
// retrieve Uint8Array of the tag's UID
tagFound.getTagCode();

// Tag Writing Responses

// Response notifying the client that a tag was successfully written
var tagWritten = new Responses.TagWritten();
// retrieve Tappy standard tag type code
tagWritten.getTagType();
// retrieve Uint8Array of the tag's UID
tagWritten.getTagCode();

// Tag Emulation Responses

// Response notifying that someone has scanned the emulated tag
var emulationScanSuccess = new Responses.EmulationScanSuccess()

// Response notifying that emulation has ended 
var emulationComplete = new Responses.EmulationComplete();
// retrieve the reason emulation completed, the
// value is a single byte as below:
// 0x01: timeout reached 
// 0x02: max scans reached
// 0x03: new instruction was received
emulationComplete.getReasonCode();
// retrieve the number of times the emulated tag was scanned
emulationComplete.getScanCount();

```

## Resolver
While you can manually resolve raw TCMP messages received from the Tappy using 
getCommandFamily(), getCommandCode(), getPayload(), and parsePayload(), it is 
much more convenient to use the built-in resolvers and isTypeOf().
```javascript
var resolver = new BasicNfc.Resolver();

// first check to see if the family matches this can be used to multiplex 
// multiple resolvers from different families
if(resolver.checkFamily(responseMsg) {
    // this will throw if the command family doesn't match, so please do that
    // first. additionally, will return null if it cannot match the command
    // code
    var resolved = resolver.resolveResponse(responseMsg);
    if(resolved !== null && 
            BasicNfc.Responses.LibraryVersion.isTypeOf(resolved)) {
        console.log("BasicNfc version v"+resolved.getMajorVersion()+
                "."+resolved.getMinorVersion());
    }
}

```

There is a corresponding resolveCommand for commands in case you are storing
commands in a raw form. Note that commands and responses have overlapping 
commandCode space, so keep track of whether the message was sent to the Tappy
or received from it and use the appropriate resolution function.


