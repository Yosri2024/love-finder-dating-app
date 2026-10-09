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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.Session
import com.lovefinder.app.data.retrofitMessage
import kotlinx.coroutines.launch

@Composable
fun VerifyScreen(email: String, onVerified: () -> Unit) {
    val context = LocalContext.current
    val api = remember { ApiClient.get(context) }
    val session = remember { Session(context) }
    val scope = rememberCoroutineScope()

    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("✉️", fontSize = 48.sp)
        Text("Check your email", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text("Enter the 6-digit code sent to $email", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error)
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.filter(Char::isDigit).take(6); error = "" },
            label = { Text("Code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                if (!Regex("^[0-9]{6}$").matches(code.trim())) {
                    error = "Enter the 6-digit code."
                    return@Button
                }
                loading = true
                scope.launch {
                    try {
                        val res = api.verify(mapOf("email" to email, "code" to code.trim()))
                        session.token = res.token
                        onVerified()
                    } catch (e: Exception) {
                        error = retrofitMessage(e)
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (loading) "Verifying..." else "Verify") }
    }
}
