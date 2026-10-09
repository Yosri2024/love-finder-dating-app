package com.lovefinder.app.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface Api {
    @POST("auth/register")
    suspend fun register(@Body body: Map<String, @JvmSuppressWildcards Any?>): SimpleResponse

    @POST("auth/verify")
    suspend fun verify(@Body body: Map<String, String>): TokenEnvelope

    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthStep1

    @POST("auth/login/verify")
    suspend fun verifyLogin(@Body body: Map<String, String>): TokenEnvelope

    @GET("auth/check-email")
    suspend fun checkEmail(@Query("email") email: String): SimpleResponse

    @POST("auth/forgot")
    suspend fun forgot(@Body body: Map<String, String>): SimpleResponse

    @POST("auth/reset")
    suspend fun reset(@Body body: Map<String, String>): SimpleResponse

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: Map<String, String>): SimpleResponse

    @GET("users/me")
    suspend fun me(): UserDto

    @PUT("users/me")
    suspend fun updateMe(@Body body: Map<String, @JvmSuppressWildcards Any?>): UserDto

    @GET("users/{id}")
    suspend fun userById(@Path("id") id: Long): UserDto

    @GET("users/search")
    suspend fun searchUsers(@Query("q") q: String): List<UserDto>

    @GET("matches/recommendations")
    suspend fun recommendations(): List<UserDto>

    @GET("matches")
    suspend fun matches(): List<MatchItem>

    @GET("matches/invites")
    suspend fun invites(): List<UserDto>

    @POST("matches/like/{id}")
    suspend fun like(@Path("id") id: Long): SimpleResponse

    @POST("matches/pass/{id}")
    suspend fun pass(@Path("id") id: Long): SimpleResponse

    @GET("messages/{id}")
    suspend fun messages(@Path("id") id: Long): List<ChatMessage>

    @POST("messages/{id}")
    suspend fun sendMessage(@Path("id") id: Long, @Body body: Map<String, String>): ChatMessage

    @PUT("messages/{id}")
    suspend fun editMessage(@Path("id") id: Long, @Body body: Map<String, String>): ChatMessage

    @DELETE("messages/{id}")
    suspend fun deleteMessage(@Path("id") id: Long): SimpleResponse
}
