package com.potg.proxy;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

/**
 * Builds the one inline script that HtmlRewriter puts into every proxied page.
 * It reads every classpath:sim/*.js once at startup and joins them in file-name order,
 * which is why the files are called 00-core, 10-keyboard, 20-tremor, 30-screenreader, 40-taborder.
 * The method signature forPage(String) is part of the team contract.
 */
@Component
public class SimScripts {

    private final String bundle;

    public SimScripts() {
        try {
            Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:sim/*.js");
            Arrays.sort(files, Comparator.comparing((Resource f) -> Objects.requireNonNullElse(f.getFilename(), ""))); // 00-core must come first
            StringBuilder sb = new StringBuilder();
            for (Resource file : files) {
                sb.append(new String(file.getInputStream().readAllBytes(), StandardCharsets.UTF_8)).append('\n');
            }
            this.bundle = sb.toString();
        } catch (IOException e) {
            // unchecked on purpose: a checked exception here would force every caller
            // (and every test that does new SimScripts()) to declare it
            throw new UncheckedIOException("Could not read the injected scripts from classpath:sim/", e);
        }
    }

    /** The script text for one page: a line that defines the page address, then every module. */
    public String forPage(String pageUrl) {
        return "window.__POTG_PAGE_URL=" + js(pageUrl) + ";\n" + bundle;
    }

    // '<' becomes \u003c so a URL can never close the script tag
    private static String js(String s) {
        return "\"" + s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("<", "\\u003c")
                .replace("\n", "")
                .replace("\r", "") + "\"";
    }
}
