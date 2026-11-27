package com.potg.proxy;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Values from application.properties under the "potg.proxy" prefix.
 * The component order is part of the team contract, tests build it by hand.
 */
@ConfigurationProperties(prefix = "potg.proxy")
public record ProxyProperties(
        boolean allowPrivate,
        long maxBytes,
        int timeoutSeconds,
        int maxRedirects,
        int maxPerMinute,
        String publicBaseUrl) {
}
