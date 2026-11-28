package com.potg.proxy;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Plain JUnit, no Spring context needed. */
class SimScriptsTest {

    private final SimScripts scripts = new SimScripts();

    @Test
    void forPageStartsWithTheUrlVariable() {
        String out = scripts.forPage("http://x/");
        assertTrue(out.startsWith("window.__POTG_PAGE_URL="));
        assertTrue(out.startsWith("window.__POTG_PAGE_URL=\"http://x/\";"));
    }

    @Test
    void hostileUrlCannotCloseTheScriptTag() {
        String out = scripts.forPage("http://x/\"></script><script>alert(1)");
        // the part before the bundle is the first line only
        String firstLine = out.substring(0, out.indexOf('\n'));
        assertFalse(firstLine.toLowerCase().contains("</script"));
        assertTrue(firstLine.contains("\\u003c"));
        // the quote must be escaped too, otherwise the URL could break out of the JS string
        assertTrue(firstLine.contains("\\\""));
    }

    @Test
    void newlinesInTheUrlCannotBreakTheStatement() {
        String firstLine = scripts.forPage("http://x/a\nb\r\nc").split("\n", 2)[0];
        assertTrue(firstLine.endsWith("\";"));
    }

    @Test
    void bundleContainsCore() {
        // needs sim/00-core.js (Jana) on the branch
        assertTrue(scripts.forPage("http://x/").contains("window.__potg"));
    }

    @Test
    void bundleContainsMyTwoModules() {
        String out = scripts.forPage("http://x/");
        assertTrue(out.contains("P.modules.screenreader"));
        assertTrue(out.contains("P.modules.taborder"));
    }

    @Test
    void coreComesBeforeTheModules() {
        String out = scripts.forPage("http://x/");
        int core = out.indexOf("window.__potg"); // first use of the global is in 00-core.js
        int module = out.indexOf("P.modules.screenreader");
        assertTrue(core >= 0 && module > core, "00-core.js must be first in the bundle");
    }

    @Test
    void noInjectedFileContainsACloseScriptTag() {
        // protects everybody's JavaScript from the same mistake: the bundle sits inside one inline <script>
        String out = scripts.forPage("http://x/");
        assertFalse(out.toLowerCase().contains("</script"));
    }

    @Test
    void noInjectedFileContainsAnHtmlCommentOpener() {
        // "<!--" followed by "<script" inside an inline script switches the HTML parser into a
        // different state and can swallow the rest of the page
        assertFalse(scripts.forPage("http://x/").contains("<!--"));
    }
}