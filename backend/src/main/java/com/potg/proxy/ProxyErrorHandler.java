package com.potg.proxy;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProxyErrorHandler {

    @ExceptionHandler(ProxyException.class)
    public ResponseEntity<String> handle(ProxyException e) {
        return ResponseEntity.status(e.getCode().status)
                .contentType(MediaType.TEXT_HTML)
                .body(page(e.getCode()));
    }

    // The message comes from the enum, never from user input, so no XSS here.
    public static String page(ProxyException.ErrorCode c) {
        return """
            <!doctype html><html><head><meta charset="utf-8"><title>Proxy error</title></head>
            <body style="font-family:system-ui;padding:2rem;max-width:40rem">
            <h2>Could not load this page</h2><p>%s</p><p><code>%s</code></p>
            <script>parent.postMessage({source:'potg',type:'proxy-error',payload:{code:'%s',message:'%s'}},'*');</script>
            </body></html>""".formatted(c.message, c.name(), c.name(), c.message);
    }
}