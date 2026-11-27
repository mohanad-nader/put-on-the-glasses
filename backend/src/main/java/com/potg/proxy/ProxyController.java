package com.potg.proxy;

import com.potg.proxy.ProxyException.ErrorCode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {

    private static final int MAX_FORM_BYTES = 100 * 1024;

    private final ProxyService service;
    private final HtmlRewriter rewriter;

    public ProxyController(ProxyService service, HtmlRewriter rewriter) {
        this.service = service;
        this.rewriter = rewriter;
    }

    @GetMapping
    public ResponseEntity<?> get(@RequestParam MultiValueMap<String, String> params) {
        String target = targetOf(params);
        String url = target;

        // _form marks a GET form submit: the other parameters ARE the new query string
        if (params.containsKey("_form")) {
            url = FormQuery.withQuery(target, FormQuery.encode(params));
        }
        return respond(service.fetch(url));
    }

    @PostMapping
    public ResponseEntity<?> post(
            @RequestParam MultiValueMap<String, String> params,
            @RequestHeader(value = "Content-Type", required = false) String contentType) {
        // Reading request parameters consumes a urlencoded body, so the form fields come
        // from the parameter map here and are encoded again for the outgoing request.
        boolean urlencoded = contentType != null
                && contentType.toLowerCase().startsWith(MediaType.APPLICATION_FORM_URLENCODED_VALUE);
        if (!urlencoded) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }

        byte[] body = FormQuery.encode(params).getBytes(StandardCharsets.UTF_8);
        if (body.length > MAX_FORM_BYTES) {
            throw new ProxyException(ErrorCode.TOO_LARGE);
        }
        return respond(service.post(targetOf(params), body));
    }

    // A missing _u becomes our own error (friendly page) instead of Spring's default 400
    private static String targetOf(Map<String, List<String>> params) {
        List<String> values = params.get("_u");
        if (values == null || values.isEmpty()) {
            throw new ProxyException(ErrorCode.BAD_URL);
        }
        return values.get(0);
    }

    private ResponseEntity<?> respond(ProxyService.ProxyResult result) {
        // not HTML (PDF, image, download): let the browser load it directly
        if (result.body() == null) {
            return ResponseEntity.status(302).location(URI.create(result.finalUrl())).build();
        }

        String html = rewriter.rewrite(result.body(), result.charset(), result.finalUrl());

        // Upstream headers are never copied, so X-Frame-Options and CSP disappear by construction
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8))
                .header("Cache-Control", "no-store")
                .body(html);
    }
}
