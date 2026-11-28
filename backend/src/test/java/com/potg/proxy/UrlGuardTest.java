package com.potg.proxy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.potg.proxy.ProxyException.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Evidence that the SSRF guard works. Every URL below attacks one rule.
 * IP literals need no DNS lookup, so these tests run offline
 * (except "localhost", which the operating system resolves from its hosts file).
 */
class UrlGuardTest {

    private final UrlGuard guard =
            new UrlGuard(new ProxyProperties(false, 5_000_000, 10, 5, 60, "http://localhost:8080"));

    // ======[ addresses that must never be fetched ]=========
    @ParameterizedTest
    @ValueSource(strings = {
        "http://127.0.0.1/",                              // loopback
        "http://localhost/",                              // loopback by name
        "http://10.0.0.5/",                               // private 10/8
        "http://192.168.1.1/",                            // private 192.168/16
        "http://172.16.0.1/",                             // private 172.16/12
        "http://169.254.169.254/latest/meta-data/",       // cloud metadata (link-local)
        "http://0.0.0.0/",                                // "this host"
        "http://[::1]/",                                  // IPv6 loopback
        "http://[fd00::1]/",                              // IPv6 unique-local
        "http://100.64.0.1/",                             // carrier-grade NAT
        "http://[::ffff:127.0.0.1]/",                     // IPv4-mapped IPv6 loopback
        "http://2130706433/",                             // 127.0.0.1 written as one integer
        "http://0x7f000001/",                             // 127.0.0.1 in hex
        "http://127.1/"                                   // short form of 127.0.0.1
    })
    void blocksPrivateAndLocalAddresses(String url) {
        assertThrows(ProxyException.class, () -> guard.check(url));
    }

    // ======[ things that are not web addresses at all ]=========
    @ParameterizedTest
    @ValueSource(strings = {
        "ftp://example.com/", "file:///etc/passwd", "javascript:alert(1)",
        "http://user:pw@example.com/",                    // user-info trick
        "",                                               // empty
        "http://exa mple.com/",                           // space inside
        "   "                                             // only spaces
    })
    void rejectsBadInput(String url) {
        assertThrows(ProxyException.class, () -> guard.check(url));
    }

    @Test
    void nullIsBadUrl() {
        assertEquals(ErrorCode.BAD_URL, assertThrows(ProxyException.class, () -> guard.check(null)).getCode());
    }

    // ======[ the error code tells Angular which message to show ]=========
    @Test
    void loopbackIsBlockedUrl() {
        assertEquals(ErrorCode.BLOCKED_URL,
                assertThrows(ProxyException.class, () -> guard.check("http://127.0.0.1/")).getCode());
    }

    @Test
    void wrongSchemeIsBadUrl() {
        assertEquals(ErrorCode.BAD_URL,
                assertThrows(ProxyException.class, () -> guard.check("ftp://example.com/")).getCode());
    }

    // ======[ things that must be allowed ]=========
    @Test
    void allowsPublicIpLiteral() {
        assertEquals("8.8.8.8", guard.check("http://8.8.8.8/x#frag").getHost());
    }

    @Test
    void stripsFragment() {
        assertNull(guard.check("http://8.8.8.8/x#frag").getFragment());
    }

    @Test
    void uppercaseSchemeIsAllowed() {
        assertEquals("8.8.8.8", guard.check("HTTP://8.8.8.8/").getHost());
    }

    @Test
    void portAndQueryAreKept() {
        var uri = guard.check("http://8.8.8.8:8080/path?q=1");
        assertEquals(8080, uri.getPort());
        assertEquals("q=1", uri.getQuery());
    }

    @Test
    void encodedAmpersandInTheQueryIsNotDecoded() {
        // %26 must stay %26, otherwise the meaning of the query changes
        assertEquals("a=1%262", guard.check("http://8.8.8.8/?a=1%262").getRawQuery());
    }

    // ======[ dev profile: the only way to reach localhost ]=========
    @Test
    void devProfileAllowsLoopback() {
        UrlGuard dev = new UrlGuard(new ProxyProperties(true, 5_000_000, 10, 5, 60, "http://localhost:8080"));
        assertEquals("127.0.0.1", dev.check("http://127.0.0.1:5500/page.html").getHost());
    }

    @Test
    void devProfileStillRejectsWrongSchemes() {
        UrlGuard dev = new UrlGuard(new ProxyProperties(true, 5_000_000, 10, 5, 60, "http://localhost:8080"));
        assertThrows(ProxyException.class, () -> dev.check("file:///etc/passwd"));
    }
}
