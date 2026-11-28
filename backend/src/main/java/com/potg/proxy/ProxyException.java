package com.potg.proxy;

/**
 * Every expected failure of the proxy. The error code carries the HTTP status and the
 * user-facing message, so the handler and the Angular banner never invent their own text.
 */
public class ProxyException extends RuntimeException {

    public enum ErrorCode {
        BAD_URL(400, "That address is not a valid web address."),
        BLOCKED_URL(403, "This address points to a private or local network, so the proxy refuses it."),
        RATE_LIMITED(429, "Too many requests. Wait a minute and try again."),
        TOO_LARGE(413, "The page is larger than 5 MB."),
        TIMEOUT(504, "The site took longer than 10 seconds to answer."),
        UPSTREAM_ERROR(502, "The site could not be reached."),
        TOO_MANY_REDIRECTS(508, "The site redirected too many times.");

        public final int status;
        public final String message;

        ErrorCode(int status, String message) {
            this.status = status;
            this.message = message;
        }
    }

    private final ErrorCode code;

    public ProxyException(ErrorCode code) {
        super(code.message);
        this.code = code;
    }

    public ErrorCode getCode() {
        return code;
    }
}
