package com.potg;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan // finds ProxyProperties without extra registration
public class PotgApplication {

    public static void main(String[] args) {
        SpringApplication.run(PotgApplication.class, args);
    }
}
