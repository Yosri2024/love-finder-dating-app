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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.Session
import com.lovefinder.app.data.UserDto
import com.lovefinder.app.data.retrofitMessage
import com.lovefinder.app.ui.Avatar
import com.lovefinder.app.ui.swipeTabs
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(nav: NavController) {
    val context = LocalContext.current
    val api = remember { ApiClient.get(context) }
    val session = remember { Session(context) }
    val scope = rememberCoroutineScope()
    val threshold = with(LocalDensity.current) { 100.dp.toPx() }

    var me by remember { mutableStateOf<UserDto?>(null) }
    var loading by remember { mutableStateOf(true) }
    var editing by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var interests by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var matchCount by remember { mutableStateOf(0) }
    var inviteCount by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        try {
            me = api.me().also {
                name = it.name ?: ""
                bio = it.bio ?: ""
                interests = it.interests ?: ""
            }
            matchCount = try {
                api.matches().size
            } catch (_: Exception) {
                0
            }
            inviteCount = try {
                api.invites().size
            } catch (_: Exception) {
                0
            }
        } catch (e: Exception) {
            message = retrofitMessage(e)
        } finally {
            loading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .swipeTabs(
                thresholdPx = threshold,
                onRight = { nav.navigate("matches") { popUpTo("browse"); launchSingleTop = true } }
            )
    ) {
        // Header with gradient cover
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp)
                .background(
                    Brush.linearGradient(
                        listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)
                    )
                ),
            contentAlignment = Alignment.BottomStart
        ) {
            if (loading) {
                CircularProgressIndicator(
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                Row(
                    Modifier.fillMaxWidth().padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(Color.White.copy(alpha = 0.25f))
                            .padding(6.dp)
                    ) {
                        Avatar(me?.name, size = 72)
                    }
                    Column(Modifier.padding(start = 14.dp)) {
                        Text(
                            "${me?.name ?: "?"} ${me?.age ?: ""}",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            me?.email ?: "",
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }

        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (message.isNotEmpty()) Text(message, color = MaterialTheme.colorScheme.primary)

            // Stats row
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("Matches", matchCount.toString(), Modifier.weight(1f)) {
                    nav.navigate("matches") { popUpTo("browse"); launchSingleTop = true }
                }
                StatCard("Invites", inviteCount.toString(), Modifier.weight(1f)) {
                    nav.navigate("matches") { popUpTo("browse"); launchSingleTop = true }
                }
                StatCard(
                    "Discover",
                    "Go",
                    Modifier.weight(1f)
                ) {
                    nav.navigate("browse") { popUpTo("browse"); launchSingleTop = true }
                }
            }

            // About card
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text("About", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(Modifier.height(6.dp))
                    if (!editing) {
                        Text(me?.bio?.ifEmpty { "No bio yet." } ?: "No bio yet.")
                        if (!me?.interests.isNullOrEmpty()) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Interests: ${me?.interests}",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(bio, { bio = it }, label = { Text("Bio") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(interests, { interests = it }, label = { Text("Interests") }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    scope.launch {
                                        try {
                                            me = api.updateMe(
                                                mapOf("name" to name, "bio" to bio, "interests" to interests)
                                            )
                                            message = "Saved ✓"
                                            editing = false
                                        } catch (e: Exception) {
                                            message = retrofitMessage(e)
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("Save") }
                            OutlinedButton(
                                onClick = { editing = false },
                                modifier = Modifier.weight(1f)
                            ) { Text("Cancel") }
                        }
                    }
                }
            }

            // Actions
            ProfileRow(Icons.Filled.Edit, "Edit Profile", "Change your name, bio, interests") {
                editing = true
            }
            ProfileRow(Icons.Filled.Settings, "Settings", "Notifications, password, privacy") {
                nav.navigate("settings")
            }
            ProfileRow(Icons.Filled.Logout, "Logout", "Sign out of this device", danger = true) {
                session.logout()
                nav.navigate("login") { popUpTo("browse") { inclusive = true } }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ProfileRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    danger: Boolean = false,
    onClick: () -> Unit
) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                icon,
                title,
                tint = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
            )
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                )
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(
                Icons.AutoMirrored.Filled.ArrowForward,
                "Go",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
