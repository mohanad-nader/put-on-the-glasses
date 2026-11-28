package com.potg.proxy;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/** Small helpers for forms that were submitted through the proxy. */
final class FormQuery {

    private FormQuery() {
    }

    /** Rebuilds "a=1&b=2" from the submitted fields, without our own _u and _form fields. */
    static String encode(Map<String, List<String>> params) {
        StringJoiner joined = new StringJoiner("&");
        params.forEach((name, values) -> {
            if (name.equals("_u") || name.equals("_form")) {
                return;
            }
            for (String value : values) {
                joined.add(enc(name) + "=" + enc(value));
            }
        });
        return joined.toString();
    }

    /** A GET form replaces the query of its action, so the old query and fragment are dropped. */
    static String withQuery(String target, String query) {
        String base = target.replaceFirst("[?#].*$", "");
        return query.isEmpty() ? base : base + "?" + query;
    }

    private static String enc(String text) {
        return URLEncoder.encode(text, StandardCharsets.UTF_8);
    }
}
