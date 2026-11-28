package com.potg.proxy;

import com.potg.proxy.ProxyException.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.Charset;
import java.nio.charset.IllegalCharsetNameException;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import org.springframework.stereotype.Service;

/**
 * The only class that talks to the outside world. It follows redirects itself so the
 * guard sees every hop, and it enforces the size and time limits.
 */
@Service
public class ProxyService {

    /** body == null means "not HTML, just redirect the browser to finalUrl". */
    public record ProxyResult(String finalUrl, String contentType, String charset, byte[] body) {
    }

    private static final String USER_AGENT = "Mozilla/5.0 (compatible; PutOnTheGlasses/1.0)";
    private static final Pattern CHARSET = Pattern.compile("charset=\"?([\\w.:-]+)", Pattern.CASE_INSENSITIVE);

    // Closes a response stream that is still open when the time limit runs out
    private static final ScheduledExecutorService WATCHDOG = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread thread = new Thread(task, "proxy-watchdog");
        thread.setDaemon(true);
        return thread;
    });

    private final UrlGuard guard;
    private final ProxyProperties props;
    private final HttpClient client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER) // we follow, so the guard sees every hop
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ProxyService(UrlGuard guard, ProxyProperties props) {
        this.guard = guard;
        this.props = props;
    }

    public ProxyResult fetch(String url) {
        return execute(url, null);
    }

    /** Forwards an application/x-www-form-urlencoded body. A redirect afterwards is followed as GET. */
    public ProxyResult post(String url, byte[] formBody) {
        return execute(url, formBody);
    }

    private ProxyResult execute(String start, byte[] formBody) {
        // one deadline for the whole call, redirects and body included
        long deadline = System.nanoTime() + Duration.ofSeconds(props.timeoutSeconds()).toNanos();

        URI uri = guard.check(start);
        byte[] body = formBody;

        for (int hop = 0; hop <= props.maxRedirects(); hop++) {
            HttpResponse<InputStream> response = send(uri, body, deadline);
            int status = response.statusCode();
            Optional<String> location = response.headers().firstValue("Location");

            if (status >= 300 && status < 400 && location.isPresent()) {
                close(response.body());
                uri = nextHop(uri, location.get());
                body = null; // browsers repeat a redirected POST as GET
                continue;
            }

            String contentType = response.headers().firstValue("Content-Type").orElse("");
            if (!isHtml(contentType)) {
                close(response.body());
                return new ProxyResult(uri.toString(), contentType, null, null);
            }

            String encoding = response.headers().firstValue("Content-Encoding").orElse("");
            byte[] bytes = readBody(response.body(), encoding, deadline);
            return new ProxyResult(uri.toString(), contentType, charsetOf(contentType), bytes);
        }
        throw new ProxyException(ErrorCode.TOO_MANY_REDIRECTS);
    }

    private URI nextHop(URI current, String location) {
        try {
            // relative Location headers are resolved against the current address, then re-checked
            return guard.check(current.resolve(location).toString());
        } catch (IllegalArgumentException e) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }
    }

    private HttpResponse<InputStream> send(URI uri, byte[] formBody, long deadline) {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri)
                .timeout(remaining(deadline))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5")
                .header("Accept-Language", "en-US,en;q=0.9");

        if (formBody == null) {
            request.GET();
        } else {
            request.header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(formBody));
        }

        try {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofInputStream());
        } catch (HttpTimeoutException e) {
            throw new ProxyException(ErrorCode.TIMEOUT);
        } catch (IOException e) {
            throw new ProxyException(ErrorCode.UPSTREAM_ERROR);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ProxyException(ErrorCode.UPSTREAM_ERROR);
        }
    }

    private byte[] readBody(InputStream raw, String encoding, long deadline) {
        // The request timeout only covers the wait for the headers. Without this watchdog a
        // server that sends one byte per minute could hold the thread forever.
        AtomicBoolean timedOut = new AtomicBoolean(false);
        long remainingMillis = remaining(deadline).toMillis();
        ScheduledFuture<?> watchdog = WATCHDOG.schedule(() -> {
            timedOut.set(true);
            close(raw);
        }, remainingMillis, TimeUnit.MILLISECONDS);

        try (InputStream in = encoding.equalsIgnoreCase("gzip") ? new GZIPInputStream(raw) : raw) {
            // read one byte past the cap so "exactly at the cap" and "over it" can be told apart
            byte[] data = in.readNBytes((int) props.maxBytes() + 1);
            if (data.length > props.maxBytes()) {
                throw new ProxyException(ErrorCode.TOO_LARGE);
            }
            return data;
        } catch (IOException e) {
            throw new ProxyException(timedOut.get() ? ErrorCode.TIMEOUT : ErrorCode.UPSTREAM_ERROR);
        } finally {
            watchdog.cancel(false);
        }
    }

    private static Duration remaining(long deadline) {
        long nanos = deadline - System.nanoTime();
        if (nanos <= 0) {
            throw new ProxyException(ErrorCode.TIMEOUT);
        }
        return Duration.ofNanos(nanos);
    }

    private static boolean isHtml(String contentType) {
        String type = contentType.toLowerCase();
        return type.contains("text/html") || type.contains("application/xhtml");
    }

    // Returns null for a missing or unknown charset, Jsoup then detects it from the bytes
    private static String charsetOf(String contentType) {
        Matcher matcher = CHARSET.matcher(contentType);
        if (!matcher.find()) {
            return null;
        }
        String name = matcher.group(1);
        try {
            return Charset.isSupported(name) ? name : null;
        } catch (IllegalCharsetNameException e) {
            return null;
        }
    }

    private static void close(InputStream in) {
        try {
            in.close();
        } catch (IOException ignored) {
            // nothing useful to do if closing fails
        }
    }
}
