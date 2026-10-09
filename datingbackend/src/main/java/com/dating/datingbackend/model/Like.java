package com.dating.datingbackend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "likes", uniqueConstraints = @UniqueConstraint(columnNames = {"liker_id", "liked_id"}))
public class Like {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "liker_id")
    private User liker;

    @ManyToOne(optional = false)
    @JoinColumn(name = "liked_id")
    private User liked;

    @Column(nullable = false)
    private String type = "LIKE"; // LIKE or PASS

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public User getLiker() { return liker; }
    public void setLiker(User liker) { this.liker = liker; }
    public User getLiked() { return liked; }
    public void setLiked(User liked) { this.liked = liked; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Instant getCreatedAt() { return createdAt; }
}
