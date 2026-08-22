/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $String = $util.global.String, $Boolean = $util.global.Boolean, $Number = $util.global.Number, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const auth = $root.auth = (() => {

    /**
     * Namespace auth.
     * @exports auth
     * @namespace
     */
    const auth = {};

    auth.AuthService = (function() {

        /**
         * Constructs a new AuthService service.
         * @memberof auth
         * @classdesc Represents an AuthService
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        const AuthService = function(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        };

        $Object.defineProperty(AuthService.prototype = $Object.create($protobuf.rpc.Service.prototype), "constructor", { value: AuthService, writable: true, enumerable: false, configurable: true });

        /**
         * Creates new AuthService service using the specified rpc implementation.
         * @function create
         * @memberof auth.AuthService
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {AuthService} RPC service. Useful where requests and/or responses are streamed.
         */
        AuthService.create = function(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link auth.AuthService#validateToken}.
         * @memberof auth.AuthService
         * @typedef ValidateTokenCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {auth.ValidateResponse} [response] ValidateResponse
         */

        /**
         * Calls ValidateToken.
         * @memberof auth.AuthService
         * @typedef ValidateToken
         * @type {{
         *   (request: auth.IValidateRequest, callback: auth.AuthService.ValidateTokenCallback): void;
         *   (request: auth.IValidateRequest): Promise<auth.ValidateResponse>;
         *   readonly name: "ValidateToken";
         *   readonly path: "/auth.AuthService/ValidateToken";
         *   readonly requestType: "ValidateRequest";
         *   readonly responseType: "ValidateResponse";
         *   readonly requestStream: undefined;
         *   readonly responseStream: undefined;
         * }}
         */

        /**
         * Calls ValidateToken.
         * @name auth.AuthService#validateToken
         * @type {auth.AuthService.ValidateToken}
         */
        $Object.defineProperties(AuthService.prototype.validateToken = function(request, callback) {
            return $protobuf.rpc.Service.prototype.rpcCall.call(this, AuthService.prototype.validateToken, $root.auth.ValidateRequest, $root.auth.ValidateResponse, request, callback);
        }, {
            name: { value: "ValidateToken" },
            path: { value: "/auth.AuthService/ValidateToken" },
            requestType: { value: "ValidateRequest" },
            responseType: { value: "ValidateResponse" },
            requestStream: { value: $undefined },
            responseStream: { value: $undefined }
        });

        return AuthService;
    })();

    auth.ValidateRequest = (function() {

        /**
         * Properties of a ValidateRequest.
         * @typedef {Object} auth.ValidateRequest.$Properties
         * @property {string|null} [token] ValidateRequest token
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ValidateRequest.
         * @memberof auth
         * @interface IValidateRequest
         * @augments auth.ValidateRequest.$Properties
         * @deprecated Use auth.ValidateRequest.$Properties instead.
         */

        /**
         * Shape of a ValidateRequest.
         * @typedef {auth.ValidateRequest.$Properties} auth.ValidateRequest.$Shape
         */

        /**
         * Constructs a new ValidateRequest.
         * @memberof auth
         * @classdesc Represents a ValidateRequest.
         * @constructor
         * @param {auth.ValidateRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ValidateRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ValidateRequest token.
         * @member {string} token
         * @memberof auth.ValidateRequest
         * @instance
         */
        ValidateRequest.prototype.token = "";

        /**
         * Creates a new ValidateRequest instance using the specified properties.
         * @function create
         * @memberof auth.ValidateRequest
         * @static
         * @param {auth.ValidateRequest.$Properties=} [properties] Properties to set
         * @returns {auth.ValidateRequest} ValidateRequest instance
         * @type {{
         *   (properties: auth.ValidateRequest.$Shape): auth.ValidateRequest & auth.ValidateRequest.$Shape;
         *   (properties?: auth.ValidateRequest.$Properties): auth.ValidateRequest;
         * }}
         */
        ValidateRequest.create = function(properties) {
            return new ValidateRequest(properties);
        };

        /**
         * Encodes the specified ValidateRequest message. Does not implicitly {@link auth.ValidateRequest.verify|verify} messages.
         * @function encode
         * @memberof auth.ValidateRequest
         * @static
         * @param {auth.ValidateRequest.$Properties} message ValidateRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValidateRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.token != null && $Object.hasOwnProperty.call(message, "token") && message.token !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.token);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ValidateRequest message, length delimited. Does not implicitly {@link auth.ValidateRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof auth.ValidateRequest
         * @static
         * @param {auth.ValidateRequest.$Properties} message ValidateRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValidateRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ValidateRequest message from the specified reader or buffer.
         * @function decode
         * @memberof auth.ValidateRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.ValidateRequest & auth.ValidateRequest.$Shape} ValidateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValidateRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.auth.ValidateRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.token = value;
                        else
                            delete message.token;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ValidateRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof auth.ValidateRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {auth.ValidateRequest & auth.ValidateRequest.$Shape} ValidateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValidateRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ValidateRequest message.
         * @function verify
         * @memberof auth.ValidateRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ValidateRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.token != null && $Object.hasOwnProperty.call(message, "token"))
                if (!$util.isString(message.token))
                    return "token: string expected";
            return null;
        };

        /**
         * Creates a ValidateRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.ValidateRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.ValidateRequest} ValidateRequest
         */
        ValidateRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.auth.ValidateRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".auth.ValidateRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.auth.ValidateRequest();
            if (object.token != null)
                if (typeof object.token !== "string" || object.token.length)
                    message.token = $String(object.token);
            return message;
        };

        /**
         * Creates a plain object from a ValidateRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.ValidateRequest
         * @static
         * @param {auth.ValidateRequest} message ValidateRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ValidateRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.token = "";
            if (message.token != null && $Object.hasOwnProperty.call(message, "token"))
                object.token = message.token;
            return object;
        };

        /**
         * Converts this ValidateRequest to JSON.
         * @function toJSON
         * @memberof auth.ValidateRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ValidateRequest.prototype.toJSON = function() {
            return ValidateRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ValidateRequest
         * @function getTypeUrl
         * @memberof auth.ValidateRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ValidateRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/auth.ValidateRequest";
        };

        return ValidateRequest;
    })();

    auth.ValidateResponse = (function() {

        /**
         * Properties of a ValidateResponse.
         * @typedef {Object} auth.ValidateResponse.$Properties
         * @property {boolean|null} [valid] ValidateResponse valid
         * @property {string|null} [userUuid] ValidateResponse userUuid
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ValidateResponse.
         * @memberof auth
         * @interface IValidateResponse
         * @augments auth.ValidateResponse.$Properties
         * @deprecated Use auth.ValidateResponse.$Properties instead.
         */

        /**
         * Shape of a ValidateResponse.
         * @typedef {auth.ValidateResponse.$Properties} auth.ValidateResponse.$Shape
         */

        /**
         * Constructs a new ValidateResponse.
         * @memberof auth
         * @classdesc Represents a ValidateResponse.
         * @constructor
         * @param {auth.ValidateResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ValidateResponse = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ValidateResponse valid.
         * @member {boolean} valid
         * @memberof auth.ValidateResponse
         * @instance
         */
        ValidateResponse.prototype.valid = false;

        /**
         * ValidateResponse userUuid.
         * @member {string} userUuid
         * @memberof auth.ValidateResponse
         * @instance
         */
        ValidateResponse.prototype.userUuid = "";

        /**
         * Creates a new ValidateResponse instance using the specified properties.
         * @function create
         * @memberof auth.ValidateResponse
         * @static
         * @param {auth.ValidateResponse.$Properties=} [properties] Properties to set
         * @returns {auth.ValidateResponse} ValidateResponse instance
         * @type {{
         *   (properties: auth.ValidateResponse.$Shape): auth.ValidateResponse & auth.ValidateResponse.$Shape;
         *   (properties?: auth.ValidateResponse.$Properties): auth.ValidateResponse;
         * }}
         */
        ValidateResponse.create = function(properties) {
            return new ValidateResponse(properties);
        };

        /**
         * Encodes the specified ValidateResponse message. Does not implicitly {@link auth.ValidateResponse.verify|verify} messages.
         * @function encode
         * @memberof auth.ValidateResponse
         * @static
         * @param {auth.ValidateResponse.$Properties} message ValidateResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValidateResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.valid != null && $Object.hasOwnProperty.call(message, "valid") && message.valid !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.valid);
            if (message.userUuid != null && $Object.hasOwnProperty.call(message, "userUuid") && message.userUuid !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.userUuid);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ValidateResponse message, length delimited. Does not implicitly {@link auth.ValidateResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof auth.ValidateResponse
         * @static
         * @param {auth.ValidateResponse.$Properties} message ValidateResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ValidateResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ValidateResponse message from the specified reader or buffer.
         * @function decode
         * @memberof auth.ValidateResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.ValidateResponse & auth.ValidateResponse.$Shape} ValidateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValidateResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.auth.ValidateResponse(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.valid = value;
                        else
                            delete message.valid;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.userUuid = value;
                        else
                            delete message.userUuid;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ValidateResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof auth.ValidateResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {auth.ValidateResponse & auth.ValidateResponse.$Shape} ValidateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ValidateResponse.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ValidateResponse message.
         * @function verify
         * @memberof auth.ValidateResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ValidateResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.valid != null && $Object.hasOwnProperty.call(message, "valid"))
                if (typeof message.valid !== "boolean")
                    return "valid: boolean expected";
            if (message.userUuid != null && $Object.hasOwnProperty.call(message, "userUuid"))
                if (!$util.isString(message.userUuid))
                    return "userUuid: string expected";
            return null;
        };

        /**
         * Creates a ValidateResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.ValidateResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.ValidateResponse} ValidateResponse
         */
        ValidateResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.auth.ValidateResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".auth.ValidateResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.auth.ValidateResponse();
            if (object.valid != null)
                if (object.valid)
                    message.valid = $Boolean(object.valid);
            if (object.userUuid != null)
                if (typeof object.userUuid !== "string" || object.userUuid.length)
                    message.userUuid = $String(object.userUuid);
            return message;
        };

        /**
         * Creates a plain object from a ValidateResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.ValidateResponse
         * @static
         * @param {auth.ValidateResponse} message ValidateResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ValidateResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.valid = false;
                object.userUuid = "";
            }
            if (message.valid != null && $Object.hasOwnProperty.call(message, "valid"))
                object.valid = message.valid;
            if (message.userUuid != null && $Object.hasOwnProperty.call(message, "userUuid"))
                object.userUuid = message.userUuid;
            return object;
        };

        /**
         * Converts this ValidateResponse to JSON.
         * @function toJSON
         * @memberof auth.ValidateResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ValidateResponse.prototype.toJSON = function() {
            return ValidateResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ValidateResponse
         * @function getTypeUrl
         * @memberof auth.ValidateResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ValidateResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/auth.ValidateResponse";
        };

        return ValidateResponse;
    })();

    return auth;
})();

export const messenger = $root.messenger = (() => {

    /**
     * Namespace messenger.
     * @exports messenger
     * @namespace
     */
    const messenger = {};

    messenger.MessengerService = (function() {

        /**
         * Constructs a new MessengerService service.
         * @memberof messenger
         * @classdesc Represents a MessengerService
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        const MessengerService = function(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        };

        $Object.defineProperty(MessengerService.prototype = $Object.create($protobuf.rpc.Service.prototype), "constructor", { value: MessengerService, writable: true, enumerable: false, configurable: true });

        /**
         * Creates new MessengerService service using the specified rpc implementation.
         * @function create
         * @memberof messenger.MessengerService
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {MessengerService} RPC service. Useful where requests and/or responses are streamed.
         */
        MessengerService.create = function(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link messenger.MessengerService#messageStream}.
         * @memberof messenger.MessengerService
         * @typedef MessageStreamCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {messenger.MessageEvent} [response] MessageEvent
         */

        /**
         * Calls MessageStream.
         * @memberof messenger.MessengerService
         * @typedef MessageStream
         * @type {{
         *   (request: messenger.ISendMessageRequest, callback: messenger.MessengerService.MessageStreamCallback): void;
         *   (request: messenger.ISendMessageRequest): Promise<messenger.MessageEvent>;
         *   readonly name: "MessageStream";
         *   readonly path: "/messenger.MessengerService/MessageStream";
         *   readonly requestType: "SendMessageRequest";
         *   readonly responseType: "MessageEvent";
         *   readonly requestStream: true;
         *   readonly responseStream: true;
         * }}
         */

        /**
         * Calls MessageStream.
         * @name messenger.MessengerService#messageStream
         * @type {messenger.MessengerService.MessageStream}
         */
        $Object.defineProperties(MessengerService.prototype.messageStream = function(request, callback) {
            return $protobuf.rpc.Service.prototype.rpcCall.call(this, MessengerService.prototype.messageStream, $root.messenger.SendMessageRequest, $root.messenger.MessageEvent, request, callback);
        }, {
            name: { value: "MessageStream" },
            path: { value: "/messenger.MessengerService/MessageStream" },
            requestType: { value: "SendMessageRequest" },
            responseType: { value: "MessageEvent" },
            requestStream: { value: true },
            responseStream: { value: true }
        });

        return MessengerService;
    })();

    messenger.Message = (function() {

        /**
         * Properties of a Message.
         * @typedef {Object} messenger.Message.$Properties
         * @property {number|Long|null} [id] Message id
         * @property {number|Long|null} [senderId] Message senderId
         * @property {number|Long|null} [recipientId] Message recipientId
         * @property {string|null} [text] Message text
         * @property {google.protobuf.Timestamp.$Properties|null} [createdAt] Message createdAt
         * @property {number|Long|null} [respondMessageId] Message respondMessageId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Message.
         * @memberof messenger
         * @interface IMessage
         * @augments messenger.Message.$Properties
         * @deprecated Use messenger.Message.$Properties instead.
         */

        /**
         * Shape of a Message.
         * @typedef {messenger.Message.$Properties} messenger.Message.$Shape
         */

        /**
         * Constructs a new Message.
         * @memberof messenger
         * @classdesc Represents a Message.
         * @constructor
         * @param {messenger.Message.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Message = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Message id.
         * @member {number|Long} id
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Message senderId.
         * @member {number|Long} senderId
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.senderId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Message recipientId.
         * @member {number|Long} recipientId
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.recipientId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Message text.
         * @member {string} text
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.text = "";

        /**
         * Message createdAt.
         * @member {google.protobuf.Timestamp.$Properties|null|undefined} createdAt
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.createdAt = null;

        /**
         * Message respondMessageId.
         * @member {number|Long|null|undefined} respondMessageId
         * @memberof messenger.Message
         * @instance
         */
        Message.prototype.respondMessageId = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(Message.prototype, "_respondMessageId", {
            get: $util.oneOfGetter($oneOfFields = ["respondMessageId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new Message instance using the specified properties.
         * @function create
         * @memberof messenger.Message
         * @static
         * @param {messenger.Message.$Properties=} [properties] Properties to set
         * @returns {messenger.Message} Message instance
         * @type {{
         *   (properties: messenger.Message.$Shape): messenger.Message & messenger.Message.$Shape;
         *   (properties?: messenger.Message.$Properties): messenger.Message;
         * }}
         */
        Message.create = function(properties) {
            return new Message(properties);
        };

        /**
         * Encodes the specified Message message. Does not implicitly {@link messenger.Message.verify|verify} messages.
         * @function encode
         * @memberof messenger.Message
         * @static
         * @param {messenger.Message.$Properties} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.id != null && $Object.hasOwnProperty.call(message, "id") && (typeof message.id === "object" ? message.id.low || message.id.high : message.id !== 0))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            if (message.senderId != null && $Object.hasOwnProperty.call(message, "senderId") && (typeof message.senderId === "object" ? message.senderId.low || message.senderId.high : message.senderId !== 0))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.senderId);
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId") && (typeof message.recipientId === "object" ? message.recipientId.low || message.recipientId.high : message.recipientId !== 0))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.recipientId);
            if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.text);
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                $root.google.protobuf.Timestamp.encode(message.createdAt, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.respondMessageId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link messenger.Message.verify|verify} messages.
         * @function encodeDelimited
         * @memberof messenger.Message
         * @static
         * @param {messenger.Message.$Properties} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof messenger.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {messenger.Message & messenger.Message.$Shape} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.messenger.Message(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.id = value;
                        else
                            delete message.id;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.senderId = value;
                        else
                            delete message.senderId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.recipientId = value;
                        else
                            delete message.recipientId;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.text = value;
                        else
                            delete message.text;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.createdAt = $root.google.protobuf.Timestamp.decode(reader, reader.uint32(), $undefined, _depth + 1, message.createdAt);
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        message.respondMessageId = reader.int64();
                        message._respondMessageId = "respondMessageId";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof messenger.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {messenger.Message & messenger.Message.$Shape} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Message message.
         * @function verify
         * @memberof messenger.Message
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Message.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                    return "id: integer|Long expected";
            if (message.senderId != null && $Object.hasOwnProperty.call(message, "senderId"))
                if (!$util.isInteger(message.senderId) && !(message.senderId && $util.isInteger(message.senderId.low) && $util.isInteger(message.senderId.high)))
                    return "senderId: integer|Long expected";
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId"))
                if (!$util.isInteger(message.recipientId) && !(message.recipientId && $util.isInteger(message.recipientId.low) && $util.isInteger(message.recipientId.high)))
                    return "recipientId: integer|Long expected";
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt")) {
                let error = $root.google.protobuf.Timestamp.verify(message.createdAt, _depth + 1);
                if (error)
                    return "createdAt." + error;
            }
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId")) {
                properties._respondMessageId = 1;
                if (!$util.isInteger(message.respondMessageId) && !(message.respondMessageId && $util.isInteger(message.respondMessageId.low) && $util.isInteger(message.respondMessageId.high)))
                    return "respondMessageId: integer|Long expected";
            }
            return null;
        };

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof messenger.Message
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {messenger.Message} Message
         */
        Message.fromObject = function (object, _depth) {
            if (object instanceof $root.messenger.Message)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".messenger.Message: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.messenger.Message();
            if (object.id != null)
                if (typeof object.id === "object" ? object.id.low || object.id.high : $Number(object.id) !== 0)
                    if ($util.Long)
                        message.id = $util.Long.fromValue(object.id, false);
                    else if (typeof object.id === "string")
                        message.id = $parseInt(object.id, 10);
                    else if (typeof object.id === "number")
                        message.id = object.id;
                    else if (typeof object.id === "object")
                        message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.senderId != null)
                if (typeof object.senderId === "object" ? object.senderId.low || object.senderId.high : $Number(object.senderId) !== 0)
                    if ($util.Long)
                        message.senderId = $util.Long.fromValue(object.senderId, false);
                    else if (typeof object.senderId === "string")
                        message.senderId = $parseInt(object.senderId, 10);
                    else if (typeof object.senderId === "number")
                        message.senderId = object.senderId;
                    else if (typeof object.senderId === "object")
                        message.senderId = new $util.LongBits(object.senderId.low >>> 0, object.senderId.high >>> 0).toNumber();
            if (object.recipientId != null)
                if (typeof object.recipientId === "object" ? object.recipientId.low || object.recipientId.high : $Number(object.recipientId) !== 0)
                    if ($util.Long)
                        message.recipientId = $util.Long.fromValue(object.recipientId, false);
                    else if (typeof object.recipientId === "string")
                        message.recipientId = $parseInt(object.recipientId, 10);
                    else if (typeof object.recipientId === "number")
                        message.recipientId = object.recipientId;
                    else if (typeof object.recipientId === "object")
                        message.recipientId = new $util.LongBits(object.recipientId.low >>> 0, object.recipientId.high >>> 0).toNumber();
            if (object.text != null)
                if (typeof object.text !== "string" || object.text.length)
                    message.text = $String(object.text);
            if (object.createdAt != null) {
                if (!$util.isObject(object.createdAt))
                    throw $TypeError(".messenger.Message.createdAt: object expected");
                message.createdAt = $root.google.protobuf.Timestamp.fromObject(object.createdAt, _depth + 1);
            }
            if (object.respondMessageId != null)
                if ($util.Long)
                    message.respondMessageId = $util.Long.fromValue(object.respondMessageId, false);
                else if (typeof object.respondMessageId === "string")
                    message.respondMessageId = $parseInt(object.respondMessageId, 10);
                else if (typeof object.respondMessageId === "number")
                    message.respondMessageId = object.respondMessageId;
                else if (typeof object.respondMessageId === "object")
                    message.respondMessageId = new $util.LongBits(object.respondMessageId.low >>> 0, object.respondMessageId.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof messenger.Message
         * @static
         * @param {messenger.Message} message Message
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.id = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.id = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.senderId = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.senderId = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.recipientId = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.recipientId = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                object.text = "";
                object.createdAt = null;
            }
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.id = typeof message.id === "number" ? $BigInt(message.id) : $util.Long.fromBits(message.id.low >>> 0, message.id.high >>> 0, false).toBigInt();
                else if (typeof message.id === "number")
                    object.id = options.longs === $String ? $String(message.id) : message.id;
                else
                    object.id = options.longs === $String ? $util.Long.prototype.toString.call(message.id) : options.longs === $Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.senderId != null && $Object.hasOwnProperty.call(message, "senderId"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.senderId = typeof message.senderId === "number" ? $BigInt(message.senderId) : $util.Long.fromBits(message.senderId.low >>> 0, message.senderId.high >>> 0, false).toBigInt();
                else if (typeof message.senderId === "number")
                    object.senderId = options.longs === $String ? $String(message.senderId) : message.senderId;
                else
                    object.senderId = options.longs === $String ? $util.Long.prototype.toString.call(message.senderId) : options.longs === $Number ? new $util.LongBits(message.senderId.low >>> 0, message.senderId.high >>> 0).toNumber() : message.senderId;
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.recipientId = typeof message.recipientId === "number" ? $BigInt(message.recipientId) : $util.Long.fromBits(message.recipientId.low >>> 0, message.recipientId.high >>> 0, false).toBigInt();
                else if (typeof message.recipientId === "number")
                    object.recipientId = options.longs === $String ? $String(message.recipientId) : message.recipientId;
                else
                    object.recipientId = options.longs === $String ? $util.Long.prototype.toString.call(message.recipientId) : options.longs === $Number ? new $util.LongBits(message.recipientId.low >>> 0, message.recipientId.high >>> 0).toNumber() : message.recipientId;
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                object.text = message.text;
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                object.createdAt = $root.google.protobuf.Timestamp.toObject(message.createdAt, options, _depth + 1);
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.respondMessageId = typeof message.respondMessageId === "number" ? $BigInt(message.respondMessageId) : $util.Long.fromBits(message.respondMessageId.low >>> 0, message.respondMessageId.high >>> 0, false).toBigInt();
                else if (typeof message.respondMessageId === "number")
                    object.respondMessageId = options.longs === $String ? $String(message.respondMessageId) : message.respondMessageId;
                else
                    object.respondMessageId = options.longs === $String ? $util.Long.prototype.toString.call(message.respondMessageId) : options.longs === $Number ? new $util.LongBits(message.respondMessageId.low >>> 0, message.respondMessageId.high >>> 0).toNumber() : message.respondMessageId;
            return object;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof messenger.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function() {
            return Message.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Message
         * @function getTypeUrl
         * @memberof messenger.Message
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Message.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/messenger.Message";
        };

        return Message;
    })();

    messenger.SendMessageRequest = (function() {

        /**
         * Properties of a SendMessageRequest.
         * @typedef {Object} messenger.SendMessageRequest.$Properties
         * @property {number|Long|null} [recipientId] SendMessageRequest recipientId
         * @property {string|null} [text] SendMessageRequest text
         * @property {number|Long|null} [respondMessageId] SendMessageRequest respondMessageId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SendMessageRequest.
         * @memberof messenger
         * @interface ISendMessageRequest
         * @augments messenger.SendMessageRequest.$Properties
         * @deprecated Use messenger.SendMessageRequest.$Properties instead.
         */

        /**
         * Shape of a SendMessageRequest.
         * @typedef {messenger.SendMessageRequest.$Properties} messenger.SendMessageRequest.$Shape
         */

        /**
         * Constructs a new SendMessageRequest.
         * @memberof messenger
         * @classdesc Represents a SendMessageRequest.
         * @constructor
         * @param {messenger.SendMessageRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SendMessageRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * SendMessageRequest recipientId.
         * @member {number|Long} recipientId
         * @memberof messenger.SendMessageRequest
         * @instance
         */
        SendMessageRequest.prototype.recipientId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * SendMessageRequest text.
         * @member {string} text
         * @memberof messenger.SendMessageRequest
         * @instance
         */
        SendMessageRequest.prototype.text = "";

        /**
         * SendMessageRequest respondMessageId.
         * @member {number|Long|null|undefined} respondMessageId
         * @memberof messenger.SendMessageRequest
         * @instance
         */
        SendMessageRequest.prototype.respondMessageId = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(SendMessageRequest.prototype, "_respondMessageId", {
            get: $util.oneOfGetter($oneOfFields = ["respondMessageId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new SendMessageRequest instance using the specified properties.
         * @function create
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {messenger.SendMessageRequest.$Properties=} [properties] Properties to set
         * @returns {messenger.SendMessageRequest} SendMessageRequest instance
         * @type {{
         *   (properties: messenger.SendMessageRequest.$Shape): messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape;
         *   (properties?: messenger.SendMessageRequest.$Properties): messenger.SendMessageRequest;
         * }}
         */
        SendMessageRequest.create = function(properties) {
            return new SendMessageRequest(properties);
        };

        /**
         * Encodes the specified SendMessageRequest message. Does not implicitly {@link messenger.SendMessageRequest.verify|verify} messages.
         * @function encode
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {messenger.SendMessageRequest.$Properties} message SendMessageRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendMessageRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId") && (typeof message.recipientId === "object" ? message.recipientId.low || message.recipientId.high : message.recipientId !== 0))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.recipientId);
            if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.respondMessageId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SendMessageRequest message, length delimited. Does not implicitly {@link messenger.SendMessageRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {messenger.SendMessageRequest.$Properties} message SendMessageRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SendMessageRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a SendMessageRequest message from the specified reader or buffer.
         * @function decode
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape} SendMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendMessageRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.messenger.SendMessageRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.recipientId = value;
                        else
                            delete message.recipientId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.text = value;
                        else
                            delete message.text;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        message.respondMessageId = reader.int64();
                        message._respondMessageId = "respondMessageId";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SendMessageRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape} SendMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SendMessageRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SendMessageRequest message.
         * @function verify
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SendMessageRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId"))
                if (!$util.isInteger(message.recipientId) && !(message.recipientId && $util.isInteger(message.recipientId.low) && $util.isInteger(message.recipientId.high)))
                    return "recipientId: integer|Long expected";
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId")) {
                properties._respondMessageId = 1;
                if (!$util.isInteger(message.respondMessageId) && !(message.respondMessageId && $util.isInteger(message.respondMessageId.low) && $util.isInteger(message.respondMessageId.high)))
                    return "respondMessageId: integer|Long expected";
            }
            return null;
        };

        /**
         * Creates a SendMessageRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {messenger.SendMessageRequest} SendMessageRequest
         */
        SendMessageRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.messenger.SendMessageRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".messenger.SendMessageRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.messenger.SendMessageRequest();
            if (object.recipientId != null)
                if (typeof object.recipientId === "object" ? object.recipientId.low || object.recipientId.high : $Number(object.recipientId) !== 0)
                    if ($util.Long)
                        message.recipientId = $util.Long.fromValue(object.recipientId, false);
                    else if (typeof object.recipientId === "string")
                        message.recipientId = $parseInt(object.recipientId, 10);
                    else if (typeof object.recipientId === "number")
                        message.recipientId = object.recipientId;
                    else if (typeof object.recipientId === "object")
                        message.recipientId = new $util.LongBits(object.recipientId.low >>> 0, object.recipientId.high >>> 0).toNumber();
            if (object.text != null)
                if (typeof object.text !== "string" || object.text.length)
                    message.text = $String(object.text);
            if (object.respondMessageId != null)
                if ($util.Long)
                    message.respondMessageId = $util.Long.fromValue(object.respondMessageId, false);
                else if (typeof object.respondMessageId === "string")
                    message.respondMessageId = $parseInt(object.respondMessageId, 10);
                else if (typeof object.respondMessageId === "number")
                    message.respondMessageId = object.respondMessageId;
                else if (typeof object.respondMessageId === "object")
                    message.respondMessageId = new $util.LongBits(object.respondMessageId.low >>> 0, object.respondMessageId.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a SendMessageRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {messenger.SendMessageRequest} message SendMessageRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SendMessageRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.recipientId = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.recipientId = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                object.text = "";
            }
            if (message.recipientId != null && $Object.hasOwnProperty.call(message, "recipientId"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.recipientId = typeof message.recipientId === "number" ? $BigInt(message.recipientId) : $util.Long.fromBits(message.recipientId.low >>> 0, message.recipientId.high >>> 0, false).toBigInt();
                else if (typeof message.recipientId === "number")
                    object.recipientId = options.longs === $String ? $String(message.recipientId) : message.recipientId;
                else
                    object.recipientId = options.longs === $String ? $util.Long.prototype.toString.call(message.recipientId) : options.longs === $Number ? new $util.LongBits(message.recipientId.low >>> 0, message.recipientId.high >>> 0).toNumber() : message.recipientId;
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                object.text = message.text;
            if (message.respondMessageId != null && $Object.hasOwnProperty.call(message, "respondMessageId"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.respondMessageId = typeof message.respondMessageId === "number" ? $BigInt(message.respondMessageId) : $util.Long.fromBits(message.respondMessageId.low >>> 0, message.respondMessageId.high >>> 0, false).toBigInt();
                else if (typeof message.respondMessageId === "number")
                    object.respondMessageId = options.longs === $String ? $String(message.respondMessageId) : message.respondMessageId;
                else
                    object.respondMessageId = options.longs === $String ? $util.Long.prototype.toString.call(message.respondMessageId) : options.longs === $Number ? new $util.LongBits(message.respondMessageId.low >>> 0, message.respondMessageId.high >>> 0).toNumber() : message.respondMessageId;
            return object;
        };

        /**
         * Converts this SendMessageRequest to JSON.
         * @function toJSON
         * @memberof messenger.SendMessageRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SendMessageRequest.prototype.toJSON = function() {
            return SendMessageRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SendMessageRequest
         * @function getTypeUrl
         * @memberof messenger.SendMessageRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SendMessageRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/messenger.SendMessageRequest";
        };

        return SendMessageRequest;
    })();

    messenger.MessageEvent = (function() {

        /**
         * Properties of a MessageEvent.
         * @typedef {Object} messenger.MessageEvent.$Properties
         * @property {messenger.Message.$Properties|null} [message] MessageEvent message
         * @property {number|Long|null} [deletedMessageId] MessageEvent deletedMessageId
         * @property {"message"|"deletedMessageId"} [event] MessageEvent event
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a MessageEvent.
         * @memberof messenger
         * @interface IMessageEvent
         * @augments messenger.MessageEvent.$Properties
         * @deprecated Use messenger.MessageEvent.$Properties instead.
         */

        /**
         * Narrowed shape of a MessageEvent.
         * @typedef {{
         *   message?: messenger.Message.$Shape|null;
         *   deletedMessageId?: number|Long|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ event?: undefined; message?: null; deletedMessageId?: null }|{ event?: "message"; message: messenger.Message.$Shape; deletedMessageId?: null }|{ event?: "deletedMessageId"; message?: null; deletedMessageId: number|Long })
         * )} messenger.MessageEvent.$Shape
         */

        /**
         * Constructs a new MessageEvent.
         * @memberof messenger
         * @classdesc Represents a MessageEvent.
         * @constructor
         * @param {messenger.MessageEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const MessageEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * MessageEvent message.
         * @member {messenger.Message.$Properties|null|undefined} message
         * @memberof messenger.MessageEvent
         * @instance
         */
        MessageEvent.prototype.message = null;

        /**
         * MessageEvent deletedMessageId.
         * @member {number|Long|null|undefined} deletedMessageId
         * @memberof messenger.MessageEvent
         * @instance
         */
        MessageEvent.prototype.deletedMessageId = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * MessageEvent event.
         * @member {"message"|"deletedMessageId"|undefined} event
         * @memberof messenger.MessageEvent
         * @instance
         */
        $Object.defineProperty(MessageEvent.prototype, "event", {
            get: $util.oneOfGetter($oneOfFields = ["message", "deletedMessageId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new MessageEvent instance using the specified properties.
         * @function create
         * @memberof messenger.MessageEvent
         * @static
         * @param {messenger.MessageEvent.$Properties=} [properties] Properties to set
         * @returns {messenger.MessageEvent} MessageEvent instance
         * @type {{
         *   (properties: messenger.MessageEvent.$Shape): messenger.MessageEvent & messenger.MessageEvent.$Shape;
         *   (properties?: messenger.MessageEvent.$Properties): messenger.MessageEvent;
         * }}
         */
        MessageEvent.create = function(properties) {
            return new MessageEvent(properties);
        };

        /**
         * Encodes the specified MessageEvent message. Does not implicitly {@link messenger.MessageEvent.verify|verify} messages.
         * @function encode
         * @memberof messenger.MessageEvent
         * @static
         * @param {messenger.MessageEvent.$Properties} message MessageEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessageEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                $root.messenger.Message.encode(message.message, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.deletedMessageId != null && $Object.hasOwnProperty.call(message, "deletedMessageId"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.deletedMessageId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified MessageEvent message, length delimited. Does not implicitly {@link messenger.MessageEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof messenger.MessageEvent
         * @static
         * @param {messenger.MessageEvent.$Properties} message MessageEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessageEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a MessageEvent message from the specified reader or buffer.
         * @function decode
         * @memberof messenger.MessageEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {messenger.MessageEvent & messenger.MessageEvent.$Shape} MessageEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessageEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.messenger.MessageEvent();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.message = $root.messenger.Message.decode(reader, reader.uint32(), $undefined, _depth + 1, message.message);
                        message.event = "message";
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        message.deletedMessageId = reader.int64();
                        message.event = "deletedMessageId";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a MessageEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof messenger.MessageEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {messenger.MessageEvent & messenger.MessageEvent.$Shape} MessageEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessageEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a MessageEvent message.
         * @function verify
         * @memberof messenger.MessageEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        MessageEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.message != null && $Object.hasOwnProperty.call(message, "message")) {
                properties.event = 1;
                {
                    let error = $root.messenger.Message.verify(message.message, _depth + 1);
                    if (error)
                        return "message." + error;
                }
            }
            if (message.deletedMessageId != null && $Object.hasOwnProperty.call(message, "deletedMessageId")) {
                if (properties.event === 1)
                    return "event: multiple values";
                properties.event = 1;
                if (!$util.isInteger(message.deletedMessageId) && !(message.deletedMessageId && $util.isInteger(message.deletedMessageId.low) && $util.isInteger(message.deletedMessageId.high)))
                    return "deletedMessageId: integer|Long expected";
            }
            return null;
        };

        /**
         * Creates a MessageEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof messenger.MessageEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {messenger.MessageEvent} MessageEvent
         */
        MessageEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.messenger.MessageEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".messenger.MessageEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.messenger.MessageEvent();
            if (object.message != null) {
                if (!$util.isObject(object.message))
                    throw $TypeError(".messenger.MessageEvent.message: object expected");
                message.message = $root.messenger.Message.fromObject(object.message, _depth + 1);
            }
            if (object.deletedMessageId != null)
                if ($util.Long)
                    message.deletedMessageId = $util.Long.fromValue(object.deletedMessageId, false);
                else if (typeof object.deletedMessageId === "string")
                    message.deletedMessageId = $parseInt(object.deletedMessageId, 10);
                else if (typeof object.deletedMessageId === "number")
                    message.deletedMessageId = object.deletedMessageId;
                else if (typeof object.deletedMessageId === "object")
                    message.deletedMessageId = new $util.LongBits(object.deletedMessageId.low >>> 0, object.deletedMessageId.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a MessageEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof messenger.MessageEvent
         * @static
         * @param {messenger.MessageEvent} message MessageEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        MessageEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.message != null && $Object.hasOwnProperty.call(message, "message")) {
                object.message = $root.messenger.Message.toObject(message.message, options, _depth + 1);
                if (options.oneofs)
                    object.event = "message";
            }
            if (message.deletedMessageId != null && $Object.hasOwnProperty.call(message, "deletedMessageId")) {
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.deletedMessageId = typeof message.deletedMessageId === "number" ? $BigInt(message.deletedMessageId) : $util.Long.fromBits(message.deletedMessageId.low >>> 0, message.deletedMessageId.high >>> 0, false).toBigInt();
                else if (typeof message.deletedMessageId === "number")
                    object.deletedMessageId = options.longs === $String ? $String(message.deletedMessageId) : message.deletedMessageId;
                else
                    object.deletedMessageId = options.longs === $String ? $util.Long.prototype.toString.call(message.deletedMessageId) : options.longs === $Number ? new $util.LongBits(message.deletedMessageId.low >>> 0, message.deletedMessageId.high >>> 0).toNumber() : message.deletedMessageId;
                if (options.oneofs)
                    object.event = "deletedMessageId";
            }
            return object;
        };

        /**
         * Converts this MessageEvent to JSON.
         * @function toJSON
         * @memberof messenger.MessageEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        MessageEvent.prototype.toJSON = function() {
            return MessageEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for MessageEvent
         * @function getTypeUrl
         * @memberof messenger.MessageEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        MessageEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/messenger.MessageEvent";
        };

        return MessageEvent;
    })();

    return messenger;
})();

export const google = $root.google = (() => {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    const google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        const protobuf = {};

        protobuf.Timestamp = (function() {

            /**
             * Properties of a Timestamp.
             * @typedef {Object} google.protobuf.Timestamp.$Properties
             * @property {number|Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */

            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @augments google.protobuf.Timestamp.$Properties
             * @deprecated Use google.protobuf.Timestamp.$Properties instead.
             */

            /**
             * Shape of a Timestamp.
             * @typedef {google.protobuf.Timestamp.$Properties} google.protobuf.Timestamp.$Shape
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @constructor
             * @param {google.protobuf.Timestamp.$Properties=} [properties] Properties to set
             * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
             */
            const Timestamp = function (properties) {
                if (properties)
                    for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            };

            /**
             * Timestamp seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp.$Properties=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             * @type {{
             *   (properties: google.protobuf.Timestamp.$Shape): google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape;
             *   (properties?: google.protobuf.Timestamp.$Properties): google.protobuf.Timestamp;
             * }}
             */
            Timestamp.create = function(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp.$Properties} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = function (message, writer, _depth) {
                if (!writer)
                    writer = $Writer.create();
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                if (message.seconds != null && $Object.hasOwnProperty.call(message, "seconds") && (typeof message.seconds === "object" ? message.seconds.low || message.seconds.high : message.seconds !== 0))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.seconds);
                if (message.nanos != null && $Object.hasOwnProperty.call(message, "nanos") && message.nanos !== 0)
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.nanos);
                if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                    for (let i = 0; i < message.$unknowns.length; ++i)
                        writer.raw(message.$unknowns[i]);
                return writer;
            };

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp.$Properties} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function(message, writer) {
                return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = function (reader, length, _end, _depth, _target) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $Reader.recursionLimit)
                    throw $Error("max depth exceeded");
                let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.google.protobuf.Timestamp(), value;
                while (reader.pos < end) {
                    let start = reader.pos;
                    let tag = reader.tag();
                    if (tag === _end) {
                        _end = $undefined;
                        break;
                    }
                    let wireType = tag & 7;
                    switch (tag >>>= 3) {
                    case 1: {
                            if (wireType !== 0)
                                break;
                            if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                                message.seconds = value;
                            else
                                delete message.seconds;
                            continue;
                        }
                    case 2: {
                            if (wireType !== 0)
                                break;
                            if (value = reader.int32())
                                message.nanos = value;
                            else
                                delete message.nanos;
                            continue;
                        }
                    }
                    reader.skipType(wireType, _depth, tag);
                    if (!reader.discardUnknown) {
                        $util.makeProp(message, "$unknowns", false);
                        (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                    }
                }
                if (_end !== $undefined)
                    throw $Error("missing end group");
                return message;
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = function (message, _depth) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    return "max depth exceeded";
                if (message.seconds != null && $Object.hasOwnProperty.call(message, "seconds"))
                    if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high)))
                        return "seconds: integer|Long expected";
                if (message.nanos != null && $Object.hasOwnProperty.call(message, "nanos"))
                    if (!$util.isInteger(message.nanos))
                        return "nanos: integer expected";
                return null;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = function (object, _depth) {
                if (object instanceof $root.google.protobuf.Timestamp)
                    return object;
                if (!$util.isObject(object))
                    throw $TypeError(".google.protobuf.Timestamp: object expected");
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let message = new $root.google.protobuf.Timestamp();
                if (object.seconds != null)
                    if (typeof object.seconds === "object" ? object.seconds.low || object.seconds.high : $Number(object.seconds) !== 0)
                        if ($util.Long)
                            message.seconds = $util.Long.fromValue(object.seconds, false);
                        else if (typeof object.seconds === "string")
                            message.seconds = $parseInt(object.seconds, 10);
                        else if (typeof object.seconds === "number")
                            message.seconds = object.seconds;
                        else if (typeof object.seconds === "object")
                            message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                if (object.nanos != null)
                    if ($Number(object.nanos) !== 0)
                        message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = function (message, options, _depth) {
                if (!options)
                    options = {};
                if (_depth === $undefined)
                    _depth = 0;
                if (_depth > $util.recursionLimit)
                    throw $Error("max depth exceeded");
                let object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        let long = new $util.Long(0, 0, false);
                        object.seconds = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                    } else
                        object.seconds = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                    object.nanos = 0;
                }
                if (message.seconds != null && $Object.hasOwnProperty.call(message, "seconds"))
                    if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                        object.seconds = typeof message.seconds === "number" ? $BigInt(message.seconds) : $util.Long.fromBits(message.seconds.low >>> 0, message.seconds.high >>> 0, false).toBigInt();
                    else if (typeof message.seconds === "number")
                        object.seconds = options.longs === $String ? $String(message.seconds) : message.seconds;
                    else
                        object.seconds = options.longs === $String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === $Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                if (message.nanos != null && $Object.hasOwnProperty.call(message, "nanos"))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function() {
                return Timestamp.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns {string} The type url
             */
            Timestamp.getTypeUrl = function(prefix) {
                if (prefix === $undefined)
                    prefix = "type.googleapis.com";
                return prefix + "/google.protobuf.Timestamp";
            };

            return Timestamp;
        })();

        return protobuf;
    })();

    return google;
})();

export {
  $root as default
};
