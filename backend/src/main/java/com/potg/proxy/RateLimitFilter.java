package com.potg.proxy;

import com.potg.config.ProxyProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final ProxyProperties props;

    public RateLimitFilter(ProxyProperties props) {
        this.props = props;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/proxy");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        Deque<Long> q = hits.computeIfAbsent(req.getRemoteAddr(), k -> new ConcurrentLinkedDeque<>());
        while (!q.isEmpty() && now - q.peekFirst() > 60_000) {
            q.pollFirst();
        }
        if (q.size() >= props.maxPerMinute()) {
            res.setStatus(429);
            res.setContentType("text/html;charset=UTF-8");
            res.getWriter().write(ProxyErrorHandler.page(ProxyException.ErrorCode.RATE_LIMITED));
            return;
        }
        q.addLast(now);
        chain.doFilter(req, res);
    }
}