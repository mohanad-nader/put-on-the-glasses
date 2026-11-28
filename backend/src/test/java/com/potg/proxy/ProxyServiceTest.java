package com.potg.proxy;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.potg.proxy.ProxyException.ErrorCode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Runs ProxyService against a tiny local server, so no internet is needed. */
class ProxyServiceTest {

    private HttpServer server;
    private String root;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        root = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    // allowPrivate is on only because the test server lives on 127.0.0.1
    private ProxyService service(long maxBytes, int timeoutSeconds, int maxRedirects) {
        ProxyProperties props =
                new ProxyProperties(true, maxBytes, timeoutSeconds, maxRedirects, 60, "http://localhost:8080");
        return new ProxyService(new UrlGuard(props), props);
    }

    private static void reply(HttpExchange exchange, int status, String contentType, byte[] body)
            throws IOException {
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        }
        exchange.close();
    }

    private static void redirect(HttpExchange exchange, String location) throws IOException {
        exchange.getResponseHeaders().add("Location", location);
        exchange.sendResponseHeaders(302, -1);
        exchange.close();
    }

    @Test
    void fetchesHtmlAndReadsTheCharset() throws IOException {
        server.createContext("/page", exchange ->
                reply(exchange, 200, "text/html; charset=UTF-8", "<p>hi</p>".getBytes(StandardCharsets.UTF_8)));
        server.start();

        ProxyService.ProxyResult result = service(5_000_000, 5, 5).fetch(root + "/page");

        assertEquals("<p>hi</p>", new String(result.body(), StandardCharsets.UTF_8));
        assertEquals("UTF-8", result.charset());
        assertEquals(root + "/page", result.finalUrl());
    }

    @Test
    void unknownCharsetIsIgnored() {
        server.createContext("/page", exchange ->
                reply(exchange, 200, "text/html; charset=not-a-real-one", "x".getBytes(StandardCharsets.UTF_8)));
        server.start();

        assertNull(service(5_000_000, 5, 5).fetch(root + "/page").charset());
    }

    @Test
    void nonHtmlHasNoBody() {
        server.createContext("/file", exchange -> reply(exchange, 200, "application/pdf", new byte[] {1, 2, 3}));
        server.start();

        ProxyService.ProxyResult result = service(5_000_000, 5, 5).fetch(root + "/file");

        assertNull(result.body());
        assertEquals(root + "/file", result.finalUrl());
    }

    @Test
    void followsRelativeRedirects() {
        server.createContext("/old", exchange -> redirect(exchange, "/new"));
        server.createContext("/new", exchange -> reply(exchange, 200, "text/html", "ok".getBytes(StandardCharsets.UTF_8)));
        server.start();

        ProxyService.ProxyResult result = service(5_000_000, 5, 5).fetch(root + "/old");

        assertEquals(root + "/new", result.finalUrl());
    }

    @Test
    void stopsAfterTooManyRedirects() {
        server.createContext("/loop", exchange -> redirect(exchange, "/loop"));
        server.start();

        ProxyException e = assertThrows(ProxyException.class, () -> service(5_000_000, 5, 3).fetch(root + "/loop"));

        assertEquals(ErrorCode.TOO_MANY_REDIRECTS, e.getCode());
    }

    @Test
    void redirectToAPrivateAddressIsBlocked() {
        server.createContext("/start", exchange -> redirect(exchange, "http://127.0.0.1:1/secret"));
        server.start();

        // strict guard (allowPrivate = false) except for the one start address of this test
        ProxyProperties strict = new ProxyProperties(false, 5_000_000, 5, 5, 60, "http://localhost:8080");
        UrlGuard guard = new UrlGuard(strict) {
            @Override
            public URI check(String raw) {
                return raw.endsWith("/start") ? URI.create(raw) : super.check(raw);
            }
        };

        ProxyException e = assertThrows(
                ProxyException.class, () -> new ProxyService(guard, strict).fetch(root + "/start"));

        assertEquals(ErrorCode.BLOCKED_URL, e.getCode());
    }

    @Test
    void pageOverTheCapIsRejected() {
        server.createContext("/big", exchange -> reply(exchange, 200, "text/html", new byte[500]));
        server.start();

        ProxyException e = assertThrows(ProxyException.class, () -> service(100, 5, 5).fetch(root + "/big"));

        assertEquals(ErrorCode.TOO_LARGE, e.getCode());
    }

    @Test
    void pageExactlyAtTheCapIsAccepted() {
        server.createContext("/exact", exchange -> reply(exchange, 200, "text/html", new byte[100]));
        server.start();

        assertEquals(100, service(100, 5, 5).fetch(root + "/exact").body().length);
    }

    @Test
    void aBodyThatStallsTimesOut() {
        server.createContext("/slow", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "text/html");
            exchange.sendResponseHeaders(200, 0); // chunked, length unknown
            exchange.getResponseBody().write("<p>start".getBytes(StandardCharsets.UTF_8));
            exchange.getResponseBody().flush();
            try {
                Thread.sleep(4000);
            } catch (InterruptedException ignored) {
                // test is over
            }
            exchange.close();
        });
        server.start();

        ProxyException e = assertThrows(ProxyException.class, () -> service(5_000_000, 1, 5).fetch(root + "/slow"));

        assertEquals(ErrorCode.TIMEOUT, e.getCode());
    }

    @Test
    void postSendsTheFormBody() {
        server.createContext("/submit", exchange -> {
            byte[] received = exchange.getRequestBody().readAllBytes();
            String type = exchange.getRequestHeaders().getFirst("Content-Type");
            reply(exchange, 200, "text/html", (exchange.getRequestMethod() + "|" + type + "|"
                    + new String(received, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
        });
        server.start();

        ProxyService.ProxyResult result =
                service(5_000_000, 5, 5).post(root + "/submit", "q=a+b&n=1".getBytes(StandardCharsets.UTF_8));

        assertEquals(
                "POST|application/x-www-form-urlencoded|q=a+b&n=1",
                new String(result.body(), StandardCharsets.UTF_8));
    }

    @Test
    void redirectAfterPostIsFollowedAsGet() {
        server.createContext("/submit", exchange -> redirect(exchange, "/done"));
        server.createContext("/done", exchange -> reply(
                exchange, 200, "text/html", exchange.getRequestMethod().getBytes(StandardCharsets.UTF_8)));
        server.start();

        ProxyService.ProxyResult result =
                service(5_000_000, 5, 5).post(root + "/submit", "a=1".getBytes(StandardCharsets.UTF_8));

        assertArrayEquals("GET".getBytes(StandardCharsets.UTF_8), result.body());
    }
}
