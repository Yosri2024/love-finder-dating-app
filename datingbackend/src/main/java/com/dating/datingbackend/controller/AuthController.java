package com.dating.datingbackend.controller;

import com.dating.datingbackend.dto.LoginRequest;
import com.dating.datingbackend.dto.RegisterRequest;
import com.dating.datingbackend.dto.UserDto;
import com.dating.datingbackend.dto.VerifyRequest;
import com.dating.datingbackend.model.User;
import com.dating.datingbackend.repository.UserRepository;
import com.dating.datingbackend.security.JwtService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final boolean debugCodes;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder,
                          JwtService jwtService, JavaMailSender mailSender,
                          @org.springframework.beans.factory.annotation.Value("${app.debug-codes:true}") boolean debugCodes) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailSender = mailSender;
        this.debugCodes = debugCodes;
    }

    private String newCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private void sendMail(String to, String subject, String text) {
        log.warn("MAIL to {} | {} | {}", to, subject, text);
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
        } catch (Exception e) {
            log.warn("Mail send failed (dev mode, continuing): {}", e.getMessage());
        }
    }

    // Live check while typing: does this email exist?
    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        String clean = email == null ? "" : email.trim().toLowerCase();
        if (clean.isEmpty() || !clean.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email."));
        }
        boolean exists = users.findByEmail(clean).isPresent();
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered."));
        }
        User u = new User();
        u.setName(req.getName().trim());
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        u.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        u.setCountryCode(req.getCountryCode());
        u.setAge(req.getAge());
        u.setGender(req.getGender());
        u.setVerified(false);
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        u.setVerificationCode(code);
        users.save(u);

        log.warn("VERIFY CODE for {} = {} (use this in /verify while mail is not configured)", email, code);
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(email);
            msg.setSubject("Love Finder - verification code");
            msg.setText("Your code is: " + code);
            mailSender.send(msg);
        } catch (Exception e) {
            log.warn("Mail send failed (dev mode, continuing): {}", e.getMessage());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("message", "Registered. Check your email for the 6-digit code.");
        res.put("devCode", code); // frontend ignores it, useful for local testing
        return ResponseEntity.ok(res);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody VerifyRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        Optional<User> opt = users.findByEmail(email);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Account not found."));
        }
        User u = opt.get();
        if (!req.getCode().trim().equals(u.getVerificationCode())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid code."));
        }
        u.setVerified(true);
        u.setVerificationCode(null);
        users.save(u);
        String token = jwtService.generate(u.getEmail());
        Map<String, Object> res = new HashMap<>();
        res.put("token", token);
        res.put("user", UserDto.from(u).toMap());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String identifier = req.resolveIdentifier().trim();
        String password = req.getPassword();
        if (identifier.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email/phone and password are required."));
        }
        Optional<User> opt;
        if (identifier.contains("@")) {
            opt = users.findByEmail(identifier.toLowerCase());
        } else {
            opt = users.findByPhone(identifier);
            if (opt.isEmpty() && identifier.startsWith("+")) {
                // stored phones have no country prefix ("60000000") but login sends "+21260000000"
                String digits = identifier.substring(1);
                opt = users.findAll().stream()
                        .filter(u -> u.getPhone() != null && !u.getPhone().isEmpty() && digits.endsWith(u.getPhone()))
                        .findFirst();
            }
            if (opt.isEmpty()) opt = users.findByEmail(identifier.toLowerCase());
        }
        if (opt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password."));
        }
        User u = opt.get();
        if (!passwordEncoder.matches(password, u.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password."));
        }
        if (!u.isVerified()) {
            return ResponseEntity.status(403).body(Map.of("message", "Please verify your email first (code sent at register)."));
        }
        // Step 1: password OK -> send 6-digit login code by email (valid 10 min)
        String code = newCode();
        u.setLoginCode(code);
        u.setLoginCodeExpiresAt(Instant.now().plusSeconds(600));
        users.save(u);
        sendMail(u.getEmail(), "Love Finder - login code", "Your login code is: " + code + "\nValid for 10 minutes. If this wasn't you, change your password.");
        Map<String, Object> res = new HashMap<>();
        res.put("requiresCode", true);
        res.put("message", "Code sent to your email. Enter it to finish signing in.");
        res.put("devCode", code);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login/verify")
    public ResponseEntity<?> verifyLogin(@RequestBody Map<String, Object> body) {
        String email = body.get("email") == null ? "" : String.valueOf(body.get("email")).trim().toLowerCase();
        String code = body.get("code") == null ? "" : String.valueOf(body.get("code")).trim();
        if (email.isEmpty() || code.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and code are required."));
        }
        Optional<User> opt = users.findByEmail(email);
        if (opt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid code."));
        }
        User u = opt.get();
        if (u.getLoginCode() == null || !code.equals(u.getLoginCode())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid code."));
        }
        if (u.getLoginCodeExpiresAt() != null && Instant.now().isAfter(u.getLoginCodeExpiresAt())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code expired. Please login again."));
        }
        u.setLoginCode(null);
        u.setLoginCodeExpiresAt(null);
        users.save(u);
        String token = jwtService.generate(u.getEmail());
        Map<String, Object> res = new HashMap<>();
        res.put("token", token);
        res.put("user", UserDto.from(u).toMap());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@RequestBody Map<String, Object> body) {
        String email = body.get("email") == null ? "" : String.valueOf(body.get("email")).trim().toLowerCase();
        if (email.isEmpty() || !email.contains("@")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid email is required."));
        }
        Map<String, Object> res = new HashMap<>();
        res.put("message", "If an account exists for this email, a reset code was sent.");
        Optional<User> opt = users.findByEmail(email);
        if (opt.isPresent()) {
            User u = opt.get();
            String code = newCode();
            u.setResetCode(code);
            u.setResetCodeExpiresAt(Instant.now().plusSeconds(900));
            users.save(u);
            sendMail(email, "Love Finder - password reset", "Your reset code is: " + code + "\nValid for 15 minutes.");
            res.put("devCode", code);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(@RequestBody Map<String, Object> body) {
        String email = body.get("email") == null ? "" : String.valueOf(body.get("email")).trim().toLowerCase();
        String code = body.get("code") == null ? "" : String.valueOf(body.get("code")).trim();
        String newPassword = body.get("newPassword") == null ? "" : String.valueOf(body.get("newPassword"));
        if (email.isEmpty() || code.isEmpty() || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email, code and new password are required."));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 6 characters."));
        }
        Optional<User> opt = users.findByEmail(email);
        if (opt.isEmpty() || opt.get().getResetCode() == null || !code.equals(opt.get().getResetCode())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid code."));
        }
        User u = opt.get();
        if (u.getResetCodeExpiresAt() != null && Instant.now().isAfter(u.getResetCodeExpiresAt())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code expired. Request a new one."));
        }
        u.setPassword(passwordEncoder.encode(newPassword));
        u.setResetCode(null);
        u.setResetCodeExpiresAt(null);
        users.save(u);
        sendMail(email, "Love Finder - password changed", "Your password was just changed. If this wasn't you, contact support immediately.");
        return ResponseEntity.ok(Map.of("message", "Password changed. You can now login."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body,
                                            org.springframework.security.core.Authentication auth) {
        String current = body.get("currentPassword") == null ? "" : String.valueOf(body.get("currentPassword"));
        String next = body.get("newPassword") == null ? "" : String.valueOf(body.get("newPassword"));
        if (current.isEmpty() || next.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current and new passwords are required."));
        }
        if (next.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 6 characters."));
        }
        Optional<User> opt = users.findByEmail(auth.getName());
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Account not found."));
        User u = opt.get();
        if (!passwordEncoder.matches(current, u.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Current password is incorrect."));
        }
        u.setPassword(passwordEncoder.encode(next));
        users.save(u);
        sendMail(u.getEmail(), "Love Finder - password changed", "Your password was just changed. If this wasn't you, contact support immediately.");
        return ResponseEntity.ok(Map.of("message", "Password changed."));
    }

    // DEV ONLY: get code without mail while testing locally (disabled in prod via APP_DEBUG_CODES=false)
    @GetMapping("/debug-code")
    public ResponseEntity<?> debugCode(@RequestParam String email) {
        if (!debugCodes) {
            return ResponseEntity.status(404).body(Map.of("message", "Not found."));
        }        return users.findByEmail(email.trim().toLowerCase())
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("code", u.getVerificationCode() == null ? "" : u.getVerificationCode());
                    m.put("loginCode", u.getLoginCode() == null ? "" : u.getLoginCode());
                    m.put("resetCode", u.getResetCode() == null ? "" : u.getResetCode());
                    return ResponseEntity.ok(m);
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "Account not found.")));
    }
}
