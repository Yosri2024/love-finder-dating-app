package com.dating.datingbackend.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyRequest {
    @NotBlank
    private String email;
    @NotBlank
    private String code;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
