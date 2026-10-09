package com.lovefinder.app.data

import android.content.Context
import android.content.SharedPreferences
import com.lovefinder.app.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/** Token store backed by SharedPreferences. */
class Session(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("love_finder", Context.MODE_PRIVATE)

    var token: String?
        get() = prefs.getString("token", null)
        set(value) = prefs.edit().putString("token", value).apply()

    fun logout() = prefs.edit().remove("token").apply()
    fun isLoggedIn(): Boolean = !token.isNullOrEmpty()
}

object ApiClient {
    @Volatile private var api: Api? = null

    fun get(context: Context): Api {
        return api ?: synchronized(this) {
            api ?: build(context.applicationContext).also { api = it }
        }
    }

    private fun build(context: Context): Api {
        val session = Session(context)
        val auth = Interceptor { chain ->
            val req = chain.request().newBuilder().apply {
                session.token?.let { header("Authorization", "Bearer $it") }
            }.build()
            chain.proceed(req)
        }
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(auth)
            .addInterceptor(logging)
            .build()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(Api::class.java)
    }
}

/** Extracts a readable message from a Retrofit HTTP error. */
fun retrofitMessage(e: Exception): String {
    val body = (e as? retrofit2.HttpException)?.response()?.errorBody()?.string()
    if (!body.isNullOrEmpty()) {
        return try {
            val json = com.google.gson.JsonParser.parseString(body).asJsonObject
            json.get("message")?.asString ?: body
        } catch (_: Exception) {
            body
        }
    }
    return e.message ?: "Network error"
}
