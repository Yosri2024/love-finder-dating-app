package com.lovefinder.app.data

import com.google.gson.annotations.SerializedName

data class UserDto(
    val id: Long = 0,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val countryCode: String? = null,
    val age: Int? = null,
    val gender: String? = null,
    val bio: String? = null,
    val interests: String? = null
)

data class MatchItem(
    val id: Long = 0,
    val name: String? = null,
    val age: Int? = null,
    val bio: String? = null,
    val lastMessage: String? = null,
    val time: String? = null
)

data class ChatMessage(
    val id: Long = 0,
    val content: String? = null,
    val senderId: Long = 0,
    val recipientId: Long = 0,
    val sentByMe: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val edited: Boolean = false
)

data class AuthStep1(
    val requiresCode: Boolean? = null,
    val message: String? = null,
    val devCode: String? = null,
    val token: String? = null,
    val user: UserDto? = null
)

data class TokenEnvelope(
    val token: String? = null,
    val user: UserDto? = null
)

data class SimpleResponse(
    val message: String? = null,
    val ok: Boolean? = null,
    val matched: Boolean? = null,
    val exists: Boolean? = null,
    val devCode: String? = null
)
