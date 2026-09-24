package br.com.foco.api;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
class LocalAuthFilter extends OncePerRequestFilter {
    private final String token;
    LocalAuthFilter(@Value("${FOCO_API_TOKEN:}") String token){this.token=token;}
    @Override protected boolean shouldNotFilter(HttpServletRequest request){return request.getRequestURI().equals("/api/health");}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String supplied=request.getHeader("X-Foco-Token");
        if(token.isBlank()||!java.security.MessageDigest.isEqual(token.getBytes(java.nio.charset.StandardCharsets.UTF_8),(supplied==null?"":supplied).getBytes(java.nio.charset.StandardCharsets.UTF_8))){response.sendError(401);return;}
        chain.doFilter(request,response);
    }
}
