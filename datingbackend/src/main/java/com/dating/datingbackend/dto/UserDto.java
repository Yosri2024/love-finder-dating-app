package com.dating.datingbackend.dto;

import com.dating.datingbackend.model.User;
import java.util.HashMap;
import java.util.Map;

public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String countryCode;
    private Integer age;
    private String gender;
    private String bio;
    private String interests;

    public static UserDto from(User u) {
        UserDto dto = new UserDto();
        dto.id = u.getId();
        dto.name = u.getName();
        dto.email = u.getEmail();
        dto.phone = u.getPhone();
        dto.countryCode = u.getCountryCode();
        dto.age = u.getAge();
        dto.gender = u.getGender();
        dto.bio = u.getBio();
        dto.interests = u.getInterests();
        return dto;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("email", email);
        m.put("phone", phone);
        m.put("countryCode", countryCode);
        m.put("age", age);
        m.put("gender", gender);
        m.put("bio", bio);
        m.put("interests", interests);
        return m;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getCountryCode() { return countryCode; }
    public Integer getAge() { return age; }
    public String getGender() { return gender; }
    public String getBio() { return bio; }
    public String getInterests() { return interests; }
}
