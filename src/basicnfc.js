(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.TappyBasicNfcFamily = factory();
    }
}(this, function () {
    var commandFamily = new Uint8Array([0x00,0x01]);
    
    var bytesToString = function(arr) {
        var binstr = Array.prototype.map.call(arr, function (ch) {
            return String.fromCharCode(ch);
        }).join('');

        var escstr = binstr.replace(/(.)/g, function (m, p) {
            var code = p.charCodeAt(0).toString(16).toUpperCase();
            if (code.length < 2) {
                code = '0' + code;
            }
            return '%' + code;
        });
        return decodeURIComponent(escstr);    
    };

    var stringToBytes = function(string) {
        var escstr = encodeURIComponent(string);
        var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        });
        var ua = new Uint8Array(binstr.length);
        Array.prototype.forEach.call(binstr, function (ch, i) {
            ua[i] = ch.charCodeAt(0);
        });
        return ua;
    };

    var getMissingMethods = function(instance,methods) {
        var missing = [];
        for(var i = 0; i < methods.length; i++) {
            var method = methods[i];
            if(typeof instance[method] !== "function") {
                missing.push(method);
            }
        }
        return missing;
    };

    var implementsMethods = function(instance,methods) {
        var missingMethods = getMissingMethods(instance,methods);
        if(missingMethods === null || missingMethods.length > 0) {
            return false;
        } else {
            return true;
        }
    };
    
    var arrEquals = function(a1, a2) {
        return (a1.length == a2.length) && a1.every(function(e, i){
            return e === a2[i];
        });
    };

    var cmdMethods = ["getCommandFamily","getCommandCode","getPayload"];

    var c = {};
    
    var CommandCodes = {
        WriteNdefUri: 0x05,
        WriteNdefText: 0x06,
        WriteNdefCustom: 0x07,
        StreamTags: 0x01,
        StreamNdef: 0x03,
        Stop: 0x00,
        ScanTag: 0x02,
        ScanNdef: 0x04,
        LockTag: 0x08,
        GetLibraryVersion: 0xFF,
    };

    var PollingModes = {
        TYPE1: 0x01,
        GENERAL: 0x02
    };

    var typeChecker = function(commandCode) {
        return function(cmd) {
            if(typeof cmd !== "object" || cmd === null) {
                throw new Error("Command passed to check type must be an object implementing: "+cmdMethods.join(", "));
            } else if(!implementsMethods(cmd,cmdMethods)) {
                throw new Error("Command passed to check type must also implement: "+
                        getMissingMethods(cmd,cmdMethods).join(", "));
            }
            else {
                return arrEquals(cmd.getCommandFamily(),commandFamily) && cmd.getCommandCode() === commandCode;
            }
        };
    };

    var AbsProto = function(commandCode){
        return {
            getCommandFamily: function() {
                return commandFamily;
            },

            getCommandCode: function() {
                return commandCode; 
            },

            getPayload: function() {
                return [];
            },

            parsePayload: function() {

            },

        };
    };

    var AbsPollingProto = function(commandCode) {
        var proto = AbsProto(commandCode);
        proto.getPayload = function() {
           return new Uint8Array([this.timeout,this.pollingMode]);
        };
        proto.parsePayload = function(payload) {
            if(payload.length < 2) {
                throw new Error("Invalid payload: Basic NFC polling command payload must be at least two bytes");
            } else {
                this.timeout = payload[0];
                this.pollingMode = payload[1];
            }
        };
        proto.getTimeout = function() {
            return this.timeout;
        };
        proto.setTimeout = function(timeout) {
            this.timeout = timeout;
        };
        proto.getPollingMode = function() {
            return this.pollingMode;
        };
        proto.setPollingMode = function(pollingMode) {
            this.pollingMode = pollingMode;
        };
        return proto;
    };

    var GetPollingCons = function() {
        return function(timeout,pollingMode) {
            if(typeof timeout === "undefined") {
                this.timeout = 0x00;
            } else {
                this.timeout = timeout;
            }

            if(typeof pollingMode === "undefined") {
                this.pollingMode = PollingModes.GENERAL;
            } else {
                this.pollingMode = pollingMode;
            }
        };
    };
    
    var GetLibraryVersion = function() {
        
    };
    GetLibraryVersion.prototype = AbsProto(CommandCodes.GetLibraryVersion);
    GetLibraryVersion.isTypeOf = typeChecker(CommandCodes.GetLibraryVersion);
    c.GetLibraryVersion = GetLibraryVersion;

    var ScanNdef = GetPollingCons(); 
    ScanNdef.prototype = AbsPollingProto(CommandCodes.ScanNdef);
    ScanNdef.isTypeOf = typeChecker(CommandCodes.ScanNdef);
    c.ScanNdef = ScanNdef;

    var StreamNdef = GetPollingCons(); 
    StreamNdef.prototype = AbsPollingProto(CommandCodes.StreamNdef);
    StreamNdef.isTypeOf = typeChecker(CommandCodes.StreamNdef);
    c.StreamNdef = StreamNdef;

    var ScanTag = GetPollingCons(); 
    ScanTag.prototype = AbsPollingProto(CommandCodes.ScanTag);
    ScanTag.isTypeOf = typeChecker(CommandCodes.ScanTag);
    c.ScanTag = ScanTag;

    var StreamTags = GetPollingCons(); 
    StreamTags.prototype = AbsPollingProto(CommandCodes.StreamTags);
    StreamTags.isTypeOf = typeChecker(CommandCodes.StreamTags);
    c.StreamTags = StreamTags;

    var LockTag = function(timeout,uid) {
        if(typeof timeout === "number") {
            this.timeout = timeout;
        } else {
            this.timeout = 0x00;
        }

        if(typeof uid !== "undefined" &&
                uid !== null) {
            this.uid = uid;
        } else {
            this.uid = new Uint8Array(0);
        }
    };
    LockTag.prototype = AbsProto(CommandCodes.LockTag);
    LockTag.isTypeOf = typeChecker(CommandCodes.LockTag);
    LockTag.prototype.getPayload = function() {
        var uidLength = this.uid.length;
        var payload = new Uint8Array(1+1+uidLength);
        payload[0] = this.timeout;
        payload[1] = uidLength;
        if (uidLength > 0) {
            payload.set(this.uid,2);
        }
       return payload;
    };
    LockTag.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Invalid payload: Lock tag command payload must be at least two bytes");
        } else {
            this.timeout = payload[0];
            var uidLength = payload[1];
            if(uidLength > 0) {
                if((uidLength + 2) < payload.length) {
                    this.uid = payload.subarray(2,2+uidLength);
                }
            } else {
                this.uid = new Uint8Array(0);
            }
        }
    };
    LockTag.prototype.getTimeout = function() {
        return this.timeout;
    };
    LockTag.prototype.setTimeout = function(timeout) {
        this.timeout = timeout;
    };
    LockTag.prototype.getTagCode = function() {
        return this.uid;
    };
    LockTag.prototype.setTagCode = function(uid) {
        this.uid = uid;
    };
    c.LockTag = LockTag;

    var Stop = function() {

    };
    Stop.prototype = AbsProto(CommandCodes.Stop);
    Stop.isTypeOf = typeChecker(CommandCodes.Stop);
    c.Stop = Stop;
    
    var WriteNdefText = function(timeout, lock, text) {
        if(typeof timeout === "undefined") {
            this.timeout = 0x00;
        } else {
            this.timeout = timeout;
        }

        if(typeof lock === "undefined") {
            this.locks = false;
        } else {
            this.locks = lock;
        }

        if(typeof text === "undefined") {
            this.text = "";
        } else {
            this.text = text;
        }
    };
    WriteNdefText.prototype = AbsProto(CommandCodes.WriteNdefText);
    WriteNdefText.isTypeOf = typeChecker(CommandCodes.WriteNdefText);
    WriteNdefText.prototype.getPayload = function() {
        var textBytes = stringToBytes(this.text);
        var payload = new Uint8Array(textBytes.length+2);
        payload[0] = this.timeout;
        payload[1] = this.locks ? 0x01 : 0x00;
        payload.set(textBytes,2);
        return payload;
    };
    WriteNdefText.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Invalid payload: write ndef text must be at least 2 bytes long");
        } else {
            this.timeout = payload[0];
            this.locks = (payload[1] === 0x01);
            if(payload.length > 2) {
                var textBytes = payload.slice(2);
                this.text = bytesToString(textBytes);
            } else {
                this.text = "";
            }
        }
    };
    WriteNdefText.prototype.getTimeout = function() {
        return this.timeout;
    };
    WriteNdefText.prototype.setTimeout = function(timeout) {
        this.timeout = timeout;
    };
    WriteNdefText.prototype.getLockFlag = function() {
        return this.locks;
    };
    WriteNdefText.prototype.setLockFlag = function(locks) {
        this.locks = locks;
    };
    WriteNdefText.prototype.getText = function() {
        return this.text;
    };
    WriteNdefText.prototype.setText = function(text) {
        this.text = text;
    };
    c.WriteNdefText = WriteNdefText;
    
    var WriteNdefUri = function(timeout, lock, uri, uriCode) {
        if(typeof timeout === "undefined") {
            this.timeout = 0x00;
        } else {
            this.timeout = timeout;
        }

        if(typeof lock === "undefined") {
            this.locks = false;
        } else {
            this.locks = lock;
        }

        if(typeof uri === "undefined") {
            this.uri = "";
        } else {
            this.uri = uri;
        }
        
        if(typeof uriCode === "undefined") {
            this.uriCode = 0x00; //no prefix
        } else {
            this.uriCode = uriCode;
        }
    };
    WriteNdefUri.prototype = AbsProto(CommandCodes.WriteNdefUri);
    WriteNdefUri.isTypeOf = typeChecker(CommandCodes.WriteNdefUri);
    WriteNdefUri.prototype.getPayload = function() {
        var uriBytes = stringToBytes(this.uri);
        var payload = new Uint8Array(uriBytes.length+3);
        payload[0] = this.timeout;
        payload[1] = this.locks ? 0x01 : 0x00;
        payload[2] = this.uriCode;
        payload.set(uriBytes,3);
        return payload;
    };
    WriteNdefUri.prototype.parsePayload = function(payload) {
        if(payload.length < 3) {
            throw new Error("Invalid payload: write ndef uri must be at least 2 bytes long");
        } else {
            this.timeout = payload[0];
            this.locks = (payload[1] === 0x01);
            this.uriCode = payload[2];
            if(payload.length > 3) {
                var uriBytes = payload.slice(3);
                this.uri = bytesToString(uriBytes);
            } else {
                this.uri = "";
            }
        }
    };
    WriteNdefUri.prototype.getTimeout = function() {
        return this.timeout;
    };
    WriteNdefUri.prototype.setTimeout = function(timeout) {
        this.timeout = timeout;
    };
    WriteNdefUri.prototype.getLockFlag = function() {
        return this.locks;
    };
    WriteNdefUri.prototype.setLockFlag = function(locks) {
        this.locks = locks;
    };
    WriteNdefUri.prototype.getUri = function() {
        return this.uri;
    };
    WriteNdefUri.prototype.setUri = function(uri) {
        this.uri = uri;
    };
    WriteNdefUri.prototype.getUriCode = function() {
        return this.uriCode;
    };
    WriteNdefUri.prototype.setUriCode = function(uriCode) {
        this.uriCode = uriCode;
    };
    c.WriteNdefUri = WriteNdefUri;
    
    var WriteNdefCustom = function(timeout, lock, msg) {
        if(typeof timeout === "undefined") {
            this.timeout = 0x00;
        } else {
            this.timeout = timeout;
        }

        if(typeof lock === "undefined") {
            this.locks = false;
        } else {
            this.locks = lock;
        }

        if(typeof msg === "undefined") {
            this.msg = new Uint8Array(0);
        } else {
            this.msg = msg;
        }
    };
    WriteNdefCustom.prototype = AbsProto(CommandCodes.WriteNdefCustom);
    WriteNdefCustom.isTypeOf = typeChecker(CommandCodes.WriteNdefCustom);
    WriteNdefCustom.prototype.getPayload = function() {
        var payload = new Uint8Array(this.msg.length+2);
        payload[0] = this.timeout;
        payload[1] = this.locks ? 0x01 : 0x00;
        payload.set(this.msg,2);
        return payload;
    };
    WriteNdefCustom.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Invalid payload: write ndef uri must be at least 2 bytes long");
        } else {
            this.timeout = payload[0];
            this.locks = (payload[1] === 0x01);
            if(payload.length > 2) {
                this.msg = payload.slice(2);
            } else {
                this.msg = new Uint8Array(0);
            }
        }
    };
    WriteNdefCustom.prototype.getTimeout = function() {
        return this.timeout;
    };
    WriteNdefCustom.prototype.setTimeout = function(timeout) {
        this.timeout = timeout;
    };
    WriteNdefCustom.prototype.getLockFlag = function() {
        return this.locks;
    };
    WriteNdefCustom.prototype.setLockFlag = function(locks) {
        this.locks = locks;
    };
    WriteNdefCustom.prototype.getMessage = function() {
        return this.msg;
    };
    WriteNdefCustom.prototype.setMessage = function(msg) {
        this.msg = msg;
    };
    c.WriteNdefCustom = WriteNdefCustom;

    var r = {};
    var ResponseCodes = {
        LibraryVersion: 0x04,
        TagWritten: 0x05,
        TagFound: 0x01,
        ScanTimeout: 0x03,
        NdefFound: 0x02,
        TagLocked: 0x06,
        ApplicationError: 0x7F,
    };
   
    var TagWritten = function(tagCode,tagType) {
        if(typeof tagCode !== "undefined") {
            this.tagCode = tagCode;
        } else {
            this.tagCode = new Uint8Array(4);
        }

        if(typeof tagType !== "undefined") {
            this.tagType = tagType;
        } else {
            this.tagType = 0x00;
        }
    };
    TagWritten.prototype = AbsProto(ResponseCodes.TagWritten);
    TagWritten.isTypeOf = typeChecker(ResponseCodes.TagWritten);
    TagWritten.prototype.getPayload = function() {
        var payload = new Uint8Array(this.tagCode.length+1);
        payload[0] = this.tagType;
        if(this.tagCode.length > 0) {
            payload.set(this.tagCode,1);
        }

        return payload;
    };
    TagWritten.prototype.parsePayload = function(payload) {
        if(payload.length < 1) {
            throw new Error("Invalid Payload: tag written response must be longer than one byte");
        } else {
            this.tagType = payload[0];
            if(payload.length > 1) {
                this.tagCode = payload.slice(1);
            } else {
                this.tagCode = new Uint8Array(0);
            }
        }
    };
    TagWritten.prototype.getTagType = function() {
        return this.tagType;
    };
    TagWritten.prototype.setTagType = function(tagType) {
        this.tagType = tagType;
    };
    TagWritten.prototype.getTagCode = function() {
        return this.tagCode;
    };
    TagWritten.prototype.setTagCode = function(tagCode) {
        this.tagCode = tagCode;
    };
    r.TagWritten = TagWritten;
    
    var TagFound = function(tagCode,tagType) {
        if(typeof tagCode !== "undefined") {
            this.tagCode = tagCode;
        } else {
            this.tagCode = new Uint8Array(4);
        }

        if(typeof tagType !== "undefined") {
            this.tagType = tagType;
        } else {
            this.tagType = 0x00;
        }
    };
    TagFound.prototype = AbsProto(ResponseCodes.TagFound);
    TagFound.isTypeOf = typeChecker(ResponseCodes.TagFound);
    TagFound.prototype.getPayload = function() {
        var payload = new Uint8Array(this.tagCode.length+1);
        payload[0] = this.tagType;
        if(this.tagCode.length > 0) {
            payload.set(this.tagCode,1);
        }

        return payload;
    };
    TagFound.prototype.parsePayload = function(payload) {
        if(payload.length < 1) {
            throw new Error("Invalid Payload: tag written response must be longer than one byte");
        } else {
            this.tagType = payload[0];
            if(payload.length > 1) {
                this.tagCode = payload.slice(1);
            } else {
                this.tagCode = new Uint8Array(0);
            }
        }
    };
    TagFound.prototype.getTagType = function() {
        return this.tagType;
    };
    TagFound.prototype.setTagType = function(tagType) {
        this.tagType = tagType;
    };
    TagFound.prototype.getTagCode = function() {
        return this.tagCode;
    };
    TagFound.prototype.setTagCode = function(tagCode) {
        this.tagCode = tagCode;
    };
    r.TagFound = TagFound;
    
    var ScanTimeout = function() {

    };
    ScanTimeout.prototype = AbsProto(ResponseCodes.ScanTimeout);
    ScanTimeout.isTypeOf = typeChecker(ResponseCodes.ScanTimeout);
    r.ScanTimeout = ScanTimeout;
    
    var NdefFound = function(tagCode,tagType,message) {
        if(typeof tagCode !== "undefined") {
            this.tagCode = tagCode;
        } else {
            this.tagCode = new Uint8Array(4);
        }

        if(typeof tagType !== "undefined") {
            this.tagType = tagType;
        } else {
            this.tagType = 0x00;
        }
        
        if(typeof message !== "undefined") {
            this.message = message;
        } else {
            this.message = new Uint8Array(0);
        }
    };
    NdefFound.prototype = AbsProto(ResponseCodes.NdefFound);
    NdefFound.isTypeOf = typeChecker(ResponseCodes.NdefFound);
    NdefFound.prototype.getPayload = function() {
        var payload = new Uint8Array(this.tagCode.length+2+this.message.length);
        payload[0] = this.tagType;
        payload[1] = this.tagCode.length;
        if(this.tagCode.length > 0) {
            payload.set(this.tagCode,2);
        }

        if(this.message.length > 0) {
            payload.set(this.message,2+this.tagCode.length);
        }

        return payload;
    };
    NdefFound.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Invalid Payload: ndef found response must be longer than one byte");
        } else {
            this.tagType = payload[0];
            tagCodeLength = payload[1];
            this.tagCode = payload.slice(2,tagCodeLength+2);
            if(payload.length > tagCodeLength+2) {
                this.message = payload.slice(tagCodeLength+2);
            } else {
                this.message = new Uint8Array(0);
            }
        }
    };
    NdefFound.prototype.getTagType = function() {
        return this.tagType;
    };
    NdefFound.prototype.setTagType = function(tagType) {
        this.tagType = tagType;
    };
    NdefFound.prototype.getTagCode = function() {
        return this.tagCode;
    };
    NdefFound.prototype.setTagCode = function(tagCode) {
        this.tagCode = tagCode;
    };
    NdefFound.prototype.getMessage = function() {
        return this.message;
    };
    NdefFound.prototype.setMessage = function(message) {
        this.message = message;
    };
    r.NdefFound = NdefFound;

    var TagLocked = function(tagCode,tagType) {
        if(typeof tagCode !== "undefined" &&
                tagCode !== null) {
            this.uid = tagCode;
        } else {
            this.uid = new Uint8Array(0);
        }

        if(typeof tagType !== "undefined" &&
                tagType !== null) {
            this.tagType = tagType;
        } else {
            this.tagType = 0x00;
        }
    };
    TagLocked.prototype = AbsProto(ResponseCodes.TagLocked);
    TagLocked.isTypeOf = typeChecker(ResponseCodes.TagLocked);
    TagLocked.prototype.getPayload = function() {
        var payload = new Uint8Array(1+1+this.uid.length);
        payload[0] = this.tagType;
        payload[1] = this.uid.length;
        if(this.uid.length > 0) {
            payload.set(this.uid,2);
        }

        return payload;
    };
    TagLocked.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Tag locked responses must be at least 2 bytes");
        } else {
            var uidLength = payload[1];
            if(uidLength > 0) {
                if((uidLength+2) < payload.length) {
                    throw new Error("Tag locked response too short to contain tag code of specified length");
                } else {
                    this.uid = payload.subarray(2,2+uidLength);
                }
            }
            this.tagType = payload[0];
        }
    };
    TagLocked.prototype.setTagType = function(tagType) {
        this.tagType = tagType;
    };
    TagLocked.prototype.getTagType = function() {
        return this.tagType;
    };
    TagLocked.prototype.setTagCode = function(uid) {
        this.uid = uid;
    };
    TagLocked.prototype.getTagCode = function() {
        return this.uid;
    };
    r.TagLocked = TagLocked;
    
    r.LibraryVersion = function() {
        if(arguments.length < 2) {
            this.majorVersion = 0;
            this.minorVersion = 0;
        } else {
            this.majorVersion = arguments[0];
            this.minorVersion = arguments[1];
        }
    };
    r.LibraryVersion.prototype = AbsProto(ResponseCodes.LibraryVersion);
    r.LibraryVersion.isTypeOf = typeChecker(ResponseCodes.LibraryVersion);
    r.LibraryVersion.prototype.getPayload = function() {
        return new Uint8Array([this.majorVersion,this.minorVersion]);
    };
    r.LibraryVersion.prototype.parsePayload = function(payload) {
        if(payload.length < 2) {
            throw new Error("Firmware version responses must be at least 2 bytes");
        }
        else {
            this.majorVersion = payload[0];
            this.minorVersion = payload[1];
        }
    };
    r.LibraryVersion.prototype.getMajorVersion = function() {
        return this.majorVersion;
    };
    r.LibraryVersion.prototype.getMinorVersion = function() {
        return this.minorVersion;
    };
    r.LibraryVersion.prototype.setMajorVersion = function(ver) {
        this.majorVersion = ver;
    };
    r.LibraryVersion.prototype.setMinorVersion = function(ver) {
        this.minorVersion = ver;
    };

    r.ApplicationError = function() {
        if(arguments.length < 3) {
            this.errorCode = 0;
            this.internalErrorCode = 0;
            this.readerStatus = 0;
            this.message = "";
        } else {
            this.errorCode = arguments[0];
            this.internalErrorCode = arguments[1];
            this.readerStatus = arguments[2];
            if(arguments.length > 3) {
                this.message = arguments[3];
            } else {
                this.message = "";
            }
        }
    };
    r.ApplicationError.isTypeOf = typeChecker(ResponseCodes.ApplicationError);
    r.ApplicationError.prototype = AbsProto(ResponseCodes.ApplicationError);
    r.ApplicationError.prototype.getPayload = function() {
        //convert string to byte array
        var utf8 = unescape(encodeURIComponent(this.message));
        var arr = [];
        for (var i = 0; i < utf8.length; i++) {
            arr.push(utf8.charCodeAt(i));
        }

        var payload = new Uint8Array(3+arr.length);
        payload[0] = this.errorCode;
        payload[1] = this.internalErrorCode;
        payload[2] = this.readerStatus;
        payload.set(arr,3);
        return payload;
    };

    r.ApplicationError.prototype.parsePayload = function(payload) {
        if(payload.length < 3) {
            throw new Error("System error payload must be at least 3 bytes");
        } else {
            this.errorCode = payload[0];
            this.internalErrorCode = payload[1];
            this.readerStatus = payload[2];

            if(payload.length > 3) {
                this.message = String.fromCharCode.apply(null, payload.slice(3));
            } else {
                this.message = "";
            }
        }
    };
    r.ApplicationError.prototype.getErrorCode = function() {
        return this.errorCode;
    };
    r.ApplicationError.prototype.getInternalErrorCode = function() {
        return this.internalErrorCode;
    };
    r.ApplicationError.prototype.getReaderStatusCode = function() {
        return this.readerStatus;
    };
    r.ApplicationError.prototype.getErrorMessage = function() {
        return this.message;
    };
    r.ApplicationError.prototype.setErrorCode = function(errorCode) {
        this.errorCode = errorCode;
    };
    r.ApplicationError.prototype.setInternalErrorCode = function(errorCode) {
        this.internalErrorCode = errorCode;
    };
    r.ApplicationError.prototype.setReaderStatusCode = function(errorCode) {
        this.readerStatus = errorCode;
    };
    r.ApplicationError.prototype.setErrorMessage = function(msg) {
        this.message = msg;
    };
     

    var e = {
        /**
         * A parameter was specific that is not acceptable
         */
        INVALID_PARAMETER: 0x01,
        /**
         * Reserved for future use
         */
        RFU: 0x02,
        /**
         * A fatal error occurred during polling
         */
        POLLING_ERROR: 0x03,
        /**
         * A sufficient number of parameters was not specified
         */
        TOO_FEW_PARAMETERS: 0x04,
        /**
         * Attempting to write an NDEF message that is too large for the tag presented
         */
        NDEF_MESSAGE_TOO_LARGE: 0x05,
        /**
         * An error occurred creating the NDEF content for writing to the tag
         */
        ERROR_CREATING_NDEF_CONTENT: 0x06,
        /**
         * An error occurred while writing NDEF content to the tag
         */
        ERROR_WRITING_NDEF_CONTENT: 0x07,
        /**
         * An error occured locking the tag. It may be locked or partially locked to
         * an unrecoverable state.
         */
        ERROR_LOCKING_TAG: 0x08
    };


    var checkCommandValidity = function (cmd) {
        if(typeof cmd !== "object" || cmd === null) {
            throw new Error("Command passed to resolver must be an object implementing: "+cmdMethods.join(", "));
        } else if(!implementsMethods(cmd,cmdMethods)) {
            throw new Error("Error, command passed to resolver must also implement: "+
                    getMissingMethods(cmd,cmdMethods).join(", "));
        } else if(!arrEquals(cmd.getCommandFamily(),commandFamily)){
            return false;
        }
        return true;
    };

    var resolver = function() {
        
    };

    resolver.prototype.checkFamily = function(cmd) {
        return checkCommandValidity(cmd);
    };

    resolver.prototype.validate = function(cmd) {
        if(checkCommandValidity(cmd)) {
            return true;
        } else {
            throw new Error("Resolver doesn't support command's family");
        }
    };

    resolver.prototype.resolveCommand = function(cmd) {
        var parsed = null;
        if(this.validate(cmd)) {
            switch(cmd.getCommandCode()) {
                case CommandCodes.WriteNdefUri:
                    parsed = new c.WriteNdefUri();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.WriteNdefText:
                    parsed = new c.WriteNdefText();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.WriteNdefCustom:
                    parsed = new c.WriteNdefCustom();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.StreamTags:
                    parsed = new c.StreamTags();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.StreamNdef:
                    parsed = new c.StreamNdef();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.Stop:
                    parsed = new c.Stop();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.ScanTag:
                    parsed = new c.ScanTag();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.LockTag:
                    parsed = new c.LockTag();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.ScanNdef:
                    parsed = new c.ScanNdef();
                    parsed.parsePayload(cmd.getPayload());
                    break;
                case CommandCodes.GetLibraryVersion:
                    parsed = new c.GetLibraryVersion();
                    parsed.parsePayload(cmd.getPayload());
                    break;
            }
        }
        return parsed;
    };

    resolver.prototype.resolveResponse = function(response) {
        var parsed = null;
        if(this.validate(response)) {
            var constructor = null;
            
            switch(response.getCommandCode()) {
                case ResponseCodes.NdefFound:
                    constructor = r.NdefFound;
                    break;
                case ResponseCodes.TagWritten:
                    constructor = r.TagWritten;
                    break;
                case ResponseCodes.TagFound:
                    constructor = r.TagFound;
                    break;
                case ResponseCodes.ScanTimeout:
                    constructor = r.ScanTimeout;
                    break;
                case ResponseCodes.TagLocked:
                    constructor = r.TagLocked;
                    break;
                case ResponseCodes.LibraryVersion:
                    constructor = r.LibraryVersion;
                    break;
                case ResponseCodes.ApplicationError:
                    constructor = r.ApplicationError;
                    break;
            }
            
            if(constructor !== null) {
                parsed = new constructor();
                parsed.parsePayload(response.getPayload());
            }
        }

        return parsed;
    };

    return {
        Commands: c,
        Responses: r,
        ErrorCodes: e,
        Resolver: resolver,
        FamilyCode: commandFamily,
        PollingModes: PollingModes
    };
}));
