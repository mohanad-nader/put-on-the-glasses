package com.potg.proxy;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FormQueryTest {

    @Test
    void encodeSkipsOurControlFields() {
        Map<String, List<String>> params = new LinkedHashMap<>();
        params.put("_u", List.of("https://example.com/search"));
        params.put("_form", List.of("1"));
        params.put("q", List.of("hello world"));

        assertEquals("q=hello+world", FormQuery.encode(params));
    }

    @Test
    void encodeKeepsRepeatedFieldsInOrder() {
        Map<String, List<String>> params = new LinkedHashMap<>();
        params.put("tag", List.of("a", "b"));
        params.put("x", List.of("1&2"));

        assertEquals("tag=a&tag=b&x=1%262", FormQuery.encode(params));
    }

    @Test
    void withQueryReplacesTheOldQueryAndFragment() {
        assertEquals(
                "https://example.com/s?q=1",
                FormQuery.withQuery("https://example.com/s?old=1#top", "q=1"));
    }

    @Test
    void withQueryWithoutFieldsLeavesNoQuestionMark() {
        assertEquals("https://example.com/s", FormQuery.withQuery("https://example.com/s?old=1", ""));
    }
}
