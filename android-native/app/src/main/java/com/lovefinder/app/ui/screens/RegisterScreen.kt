package com.lovefinder.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.retrofitMessage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$")

@Composable
fun RegisterScreen(onRegistered: (String) -> Unit) {
    val context = LocalContext.current
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var hint by remember { mutableStateOf<String?>(null) }
    var checkJob by remember { mutableStateOf<Job?>(null) }

    LaunchedEffect(email) {
        val v = email.trim()
        if (!EMAIL_REGEX.matches(v)) {
            hint = null
            return@LaunchedEffect
        }
        hint = "checking"
        checkJob?.cancel()
        checkJob = launch {
            delay(450)
            hint = try {
                if (api.checkEmail(v).exists == true) "taken" else "free"
            } catch (_: Exception) {
                null
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("💕", fontSize = 48.sp)
        Text("Create Account", fontSize = 26.sp, fontWeight = FontWeight.Bold)
        Text("Start your love story today", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error)

        OutlinedTextField(name, { name = it }, label = { Text("Full name") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            email, { email = it; error = "" },
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )
        when (hint) {
            "checking" -> Text("Checking email...", fontSize = 12.sp)
            "free" -> Text("✓ Email available — a code will be sent.", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
            "taken" -> Text("Email already registered — sign in instead.", fontSize = 12.sp, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            phone, { phone = it.filter(Char::isDigit) },
            label = { Text("Phone") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            age, { age = it.filter(Char::isDigit).take(3) },
            label = { Text("Age") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            password, { password = it },
            label = { Text("Password (min 6)") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            confirm, { confirm = it },
            label = { Text("Confirm password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                val e = email.trim()
                val ageNum = age.toIntOrNull()
                error = when {
                    name.trim().length < 2 -> "Name must be at least 2 characters."
                    !EMAIL_REGEX.matches(e) -> "Invalid email."
                    hint == "taken" -> "Email already registered."
                    phone.length < 6 -> "Phone must be 6 to 15 digits."
                    ageNum == null || ageNum < 18 -> "You must be at least 18."
                    password.length < 6 -> "Password must be at least 6 characters."
                    password != confirm -> "Passwords do not match."
                    else -> ""
                }
                if (error.isNotEmpty()) return@Button
                loading = true
                scope.launch {
                    try {
                        api.register(
                            mapOf(
                                "name" to name.trim(), "email" to e,
                                "password" to password, "phone" to phone,
                                "countryCode" to "+212", "age" to ageNum, "gender" to "MALE"
                            )
                        )
                        onRegistered(e)
                    } catch (ex: Exception) {
                        error = retrofitMessage(ex)
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (loading) "Creating..." else "Create Account") }
    }
}
