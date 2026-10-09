package com.dating.datingbackend.controller;

import com.dating.datingbackend.dto.UserDto;
import com.dating.datingbackend.model.User;
import com.dating.datingbackend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        return users.findByEmail(auth.getName())
                .map(u -> ResponseEntity.ok(UserDto.from(u).toMap()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(Authentication auth, @RequestBody Map<String, Object> body) {
        return users.findByEmail(auth.getName()).map(u -> {
            if (body.get("name") != null) u.setName(String.valueOf(body.get("name")));
            if (body.get("bio") != null) u.setBio(String.valueOf(body.get("bio")));
            if (body.get("interests") != null) u.setInterests(String.valueOf(body.get("interests")));
            if (body.get("phone") != null) u.setPhone(String.valueOf(body.get("phone")));
            if (body.get("countryCode") != null) u.setCountryCode(String.valueOf(body.get("countryCode")));
            if (body.get("gender") != null) u.setGender(String.valueOf(body.get("gender")));
            if (body.get("age") != null) {
                try { u.setAge(Integer.valueOf(String.valueOf(body.get("age")))); } catch (Exception ignored) {}
            }
            users.save(u);
            return ResponseEntity.ok(UserDto.from(u).toMap());
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam(defaultValue = "") String q, Authentication auth) {
        User me = users.findByEmail(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
        String query = q == null ? "" : q.trim().toLowerCase();
        if (query.isEmpty()) return ResponseEntity.ok(List.of());
        List<Map<String, Object>> starts = new ArrayList<>();
        List<Map<String, Object>> nameHits = new ArrayList<>();
        List<Map<String, Object>> rest = new ArrayList<>();
        for (User u : users.findAll()) {
            if (u.getId().equals(me.getId()) || !u.isVerified()) continue;
            String name = u.getName() == null ? "" : u.getName().toLowerCase();
            String bio = u.getBio() == null ? "" : u.getBio().toLowerCase();
            String interests = u.getInterests() == null ? "" : u.getInterests().toLowerCase();
            boolean prefix = name.startsWith(query)
                    || Arrays.stream(name.split("\\s+")).anyMatch(w -> w.startsWith(query));
            if (prefix) starts.add(UserDto.from(u).toMap());
            else if (name.contains(query)) nameHits.add(UserDto.from(u).toMap());
            // single-letter queries match names only (bio hits are noise for "d", "k", ...)
            else if (query.length() >= 2 && (bio.contains(query) || interests.contains(query))) {
                rest.add(UserDto.from(u).toMap());
            }
        }
        List<Map<String, Object>> out = new ArrayList<>(starts);
        out.addAll(nameHits);
        out.addAll(rest);
        return ResponseEntity.ok(out.stream().limit(20).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> byId(@PathVariable Long id) {
        return users.findById(id)
                .map(u -> ResponseEntity.ok(UserDto.from(u).toMap()))
                .orElse(ResponseEntity.notFound().build());
    }
}
