package com.lovefinder.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.retrofitMessage
import com.lovefinder.app.ui.swipeTabs
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(nav: androidx.navigation.NavController) {
    val context = LocalContext.current
    val threshold = with(LocalDensity.current) { 100.dp.toPx() }
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var notifications by remember { mutableStateOf(true) }
    var sounds by remember { mutableStateOf(true) }
    var privateProfile by remember { mutableStateOf(false) }
    var showOnline by remember { mutableStateOf(true) }

    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var pwdError by remember { mutableStateOf("") }
    var pwdInfo by remember { mutableStateOf("") }
    var pwdLoading by remember { mutableStateOf(false) }
    var pwdOpen by remember { mutableStateOf(false) }

    var dialog by remember { mutableStateOf<Pair<String, String>?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .swipeTabs(thresholdPx = threshold, onRight = { nav.popBackStack() })
    ) {
        // Pro header: circular back icon + title (no "Back" text)
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { nav.popBackStack() },
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Spacer(Modifier.width(12.dp))
            Text("Settings", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionTitle("Account")
            SettingsCard {
                SettingRow(Icons.Filled.Person, "Edit Profile", "Name, bio, interests", onClick = {
                    nav.navigate("profile") { popUpTo("browse"); launchSingleTop = true }
                })
                SettingRow(Icons.Filled.Lock, "Change Password", "Update + email confirmation", onClick = {
                    pwdOpen = !pwdOpen
                    pwdError = ""
                    pwdInfo = ""
                })
                if (pwdOpen) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (pwdError.isNotEmpty()) Text(pwdError, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                        if (pwdInfo.isNotEmpty()) Text(pwdInfo, color = MaterialTheme.colorScheme.primary, fontSize = 13.sp)
                        OutlinedTextField(current, { current = it; pwdError = "" }, label = { Text("Current password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(next, { next = it; pwdError = "" }, label = { Text("New password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(confirm, { confirm = it; pwdError = "" }, label = { Text("Confirm new password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                        Button(
                            onClick = {
                                pwdError = when {
                                    current.isEmpty() -> "Current password is required."
                                    next.length < 6 -> "New password must be at least 6 characters."
                                    next != confirm -> "New passwords do not match."
                                    else -> ""
                                }
                                if (pwdError.isNotEmpty()) return@Button
                                pwdLoading = true
                                scope.launch {
                                    try {
                                        val res = api.changePassword(mapOf("currentPassword" to current, "newPassword" to next))
                                        pwdInfo = res.message ?: "Password changed."
                                        current = ""
                                        next = ""
                                        confirm = ""
                                    } catch (e: Exception) {
                                        pwdError = retrofitMessage(e)
                                    } finally {
                                        pwdLoading = false
                                    }
                                }
                            },
                            enabled = !pwdLoading,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(if (pwdLoading) "Changing..." else "Change password") }
                    }
                }
            }

            SectionTitle("Privacy")
            SettingsCard {
                ToggleRow(Icons.Filled.PrivacyTip, "Private Profile", "Only matches can see you", privateProfile) { privateProfile = it }
                ToggleRow(Icons.Filled.Person, "Online Status", "Show when you're active", showOnline) { showOnline = it }
            }

            SectionTitle("Notifications")
            SettingsCard {
                ToggleRow(Icons.Filled.Notifications, "Push Notifications", "Matches & messages", notifications) { notifications = it }
                ToggleRow(Icons.Filled.VolumeUp, "Sounds", "Play sounds on actions", sounds) { sounds = it }
            }

            SectionTitle("Support")
            SettingsCard {
                SettingRow(Icons.Filled.Help, "Help Center", "FAQs & contact", onClick = {
                    dialog = "Help Center" to "Need help? Write to support@lovefinder.app.\n\n• Matches appear when two people like each other.\n• Invites are people who liked you — Accept or Pass.\n• Forgot password? Use the code emailed to you."
                })
                SettingRow(Icons.Filled.Description, "Terms of Service", onClick = {
                    dialog = "Terms of Service" to "Be kind, be real, be 18+.\n\nNo harassment, no spam, no fake profiles. Accounts breaking the rules can be removed."
                })
                SettingRow(Icons.Filled.Info, "Privacy Policy", onClick = {
                    dialog = "Privacy Policy" to "Your data stays yours.\n\nProfile info is visible to other members. Passwords are encrypted. Delete your account anytime from your Profile."
                })
            }

            SectionTitle("About")
            SettingsCard {
                SettingRow(Icons.Filled.Info, "Love Finder", "Version 1.0.0", onClick = null)
            }

            Spacer(Modifier.height(8.dp))
        }
    }

    dialog?.let { (title, text) ->
        AlertDialog(
            onDismissRequest = { dialog = null },
            title = { Text(title, fontWeight = FontWeight.Bold) },
            text = { Text(text) },
            confirmButton = { TextButton(onClick = { dialog = null }) { Text("OK") } }
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text.uppercase(),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 4.dp)
    )
}

@Composable
private fun SettingsCard(content: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(vertical = 4.dp)) { content() }
    }
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = onClick != null, onClick = { onClick?.invoke() })
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, title, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            if (subtitle != null) {
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (onClick != null) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowForward,
                "Open",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, title, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
