package com.lovefinder.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import kotlinx.coroutines.launch

@Composable
fun ForgotScreen() {
    val context = LocalContext.current
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var step by remember { mutableStateOf("email") }
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var info by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("🔑", fontSize = 48.sp)
        Text("Forgot Password", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text(
            if (step == "email") "We'll send you a reset code"
            else "Enter the code sent to $email",
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(16.dp))
        if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error)
        if (info.isNotEmpty()) Text(info, color = MaterialTheme.colorScheme.primary)

        if (step == "email") {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = "" },
                label = { Text("Email") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    if (!Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$").matches(email.trim())) {
                        error = "Invalid email."
                        return@Button
                    }
                    loading = true
                    scope.launch {
                        try {
                            val res = api.forgot(mapOf("email" to email.trim()))
                            info = res.message ?: "Code sent."
                            step = "reset"
                        } catch (e: Exception) {
                            error = retrofitMessage(e)
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (loading) "Sending..." else "Send reset code") }
        } else {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.filter(Char::isDigit).take(6); error = "" },
                label = { Text("Reset code") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = newPassword,
                onValueChange = { newPassword = it; error = "" },
                label = { Text("New password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = confirm,
                onValueChange = { confirm = it; error = "" },
                label = { Text("Confirm new password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    error = when {
                        !Regex("^[0-9]{6}$").matches(code.trim()) -> "Enter the 6-digit code."
                        newPassword.length < 6 -> "Password must be at least 6 characters."
                        newPassword != confirm -> "Passwords do not match."
                        else -> ""
                    }
                    if (error.isNotEmpty()) return@Button
                    loading = true
                    scope.launch {
                        try {
                            val res = api.reset(
                                mapOf(
                                    "email" to email.trim(),
                                    "code" to code.trim(),
                                    "newPassword" to newPassword
                                )
                            )
                            info = res.message ?: "Password changed."
                        } catch (e: Exception) {
                            error = retrofitMessage(e)
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (loading) "Changing..." else "Change password") }
        }
    }
}
