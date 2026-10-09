package com.dating.datingbackend.repository;

import com.dating.datingbackend.model.Message;
import com.dating.datingbackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE (m.sender = :a AND m.recipient = :b) OR (m.sender = :b AND m.recipient = :a) ORDER BY m.createdAt ASC, m.id ASC")
    List<Message> conversation(User a, User b);

    @Query("SELECT m FROM Message m WHERE (m.sender = :a AND m.recipient = :b) OR (m.sender = :b AND m.recipient = :a) ORDER BY m.createdAt DESC, m.id DESC")
    List<Message> conversationDesc(User a, User b);

    Optional<Message> findByIdAndSender(Long id, User sender);
}
