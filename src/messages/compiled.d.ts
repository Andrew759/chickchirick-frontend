import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace auth. */
export namespace auth {

    /** Represents an AuthService */
    class AuthService extends $protobuf.rpc.Service {

        /**
         * Constructs a new AuthService service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new AuthService service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): AuthService;

        /** Calls ValidateToken. */
        validateToken: auth.AuthService.ValidateToken;
    }

    namespace AuthService {

        /**
         * Callback as used by {@link auth.AuthService#validateToken}.
         * @param error Error, if any
         * @param [response] ValidateResponse
         */
        type ValidateTokenCallback = (error: (Error|null), response?: auth.ValidateResponse) => void;

        /** Calls ValidateToken. */
        type ValidateToken = {
          (request: auth.IValidateRequest, callback: auth.AuthService.ValidateTokenCallback): void;
          (request: auth.IValidateRequest): Promise<auth.ValidateResponse>;
          readonly name: "ValidateToken";
          readonly path: "/auth.AuthService/ValidateToken";
          readonly requestType: "ValidateRequest";
          readonly responseType: "ValidateResponse";
          readonly requestStream: undefined;
          readonly responseStream: undefined;
        };
    }

    /**
     * Properties of a ValidateRequest.
     * @deprecated Use auth.ValidateRequest.$Properties instead.
     */
    interface IValidateRequest extends auth.ValidateRequest.$Properties {
    }

    /** Represents a ValidateRequest. */
    class ValidateRequest {

        /**
         * Constructs a new ValidateRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.ValidateRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ValidateRequest token. */
        token: string;

        /**
         * Creates a new ValidateRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ValidateRequest instance
         */
        static create(properties: auth.ValidateRequest.$Shape): auth.ValidateRequest & auth.ValidateRequest.$Shape;
        static create(properties?: auth.ValidateRequest.$Properties): auth.ValidateRequest;

        /**
         * Encodes the specified ValidateRequest message. Does not implicitly {@link auth.ValidateRequest.verify|verify} messages.
         * @param message ValidateRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: auth.ValidateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ValidateRequest message, length delimited. Does not implicitly {@link auth.ValidateRequest.verify|verify} messages.
         * @param message ValidateRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: auth.ValidateRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ValidateRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {auth.ValidateRequest & auth.ValidateRequest.$Shape} ValidateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.ValidateRequest & auth.ValidateRequest.$Shape;

        /**
         * Decodes a ValidateRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {auth.ValidateRequest & auth.ValidateRequest.$Shape} ValidateRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): auth.ValidateRequest & auth.ValidateRequest.$Shape;

        /**
         * Verifies a ValidateRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ValidateRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ValidateRequest
         */
        static fromObject(object: { [k: string]: any }): auth.ValidateRequest;

        /**
         * Creates a plain object from a ValidateRequest message. Also converts values to other types if specified.
         * @param message ValidateRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: auth.ValidateRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ValidateRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ValidateRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ValidateRequest {

        /** Properties of a ValidateRequest. */
        interface $Properties {

            /** ValidateRequest token */
            token?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ValidateRequest. */
        type $Shape = auth.ValidateRequest.$Properties;
    }

    /**
     * Properties of a ValidateResponse.
     * @deprecated Use auth.ValidateResponse.$Properties instead.
     */
    interface IValidateResponse extends auth.ValidateResponse.$Properties {
    }

    /** Represents a ValidateResponse. */
    class ValidateResponse {

        /**
         * Constructs a new ValidateResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.ValidateResponse.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ValidateResponse valid. */
        valid: boolean;

        /** ValidateResponse userUuid. */
        userUuid: string;

        /**
         * Creates a new ValidateResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ValidateResponse instance
         */
        static create(properties: auth.ValidateResponse.$Shape): auth.ValidateResponse & auth.ValidateResponse.$Shape;
        static create(properties?: auth.ValidateResponse.$Properties): auth.ValidateResponse;

        /**
         * Encodes the specified ValidateResponse message. Does not implicitly {@link auth.ValidateResponse.verify|verify} messages.
         * @param message ValidateResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: auth.ValidateResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ValidateResponse message, length delimited. Does not implicitly {@link auth.ValidateResponse.verify|verify} messages.
         * @param message ValidateResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: auth.ValidateResponse.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ValidateResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {auth.ValidateResponse & auth.ValidateResponse.$Shape} ValidateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.ValidateResponse & auth.ValidateResponse.$Shape;

        /**
         * Decodes a ValidateResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {auth.ValidateResponse & auth.ValidateResponse.$Shape} ValidateResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): auth.ValidateResponse & auth.ValidateResponse.$Shape;

        /**
         * Verifies a ValidateResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ValidateResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ValidateResponse
         */
        static fromObject(object: { [k: string]: any }): auth.ValidateResponse;

        /**
         * Creates a plain object from a ValidateResponse message. Also converts values to other types if specified.
         * @param message ValidateResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: auth.ValidateResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ValidateResponse to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ValidateResponse
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ValidateResponse {

        /** Properties of a ValidateResponse. */
        interface $Properties {

            /** ValidateResponse valid */
            valid?: (boolean|null);

            /** ValidateResponse userUuid */
            userUuid?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ValidateResponse. */
        type $Shape = auth.ValidateResponse.$Properties;
    }
}

/** Namespace messenger. */
export namespace messenger {

    /** Represents a MessengerService */
    class MessengerService extends $protobuf.rpc.Service {

        /**
         * Constructs a new MessengerService service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new MessengerService service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): MessengerService;

        /** Calls MessageStream. */
        messageStream: messenger.MessengerService.MessageStream;
    }

    namespace MessengerService {

        /**
         * Callback as used by {@link messenger.MessengerService#messageStream}.
         * @param error Error, if any
         * @param [response] MessageEvent
         */
        type MessageStreamCallback = (error: (Error|null), response?: messenger.MessageEvent) => void;

        /** Calls MessageStream. */
        type MessageStream = {
          (request: messenger.ISendMessageRequest, callback: messenger.MessengerService.MessageStreamCallback): void;
          (request: messenger.ISendMessageRequest): Promise<messenger.MessageEvent>;
          readonly name: "MessageStream";
          readonly path: "/messenger.MessengerService/MessageStream";
          readonly requestType: "SendMessageRequest";
          readonly responseType: "MessageEvent";
          readonly requestStream: true;
          readonly responseStream: true;
        };
    }

    /**
     * Properties of a Message.
     * @deprecated Use messenger.Message.$Properties instead.
     */
    interface IMessage extends messenger.Message.$Properties {
    }

    /** Represents a Message. */
    class Message {

        /**
         * Constructs a new Message.
         * @param [properties] Properties to set
         */
        constructor(properties?: messenger.Message.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Message id. */
        id: (number|Long);

        /** Message senderId. */
        senderId: (number|Long);

        /** Message recipientId. */
        recipientId: (number|Long);

        /** Message text. */
        text: string;

        /** Message createdAt. */
        createdAt?: (google.protobuf.Timestamp.$Properties|null);

        /** Message respondMessageId. */
        respondMessageId?: (number|Long|null);

        /**
         * Creates a new Message instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Message instance
         */
        static create(properties: messenger.Message.$Shape): messenger.Message & messenger.Message.$Shape;
        static create(properties?: messenger.Message.$Properties): messenger.Message;

        /**
         * Encodes the specified Message message. Does not implicitly {@link messenger.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: messenger.Message.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link messenger.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: messenger.Message.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {messenger.Message & messenger.Message.$Shape} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): messenger.Message & messenger.Message.$Shape;

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {messenger.Message & messenger.Message.$Shape} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): messenger.Message & messenger.Message.$Shape;

        /**
         * Verifies a Message message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Message
         */
        static fromObject(object: { [k: string]: any }): messenger.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param message Message
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: messenger.Message, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Message
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Message {

        /** Properties of a Message. */
        interface $Properties {

            /** Message id */
            id?: (number|Long|null);

            /** Message senderId */
            senderId?: (number|Long|null);

            /** Message recipientId */
            recipientId?: (number|Long|null);

            /** Message text */
            text?: (string|null);

            /** Message createdAt */
            createdAt?: (google.protobuf.Timestamp.$Properties|null);

            /** Message respondMessageId */
            respondMessageId?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Message. */
        type $Shape = messenger.Message.$Properties;
    }

    /**
     * Properties of a SendMessageRequest.
     * @deprecated Use messenger.SendMessageRequest.$Properties instead.
     */
    interface ISendMessageRequest extends messenger.SendMessageRequest.$Properties {
    }

    /** Represents a SendMessageRequest. */
    class SendMessageRequest {

        /**
         * Constructs a new SendMessageRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: messenger.SendMessageRequest.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** SendMessageRequest recipientId. */
        recipientId: (number|Long);

        /** SendMessageRequest text. */
        text: string;

        /** SendMessageRequest respondMessageId. */
        respondMessageId?: (number|Long|null);

        /**
         * Creates a new SendMessageRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SendMessageRequest instance
         */
        static create(properties: messenger.SendMessageRequest.$Shape): messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape;
        static create(properties?: messenger.SendMessageRequest.$Properties): messenger.SendMessageRequest;

        /**
         * Encodes the specified SendMessageRequest message. Does not implicitly {@link messenger.SendMessageRequest.verify|verify} messages.
         * @param message SendMessageRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: messenger.SendMessageRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SendMessageRequest message, length delimited. Does not implicitly {@link messenger.SendMessageRequest.verify|verify} messages.
         * @param message SendMessageRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: messenger.SendMessageRequest.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SendMessageRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape} SendMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape;

        /**
         * Decodes a SendMessageRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape} SendMessageRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): messenger.SendMessageRequest & messenger.SendMessageRequest.$Shape;

        /**
         * Verifies a SendMessageRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SendMessageRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SendMessageRequest
         */
        static fromObject(object: { [k: string]: any }): messenger.SendMessageRequest;

        /**
         * Creates a plain object from a SendMessageRequest message. Also converts values to other types if specified.
         * @param message SendMessageRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: messenger.SendMessageRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SendMessageRequest to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for SendMessageRequest
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace SendMessageRequest {

        /** Properties of a SendMessageRequest. */
        interface $Properties {

            /** SendMessageRequest recipientId */
            recipientId?: (number|Long|null);

            /** SendMessageRequest text */
            text?: (string|null);

            /** SendMessageRequest respondMessageId */
            respondMessageId?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a SendMessageRequest. */
        type $Shape = messenger.SendMessageRequest.$Properties;
    }

    /**
     * Properties of a MessageEvent.
     * @deprecated Use messenger.MessageEvent.$Properties instead.
     */
    interface IMessageEvent extends messenger.MessageEvent.$Properties {
    }

    /** Represents a MessageEvent. */
    class MessageEvent {

        /**
         * Constructs a new MessageEvent.
         * @param [properties] Properties to set
         */
        constructor(properties?: messenger.MessageEvent.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** MessageEvent message. */
        message?: (messenger.Message.$Properties|null);

        /** MessageEvent deletedMessageId. */
        deletedMessageId?: (number|Long|null);

        /** MessageEvent event. */
        event?: ("message"|"deletedMessageId");

        /**
         * Creates a new MessageEvent instance using the specified properties.
         * @param [properties] Properties to set
         * @returns MessageEvent instance
         */
        static create(properties: messenger.MessageEvent.$Shape): messenger.MessageEvent & messenger.MessageEvent.$Shape;
        static create(properties?: messenger.MessageEvent.$Properties): messenger.MessageEvent;

        /**
         * Encodes the specified MessageEvent message. Does not implicitly {@link messenger.MessageEvent.verify|verify} messages.
         * @param message MessageEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: messenger.MessageEvent.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified MessageEvent message, length delimited. Does not implicitly {@link messenger.MessageEvent.verify|verify} messages.
         * @param message MessageEvent message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: messenger.MessageEvent.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a MessageEvent message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {messenger.MessageEvent & messenger.MessageEvent.$Shape} MessageEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): messenger.MessageEvent & messenger.MessageEvent.$Shape;

        /**
         * Decodes a MessageEvent message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {messenger.MessageEvent & messenger.MessageEvent.$Shape} MessageEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): messenger.MessageEvent & messenger.MessageEvent.$Shape;

        /**
         * Verifies a MessageEvent message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a MessageEvent message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns MessageEvent
         */
        static fromObject(object: { [k: string]: any }): messenger.MessageEvent;

        /**
         * Creates a plain object from a MessageEvent message. Also converts values to other types if specified.
         * @param message MessageEvent
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: messenger.MessageEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this MessageEvent to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for MessageEvent
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace MessageEvent {

        /** Properties of a MessageEvent. */
        interface $Properties {

            /** MessageEvent message */
            message?: (messenger.Message.$Properties|null);

            /** MessageEvent deletedMessageId */
            deletedMessageId?: (number|Long|null);

            /** MessageEvent event */
            event?: ("message"|"deletedMessageId");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a MessageEvent. */
        type $Shape = {
          message?: messenger.Message.$Shape|null;
          deletedMessageId?: number|Long|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ event?: undefined; message?: null; deletedMessageId?: null }|{ event?: "message"; message: messenger.Message.$Shape; deletedMessageId?: null }|{ event?: "deletedMessageId"; message?: null; deletedMessageId: number|Long })
        );
    }
}

/** Namespace google. */
export namespace google {

    /** Namespace protobuf. */
    namespace protobuf {

        /**
         * Properties of a Timestamp.
         * @deprecated Use google.protobuf.Timestamp.$Properties instead.
         */
        interface ITimestamp extends google.protobuf.Timestamp.$Properties {
        }

        /** Represents a Timestamp. */
        class Timestamp {

            /**
             * Constructs a new Timestamp.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.Timestamp.$Properties);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];

            /** Timestamp seconds. */
            seconds: (number|Long);

            /** Timestamp nanos. */
            nanos: number;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Timestamp instance
             */
            static create(properties: google.protobuf.Timestamp.$Shape): google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape;
            static create(properties?: google.protobuf.Timestamp.$Properties): google.protobuf.Timestamp;

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encode(message: google.protobuf.Timestamp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            static encodeDelimited(message: google.protobuf.Timestamp.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape;

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Timestamp & google.protobuf.Timestamp.$Shape;

            /**
             * Verifies a Timestamp message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Timestamp
             */
            static fromObject(object: { [k: string]: any }): google.protobuf.Timestamp;

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @param message Timestamp
             * @param [options] Conversion options
             * @returns Plain object
             */
            static toObject(message: google.protobuf.Timestamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Timestamp to JSON.
             * @returns JSON object
             */
            toJSON(): { [k: string]: any };

            /**
             * Gets the type url for Timestamp
             * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
             * @returns The type url
             */
            static getTypeUrl(prefix?: string): string;
        }

        namespace Timestamp {

            /** Properties of a Timestamp. */
            interface $Properties {

                /** Timestamp seconds */
                seconds?: (number|Long|null);

                /** Timestamp nanos */
                nanos?: (number|null);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];
            }

            /** Shape of a Timestamp. */
            type $Shape = google.protobuf.Timestamp.$Properties;
        }
    }
}
