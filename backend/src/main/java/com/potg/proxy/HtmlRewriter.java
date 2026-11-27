package com.potg.proxy;

import com.potg.proxy.ProxyException.ErrorCode;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.jsoup.Jsoup;
import org.jsoup.nodes.DataNode;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/**
 * Turns a stranger's page into one that stays inside the proxy and runs our scripts.
 * Only navigation (links and forms) is rewritten. Images, CSS and scripts keep loading
 * from the real site through a base tag.
 */
@Component
public class HtmlRewriter {

    private final ProxyProperties props;
    private final SimScripts scripts;

    public HtmlRewriter(ProxyProperties props, SimScripts scripts) {
        this.props = props;
        this.scripts = scripts;
    }

    public String rewrite(byte[] body, String charset, String pageUrl) {
        Document doc;
        try {
            doc = Jsoup.parse(new ByteArrayInputStream(body), charset, pageUrl);
        } catch (IOException e) {
            throw new ProxyException(ErrorCode.UPSTREAM_ERROR);
        }

        String proxy = props.publicBaseUrl() + "/api/proxy";
        // Jsoup already follows an existing <base href>. Resolve everything before touching it.
        String base = doc.baseUri();

        rewriteLinks(doc, proxy);
        rewriteForms(doc, proxy, pageUrl);
        stripBlockingPolicies(doc);

        // the script goes in first and the base after it, so the base ends up first in <head>
        doc.head().prependElement("script").appendChild(new DataNode(scripts.forPage(pageUrl)));
        doc.head().prependElement("base").attr("href", base);

        doc.outputSettings().prettyPrint(false).charset(StandardCharsets.UTF_8);
        return doc.outerHtml();
    }

    private void rewriteLinks(Document doc, String proxy) {
        for (Element link : doc.select("a[href], area[href]")) {
            // _top and _parent would try to leave our frame
            link.removeAttr("target");

            String raw = link.attr("href").trim();
            // fragment links are scrolled by hand in 00-core.js
            if (raw.isEmpty() || raw.startsWith("#")) {
                continue;
            }

            // empty or non-http for mailto:, tel: and javascript:, those stay as they are
            String absolute = link.absUrl("href");
            if (absolute.startsWith("http://") || absolute.startsWith("https://")) {
                link.attr("href", proxy + "?_u=" + encode(absolute));
            }
        }
    }

    private void rewriteForms(Document doc, String proxy, String pageUrl) {
        for (Element form : doc.select("form")) {
            form.removeAttr("target");

            // an empty action means "this page"
            String action = form.absUrl("action");
            if (action.isEmpty()) {
                action = pageUrl;
            }

            if (form.attr("method").equalsIgnoreCase("post")) {
                form.attr("action", proxy + "?_u=" + encode(action));
                continue;
            }

            // A GET form replaces the query string of its action with the fields, so the
            // target address cannot live in the action. It travels as a hidden field.
            form.attr("action", proxy);
            form.prependElement("input").attr("type", "hidden").attr("name", "_form").attr("value", "1");
            form.prependElement("input").attr("type", "hidden").attr("name", "_u").attr("value", action);
        }
    }

    private void stripBlockingPolicies(Document doc) {
        for (Element meta : doc.select("meta[http-equiv]")) {
            String kind = meta.attr("http-equiv").toLowerCase();
            if (kind.equals("content-security-policy")
                    || kind.equals("x-frame-options")
                    || kind.equals("refresh")) {
                meta.remove();
            }
        }
        doc.select("base").remove();
    }

    private static String encode(String text) {
        return URLEncoder.encode(text, StandardCharsets.UTF_8);
    }
}
