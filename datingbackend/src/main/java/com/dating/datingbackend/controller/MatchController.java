package com.dating.datingbackend.controller;

import com.dating.datingbackend.dto.UserDto;
import com.dating.datingbackend.model.Like;
import com.dating.datingbackend.model.Message;
import com.dating.datingbackend.model.User;
import com.dating.datingbackend.repository.LikeRepository;
import com.dating.datingbackend.repository.MessageRepository;
import com.dating.datingbackend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final UserRepository users;
    private final LikeRepository likes;
    private final MessageRepository messages;

    public MatchController(UserRepository users, LikeRepository likes, MessageRepository messages) {
        this.users = users;
        this.likes = likes;
        this.messages = messages;
    }

    private User me(Authentication auth) {
        return users.findByEmail(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean isMutual(User a, User b) {
        Optional<Like> ab = likes.findByLikerAndLiked(a, b);
        Optional<Like> ba = likes.findByLikerAndLiked(b, a);
        return ab.isPresent() && "LIKE".equals(ab.get().getType())
                && ba.isPresent() && "LIKE".equals(ba.get().getType());
    }

    /** Discover: verified users excluding self + anyone I already liked/passed. */
    @GetMapping("/recommendations")
    public ResponseEntity<?> recommendations(Authentication auth) {
        User me = me(auth);
        Set<Long> acted = new HashSet<>();
        // anyone I have a Like row for (LIKE or PASS) is excluded
        likes.findAll().stream()
                .filter(l -> l.getLiker().getId().equals(me.getId()))
                .forEach(l -> acted.add(l.getLiked().getId()));
        List<Map<String, Object>> list = users.findAll().stream()
                .filter(u -> !u.getId().equals(me.getId()) && u.isVerified())
                .filter(u -> !acted.contains(u.getId()))
                .map(u -> UserDto.from(u).toMap())
                .toList();
        return ResponseEntity.ok(list);
    }

    /** Mutual matches only — persistent, backed by Like rows. */
    @GetMapping
    public ResponseEntity<?> myMatches(Authentication auth) {
        User me = me(auth);
        // users I liked
        List<Like> myLikes = likes.findByLikerAndType(me, "LIKE");
        List<Map<String, Object>> list = new ArrayList<>();
        for (Like l : myLikes) {
            User other = l.getLiked();
            Optional<Like> back = likes.findByLikerAndLiked(other, me);
            if (back.isPresent() && "LIKE".equals(back.get().getType())) {
                List<Message> conv = messages.conversationDesc(me, other);
                String last = conv.isEmpty() ? "" : conv.get(0).getContent();
                String time = conv.isEmpty() ? "now"
                        : conv.get(0).getCreatedAt().toString();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", other.getId());
                m.put("name", other.getName());
                m.put("age", other.getAge());
                m.put("bio", other.getBio());
                m.put("lastMessage", last);
                m.put("time", time);
                list.add(m);
            }
        }
        return ResponseEntity.ok(list);
    }

    /** Incoming invites: users who liked me and I haven't acted on yet. */
    @GetMapping("/invites")
    public ResponseEntity<?> invites(Authentication auth) {
        User me = me(auth);
        List<Like> incoming = likes.findByLikedAndType(me, "LIKE");
        List<Map<String, Object>> list = new ArrayList<>();
        for (Like l : incoming) {
            User other = l.getLiker();
            // skip if I already acted (liked or passed them)
            if (likes.findByLikerAndLiked(me, other).isPresent()) continue;
            Map<String, Object> m = UserDto.from(other).toMap();
            m.put("likedAt", l.getCreatedAt() == null ? null : l.getCreatedAt().toString());
            list.add(m);
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping("/like/{userId}")
    public ResponseEntity<?> like(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (me.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot like yourself."));
        }
        User other = users.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Optional<Like> existing = likes.findByLikerAndLiked(me, other);
        Like like;
        if (existing.isPresent()) {
            like = existing.get();
            like.setType("LIKE");
        } else {
            like = new Like();
            like.setLiker(me);
            like.setLiked(other);
            like.setType("LIKE");
        }
        likes.save(like);
        boolean matched = likes.findByLikerAndLiked(other, me)
                .map(l -> "LIKE".equals(l.getType())).orElse(false);
        return ResponseEntity.ok(Map.of("matched", matched));
    }

    @PostMapping("/pass/{userId}")
    public ResponseEntity<?> pass(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (me.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot pass yourself."));
        }
        User other = users.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Optional<Like> existing = likes.findByLikerAndLiked(me, other);
        if (existing.isPresent()) {
            existing.get().setType("PASS");
            likes.save(existing.get());
        } else {
            Like p = new Like();
            p.setLiker(me);
            p.setLiked(other);
            p.setType("PASS");
            likes.save(p);
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
