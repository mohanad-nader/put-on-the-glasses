package com.potg.proxy;

import com.potg.proxy.ProxyException.ErrorCode;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import org.springframework.stereotype.Component;

/**
 * The SSRF guard. Every address the proxy is about to fetch, including every redirect
 * target, goes through check() first.
 */
@Component
public class UrlGuard {

    private final ProxyProperties props;

    public UrlGuard(ProxyProperties props) {
        this.props = props;
    }

    /** Returns a clean absolute URI (no fragment) or throws a ProxyException. */
    public URI check(String raw) {
        URI uri = parse(raw);

        String scheme = uri.getScheme();
        boolean web = scheme != null
                && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
        if (!web) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }

        // http://example.com@127.0.0.1/ is a classic way to fool string checks
        if (uri.getUserInfo() != null) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }
        if (uri.getHost() == null) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }

        // dev profile only: lets us test against localhost pages
        if (props.allowPrivate()) {
            return uri;
        }

        // resolve the name first, then judge the addresses it points to
        try {
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (isBlocked(address)) {
                    throw new ProxyException(ErrorCode.BLOCKED_URL);
                }
            }
        } catch (UnknownHostException e) {
            throw new ProxyException(ErrorCode.UPSTREAM_ERROR);
        }
        return uri;
    }

    private static URI parse(String raw) {
        if (raw == null) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }
        String text = raw.trim();

        // The server never needs the #fragment. Cut it on the raw text: rebuilding the URI
        // from decoded parts would turn %26 in a query into a real & and change its meaning.
        int hash = text.indexOf('#');
        if (hash >= 0) {
            text = text.substring(0, hash);
        }

        try {
            return new URI(text);
        } catch (URISyntaxException e) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }
    }

    static boolean isBlocked(InetAddress address) {
        // loopback, 0.0.0.0, 169.254/16 (cloud metadata), 10/8, 172.16/12, 192.168/16, multicast
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = bytes[0] & 0xFF;
            int second = bytes[1] & 0xFF;
            if (first == 0) {
                return true; // 0.0.0.0/8
            }
            if (first == 100 && second >= 64 && second <= 127) {
                return true; // 100.64.0.0/10 carrier-grade NAT
            }
            if (first == 198 && (second == 18 || second == 19)) {
                return true; // 198.18.0.0/15 benchmarking
            }
            if (first >= 240) {
                return true; // 240.0.0.0/4 reserved, includes 255.255.255.255
            }
        } else if (bytes.length == 16) {
            if ((bytes[0] & 0xFE) == 0xFC) {
                return true; // fc00::/7 unique local, Java does not flag it
            }
        }
        return false;
    }
}
