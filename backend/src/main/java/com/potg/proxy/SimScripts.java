package com.potg.proxy;

import org.springframework.stereotype.Component;

/**
 * Temporary stub so HtmlRewriter compiles. Rowan replaces the body with the real bundler,
 * the method signature forPage(String) is frozen.
 */
@Component
public class SimScripts {

    public String forPage(String pageUrl) {
        return "window.__POTG_PAGE_URL=" + quote(pageUrl) + ";";
    }

    // '<' becomes \u003c so a URL can never close the script tag
    private static String quote(String s) {
        return "\"" + s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("<", "\\u003c")
                .replace("\n", "")
                .replace("\r", "") + "\"";
    }
}
