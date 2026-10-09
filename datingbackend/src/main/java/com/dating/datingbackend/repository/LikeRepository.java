package com.dating.datingbackend.repository;

import com.dating.datingbackend.model.Like;
import com.dating.datingbackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Long> {
    Optional<Like> findByLikerAndLiked(User liker, User liked);
    List<Like> findByLikerAndType(User liker, String type);
    List<Like> findByLikedAndType(User liked, String type);
}
