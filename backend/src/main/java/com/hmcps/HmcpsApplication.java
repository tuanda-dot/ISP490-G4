package com.hmcps;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Hai Minh Construction Payroll System (HMCPS) - Backend Application
 */
@SpringBootApplication
@EnableScheduling
public class HmcpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(HmcpsApplication.class, args);
    }
}
