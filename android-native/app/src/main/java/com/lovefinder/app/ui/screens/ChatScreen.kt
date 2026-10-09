package com.lovefinder.app.ui.screens

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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lovefinder.app.data.ApiClient
import com.lovefinder.app.data.ChatMessage
import com.lovefinder.app.ui.formatRelativeTime
import com.lovefinder.app.ui.swipeTabs
import kotlinx.coroutines.launch

@Composable
fun ChatScreen(nav: androidx.navigation.NavController, userId: Long, name: String) {
    val context = LocalContext.current
    val threshold = with(LocalDensity.current) { 100.dp.toPx() }
    val api = remember { ApiClient.get(context) }
    val scope = rememberCoroutineScope()

    var messages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var input by remember { mutableStateOf("") }
    var openMenuId by remember { mutableStateOf<Long?>(null) }
    var editingId by remember { mutableStateOf<Long?>(null) }
    var editText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    fun load() {
        scope.launch {
            try {
                messages = api.messages(userId)
            } catch (_: Exception) {
            }
        }
    }
    LaunchedEffect(userId) { load() }
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Column(
        Modifier
            .fillMaxSize()
            .swipeTabs(thresholdPx = threshold, onRight = { nav.popBackStack() })
    ) {
        Text(
            "💬 $name",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(16.dp)
        )

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(messages, key = { it.id }) { msg ->
                val mine = msg.sentByMe
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start
                ) {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (mine) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        ),
                        modifier = Modifier.fillMaxWidth(0.8f)
                    ) {
                        Column(Modifier.padding(10.dp)) {
                            if (editingId == msg.id) {
                                OutlinedTextField(
                                    value = editText,
                                    onValueChange = { editText = it },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Row {
                                    IconButton(onClick = {
                                        scope.launch {
                                            try {
                                                val updated = api.editMessage(
                                                    msg.id,
                                                    mapOf("content" to editText.trim())
                                                )
                                                messages = messages.map {
                                                    if (it.id == msg.id) it.copy(
                                                        content = updated.content,
                                                        edited = true
                                                    ) else it
                                                }
                                            } catch (_: Exception) {
                                            } finally {
                                                editingId = null
                                            }
                                        }
                                    }) { Text("Save", color = MaterialTheme.colorScheme.onPrimary) }
                                    IconButton(onClick = { editingId = null }) {
                                        Text("Cancel", color = MaterialTheme.colorScheme.onPrimary)
                                    }
                                }
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        msg.content ?: "",
                                        modifier = Modifier.weight(1f),
                                        color = if (mine) MaterialTheme.colorScheme.onPrimary
                                        else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    if (mine) {
                                        IconButton(onClick = {
                                            openMenuId = if (openMenuId == msg.id) null else msg.id
                                        }) {
                                            Icon(
                                                Icons.Filled.MoreVert,
                                                "Options",
                                                tint = MaterialTheme.colorScheme.onPrimary
                                            )
                                        }
                                        DropdownMenu(
                                            expanded = openMenuId == msg.id,
                                            onDismissRequest = { openMenuId = null }
                                        ) {
                                            DropdownMenuItem(
                                                text = { Text("Edit") },
                                                onClick = {
                                                    editText = msg.content ?: ""
                                                    editingId = msg.id
                                                    openMenuId = null
                                                }
                                            )
                                            DropdownMenuItem(
                                                text = { Text("Delete") },
                                                onClick = {
                                                    openMenuId = null
                                                    scope.launch {
                                                        try {
                                                            api.deleteMessage(msg.id)
                                                            messages = messages.filter { it.id != msg.id }
                                                        } catch (_: Exception) {
                                                        }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                                Row {
                                    Text(
                                        formatRelativeTime(msg.createdAt),
                                        fontSize = 10.sp,
                                        color = if (mine) MaterialTheme.colorScheme.onPrimary
                                        else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    if (msg.edited) {
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            "(edited)",
                                            fontSize = 10.sp,
                                            fontStyle = FontStyle.Italic,
                                            color = if (mine) MaterialTheme.colorScheme.onPrimary
                                            else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = { Text("Message $name...") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = {
                    val text = input.trim()
                    if (text.isEmpty()) return@IconButton
                    input = ""
                    scope.launch {
                        try {
                            val sent = api.sendMessage(userId, mapOf("content" to text))
                            messages = messages + sent
                        } catch (_: Exception) {
                            load()
                        }
                    }
                }
            ) {
                Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = MaterialTheme.colorScheme.primary)
            }
        }
        Spacer(Modifier.height(4.dp))
    }
}
