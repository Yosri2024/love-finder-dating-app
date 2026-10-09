package com.dating.datingbackend.dto;

public class LoginRequest {
    private String email;
    private String password;
    // phone-login variants sent by frontend
    private String phone;
    private String phoneNumber;
    private String username;
    private String countryCode;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }

    /** Frontend sends email=fullPhone for phone login, so resolve identifier. */
    public String resolveIdentifier() {
        if (email != null && !email.isBlank()) return email.trim();
        if (phone != null && !phone.isBlank()) return phone.trim();
        if (phoneNumber != null && !phoneNumber.isBlank()) return phoneNumber.trim();
        if (username != null && !username.isBlank()) return username.trim();
        return "";
    }
}
