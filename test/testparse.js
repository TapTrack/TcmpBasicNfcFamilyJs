var Family = require("../src/basicnfc.js");
var Commands = Family.Commands;
var Responses = Family.Responses;
var Resolver = Family.Resolver;

describe("Test system family parsing",function() {
    
    it("Test commands' familiy codes",function() {
        for(var prop in Commands) {
            expect([].slice.call((new Commands[prop]()).getCommandFamily())).toEqual([0x00,0x01]);
        }
    });

    it("Test responses' familiy codes",function() {
        for(var prop in Responses) {
            expect([].slice.call((new Responses[prop]()).getCommandFamily())).toEqual([0x00,0x01]);
        }
    });
    
    var testCmd = function(constructor, code) {
        var cmd = new constructor();
        expect(cmd.getCommandCode()).toEqual(code);
    };

    it("Test Command codes", function() {
        testCmd(Commands.WriteNdefUri, 0x05);
        testCmd(Commands.WriteNdefText, 0x06);
        testCmd(Commands.WriteNdefCustom, 0x07);
        testCmd(Commands.StreamTags, 0x01);
        testCmd(Commands.StreamNdef, 0x03);
        testCmd(Commands.Stop, 0x00);
        testCmd(Commands.ScanTag, 0x02);
        testCmd(Commands.ScanNdef, 0x04);
        testCmd(Commands.GetLibraryVersion, 0xFF);
    });

    it("Test command payloads",function() {
        var cmd = new Commands.ScanNdef(0x02,0x01);
        expect([].slice.call(cmd.getPayload())).toEqual([0x02,0x01]);
        cmd.parsePayload([0x02,0x01]);
        expect(cmd.getTimeout()).toEqual(0x02);
        expect(cmd.getPollingMode()).toEqual(0x01);
        
        cmd = new Commands.ScanTag(0x02,0x01);
        expect([].slice.call(cmd.getPayload())).toEqual([0x02,0x01]);
        cmd.parsePayload([0x02,0x01]);
        expect(cmd.getTimeout()).toEqual(0x02);
        expect(cmd.getPollingMode()).toEqual(0x01);
        
        cmd = new Commands.StreamNdef(0x02,0x01);
        expect([].slice.call(cmd.getPayload())).toEqual([0x02,0x01]);
        cmd.parsePayload([0x02,0x01]);
        expect(cmd.getTimeout()).toEqual(0x02);
        expect(cmd.getPollingMode()).toEqual(0x01);
        
        cmd = new Commands.StreamTags(0x02,0x01);
        expect([].slice.call(cmd.getPayload())).toEqual([0x02,0x01]);
        cmd.parsePayload([0x02,0x01]);
        expect(cmd.getTimeout()).toEqual(0x02);
        expect(cmd.getPollingMode()).toEqual(0x01);
        
        cmd = new Commands.WriteNdefText(0x01,true,"TEST");
        expect([].slice.call(cmd.getPayload())).toEqual([0x01,0x01,0x54,0x45,0x53,0x54]);
        cmd.parsePayload([0x01,0x01,0x54,0x45,0x53,0x54]);
        expect(cmd.getTimeout()).toEqual(0x01);
        expect(cmd.getLockFlag()).toEqual(true);
        expect(cmd.getText()).toEqual("TEST");
        
        cmd = new Commands.WriteNdefUri(0x01,true,"TEST",0x05);
        expect([].slice.call(cmd.getPayload())).toEqual([0x01,0x01,0x05,0x54,0x45,0x53,0x54]);
        cmd.parsePayload([0x01,0x01,0x05,0x54,0x45,0x53,0x54]);
        expect(cmd.getTimeout()).toEqual(0x01);
        expect(cmd.getLockFlag()).toEqual(true);
        expect(cmd.getUri()).toEqual("TEST");
        expect(cmd.getUriCode()).toEqual(0x05);
        
        cmd = new Commands.WriteNdefCustom(0x01,true,[0x54,0x45,0x53,0x54]);
        expect([].slice.call(cmd.getPayload())).toEqual([0x01,0x01,0x54,0x45,0x53,0x54]);
        cmd.parsePayload([0x01,0x01,0x54,0x45,0x53,0x54]);
        expect(cmd.getTimeout()).toEqual(0x01);
        expect(cmd.getLockFlag()).toEqual(true);
        expect([].slice.call(cmd.getMessage())).toEqual([0x54,0x45,0x53,0x54]);

    });

    it("Test response command codes", function() {
        testCmd(Responses.LibraryVersion, 0x04);
        testCmd(Responses.TagWritten, 0x05);
        testCmd(Responses.TagFound, 0x01);
        testCmd(Responses.ScanTimeout, 0x03);
        testCmd(Responses.NdefFound, 0x02);
        testCmd(Responses.ApplicationError, 0x7F);
    });

    it("Test response payloads", function() {
        var cmd = new Responses.LibraryVersion(0x02,0x05);
        expect([].slice.call(cmd.getPayload())).toEqual([0x02,0x05]);
        cmd.parsePayload([0x02,0x05]);
        expect(cmd.getMajorVersion()).toEqual(0x02);
        expect(cmd.getMinorVersion()).toEqual(0x05);

        cmd = new Responses.ApplicationError(0x03,0x07,0x74,"Test");
        expect([].slice.call(cmd.getPayload())).toEqual([0x03,0x07,0x74,0x54,0x65,0x73,0x74]);
        cmd.parsePayload([0x55,0x21,0xF5,0x58]);
        expect(cmd.getErrorCode()).toEqual(0x55);
        expect(cmd.getInternalErrorCode()).toEqual(0x21);
        expect(cmd.getReaderStatusCode()).toEqual(0xF5);
        expect(cmd.getErrorMessage()).toEqual("X");

        cmd = new Responses.TagWritten([0x54,0x56,0x23,0x99],0x05);
        expect([].slice.call(cmd.getPayload())).toEqual([0x05,0x54,0x56,0x23,0x99]);
        cmd.parsePayload(new Uint8Array([0x05,0x54,0x56,0x23,0x99]));
        expect(cmd.getTagType()).toEqual(0x05);
        expect([].slice.call(cmd.getTagCode())).toEqual([0x54,0x56,0x23,0x99]);
        
        cmd = new Responses.TagFound([0x54,0x56,0x23,0x99],0x05);
        expect([].slice.call(cmd.getPayload())).toEqual([0x05,0x54,0x56,0x23,0x99]);
        cmd.parsePayload(new Uint8Array([0x05,0x54,0x56,0x23,0x99]));
        expect(cmd.getTagType()).toEqual(0x05);
        expect([].slice.call(cmd.getTagCode())).toEqual([0x54,0x56,0x23,0x99]);
        
        cmd = new Responses.NdefFound([0x54,0x56,0x23,0x99],0x05,[0x77,0x88,0x99,0x2A]);
        expect([].slice.call(cmd.getPayload()))
            .toEqual([0x05,0x04,0x54,0x56,0x23,0x99,0x77,0x88,0x99,0x2A]);
        cmd.parsePayload(new Uint8Array([0x05,0x04,0x54,0x56,0x23,0x99,0x77,0x88,0x99,0x2A]));
        expect(cmd.getTagType()).toEqual(0x05);
        expect([].slice.call(cmd.getTagCode())).toEqual([0x54,0x56,0x23,0x99]);
        expect([].slice.call(cmd.getMessage())).toEqual([0x77,0x88,0x99,0x2A]);
    });

    it("Test command resolver",function(){
        var resolver = new Resolver();
        var resolved = null;
        
        var basicCheck = function(res,name) {
            expect(res).not.toEqual(null,name);
            expect(typeof res).toBe("object",name);
        };

        for(var cKey in Commands) {
            basicCheck(resolver.resolveCommand(new Commands[cKey]()),cKey);
        }
        
        for(var rKey in Responses) {
            basicCheck(resolver.resolveResponse(new Responses[rKey]()),rKey);
        }
    });
});

describe("Test typeof",function() {
    var testType = function(constructor) {
        return function() {
            var testCmd = new constructor();
            expect(constructor.isTypeOf(testCmd)).toBe(true);
        };
    };

    for(var ckey in Commands) {
        it("Command "+ckey+" should pass its own isTypeOf",testType(Commands[ckey]));
    }
    
    for(var rkey in Responses) {
        it("Response "+rkey+" should pass its own isTypeOf",testType(Responses[rkey]));
    }
});
