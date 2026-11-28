package com.potg.proxy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

/** Builds the rewriter by hand, no Spring context needed. */
class HtmlRewriterTest {

    private static final String PAGE = "https://example.com/dir/page.html";
    private static final String PROXY = "http://localhost:8080/api/proxy";

    private final HtmlRewriter rw = new HtmlRewriter(
            new ProxyProperties(false, 5_000_000, 10, 5, 60, "http://localhost:8080"),
            new SimScripts());

    private String run(String html) {
        return rw.rewrite(html.getBytes(StandardCharsets.UTF_8), "UTF-8", PAGE);
    }

    // 1
    @Test
    void rewritesAnAbsolutePathLink() {
        String out = run("<html><body><a href=\"/x\">x</a></body></html>");
        assertTrue(out.contains(PROXY + "?_u=https%3A%2F%2Fexample.com%2Fx"));
    }

    // 2
    @Test
    void getFormGetsTwoHiddenInputs() {
        Document d = Jsoup.parse(run("<form action=\"/s\"><input name=\"q\"></form>"));
        assertEquals("https://example.com/s", d.selectFirst("form input[name=_u]").attr("value"));
        assertEquals("1", d.selectFirst("form input[name=_form]").attr("value"));
        assertEquals(PROXY, d.selectFirst("form").attr("action"));
    }

    // 3
    @Test
    void fragmentLinkIsLeftUnchanged() {
        Document d = Jsoup.parse(run("<body><a href=\"#top\">top</a></body>"));
        assertEquals("#top", d.selectFirst("a").attr("href"));
    }

    // 4
    @Test
    void mailtoAndJavascriptLinksAreLeftUnchanged() {
        Document d = Jsoup.parse(run(
                "<body><a id=\"m\" href=\"mailto:a@b.com\">m</a>"
                        + "<a id=\"j\" href=\"javascript:void(0)\">j</a></body>"));
        assertEquals("mailto:a@b.com", d.getElementById("m").attr("href"));
        assertEquals("javascript:void(0)", d.getElementById("j").attr("href"));
    }

    // 5
    @Test
    void postFormKeepsMethodAndPointsAtTheProxy() {
        Document d = Jsoup.parse(run("<form method=\"post\" action=\"/login\"><input name=\"u\"></form>"));
        assertEquals("post", d.selectFirst("form").attr("method").toLowerCase());
        assertEquals(PROXY + "?_u=https%3A%2F%2Fexample.com%2Flogin", d.selectFirst("form").attr("action"));
        // a POST form carries its target in the action, so it needs no hidden inputs
        assertNull(d.selectFirst("form input[name=_u]"));
    }

    // 6
    @Test
    void cspAndRefreshMetaTagsAreRemoved() {
        Document d = Jsoup.parse(run(
                "<html><head>"
                        + "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'\">"
                        + "<meta http-equiv=\"refresh\" content=\"0;url=/elsewhere\">"
                        + "<meta http-equiv=\"Content-Type\" content=\"text/html\">"
                        + "</head><body>x</body></html>"));
        assertNull(d.selectFirst("meta[http-equiv~=(?i)content-security-policy]"));
        assertNull(d.selectFirst("meta[http-equiv~=(?i)refresh]"));
        // harmless meta tags stay
        assertNotNull(d.selectFirst("meta[http-equiv~=(?i)content-type]"));
    }

    // 7
    @Test
    void existingBaseIsReplacedByExactlyOneBase() {
        Document d = Jsoup.parse(run(
                "<html><head><base href=\"https://cdn.example.org/assets/\"></head>"
                        + "<body><a href=\"p.html\">p</a></body></html>"));
        assertEquals(1, d.select("base").size());
        // Jsoup follows the page's own <base>, so the new one keeps pointing where the page wanted
        assertEquals("https://cdn.example.org/assets/", d.selectFirst("base").attr("href"));
        // and relative links were resolved against that base before it was replaced
        assertTrue(d.selectFirst("a").attr("href").contains("cdn.example.org%2Fassets%2Fp.html"));
    }

    // 8
    @Test
    void outputContainsOurScriptWithThePageUrl() {
        String out = run("<html><body>x</body></html>");
        assertTrue(out.contains("window.__POTG_PAGE_URL=\"" + PAGE + "\""));
        assertTrue(out.contains("window.__potg"));
    }

    // 9
    @Test
    void baseComesBeforeOurScript() {
        String out = run("<html><head><title>t</title></head><body>x</body></html>");
        int base = out.indexOf("<base");
        int script = out.indexOf("<script");
        assertTrue(base >= 0 && script >= 0);
        assertTrue(base < script, "<base> must be first so every relative URL resolves against it");
    }
}