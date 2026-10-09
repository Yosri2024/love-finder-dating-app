package com.dating.datingbackend.controller;

import com.dating.datingbackend.model.Message;
import com.dating.datingbackend.model.User;
import com.dating.datingbackend.repository.MessageRepository;
import com.dating.datingbackend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageRepository messages;
    private final UserRepository users;

    public MessageController(MessageRepository messages, UserRepository users) {
        this.messages = messages;
        this.users = users;
    }

    private User me(Authentication auth) {
        return users.findByEmail(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toMap(Message m, Long myId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("content", m.getContent());
        map.put("senderId", m.getSender().getId());
        map.put("recipientId", m.getRecipient().getId());
        map.put("sentByMe", m.getSender().getId().equals(myId));
        map.put("createdAt", m.getCreatedAt() == null ? null : m.getCreatedAt().toString());
        map.put("updatedAt", m.getUpdatedAt() == null ? null : m.getUpdatedAt().toString());
        map.put("edited", m.isEdited());
        return map;
    }

    /** Persistent chat history with another user. {matchId} is the OTHER user's id. */
    @GetMapping("/{matchId}")
    public ResponseEntity<?> list(@PathVariable Long matchId, Authentication auth) {
        User me = me(auth);
        User other = users.findById(matchId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Message> conv = messages.conversation(me, other);
        return ResponseEntity.ok(conv.stream().map(m -> toMap(m, me.getId())).toList());
    }

    @PostMapping("/{matchId}")
    public ResponseEntity<?> send(@PathVariable Long matchId,
                                  @RequestBody Map<String, Object> body,
                                  Authentication auth) {
        User me = me(auth);
        User other = users.findById(matchId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (me.getId().equals(other.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot message yourself."));
        }
        Object raw = body.get("content");
        String content = raw == null ? "" : String.valueOf(raw).trim();
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message content is required."));
        }
        if (content.length() > 2000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message too long (max 2000)."));
        }
        Message m = new Message();
        m.setSender(me);
        m.setRecipient(other);
        m.setContent(content);
        messages.save(m);
        return ResponseEntity.ok(toMap(m, me.getId()));
    }

    /** Edit own message. */
    @PutMapping("/{id}")
    public ResponseEntity<?> edit(@PathVariable Long id,
                                  @RequestBody Map<String, Object> body,
                                  Authentication auth) {
        User me = me(auth);
        Message m = messages.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (!m.getSender().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only edit your own messages."));
        }
        Object raw = body.get("content");
        String content = raw == null ? "" : String.valueOf(raw).trim();
        if (content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message content is required."));
        }
        if (content.length() > 2000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message too long (max 2000)."));
        }
        m.setContent(content);
        m.setEdited(true);
        m.setUpdatedAt(Instant.now());
        messages.save(m);
        return ResponseEntity.ok(toMap(m, me.getId()));
    }

    /** Delete own message. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        User me = me(auth);
        Message m = messages.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (!m.getSender().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only delete your own messages."));
        }
        messages.delete(m);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
