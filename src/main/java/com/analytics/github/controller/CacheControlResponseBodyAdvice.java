package com.analytics.github.controller;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Controller advice that enforces Cache-Control: no-store on all REST responses
 * under com.analytics.github.controller to prevent any browser, proxy, or host
 * from caching stale or empty analytics and capability payloads.
 */
@ControllerAdvice(basePackages = "com.analytics.github.controller")
public class CacheControlResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        response.getHeaders().set(HttpHeaders.CACHE_CONTROL, "no-store");
        return body;
    }
}
