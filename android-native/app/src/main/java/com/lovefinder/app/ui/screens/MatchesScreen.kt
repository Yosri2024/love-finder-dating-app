package com.lovefinder.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.MatchItem
import com.lovefinder.app.data.UserDto
import com.lovefinder.app.data.retrofitMessage
import com.lovefinder.app.ui.Avatar
import com.lovefinder.app.ui.formatRelativeTime
import com.lovefinder.app.ui.swipeTabs
import kotlinx.coroutines.launch

@Composable
fun MatchesScreen(nav: NavController) {
    val context = LocalContext.current
    val threshold = with(LocalDensity.current) { 100.dp.toPx() }
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var matches by remember { mutableStateOf<List<MatchItem>>(emptyList()) }
    var invites by remember { mutableStateOf<List<UserDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            loading = true
            try {
                matches = api.matches()
                invites = api.invites()
            } catch (_: Exception) {
            } finally {
                loading = false
            }
        }
    }
    LaunchedEffect(Unit) { load() }

    val shownInvites = invites.filter {
        query.isBlank() || (it.name ?: "").contains(query.trim(), ignoreCase = true)
    }
    val shownMatches = matches.filter {
        query.isBlank() ||
            (it.name ?: "").contains(query.trim(), ignoreCase = true) ||
            (it.lastMessage ?: "").contains(query.trim(), ignoreCase = true)
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(16.dp)
            .swipeTabs(
                thresholdPx = threshold,
                onRight = { nav.navigate("browse") { popUpTo("browse"); launchSingleTop = true } }
            )
    ) {
        Text("💬 Messages", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("Search conversations...") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))

        if (loading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            return@Column
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (shownInvites.isNotEmpty()) {
                item {
                    Text(
                        "Invites (${shownInvites.size}) — people who liked you",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
                items(shownInvites, key = { it.id }) { inv ->
                    Card(shape = RoundedCornerShape(12.dp)) {
                        Row(
                            Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Avatar(inv.name)
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(
                                    "${inv.name ?: "?"} ${inv.age ?: ""}",
                                    fontWeight = FontWeight.Bold
                                )
                                if (!inv.bio.isNullOrEmpty()) {
                                    Text(inv.bio!!, fontSize = 13.sp, maxLines = 1)
                                }
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        try {
                                            api.like(inv.id)
                                            invites = invites.filter { it.id != inv.id }
                                            matches = api.matches()
                                        } catch (e: Exception) {
                                        }
                                    }
                                },
                                contentPadding = ButtonDefaults.ContentPadding
                            ) { Text("Accept") }
                            Spacer(Modifier.width(6.dp))
                            OutlinedButton(onClick = {
                                scope.launch {
                                    try {
                                        api.pass(inv.id)
                                        invites = invites.filter { it.id != inv.id }
                                    } catch (e: Exception) {
                                    }
                                }
                            }) { Text("Pass") }
                        }
                    }
                }
                item {
                    Spacer(Modifier.height(4.dp))
                    Text("Matches", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }

            if (shownMatches.isEmpty()) {
                item { Text(if (query.isBlank()) "No matches yet — keep swiping!" else "No conversations found.") }
            } else {
                items(shownMatches, key = { it.id }) { m ->
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().clickable {
                            nav.navigate("chat/${m.id}?name=${m.name ?: ""}")
                        }
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Avatar(m.name)
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(m.name ?: "?", fontWeight = FontWeight.Bold)
                                if (!m.lastMessage.isNullOrEmpty()) {
                                    Text(m.lastMessage!!, fontSize = 13.sp, maxLines = 1)
                                }
                            }
                            Text(
                                formatRelativeTime(m.time),
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
