package com.lovefinder.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.Session
import com.lovefinder.app.data.retrofitMessage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$")

@Composable
fun LoginScreen(onLoggedIn: () -> Unit, onGoRegister: () -> Unit = {}) {
    val context = LocalContext.current
    val api = remember { ApiClient.get(context) }
    val session = remember { Session(context) }
    val scope = rememberCoroutineScope()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    // step 2: email code
    var step by remember { mutableStateOf("credentials") }
    var code by remember { mutableStateOf("") }
    var codeError by remember { mutableStateOf("") }
    var info by remember { mutableStateOf("") }
    var lastPayload by remember { mutableStateOf<Map<String, String>?>(null) }

    // live email existence check
    var hint by remember { mutableStateOf<String?>(null) } // null | checking | found | missing
    var checkJob by remember { mutableStateOf<Job?>(null) }
    LaunchedEffect(email) {
        val v = email.trim()
        if (!EMAIL_REGEX.matches(v) || step != "credentials") {
            hint = null
            return@LaunchedEffect
        }
        hint = "checking"
        checkJob?.cancel()
        checkJob = launch {
            delay(450)
            hint = try {
                if (api.checkEmail(v).exists == true) "found" else "missing"
            } catch (_: Exception) {
                null
            }
        }
    }

    fun finishLogin(token: String) {
        session.token = token
        onLoggedIn()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("💕", fontSize = 48.sp)
        Text("Welcome Back", fontSize = 26.sp, fontWeight = FontWeight.Bold)
        Text("Sign in to continue your journey", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(20.dp))

        if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error)
        if (info.isNotEmpty() && step == "code") Text(info, color = MaterialTheme.colorScheme.primary)

        if (step == "code") {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.filter(Char::isDigit).take(6); codeError = "" },
                label = { Text("6-digit code") },
                supportingText = { Text("Sent to $email") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                isError = codeError.isNotEmpty(),
                modifier = Modifier.fillMaxWidth()
            )
            if (codeError.isNotEmpty()) Text(codeError, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    if (!Regex("^[0-9]{6}$").matches(code.trim())) {
                        codeError = "Enter the 6-digit code."
                        return@Button
                    }
                    loading = true
                    scope.launch {
                        try {
                            val res = api.verifyLogin(mapOf("email" to email.trim(), "code" to code.trim()))
                            finishLogin(res.token ?: "")
                        } catch (e: Exception) {
                            codeError = retrofitMessage(e)
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (loading) "Verifying..." else "Verify & Sign In") }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = {
                    scope.launch {
                        try {
                            lastPayload?.let { api.login(it) }
                            info = "New code sent."
                        } catch (e: Exception) {
                            codeError = retrofitMessage(e)
                        }
                    }
                }) { Text("Resend code") }
                TextButton(onClick = { step = "credentials"; info = "" }) { Text("← Back") }
            }
        } else {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = "" },
                label = { Text("Email") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                isError = false,
                modifier = Modifier.fillMaxWidth()
            )
            when (hint) {
                "checking" -> Text("Checking email...", fontSize = 12.sp)
                "found" -> Text(
                    "✓ Account found — a code will be emailed.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                "missing" -> Text(
                    "No account with this email.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error
                )
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; error = "" },
                label = { Text("Password") },
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    TextButton(onClick = { showPassword = !showPassword }) {
                        Text(if (showPassword) "Hide" else "Show")
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    val e = email.trim()
                    if (!EMAIL_REGEX.matches(e)) {
                        error = "Invalid email."
                        return@Button
                    }
                    if (password.length < 6) {
                        error = "Password must be at least 6 characters."
                        return@Button
                    }
                    error = ""
                    loading = true
                    val payload = mapOf("email" to e, "password" to password)
                    scope.launch {
                        try {
                            val res = api.login(payload)
                            if (res.requiresCode == true) {
                                lastPayload = payload
                                code = ""
                                info = res.message ?: "Code sent."
                                step = "code"
                            } else if (!res.token.isNullOrEmpty()) {
                                finishLogin(res.token!!)
                            }
                        } catch (ex: Exception) {
                            error = retrofitMessage(ex)
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (loading) "Signing in..." else "Sign In") }
        }
        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("New to Love Finder?", fontSize = 13.sp)
            TextButton(onClick = onGoRegister) { Text("Create account") }
        }
    }
}
