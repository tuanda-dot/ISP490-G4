package com.hmcps.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "BearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("HMCPS API - Hai Minh Construction Payroll System")
                        .description("Tài liệu đặc tả toàn bộ RESTful API cho hệ thống Chấm công & Tính lương Công ty Xây dựng Hải Minh. " +
                                "Bao gồm Chấm công Face ID/GPS, Lõi tính lương 8 khối cột, Sổ cái kép MISA (TT 200), Phiếu lương PIN.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("HMCPS Engineering Team")
                                .email("dev@haiminh.vn"))
                        .license(new License().name("Internal Proprietary").url("https://haiminh.vn")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Nhập Bearer Token (JWT) được trả về từ API /api/v1/auth/login")));
    }
}
